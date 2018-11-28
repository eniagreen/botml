const log = require('./log')

class WatchMap extends Map {
  static create (name, emitter) {
    const instance = new Map()
    // eslint-disable-next-line no-proto
    instance['__proto__'] = WatchMap.prototype
    instance.name = name
    instance.emitter = emitter
    return instance
  }
  set (key, value) {
    super.set(key, value)

    log.info(value && value.toString ? value.toString() : { value })
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
    this.variables = WatchMap.create('variable', emitter)
    this.workflows = WatchMap.create('workflow', emitter)
    this.patterns = WatchMap.create('pattern', emitter)
  }
}

module.exports = Context
