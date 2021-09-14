import fs from 'fs'
import https from 'https'

// Helper functions
export function getJSONObject (URL, failOn404 = true) {
  return new Promise((resolve, reject) => {
    let rawJSONData = ''
    https.get(URL, { headers: { 'User-Agent': 'request' } }, (res) => {
      // Extract response info
      const { statusCode } = res
      const contentType = res.headers['content-type']

      // Do a sanity check on the response
      if (statusCode !== 200) {
        if (statusCode === 404 && !failOn404) {
          return resolve(null)
        }
        return reject(new Error(`Request Failed.\nStatus Code: ${statusCode}`))
      } else if (!/^application\/json/.test(contentType)) {
        return reject(new Error(`Invalid content-type.\nExpected application/json but received ${contentType}`))
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

export function getBinaryFile (URL, filename) {
  return new Promise((resolve, reject) => {
    // Create output file write stream
    const outputFile = fs.createWriteStream(filename)

    // Setup HTTPS request
    https.get(URL, { headers: { 'User-Agent': 'request' } }, (res) => {
      // Extract response info
      const { statusCode } = res
      // const contentType = res.headers['content-type']

      // Follow redirects
      if (statusCode === 302) {
        return getBinaryFile(res.headers.location, filename)
          .then(() => { return resolve() })
          .catch((err) => { return reject(err) })
      }

      // Do a sanity check on the response
      if (statusCode !== 200) {
        return reject(new Error(`Request Failed.\nStatus Code: ${statusCode}`))
      }

      // Pipe data to file
      res.pipe(outputFile)

      // Close file and return
      res.on('end', () => {
        outputFile.close()
        return resolve()
      })
    }).on('error', (err) => {
      return reject(err)
    })
  })
}
