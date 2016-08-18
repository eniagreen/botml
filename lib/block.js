const chalk = require('chalk')
const pattern = require('./pattern')
const { debug, interpolateLists, interpolateVariables, random, say, service, warn } = require('./utils')
const { context, emitter } = require('./context')

module.exports = class Block {
  constructor (text) {
    this._updateText(text)
  }

  _interpolateReferencingWorkflow (text) {
    let isReferencingWorkflow = /^\s*~\s*\[/
    if (isReferencingWorkflow.test(text)) {
      let workflowRef = text.match(/^\s*~\s*\[([^\]]+)\]\s*$/m)[1]
      let workflow = context.workflows.get(workflowRef)
      if (workflow) {
        debug('_interpolateReferencingWorkflow', workflowRef)
        let lineToReplace = RegExp(`^\\s*~\\s*\\[${workflowRef}\\]\\s*$`, 'm')
        let workflowRawWithoutHeading = workflow.raw.replace(/^\s*~.+$\n/m, '')
        return text.replace(lineToReplace, workflowRawWithoutHeading)
      } else {
        warn(`The workflow "${workflow}" does not exist.`)
      }
    }
    return text
  }

  _updateText (text) {
    // if the first line is a reference to a workflow, let's interpolate it
    let oldText = text
    text = this._interpolateReferencingWorkflow(text)
    let textHasChanged = false
    if (oldText !== text) textHasChanged = true
    this.raw = text
    this.activators = []
    if (!text) return
    this.rawType = this.raw.trimLeft()[0]
    this.type = GRAMMAR_TYPES[this.rawType]
    this.label = this.raw.match(/^\s*[<>=~\-@\?]\s*(.+)$/m)[1].trim()
    switch (this.type) {
      case 'dialogue':
        let activators = this.raw.match(/(^\s*>.*$\n)+/m)
        this.activators = activators && activators[0].split(/\s*>\s*/).filter(s => s).map(pattern)
        this.raw = this.raw.replace(/(^\s*>.*$\n)+/m, '')
        this.rawType = this.raw.trimLeft()[0]
        break
      case 'output':
        if (textHasChanged) this.process()
        break
      case 'prompt':
        let list = this.raw.match(/^\s*\?\s*\[([^\]]+)\]/m)[1]
        let replies = context.lists.get(list)
        console.log(chalk.dim('smart replies:'), replies.value.map(s => `[${s}]`).join(chalk.dim(', ')))
        emitter.emit('smart-replies', replies.value)
        break
      case 'list':
        this.value = this.raw
            .replace(/^\s*=.+$\n\s*\-/m, '')
            .split(/^\s*-\s*/m).map(s => s.trim())
        break
      case 'service':
        let service
        // Case 1. service definition
        service = this.label.match(/^(\w+)\s+([^\s]+)\s*$/)
        // Case 2. service consumption
        if (!service) service = this.label.match(/^(\w+)\s*\(([^\)]+)\)(\.[\.\w\d\[\]]+)?\s*$/i)
        // Case 3. code evaluation
        if (!service) {
          try {
            // let aa = interpolateVariables(this.label);
            // debug('$', aa);
          } catch (e) { debug('ERROR', e) }
        } else {
          this.label = service[1]
          this.value = service[2]
          this.output = service[3]
        }
        break
      case 'workflow':
          // remove the first line
//          this.value = this.raw.replace(/^\s*~.+$\n/m, '')
        // // if the current line references another workflow, let's interpolate it
        // this.value = this.raw.replace(/^\s*~\s*\[([^\]]+)\]\s*$/, (m, workflow) => {
        //   let w = context.workflows.get(workflow)
        //   if (w) {
        //     this.raw = w.raw
        //   } else {
        //     warn(`The workflow "${workflow}" does not exist.`)
        //   }
        // })
        // // remove the first line
        // this.value = this.raw;.replace(/^\s*~.+$\n/m, '')
        break
    }
    // debug('updateText', this.label, this.activators, this.split('\n').join('\\'));
  }

  toString () {
    return this.value
  }

  activable () {
    return this.activators !== undefined && this.activators.length > 0
  }

  remaining () {
    return this.raw.length > 0
  }

  process () {
    debug(chalk.bold("process"), this.rawType, this.raw);

    switch (this.rawType) {
      case '~':
        try {
          // referenced workflow
          let workflowName = this.raw.match(/^\s*~\s*\[([^\]]+)\]/m)[1]
          let workflow = context.workflows.get(workflowName)
          if(!workflow) throw Error
        } catch (e) {}
        break
      case '<':
        let responseCandidates = this.raw
            .match(/(^\s*<.*$\n?)+/m)[0]
            .split(/\s*<\s*/).filter(s => s).map(s => s.trim())

        let message = interpolateLists(random(responseCandidates))
        try {
          message = message.replace(/`([^`]*)`/g, (m, script) =>
            eval(interpolateVariables(script)) // eslint-disable-line no-eval
          )
          if (message) {
            emitter.emit('reply', message)
            say(message)
          }
        } catch (e) {
          warn('Error while running script', e)
        }
        // remove all following lines of the bot answering
        this.next()
        return
        // break;
      case '@':
        // Case 1. Trigger
        if (this.label === 'trigger') {
          this.raw.match(/^\s*@\s*trigger\('([^']+)'\)/)
          let eventName = RegExp.lastParen
          emitter.emit(eventName, context.variables.get('$'))
        // Case 2. Service
        } else if (context.services.has(this.label)) {
          service(this.label, this.output, (result) => {
            debug(JSON.stringify(result))
            this.next()
            this.process()
          }, (error) => {
            warn(error)
          })
          return // break the loop
        } else {
          warn('TODO @')
        }
        break
      case '>':
      case undefined:
        warn(`TODO: block#process(${this.rawType})`)
        return // break the loop
      default:
        warn(`TODO: block#process(${this.rawType})`)
    }
    let before = this.raw
    this.next()
    if (this.activable()) return
    if (this.raw !== before) {
      this.process()
    } else {
      warn('NO CHANGE => STOPPED')
      debug(this.raw)
    }
  }

  next () {
    debug(chalk.bold("next"), `rawType: ${this.rawType}`, this.raw);

    let text = this.raw
    if (this.rawType === '>' || this.rawType === '<') {
      // remove all following lines of same type
      text = text.replace(RegExp(`(^\s*${this.rawType}.*$\n?)+`, 'm'), '')
    } else {
      // remove the current line
      text = text.replace(/^.*$\n?/m, '')
    }
    // text = text.replace(RegExp(`^\s*>.*$\n?`, "m"), '');
    if (text !== this.raw) {
      this._updateText(text)
      if (this.type === 'service') this.process()
    } else {
      warn('text not updated', `before: ${this.raw.length}`, `after: ${text.length}`)
    }
    return this
    // return new Block(text.trimLeft());
  }
}

const GRAMMAR_TYPES = {
  '>': 'dialogue',
  '<': 'output',
  '?': 'prompt',
  '=': 'list',
  '@': 'service',
  '~': 'workflow'
}
