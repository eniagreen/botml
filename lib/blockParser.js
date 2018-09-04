const chalk = require('chalk')
const machina = require('machina')
const log = require('./log')
const { patternify } = require('./pattern')
const Utils = require('./utils')

const TYPES = {
  '>': 'dialogue',
  '<': 'output',
  '?': 'prompt',
  '=': 'list',
  '@': 'service',
  '~': 'workflow',
  '`': 'code',
  '#': 'comment'
}

let removeBlockCurrentLine = (block) =>
  block.replace(/^.*$\n?/m, '')

let removeBlockLinesOfType = (block, type) =>
  block.replace(RegExp(`(^\\s*${type}.*$\\n?)+`, 'm'), '')

// hacky patch that ensures the next action/line will be handled
// TODO: implement a better solution
let ensureNextActionWillBeHandled = (block) =>
  `# remove me\n${block}`

let isReferencingWorkflow = (text) =>
  /^\s*~\s*\[/.test(text)

let isCheckpoint = (text) =>
  /^\s*~\s*\w/.test(text)

let referencingWorkflowName = (text) =>
  text.match(/^\s*~\s*\[([^\]]+)\]\s*$/m)[1]

let checkpointName = (text) =>
  text.match(/^~\s+(\w[\w_-]*)/)[1]

function interpolateReferencingWorkflow (context, text) {
  if (isReferencingWorkflow(text)) {
    let workflowRef = referencingWorkflowName(text)
    let workflow = context.workflows.get(workflowRef)
    if (workflow) {
      log.debug('[parser]', '_interpolateReferencingWorkflow', workflowRef)
      let lineToReplace = RegExp(`^\\s*~\\s*\\[${workflowRef}\\]\\s*$`, 'm')
      let workflowRawWithoutHeading = workflow.block.replace(/^\s*~[a-z](?:[a-z0-9-_]*[a-z0-9])?$\n/m, '')

      // hacky code that ensures the next action/line will be handled not as a response candidate but as a response
      workflowRawWithoutHeading += '\n@ trigger(\'nothing\')'

      return text.replace(lineToReplace, workflowRawWithoutHeading)
    } else {
      log.warn('[parser]', `The workflow '${workflow}' does not exist.`)
    }
  }
  return text
}

let blockType = (block) => TYPES[block.trimLeft()[0]]

/**
 * States:
 * - uninitialized
 * - [ code | comment | dialogue | output | prompt | service | workflow ]*
 * - terminated
 */
