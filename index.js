import { getJSONObject } from './lib/downloadHelp.js'

function lookupUsers (userNames) {
  return Promise.all(
    userNames.map((curName) => {
      return getJSONObject(`https://api.github.com/users/${curName}`, false)
    })
  )
}

// Invite the list of users to join the indicated org
async function makeInvite (orgName, userNames) {
  try {
    // Lookup userIDs
    const userInfo = await lookupUsers(userNames)
    const userIDs = userInfo.map((fullInfo) => (fullInfo?.id))
    console.log(userIDs)
  } catch (err) {
    console.error(err)
  }
}

// Run the main code
makeInvite('UWStout', [
  'Hasiaki',
  'Elska85',
  'braunn8142',
  'BradyBogucki',
  'HarendaB',
  'hailstorm1',
  'Qwertybanana',
  'muhammadn1200',
  'magsmarcinkiewicz',
  'JamesValentino',
  'Eless0',
  'jaydonpfab',
  'LyraLies',
  'Raiins',
  'TheNoxoholic',
  'Jarmzie',
  'CharlesHeikkila',
  'dustytheaverage',
  'Skrimbus',
  'WannabeDesigner',
  'toppop7',
  'Rydiante',
  'KyleChristensen11037',
  'fergusonc8841',
  'BassS0ul'
])
