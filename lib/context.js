class WatchMap extends Map {
  constructor (name, emitter, ...args) {
    super(...args)
    this.name = name
    this.emitter = emitter
  }
  set (key, value) {
    super.set(key, value)

    this.emitter.emit(`${this.name}:set`, key, value)
    this.emitter.emit(`${this.name}:set:${key}`, value)
  }
  toString () {
    return Array.from(this.entries())
  }
}

class Context {
  constructor (emitter) {
    this.emitter = emitter
    this.dialogues = new Map()
    this.lists = new Map()
    this.services = new Map()
    this.variables = new WatchMap('variable', emitter)
    this.workflows = new WatchMap('workflow', emitter)
    this.patterns = new WatchMap('pattern', emitter)
  }
}

module.exports = Context
