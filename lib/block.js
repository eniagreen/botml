const pattern = require('./pattern'),
      { debug, interpolateLists, random, say, warn } = require('./utils'),
      { context } = require('./context');

module.exports = class Block {
  constructor(text) {
    this.updateText(text);
  }

  updateText(text) {
    this.raw = text;
    delete this.activators;
    if (!text) return;
    this.rawType = this.raw.trimLeft()[0];
    this.type = GRAMMAR_TYPES[this.rawType];
    this.label = this.raw.match(/^\s*[<>=~\-@]\s*(.+)$/m)[1].trim();
    switch (this.type) {
      case 'dialogue':
        let activators = this.raw.match(/(^\s*>.*$\n)+/m);
        this.activators = activators && activators[0].split(/\s*>\s*/).filter(s => s).map(pattern);
        this.raw = this.raw.replace(/(^\s*>.*$\n)+/m, '');
        this.rawType = this.raw.trimLeft()[0];
        break;
      case 'output':
        // do nothing
        break;
      case 'list':
        this.value = this.raw
            .replace(/^\s*=.+$\n\s*\-/m, '')
            .split(/^\s*-\s*/m).map(s => s.trim());
        break;
      case 'service':
        let service = this.label.match(/^(\w+)\s+([^\s]+)\s*$/);
        this.label = service[1];
        this.value = service[2];
        break;
      case 'workflow':
        // remove the first line
        this.value = this.raw.replace(/^\s*~.+$\n\s*/m, '');
        break;
    }
    //debug('updateText', this.label, this.activators, this.split('\n').join('\\'));
  }

  toString() {
    return this.value;
  }

  remaining() {
    //debug("remaining", this.raw.length, this.raw.split('\n').join('\\'));
    return this.raw.length > 0;
  }

  process() {
    //debug("process", this.rawType);
    switch (this.rawType) {
      case '~':
        warn(`TODO: block#process(${this.rawType})`);
        break;
      case '<':
        let responseCandidates = this.raw
            .match(/(^\s*<.*$\n?)+/m)[0]
            .split(/\s*<\s*/).filter(s => s).map(s => s.trim())
        ;
        let answer = interpolateLists(random(responseCandidates));
        if (answer) say(answer);
        // remove all following lines of the bot answering
        this.next();
        return;
        //break;
      case '>':
      case undefined:
        warn(`TODO: block#process(${this.rawType})`);
        return; // break the loop
      default:
        warn(`TODO: block#process(${this.rawType})`);
    }
    let before = this.raw;
    this.next();
    if (this.raw !== before) {
      this.process();
    } else {
      warn("NO CHANGE => STOPPED");
      debug(this.raw);
    }
  }

  next() {
    //debug("next", `rawType: ${this.rawType}`);
    let text = this.raw;
    if (this.rawType === '>' || this.rawType === '<') {
      // remove all following lines of same type
      text = text.replace(new RegExp(`(^\s*${this.rawType}.*$\n?)+`, "m"), '');
    } else {
      // remove the current line
      text = text.replace(/^.*$\n?/m, '');
    }
    //text = text.replace(new RegExp(`^\s*>.*$\n?`, "m"), '');
    if (text !== this.raw) {
      this.updateText(text);
    } else {
      warn("text not updated", `before: ${this.raw.length}`, `after: ${text.length}`);
    }
    return this;
    //return new Block(text.trimLeft());
  }
}

const GRAMMAR_TYPES = {
  '>': 'dialogue',
  '<': 'output',
  '=': 'list',
  '@': 'service',
  '~': 'workflow'
}
