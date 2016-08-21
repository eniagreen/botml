const { EventEmitter } = require('events')

class WatchMap extends Map {
  constructor (name, ...args) {
    super(...args)
    this.name = name
  }
  set (key, value) {
    super.set(key, value)
    emitter.emit(`${this.name}:set:${key}`, value)
  }
}

class WatchEmitter extends EventEmitter {
  emit (eventName, ...args) {
    let { debug } = require('./utils')
    debug('emitting', eventName, ...args)
    super.emit(eventName, ...args)
    super.emit('*', eventName, ...args)
  }
}

let context = {
  dialogues: new Map(),
  lists: new Map(),
  services: new Map(),
  variables: new WatchMap('variable'),
  workflows: new WatchMap('workflow'),
  patterns: new WatchMap('pattern')
}

let emitter = new WatchEmitter()

module.exports = { context, emitter }
