import { EventEmitter } from 'events'
import { debug } from './utils'

class WatchEmitter extends EventEmitter {
  emit (eventName, ...args) {
    debug('emitting', eventName, ...args)
    super.emit(eventName, ...args)
    super.emit('*', eventName, ...args)
  }
}

let emitter = new WatchEmitter()

export default emitter
