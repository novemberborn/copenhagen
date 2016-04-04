import csv from 'csv-parser'

export function addCounts (coverage, usageData) {
  // for/of would be the preferrable syntax but that requires an inlined
  // iterator implementation to support older Node.js versions. An old-fashioned
  // loop does the job as well.
  for (let i = 0; i < usageData.length; i++) {
    const { type, id } = usageData[i]
    coverage[type][id]++
  }
}

function collectStream (result, stream) {
  return new Promise((resolve, reject) => {
    const parser = csv(['hash', 'type', 'id'])
      .on('data', ({ hash, type, id }) => {
        const usage = result[hash] || (result[hash] = [])
        usage.push({ id, type })
      })
      .on('end', resolve)

    stream.once('error', err => {
      stream.unpipe(parser)
      reject(err)
    }).pipe(parser)
  })
}

export function collectUsageData (streams) {
  if (!Array.isArray(streams)) {
    streams = [streams]
  }

  const result = Object.create(null)
  return Promise.all(
    streams.map(stream => collectStream(result, stream))
  ).then(() => result)
}
