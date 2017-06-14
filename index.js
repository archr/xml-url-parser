const fs = require('fs')
const path = require('path')
const request = require('request')
const XmlStream = require('xml-stream')
const debug = require('debug')('xml-url-parser')
const tmpDir = require('os').tmpdir()

class XmlParser {
  constructor (options) {
    this.url = options.url
    this.selector = options.selector
    this.collect = options.collect || []
    this.files = []

    process.on('exit', this.exitHandler.bind(this))
  }

  get () {
    const file = path.join(tmpDir, `${Date.now()}.xml`)
    this.files.push(file)

    return Promise.resolve()
      .then(() => this.download(file))
      .then(() => this.parse(file))
      .then(items => {
        debug(`${items.length} items`)
        return items
      })
  }

  download (file) {
    debug(`Downloading xml ${this.url} to tmp ${file}`)

    return new Promise((resolve, reject) => {
      request({ uri: this.url })
        .pipe(fs.createWriteStream(file))
        .on('error', reject)
        .on('close', resolve)
    })
  }

  parse (file) {
    const items = []
    debug('Parsing xml')

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(file)
      const xml = new XmlStream(stream)

      this.collect.forEach(collect => {
        xml.collect(collect)
      })

      xml.on(`endElement: ${this.selector}`, el => items.push(el))
      xml.on('error', reject)
      xml.on('end', () => resolve(items))
    })
  }

  exitHandler () {
    if (!this.files.length) return

    this.files.forEach(file => {
      if (!fs.existsSync(file)) return
      fs.unlinkSync(file)
      debug(`Deleted file ${file}`)
    })
  }
}

module.exports = XmlParser
