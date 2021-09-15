import fs from 'fs'
import { createGitHubRepository, createGitHubTeam, getGitHubUserInfoWithMembership, inviteUserToTeam } from './lib/gitHubHelp.js'

const rawListJSON = fs.readFileSync('./classProjectData/koehleFall2021Exp.json', { encoding: 'utf8' })
const koehleF21ExperimentTeamList = JSON.parse(rawListJSON)

// Main function
async function main () {
  try {
    // Make the full class team
    console.log('Creating class team ...')
    const classTeamInfo = await createGitHubTeam(
      koehleF21ExperimentTeamList.classTeam.name,
      koehleF21ExperimentTeamList.classTeam.description,
      'UWStout'
    )

    if (classTeamInfo === undefined) { return }
    console.log(classTeamInfo)

    // Make the individual project teams
    console.log('Creating project teams ...')
    const projectTeamInfo = await Promise.all(
      koehleF21ExperimentTeamList.projectTeams.map((project) => {
        return createGitHubTeam(
          project.name, project.description, 'UWStout', classTeamInfo.id
        )
      })
    )

    if (projectTeamInfo.includes(undefined)) { return }
    console.log(projectTeamInfo)

    // Make the individual project repos
    console.log('Creating project repos ...')
    const projectRepoInfo = await Promise.all(
      koehleF21ExperimentTeamList.projectTeams.map((project, i) => {
        return createGitHubRepository(
          project.repository.name,
          project.repository.description,
          project.repository.template,
          'UWStout',
          projectTeamInfo[i].slug
        )
      })
    )

    if (projectRepoInfo.includes(undefined)) { return }
    console.log(projectRepoInfo)

    // Make flat user list
    const userList = []
    const teamList = []
    koehleF21ExperimentTeamList.projectTeams.forEach((project, i) => {
      userList.push(...project.users)
      teamList.push(...Array(project.users.length).fill(projectTeamInfo[i].id))
    })

    // Lookup extended user info
    const membershipInfo = await getGitHubUserInfoWithMembership('UWStout', userList)
    const inviteList = membershipInfo.map((membership, i) => ({ ...membership, team: teamList[i] }))

    // Create invites for all members
    console.log('Sending user invites ...')
    await Promise.all(
      inviteList.map((invite) => (
        inviteUserToTeam(invite.id, 'UWStout', [classTeamInfo.id, invite.team])
      ))
    )
  } catch (err) {
    console.error('Something went wrong')
    console.error(err)
  }
}

// Start main function
main()
