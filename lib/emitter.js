const { EventEmitter } = require('events')
const log = require('./log')

class WatchEmitter extends EventEmitter {
  emit (eventName, ...args) {
    log.debug('emitting', eventName, JSON.stringify(...args))
    super.emit(eventName, ...args)
    super.emit('*', eventName, ...args)
  }
}

module.exports = WatchEmitter
