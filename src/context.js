import emitter from './emitter'

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

let context = {
  dialogues: new Map(),
  lists: new Map(),
  services: new Map(),
  variables: new WatchMap('variable'),
  workflows: new WatchMap('workflow'),
  patterns: new WatchMap('pattern')
}

export default context