let Parser = machina.Fsm.extend({
  initialize: function (block, context) {
    this.type = blockType(block)
    this.initialBlock = block
    this.block = block
    this.blockHistory = [{ type: 'init', remainingBlock: block }]
    this.context = context
    this.emitter = this.context.emitter
    this.utils = new Utils(context)
    this.startOfBlock = true
    if (this.type === 'workflow') {
      this.label = this.block.match(/^\s*[<>=~\-@?`]\s*(.+)$/m)[1]
      log.debug('[parser]', 'type workflow', { label: this.label })
      this.block = removeBlockCurrentLine(this.block)
      this.markBlockHistory({ type: 'checkpoint', event: this.label, remainingBlock: this.block })
      log.debug('[parser]', 'type workflow', { historySize: this.blockHistory.length })
    }
  },

  toString: function () {
    return JSON.stringify({ type: this.type, block: this.block })
  },

  initialState: 'uninitialized',

  states: {
    uninitialized: {},

    comment: {
      _onEnter: function () {
        this.block = removeBlockLinesOfType(this.block, '#')
        this.next()
      }
    },

    dialogue: {
      _onEnter: function () {
        this.activators(true) // preload
        this.block = removeBlockLinesOfType(this.block, '>')
        this.markBlockHistory({ type: 'dialogue', event: 'removeBlockLinesOfType', remainingBlock: this.block })
        this.block = ensureNextActionWillBeHandled(this.block)
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
        let message = this.utils.interpolateLists(this.utils.random(responseCandidates))
        try {
          message = message.replace(/`([^`]*)`/g, (m, script) =>
            this.utils.evalCode(this, this.utils.interpolateVariables(script))
          )
          if (message) {
            this.utils.say(message)
          }
        } catch (e) {
          log.warn('[parser]', 'Error while running script', e)
        }

        // trigger the next instruction
        this.block = removeBlockLinesOfType(this.block, '<')
        this.markBlockHistory({ type: 'output', event: 'removeBlockLinesOfType', remainingBlock: this.block })
        this.next()
      }
    },

    prompt: {
      _onEnter: function () {
        let list = this.block.match(/^\s*\?\s*\[([^\]]+)\]/m)[1]
        let replies = this.context.lists.get(list)
        if (!replies) throw new Error(`List undefined: '${list}'`)
        log.info('[parser]', chalk.dim('smart replies:'), replies.value.map(s => `[${s}]`).join(chalk.dim(', ')))
        this.emitter.emit('smart-replies', replies.value)

        // trigger the next instruction
        this.block = removeBlockCurrentLine(this.block)
        this.markBlockHistory({ type: 'prompt', event: 'removeBlockCurrentLine', remainingBlock: this.block })
        this.block = ensureNextActionWillBeHandled(this.block)
        this.next()
      }
    },

    service: {
      _onEnter: function () {
        let [label, value, output] = this.line.match(/^(\w+)\s*\(([^)]*)\)(\.[.\w[\]]+)?\s*$/i).slice(1) // eslint-disable-line no-unused-vars

        // Case 1. Trigger
        if (label === 'trigger') {
          this.line.replace(/^trigger\('([^']+)'(?:\s*,\s*(.*))?\)$/m, (match, eventName, value) => {
            try { value = JSON.parse(value) } catch (e) {}

            if (value) value = this.utils.interpolateVariables(value)
            value = value || this.context.variables.get('$')

            this.emitter.emit(eventName, value)
          })
          this.block = removeBlockCurrentLine(this.block)
          this.markBlockHistory({ type: 'service', event: 'removeBlockCurrentLine', remainingBlock: this.block })
          this.block = ensureNextActionWillBeHandled(this.block)
          this.next()

        // Case 2. Service
        } else if (this.context.services.has(label)) {
          try {
            const result = this.utils.service(label, output)
            log.debug('[parser]', JSON.stringify(result))
            this.block = removeBlockCurrentLine(this.block)
            this.markBlockHistory({ type: 'service', event: 'removeBlockCurrentLine', remainingBlock: this.block })
            this.block = ensureNextActionWillBeHandled(this.block)
            this.next()
          } catch (error) {
            log.warn('[parser]', `Error while executing service '${label}'`, error)
            throw error
          }
        } else {
          throw Error(`'Unknown service: ${label}'`)
        }
      }
    },

    workflow: {
      _onEnter: function () {
        if (isReferencingWorkflow(this.block)) {
          // const workflowName = referencingWorkflowName(this.block)
          // case: ~ [workflow_ref]
          this.markBlockHistory({ type: 'subworkflow', event: 'before:interpolatingReferencingWorkflow', remainingBlock: this.block })
          this.block = interpolateReferencingWorkflow(this.context, this.block)
          this.markBlockHistory({ type: 'subworkflow', event: 'after:interpolatingReferencingWorkflow', remainingBlock: this.block })
        } else if (isCheckpoint(this.block)) {
          // case: ~ checkpoint
          const checkpoint = checkpointName(this.block)
          this.markBlockHistory({ type: 'checkpoint', event: checkpoint, remainingBlock: this.block })
          this.block = removeBlockCurrentLine(this.block)
        } else {
          throw Error(`Malformed workflow definition: ${this.line}`)
        }

        // trigger the next instruction
        delete this.startOfBlock
        this.next()
      }
    },

    code: {
      _onEnter: function () {
        const result = this.utils.evalCode(this, this.utils.interpolateVariables(this.line))
        if (this.handleBreakingReturnCode(result)) {
          log.debug('[parser]', 'stopped by breaking return code', result)
          return
        }

        this.context.variables.set('$', result)

        this.block = removeBlockCurrentLine(this.block)
        this.markBlockHistory({ type: 'code', event: 'removeBlockCurrentLine', remainingBlock: this.block })
        this.block = ensureNextActionWillBeHandled(this.block)
        this.next()
      }
    },

    codeBlock: {
      _onEnter: function () {
        const result = this.utils.evalCode(this, this.utils.interpolateVariables(this.line), false)
        if (this.handleBreakingReturnCode(result)) {
          log.debug('[parser]', 'stopped by breaking return code', result)
          return
        }

        this.context.variables.set('$', result)

        this.block = this.block.replace(/^\s*```\s*\n(([^\n]*\n)+)\s*```\s*\n/, '')
        this.markBlockHistory({ type: 'code', event: 'removeCodeBlock', remainingBlock: this.block })
        this.block = ensureNextActionWillBeHandled(this.block)
        this.next()
      }
    },

    terminated: {
      _onEnter: () => log.debug('[parser]', 'End of block')
    }
  },

  next: function (process = true) {
    this.deferUntilTransition()

    // 1. Use the current line type as current state
    let type = blockType(this.block) || 'terminated'

    // 2. Store the first line stripped from its symbol
    if (type !== 'terminated') {
      // special case: the inner block script
      if (/^\s*```\s*\n/.test(this.block)) {
        type = 'codeBlock'
        this.line = this.block.match(/^\s*```\s*\n(([^\n]*\n)+)\s*```\s*\n/)[1].trim()
      } else {
        // general case
        this.line = this.block.match(/^\s*[#<>=~\-@?`]\s*(.+)$/m)[1].trim()
      }
    }

    if (!process) delete this.startOfBlock

    // 3. Transition to the identified state
    this.transition(type)

    delete this.startOfBlock
  },

  markBlockHistory: function ({ type, event, remainingBlock }) {
    log.debug('[parser]', 'mark block history', type, event)
    this.blockHistory.push({ type, event, remainingBlock })
  },

  handleBreakingReturnCode (code) {
    switch (true) {
      case code === '<STOP>':
        return true
      case code === '<MANUAL>':
        this.next()
        return true
      case /^<GOTO:-?\d+>$/.test(code):
        const steps = code.match(/^<GOTO:(-?\d+)>$/)[1]
        this.goto(steps)
        return true
    }
    return false
  },

  // checkpointNameOrSteps: either a checkpoint name or the number of steps we want to go back/forth in history
  goto: function (checkpointNameOrSteps) {
    log.info('[parser]', 'goto checkpoint', checkpointNameOrSteps)
    log.debug({ history: this.blockHistory })

    // let checkpoint
    if (isNaN(checkpointNameOrSteps)) {
      const checkpointName = checkpointNameOrSteps
      // context.parser.goto('ask-for-email')
      this.block = `~ [${checkpointName}]`
      this.next()

      /*
      checkpoint = this.blockHistory.reverse().find(e => e.type === 'checkpoint' && e.event === checkpointName)

      if (checkpoint) {
        log.info('[parser]', 'Found checkpoint', checkpointName)
        // reset the block
        this.block = checkpoint.remainingBlock
        // reset the blockHistory
        for (let i = 0; i <= this.blockHistory.length; i++) {
          if (this.blockHistory[i] === checkpoint) {
            this.blockHistory = this.blockHistory.slice(0, i)
          }
        }
        // continue with the parsing
        this.next()
      } else {
        log.warn('[parser]', 'Could not find checkpoint', checkpointName)
      }
      */
    } else {
      const steps = checkpointNameOrSteps
      if (steps >= 0) {
        log.error('[parser]', `Cannot goto +${steps} with the current botml implementation`)
        return
      }
      // reset the blockHistory
      log.trace('[parser]', 'blockHistory:before', this.blockHistory)
      log.trace('[parser]', 'block:before', this.block)
      this.blockHistory = this.blockHistory.reverse().slice(0, Math.max(this.blockHistory - 1, -steps)).reverse()
      this.block = this.blockHistory[this.blockHistory.length - 1].remainingBlock
      log.trace('[parser]', 'block:after', this.block)
      log.trace('[parser]', 'blockHistory:after', this.blockHistory)
      // continue with the parsing
      this.next()
    }
  },

  activators: function (forceReloading = false) {
    if (!forceReloading && this._activators) return this._activators
    const isTheFirstLineOfBlockAnActivator = this.block.match(/^\s*>\s*/) !== null
    let _activators = isTheFirstLineOfBlockAnActivator && this.block.match(/(^\s*>.*$\n)+/m)
    if (!_activators) return this._activators || []
    this._activators = _activators && _activators[0].split(/^\s*>\s*/m).filter(s => s)
    this._activators = this._activators.map(a => patternify(a, this.context))
    return this._activators || []
  },

  activable: function () {
    return this.activators() && this.activators().length > 0
  },

  remaining: function () {
    return this.block.length > 0
  }
})

module.exports = Parser
