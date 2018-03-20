const { EventEmitter } = require('events')
const log = require('./log')

class WatchEmitter extends EventEmitter {
  emit (eventName, ...args) {
    log.debug('emit', eventName, (JSON.stringify(...args) || '').slice(0, 120))
    super.emit(eventName, ...args)
    super.emit('*', eventName, ...args)
  }
}

module.exports = WatchEmitter
