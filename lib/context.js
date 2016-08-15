const { EventEmitter } = require('events');

let context = {
  dialogues: new Map(),
  lists: new Map(),
  services: new Map(),
  variables: new Map(),
  workflows: new Map()
};

let emitter = new EventEmitter();

module.exports = { context, emitter };
