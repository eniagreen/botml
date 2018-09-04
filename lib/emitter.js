const { EventEmitter } = require('events')
const log = require('./log')
const chalk = require('chalk')

class WatchEmitter extends EventEmitter {
  emit (eventName, ...args) {
    log.debug(chalk.gray('[emit]', eventName, ...args))
    super.emit(eventName, ...args)
    super.emit('*', eventName, ...args)
  }
}

module.exports = WatchEmitter
