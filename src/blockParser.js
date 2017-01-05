import chalk from 'chalk'
import machina from 'machina'
import context from './context'
import emitter from './emitter'
import { patternify } from './pattern'
import { debug, interpolateLists, interpolateVariables, random, say, service, warn } from './utils'

const TYPES = {
  '>': 'dialogue',
  '<': 'output',
  '?': 'prompt',
  '=': 'list',
  '@': 'service',
  '~': 'workflow'
}

let removeBlockCurrentLine = (block) =>
  block.replace(/^.*$\n?/m, '')

let removeBlockLinesOfType = (block, type) =>
  block.replace(RegExp(`(^\\s*${type}.*$\\n)+`, 'm'), '')

function interpolateReferencingWorkflow (text) {
  let isReferencingWorkflow = /^\s*~\s*\[/
  if (isReferencingWorkflow.test(text)) {
    let workflowRef = text.match(/^\s*~\s*\[([^\]]+)\]\s*$/m)[1]
    let workflow = context.workflows.get(workflowRef)
    if (workflow) {
      debug('_interpolateReferencingWorkflow', workflowRef)
      let lineToReplace = RegExp(`^\\s*~\\s*\\[${workflowRef}\\]\\s*$`, 'm')
      let workflowRawWithoutHeading = workflow.block.replace(/^\s*~.+$\n/m, '')
      return text.replace(lineToReplace, workflowRawWithoutHeading)
    } else {
      warn(`The workflow '${workflow}' does not exist.`)
    }
  }
  return text
}

let blockType = (block) => TYPES[block.trimLeft()[0]]

/**
 * States:
 * - uninitialized
 * - [ dialogue | output | prompt | service | workflow ]*
 * - terminated
 */
let Parser = machina.Fsm.extend({
  initialize: function (block) {
    this.type = blockType(block)
    this.block = block
    this.startOfBlock = true
    if (this.type === 'workflow') {
      this.label = this.block.match(/^\s*[<>=~\-@\?]\s*(.+)$/m)[1]
      this.block = removeBlockCurrentLine(this.block)
    }
  },

  initialState: 'uninitialized',

  states: {
    uninitialized: {},

    dialogue: {
      _onEnter: function () {
        this.activators(true) // preload
        this.block = removeBlockLinesOfType(this.block, '>')
        if (this.startOfBlock) this.next(false)
        delete this.startOfBlock
      }
    },

    output: {
      _onEnter: function () {
        delete this.startOfBlock

        let responseCandidates = this.block
            .match(/(^\s*<.*$\n?)+/m)[0]
            .split(/\s*<\s*/).filter(s => s).map(s => s.trim())
        let message = interpolateLists(random(responseCandidates))
        try {
          message = message.replace(/`([^`]*)`/g, (m, script) =>
            eval(interpolateVariables(script)) // eslint-disable-line no-eval
          )
          if (message) {
            say(message)
          }
        } catch (e) {
          warn('Error while running script', e)
        }

        // trigger the next instruction
        this.block = removeBlockLinesOfType(this.block, '<')
        this.next()
      }
    },

    prompt: {
      _onEnter: function () {
        let list = this.block.match(/^\s*\?\s*\[([^\]]+)\]/m)[1]
        let replies = context.lists.get(list)
        if (!replies) throw new Error(`List undefined: '${list}'`)
        console.log(chalk.dim('smart replies:'), replies.value.map(s => `[${s}]`).join(chalk.dim(', ')))
        emitter.emit('smart-replies', replies.value)

        // trigger the next instruction
        this.block = removeBlockCurrentLine(this.block)
        this.next()
      }
    },

    service: {
      _onEnter: function () {
        let [label, value, output] = this.line.match(/^(\w+)\s*\(([^\)]*)\)(\.[\.\w\[\]]+)?\s*$/i).slice(1) // eslint-disable-line no-unused-vars

        // Case 1. Trigger
        if (label === 'trigger') {
          this.line.replace(/^trigger\('([^']+)'(?:\s*,\s*(.*))?\)$/m, (match, eventName, value) => {
            try { value = JSON.parse(value) } catch (e) {}
            value = value || context.variables.get('$')
            emitter.emit(eventName, value)
          })
          this.block = removeBlockCurrentLine(this.block)
          this.next()

        // Case 2. Service
        } else if (context.services.has(label)) {
          service(label, output, (result) => {
            debug(JSON.stringify(result))
            this.block = removeBlockCurrentLine(this.block)
            this.next()
          }, (error) => {
            warn(`Error while executing service '${label}'`, error)
            throw error
          })
        } else {
          throw Error(`'Unknown service: ${label}'`)
        }
      }
    },

    workflow: {
      _onEnter: function () {
        this.block = interpolateReferencingWorkflow(this.block)

        // trigger the next instruction
        delete this.startOfBlock
        this.next()
      }
    },

    terminated: {
      _onEnter: () => debug('End of block')
    }
  },

  next: function (process = true) {
    this.deferUntilTransition()

    // 1. Use the current line type as current state
    let type = blockType(this.block) || 'terminated'
    debug('next', type)

    // 2. Store the first line stripped from its symbol
    if (type !== 'terminated') {
      this.line = this.block.match(/^\s*[<>=~\-@\?]\s*(.+)$/m)[1].trim()
    }

    if (!process) delete this.startOfBlock

    // 3. Transition to the identified state
    this.transition(type)

    delete this.startOfBlock
  },

  activators: function (forceReloading = false) {
    if (!forceReloading && this._activators) return this._activators
    let _activators = this.block.match(/(^\s*>.*$\n)+/m)
    if (!_activators) return this._activators || []
    this._activators = _activators && _activators[0].split(/^\s*>\s*/m).filter(s => s)
    this._activators = this._activators.map(patternify)
    return this._activators || []
  },

  activable: function () {
    return this.activators() && this.activators().length > 0
  },

  remaining: function () {
    return this.block.length > 0
  }
})

export default Parser
