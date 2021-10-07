import fs from 'fs'
import {
  createGitHubRepository,
  getGitHubUserInfoWithMembership,
  createGitHubTeam, addToGitHubTeam
} from './lib/gitHubHelp.js'

const rawListJSON = fs.readFileSync('./classProjectData/berrierFall2021-325-full.json', { encoding: 'utf8' })
const teamInfoData = JSON.parse(rawListJSON)

// Main function
async function main () {
  try {
    // Make the full class team
    console.log('Creating class team ...')
    const classTeamInfo = await createGitHubTeam(
      teamInfoData.classTeam.name,
      teamInfoData.classTeam.description,
      'UWStout'
    )

    if (classTeamInfo === undefined) { return }
    // console.log(classTeamInfo)

    // Make the individual project teams
    console.log('Creating project teams ...')
    const projectTeamInfo = await Promise.all(
      teamInfoData.projectTeams.map((project) => {
        return createGitHubTeam(
          project.name, project.description, 'UWStout', classTeamInfo.id
        )
      })
    )

    if (projectTeamInfo.includes(undefined)) { return }
    // console.log(projectTeamInfo)

    // Make the individual project repos
    console.log('Creating project repos ...')
    const projectRepoInfo = await Promise.all(
      teamInfoData.projectTeams.map((project, i) => {
        return createGitHubRepository(
          project.repository.name,
          project.repository.description,
          'UWStout',
          projectTeamInfo[i].slug,
          project.repository.template
        )
      })
    )

    if (projectRepoInfo.includes(undefined)) { return }
    // console.log(projectRepoInfo)

    // Make flat user and team list (starting with instructor)
    const userList = []
    const userTeamList = []
    teamInfoData.projectTeams.forEach((project, i) => {
      userList.push(...project.users)
      userTeamList.push(...Array(project.users.length).fill(projectTeamInfo[i].slug))
    })

    // Lookup extended user info
    const membershipInfo = await getGitHubUserInfoWithMembership('UWStout', userList)
    const inviteList = membershipInfo.map((membership, i) => ({ ...membership, teamSlug: userTeamList[i] }))

    // Create invites for the instructor (if there is one)
    if (teamInfoData.classTeam.instructor) {
      console.log('Adding instructor to teams ...')
      const teacherInfo = await getGitHubUserInfoWithMembership('UWStout',
        [teamInfoData.classTeam.instructor]
      )
      await Promise.all([
        addToGitHubTeam('UWStout', classTeamInfo.slug, teacherInfo[0].userName, 'maintainer'),
        ...projectTeamInfo.map((projectTeam) => (
          addToGitHubTeam('UWStout', projectTeam.slug, teacherInfo[0].userName, 'maintainer')
        ))
      ])
    }

    // Create invites for the users
    console.log('Adding users to teams ...')
    await Promise.all(
      inviteList.map((invite) => {
        return Promise.all([
          addToGitHubTeam('UWStout', classTeamInfo.slug, invite.userName),
          addToGitHubTeam('UWStout', invite.teamSlug, invite.userName)
        ])
      })
    )
  } catch (err) {
    console.error('Something went wrong')
    console.error(err)
  }
}

// Start main function
main()
