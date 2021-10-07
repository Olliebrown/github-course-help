import fs from 'fs'
import https from 'https'

// Set to only simulate and log the requests
const SIMULATE = false

// Helper functions
export function getJSONObject (URL, username, token, failOn404, redirect) {
  // Check for missing optional parameters (username and token)
  if (failOn404 === undefined && redirect === undefined) {
    if (typeof username === 'boolean') { failOn404 = username; username = undefined }
    if (typeof token === 'number') { redirect = token; token = undefined }
  }

  // Ensure last two parameters are defined
  if (failOn404 === undefined) { failOn404 = true }
  if (typeof redirect !== 'number') { redirect = 10 }

  return new Promise((resolve, reject) => {
    // Build request headers
    const headers = {
      'User-Agent': 'request',
      accept: 'application/vnd.github.v3+json'
    }
    if (username && token) {
      headers.authorization = 'Basic ' + Buffer.from(username + ':' + token).toString('base64')
    }

    // log simulation only
    if (SIMULATE) {
      console.log(`getJSONObject (${URL}, ${username}, ${token}, ${failOn404}, ${redirect})`)
      console.log(`\tUser-Agent: ${headers['User-Agent']}`)
      console.log(`\tAuth: ${headers.authorization}`)
      console.log(`\tAccept: ${headers.accept}`)
      return Promise.resolve(null)
    }

    // Variable to accumulate the returned raw JSON
    let rawJSONData = ''

    // Make the request
    https.get(URL, { headers }, (res) => {
      // Extract response info
      const { statusCode, headers: resHeaders } = res

      // Follow redirects
      if ((statusCode === 301 || statusCode === 302) && redirect > 0) {
        return getJSONObject(res.headers.location, username, token, failOn404, redirect - 1)
          .then((result) => { return resolve(result) })
          .catch((err) => { return reject(err) })
      }

      // Should we 'reject' or 'resolve' a 404?
      if (statusCode === 404 && !failOn404) {
        console.log('Ignoring 404')
        return resolve(null)
      }

      // Do a sanity check on the response
      if (statusCode < 200 || statusCode > 299) {
        // Check if we got rate-limited
        if (resHeaders['x-ratelimit-remaining'] === '0') {
          return reject(new Error(`Request Failed, rate-limit exceeded\nStatus Code: ${statusCode}`))
        }
        return reject(new Error(`Request Failed.\nStatus Code: ${statusCode}`))
      } else if (!/^application\/json/.test(resHeaders['content-type'])) {
        return reject(new Error(`Invalid content-type.\nExpected application/json but received ${resHeaders['content-type']}`))
      }

      // Accumulate data
      res.on('data', (chunk) => { rawJSONData += chunk })

      // Parse final result
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawJSONData)
          return resolve(parsedData)
        } catch (err) {
          return reject(err)
        }
      })
    }).on('error', (err) => {
      return reject(err)
    })
  })
}

export function getBinaryFile (URL, filename, username, token, failOn404, redirect) {
  // Check for missing optional parameters (username and token)
  if (failOn404 === undefined && redirect === undefined) {
    if (typeof username === 'boolean') { failOn404 = username; username = undefined }
    if (typeof token === 'number') { redirect = token; token = undefined }
  }

  // Ensure last two parameters are defined
  if (failOn404 === undefined) { failOn404 = true }
  if (typeof redirect !== 'number') { redirect = 10 }

  // DEBUG: check parameters by un-commenting line below
  // console.log(`getBinaryFile (${URL}, ${filename}, ${username}, ${token}, ${failOn404}, ${redirect})`)

  return new Promise((resolve, reject) => {
    // Build request headers
    const headers = {
      'User-Agent': 'request'
    }
    if (username && token) {
      headers.authorization = 'Basic ' + Buffer.from(username + ':' + token).toString('base64')
    }

    // log simulation only
    if (SIMULATE) {
      console.log(`getBinaryFile (${URL}, ${filename}, ${username}, ${token}, ${failOn404}, ${redirect})`)
      console.log(`\tUser-Agent: ${headers['User-Agent']}`)
      console.log(`\tAuth: ${headers.authorization}`)
      console.log(`\tAccept: ${headers.accept}`)
      return Promise.resolve(null)
    }

    // Create output file write stream
    const outputFile = fs.createWriteStream(filename)

    // Setup HTTPS request
    https.get(URL, { headers }, (res) => {
      // Extract response info
      const { statusCode, headers: resHeaders } = res

      // Follow redirects
      if ((statusCode === 301 || statusCode === 302) && redirect > 0) {
        return getBinaryFile(res.headers.location, filename, username, token, failOn404, redirect - 1)
          .then((result) => { return resolve(result) })
          .catch((err) => { return reject(err) })
      }

      // Should we 'reject' or 'resolve' a 404?
      if (statusCode === 404 && !failOn404) {
        return resolve(false)
      }

      // Do a sanity check on the response
      if (statusCode < 200 || statusCode > 299) {
        // Check if we got rate-limited
        if (resHeaders['x-ratelimit-remaining'] === '0') {
          return reject(new Error(`Request Failed, rate-limit exceeded\nStatus Code: ${statusCode}`))
        }
        return reject(new Error(`Request Failed.\nStatus Code: ${statusCode}`))
      }

      // Pipe data to file
      res.pipe(outputFile)

      // Close file and return
      res.on('end', () => {
        outputFile.close()
        return resolve(true)
      })
    }).on('error', (err) => {
      return reject(err)
    })
  })
}

