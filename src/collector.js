import { Readable } from 'stream'

let stream = null
export function getStream () {
  if (!stream) {
    stream = new Readable()
    // Node.js 0.10 compatibility necessitates this slightly awkward syntax.
    stream._read = () => {}
  }

  return stream
}

export function createCollector (hash) {
  const collect = (type, id) => {
    if (stream) {
      stream.push(`${hash},${type},${id}\n`)
    }
  }

  return {
    s (id) { collect('s', id) },
    f (id) { collect('f', id) }
  }
}
