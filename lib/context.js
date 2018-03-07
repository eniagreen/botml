const emitter = require('./emitter')

class WatchMap extends Map {
  constructor (name, ...args) {
    super(...args)
    this.name = name
  }
  set (key, value) {
    super.set(key, value)
    emitter.emit(`${this.name}:set`, key, value)
    emitter.emit(`${this.name}:set:${key}`, value)
  }
}


class Context {
  constructor () {
    this.dialogues = new Map()
    this.lists = new Map()
    this.services = new Map()
    this.variables = new WatchMap('variable')
    this.workflows = new WatchMap('workflow')
    this.patterns = new WatchMap('pattern')
  }
}

module.exports = Context