// Helper functions
export function createJSONObject (URL, method, body, username, token, failOn404, redirect) {
  // Check for missing optional parameters (username and token)
  if (failOn404 === undefined && redirect === undefined) {
    if (typeof username === 'boolean') { failOn404 = username; username = undefined }
    if (typeof token === 'number') { redirect = token; token = undefined }
  }

  // Ensure last two parameters are defined
  if (failOn404 === undefined) { failOn404 = true }
  if (typeof redirect !== 'number') { redirect = 10 }

  // DEBUG: check parameters by un-commenting line below
  // console.log(`createJSONObject (${URL}, ${method}, ${body}, ${username}, ${token}, ${failOn404}, ${redirect})`)

  return new Promise((resolve, reject) => {
    // Prepare the post data
    const postData = JSON.stringify(body)

    // Build request headers
    const headers = {
      'User-Agent': 'request',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      accept: 'application/vnd.github.baptiste-preview+json, application/vnd.github.v3+json'
    }
    if (username && token) {
      headers.authorization = 'Basic ' + Buffer.from(username + ':' + token).toString('base64')
    }

    // log simulation only
    if (SIMULATE) {
      console.log(`createJSONObject (${URL}, ${method}, ${body}, ${username}, ${token}, ${failOn404}, ${redirect})`)
      console.log(`\tUser-Agent: ${headers['User-Agent']}`)
      console.log(`\tAuth: ${headers.authorization}`)
      console.log(`\tContent-Type: ${headers['Content-Type']}`)
      console.log(`\tContent-Length: ${headers['Content-Length']}`)
      console.log(`\tAccept: ${headers.accept}`)
      return resolve(null)
    }

    // Variable to accumulate the returned raw JSON
    let rawJSONData = ''

    // Make the request
    const req = https.request(URL, { method, headers }, (res) => {
      // Extract response info
      const { statusCode, headers: resHeaders } = res

      // Follow redirects
      if ((statusCode === 301 || statusCode === 302) && redirect > 0) {
        return getJSONObject(res.headers.location, username, token, failOn404, redirect - 1)
          .then((result) => { return resolve(result) })
          .catch((err) => { return reject(err) })
      }

      // Should we 'reject' or 'resolve' a 404?
      if (statusCode === 404 && !failOn404) {
        return resolve(null)
      }

      // Accumulate data
      res.on('data', (chunk) => { rawJSONData += chunk })

      // Parse final result
      res.on('end', () => {
        if (resHeaders['content-type'] !== undefined && !/^application\/json/.test(resHeaders['content-type'])) {
          return reject(new Error(`Invalid content-type.\nExpected application/json but received ${resHeaders['content-type']}`))
        } else {
          let parsedData = null
          try {
            parsedData = JSON.parse(rawJSONData)
          } catch (err) {
            return reject(err)
          }

          // Do a sanity check on the response
          if (statusCode < 200 || statusCode > 299) {
            // Check if we got rate-limited
            if (resHeaders['x-ratelimit-remaining'] === '0') {
              return reject(new Error(`Request Failed, rate-limit exceeded\nStatus Code: ${statusCode}\nURL: ${URL}\nDATA: ${postData}`))
            }
            return reject(new Error(`Request Failed.\nStatus Code: ${statusCode}\nURL: ${URL}\nDATA: ${postData}`))
          }

          return resolve(parsedData)
        }
      })
    }).on('error', (err) => {
      return reject(err)
    })

    // Send the body data
    req.write(postData)
    req.end()
  })
}
