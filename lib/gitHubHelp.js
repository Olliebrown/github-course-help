import Dotenv from 'dotenv'
import Slugify from 'slugify'
import { getJSONObject, createJSONObject } from './httpRequestHelp.js'

Dotenv.config()

// Github auth from .env file
const GH_USER = process.env.USER || ''
const GH_TOKEN = process.env.PAT || ''

// Function to lookup public github user details from a username
// NOTE: Credentials are not required but using them avoids rate limiting
export function lookupGitHubUser (userName) {
  return getJSONObject(
    `https://api.github.com/users/${userName}`,
    GH_USER, GH_TOKEN, false
  )
}

// Lookup details about a github team (if it exists)
export function lookupGitHubTeam (orgName, teamName) {
  const teamSlug = Slugify(teamName)
  return getJSONObject(
    `https://api.github.com/orgs/${orgName}/teams/${teamSlug}`,
    GH_USER, GH_TOKEN, false
  )
}

// Internal function to check user membership in an org
// NOTE: Credentials must have permission for the given org
function checkGitHubOrgMembership (orgName, users) {
  return Promise.all(
    users.map((curUser) => {
      return getJSONObject(
        `https://api.github.com/orgs/${orgName}/memberships/${curUser}`,
        GH_USER, GH_TOKEN, false
      )
    })
  )
}

// Invite the list of users to join the indicated org
export async function getGitHubUserInfoWithMembership (orgName, userNames) {
  try {
    // Check if already in given org
    const fullMembership = await checkGitHubOrgMembership(orgName, userNames)
    const basicMembership = fullMembership.map((member, i) => ({
      userName: member?.user?.login || userNames[i],
      id: member?.user?.id,
      status: (member === undefined || member === null ? 'none' : member.state),
      isMember: (member?.state === 'active')
    }))

    // Lookup any users not in org to get their internal GH id
    const userInfoWithMembership = await Promise.all(
      basicMembership.map(async (user, i) => {
        if (user.id === undefined || user.id === null) {
          const userInfo = await lookupGitHubUser(user.userName)
          return { ...user, id: userInfo.id }
        } else {
          return user
        }
      })
    )

    console.log('Info with membership:')
    console.log(userInfoWithMembership)

    // Return results
    return userInfoWithMembership
  } catch (err) {
    console.error(err)
  }
}

export async function inviteUserToTeam (userId, orgName, teamIdList) {
  // Create post data and URL
  const postData = { invitee_id: userId, team_ids: teamIdList }
  const postURL = `https://api.github.com/orgs/${orgName}/invitations`

  try {
    const inviteResult = await createJSONObject(postURL, 'POST', postData, GH_USER, GH_TOKEN)
    return {
      id: inviteResult.id,
      userName: inviteResult.login,
      role: inviteResult.role
    }
  } catch (err) {
    console.error(err)
  }
}

export async function createGitHubTeam (name, description, orgName, parentTeamId) {
  // Try looking up the team first
  try {
    const teamSlug = Slugify(name)
    const teamResult = await getJSONObject(`https://api.github.com/orgs/${orgName}/teams/${teamSlug}`, GH_USER, GH_TOKEN, false)
    if (teamResult) {
      return {
        id: teamResult.id,
        slug: teamResult.slug
      }
    }
  } catch (err) {
    console.error(err)
    return
  }

  // Create post data and URL
  const postData = { name, description, parent_team_id: parentTeamId }
  const postURL = `https://api.github.com/orgs/${orgName}/teams`

  try {
    const teamResult = await createJSONObject(postURL, 'POST', postData, GH_USER, GH_TOKEN)
    return {
      id: teamResult.id,
      slug: teamResult.slug
    }
  } catch (err) {
    console.error(err)
  }
}

export async function addToGitHubTeam (orgName, teamName, userName, role = 'member') {
  // Try looking up the team first
  try {
    const teamSlug = Slugify(teamName)
    const result = await createJSONObject(
      `https://api.github.com/orgs/${orgName}/teams/${teamSlug}/memberships/${userName}`,
      'PUT', { role }, GH_USER, GH_TOKEN
    )
    if (result) {
      return true
    }
  } catch (err) {
    console.error(err)
    return false
  }
}

export async function createGitHubRepository (name, description, owner, teamSlug, template) {
  // Does this repo already exist?
  try {
    const nameSlug = Slugify(name)
    const repoResult = await getJSONObject(`https://api.github.com/repos/${owner}/${nameSlug}`, GH_USER, GH_TOKEN, false)
    if (repoResult?.id) {
      return {
        id: repoResult.id,
        name: repoResult.name,
        fullName: repoResult.full_name
      }
    } else {
      console.log(`Repo "${owner}/${nameSlug}" does not exist`)
    }
  } catch (err) {
    console.error('Error looking up repo')
    console.error(err)
    return null
  }

  // Create post data and URL (different endpoints for template-based or not)
  let repoResult = null
  if (template) {
    const postData = { owner, name, description, private: true }
    const postURL = `https://api.github.com/repos/${template}/generate`

    try {
      repoResult = await createJSONObject(postURL, 'POST', postData, GH_USER, GH_TOKEN)
    } catch (err) {
      console.error(err)
    }
  } else {
    const postData = { name, description, private: true }
    const postURL = `https://api.github.com/orgs/${owner}/repos`

    try {
      repoResult = await createJSONObject(postURL, 'POST', postData, GH_USER, GH_TOKEN)
    } catch (err) {
      console.error(err)
    }
  }

  if (teamSlug) {
    // Create post data and URL
    const putData = { permission: 'admin' }
    const putURL = `https://api.github.com/orgs/${owner}/teams/${teamSlug}/repos/${repoResult.full_name}`

    try {
      await createJSONObject(putURL, 'PUT', putData, GH_USER, GH_TOKEN)
    } catch (err) {
      console.error(err)
    }
  }

  return {
    id: repoResult.id,
    name: repoResult.name,
    fullName: repoResult.full_name
  }
}
