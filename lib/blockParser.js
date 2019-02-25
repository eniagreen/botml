const chalk = require('chalk')
const { Fsm } = require('machina')
const XRegExp = require('xregexp')
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
  '#': 'comment',
  '-': 'switch'
}

let removeBlockCurrentLine = (block) =>
  block.replace(/^.*$\n?/m, '')

let removeBlockLinesOfType = (block, type) => type === '<'
  ? block.replace(RegExp(`(^\\s*${type}.*$\\n?(\\s{2}.*\\n)*)+`, 'm'), '')
  : block.replace(RegExp(`(^\\s*${type}.*$\\n?)+`, 'm'), '')

// hacky patch that ensures the next action/line will be handled
// TODO: implement a better solution
let ensureNextActionWillBeHandled = (block) =>
  `# remove me\n${block}`

let isReferencingWorkflow = (text) =>
  /^\s*~\s*\[/.test(text)

let isReferencingCheckpoint = (text, blockHistory) =>
  blockHistory.filter(b => b.type === 'checkpoint' && b.event === getFromBrackets(text)).length &&
  /^\s*~\s*\[/.test(text)

let isCheckpoint = (text) =>
  /^\s*~\s*\w/.test(text)

let getFromBrackets = (text) =>
  text.match(/^\s*~\s*\[([^\]]+)\]\s*$/m) !== null
    ? text.match(/^\s*~\s*\[([^\]]+)\]\s*$/m)[1]
    : false

let checkpointName = (text) =>
  text.match(/^~\s+(\w[\w_-]*)/)[1]

let targetName = (text, name) =>
  text.match(XRegExp(`~ ${name}`)) !== null
    ? text.match(XRegExp(`~ (${name})`))[1]
    : false

let isNotEqual = (text) =>
  /^\s*>.*!\[\s*/.test(text)

let getLastCase = (block) =>
  block.match(/(---\n(\S.+\n?(\s{2})?)+)/g)

let getLastCaseFromSwitchHistory = (history) =>
  getLastCase(history[history.length - 1].remainingBlock)[0]

let getSwitchHistory = (history) =>
  history.filter(bh => bh.event === 'beforeSwitchInit')

function isReferencingJumpTo (blockHistory, block) {
  const switchHistory = getSwitchHistory(blockHistory)
  if (switchHistory.length) {
    const referenceName = getFromBrackets(block)
    const lastCase = getLastCaseFromSwitchHistory(switchHistory)
    const jumpTarget = targetName(lastCase, referenceName)
    return jumpTarget === referenceName
  } else {
    return false
  }
}

function jumpTo (blockHistory, block) {
  const switchHistory = getSwitchHistory(blockHistory)
  const referenceName = getFromBrackets(block)
  return referenceName
    ? getLastCaseFromSwitchHistory(switchHistory).replace(RegExp(`(.*?\n)*?(?:~ ${referenceName})`), '')
    : removeBlockCurrentLine(block)
}

function interpolateReferencingWorkflow (context, text) {
  if (isReferencingWorkflow(text)) {
    let workflowRef = getFromBrackets(text)
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

function loadCheckpoint (text, blockHistory) {
  const checkpointName = getFromBrackets(text)
  let loadedBlock
  blockHistory.map(b => {
    if (b.type === 'checkpoint' && b.event === checkpointName) {
      loadedBlock = removeBlockCurrentLine(b.remainingBlock)
    }
  })
  return loadedBlock
}

let blockType = (block) => TYPES[block.trimLeft()[0]]

/**
 * States:
 * - uninitialized
 * - [ code | comment | dialogue | output | prompt | switch | service | workflow ]*
 * - terminated
 */
let Parser = Fsm.extend({
  initialize: function (block, context, blockHistory = [{ type: 'init', remainingBlock: block }]) {
    this.type = blockType(block)
    this.initialBlock = block
    this.block = block
    this.blockHistory = blockHistory
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
    this.switchModel = {
      switchStatement: false,
      startIteration: false,
      currentCase: 0,
      switchCases: [],
      type: null,
      captureSignType: function (block) {
        const capturedSignType = block.match(XRegExp('(?:---\n {2})([`>])'))[1]
        switch (capturedSignType) {
          case '`':
            this.type = 'code'
            break
          case '>':
            this.type = 'word'
            break
        }
      },
      captureCases: function (block) {
        let capturedCases = block.match(/(---\n( {2}.+\n)*)/g)
        let capturedDefaultCase = getLastCase(block)

        capturedCases.pop()
        capturedCases.push(capturedDefaultCase[0])
        this.switchCases = this.getSwitchCases(block, capturedCases)
        this.switchStatement = true
      },
      getSwitchCases: function (block, cases) {
        return cases.map(c => block.replace(/^\s*---\s*\n(([^\n]*\n)+)\s*---\s*\n(.*\n*)*/, removeBlockCurrentLine(c).trim()))
      },
      validate: function () {
        return this.currentCase <= this.switchCases.length - 1
      },
      reset: function () {
        this.switchStatement = false
        this.startIteration = false
        this.currentCase = 0
        this.switchCases = []
      }
    }
    this.context = Object.assign(this.context, { switchModel: this.switchModel, actionsMapping: this.actionsMapping })
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
        this.activators(true, isNotEqual(this.block.match(/^.*$\n?/m)[0])) // preload

        // Emit dialogue-actions event
        !this.context.switchModel.switchStatement &&
          this.emitter.emit('dialogue-actions', this.actionsMapping({ type: 'dialogue' }))

        // Emit switch-cases event
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
          .match(/(^\s*<.*$\n?(\s{2}(?![<>=~\-@?`]).*\n?)*)+/m)[0]
          .replace(/\n\s*/g, '\\n')
          .split(/\s*<\s*/).filter(s => s).map(s => s.trim())
        let message = this.utils.interpolateLists(this.utils.random(responseCandidates))
        message = message.replace(/`([^`]*)`/g, (m, script) => {
          try {
            return this.utils.evalCode(this, script)
          } catch (e) {
            log.warn('[parser]', 'Error while running script', e, { script })
            return '??'
          }
        })
        if (message) {
          this.utils.say(message)
        }

        // trigger the next instruction
        this.block = removeBlockLinesOfType(this.block, '<')
        this.markBlockHistory({ type: 'output', event: 'removeBlockLinesOfType', remainingBlock: this.block })
        this.next()
      }
    },

    prompt: {
      _onEnter: function () {
        const list = this.block.match(/^\s*\?\s*\[([^\]]+)\]/m)[1]
        const getReplies = this.context.lists.get(list)
        let processedReplies = []

        if (!getReplies) throw new Error(`List undefined: '${list}'`)
        getReplies.value.map(l => {
          (/\[.+\]/.test(l))
            ? processedReplies.push(...this.context.lists.get(l.match(/^\[([^\]]+)\]$/)[1]).value)
            : processedReplies.push(l)
        })

        log.info('[parser]', chalk.dim('smart replies:'), processedReplies.map(s => `[${s}]`).join(chalk.dim(', ')))

        // Emit prompt-actions event
        this.emitter.emit('prompt-actions', this.actionsMapping({ type: 'prompt', names: processedReplies }))
        this.emitter.emit('smart-replies', processedReplies)

        // trigger the next instruction
        this.block = removeBlockCurrentLine(this.block)
        this.markBlockHistory({ type: 'prompt', event: 'removeBlockCurrentLine', remainingBlock: this.block })
        this.block = ensureNextActionWillBeHandled(this.block)
        this.next()
      }
    },

    switch: {
      _onEnter: function () {
        this.context.switchModel.reset()
        this.context.switchModel.captureCases(this.block)
        this.context.switchModel.captureSignType(this.block)

        // Emit switch-actions event
        this.emitter.emit('switch-actions', this.actionsMapping({ type: 'switch' }))

        // trigger the next instruction
        this.markBlockHistory({ type: 'switch', event: 'beforeSwitchInit', remainingBlock: this.block })
        this.block = this.block.replace(/^\s*---\s*\n(([^\n]*\n)+)\s*---\s*\n(.*\n*)*/, this.context.switchModel.switchCases[this.context.switchModel.currentCase++])
        this.markBlockHistory({ type: 'switch', event: 'setFirstCase', remainingBlock: this.block })
        this.next()
      }
    },

    service: {
      _onEnter: async function () {
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
            const result = await this.utils.service(label, output)
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
        if (isReferencingCheckpoint(this.block, this.blockHistory)) {
          // case: ~ [checkpoint]
          this.markBlockHistory({ type: 'checkpoint', event: 'before:loadingReferencingCheckpoint', remainingBlock: this.block })
          this.block = loadCheckpoint(this.block, this.blockHistory)
          this.markBlockHistory({ type: 'checkpoint', event: 'after:loadingReferencingCheckpoint', remainingBlock: this.block })
        } else if (isReferencingJumpTo(this.blockHistory, this.block)) {
          // case: ~ [jumpTo]
          this.markBlockHistory({ type: 'jumpTo', event: 'before:jumpTo', remainingBlock: this.block })
          this.block = jumpTo(this.blockHistory, this.block)
          this.markBlockHistory({ type: 'jumpTo', event: 'after:jumpTo', remainingBlock: this.block })
        } else if (isReferencingWorkflow(this.block)) {
          // const workflowName = getFromBrackets(this.block)
          // case: ~ [workflow_ref]
          this.context.activeCheckpoint = false
          this.markBlockHistory({ type: 'subworkflow', event: 'before:interpolatingReferencingWorkflow', remainingBlock: this.block })
          this.block = interpolateReferencingWorkflow(this.context, this.block)
          this.markBlockHistory({ type: 'subworkflow', event: 'after:interpolatingReferencingWorkflow', remainingBlock: this.block })
        } else if (isCheckpoint(this.block)) {
          // case: ~ checkpoint
          this.context.activeCheckpoint = true
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
        let triggerNext = (type, event) => {
          this.markBlockHistory({ type, event, remainingBlock: this.block })
          this.block = ensureNextActionWillBeHandled(this.block)
          this.next()
        }
        const result = this.utils.evalCode(this, this.line)
        if (this.handleBreakingReturnCode(result)) {
          log.debug('[parser]', 'stopped by breaking return code', result)
          return
        }

        this.context.variables.set('$', result)

        if (this.context.switchModel.type === 'code' && this.context.switchModel.switchStatement && !result) {
          this.block = this.context.switchModel.switchCases[this.context.switchModel.currentCase++]
          if (this.context.switchModel.currentCase <= this.context.switchModel.switchCases.length - 1) {
            // go to next case
            triggerNext('switch', 'code:setNextCase')
          } else {
            // set default case if every cases was checked
            triggerNext('switch', 'code:setDefaultCase')
          }
        } else {
          this.block = removeBlockCurrentLine(this.block)
          // trigger the next instruction
          triggerNext('code', 'removeBlockCurrentLine')
        }
      }
    },

    codeBlock: {
      _onEnter: function () {
        const result = this.utils.evalCode(this, this.line, false)
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

  activators: function (forceReloading = false, notEqual = false) {
    if (this.context.switchModel.startIteration && forceReloading) {
      if (!this.context.switchModel.validate()) {
        this.context.switchModel.reset()
        return []
      }
      this.block = this.context.switchModel.switchCases[this.context.switchModel.currentCase++]
      this.markBlockHistory({ type: 'switch', event: 'word:setNextCase', remainingBlock: this.block })
    }
    if (!forceReloading && this._activators) return this._activators
    const isTheFirstLineOfBlockAnActivator = this.block.match(/^\s*>\s*/) !== null
    let _activators = isTheFirstLineOfBlockAnActivator && this.block.match(/(^\s*>.*$\n)+/m)
    if (!_activators) return this._activators || []
    this._activators = _activators && _activators[0].split(/^\s*>\s*/m).filter(s => s)
    this._activators = this._activators.map(a => patternify(a, this.context, notEqual))
    return this._activators || []
  },

  activable: function () {
    return this.activators() && this.activators().length > 0
  },

  remaining: function () {
    return this.block.length > 0
  },

  actionsMapping: function (actionType) {
    switch (actionType.type) {
      case 'switch':
        const switchNames = this.context.switchModel.switchCases.map(c => {
          const list = c.match(/^> \[(.*)\]/)
          const dialogue = c.match(/^[><`] (.*)$/m)
          if (list !== null) return this.context.lists.get(list[1]).value.join(' | ')
          if (dialogue !== null) return dialogue[1]
        })
        const switchResults = this.context.switchModel.switchCases.map(c => c.match(/^(\w*.*)$/mg).map(i => i.trim()))
        return switchNames.map((a, i) => ({ name: a, type: actionType.type, result: switchResults[i] }))
      case 'dialogue':
        // if '> [list]'
        const block = this.block.trim()
        if (/^\[\w+\]$/.test(block.match(/^> (.*)$/m)[1])) {
          const list = this.context.lists.get(block.match(/^> \[(.*)\]$/m)[1]).block
          const interpolatedList = list.replace(/^- \[.*\]/mg, (match) =>
            this.context.lists.get(match.replace(/- \[(.*)\]/, '$1')).block.replace(/= .*\n/, '')
          )
          return [{
            name: interpolatedList.match(/- (.*)/mg).map(n => n.replace(/- /mg, '')).join(' | '),
            type: actionType.type,
            result: block.match(/^(\w*.*)$/mg).map(i => i.trim())
          }]
        // if '> word'
        } else {
          return [{
            name: block.match(/^> (.*)$/m)[1],
            type: actionType.type,
            result: block.match(/^(\w*.*)$/mg).map(i => i.trim())
          }]
        }
      case 'prompt':
        let dialogueActions = []
        let workflowActions = []
        // check dialogues
        this.context.dialogues.forEach(d => {
          actionType.names.map(n => {
            if (RegExp(`(?:^|[\\s,;—])(?:\\W*)(${d.label === '*' ? '\\' : ''}${d.label})(?:\\W*)(?!\\w)`, 'gi').test(n)) {
              dialogueActions.push({ name: d.label, type: actionType.type, result: d.block.match(/^(\w*.*)$/mg).map(i => i.trim()) })
            }
          })
        })
        // check workflows
        this.context.workflows.forEach(w => {
          let name = w.block.match(/^> .*$/m)
          if (name !== null) {
            name = name[0].replace(/^> /, '')
            actionType.names.map(n => {
              if (RegExp(`(?:^|[\\s,;—])(?:\\W*)(${/^\*/.test(name) ? '\\' : ''}${name})(?:\\W*)(?!\\w)`, 'gi').test(n)) {
                workflowActions.push({ name, workflowName: w.label, type: actionType.type, result: w.block.match(/^(\w*.*)$/mg).map(i => i.trim()) })
              }
            })
          }
        })
        return [...dialogueActions, ...workflowActions]
      // catch all possible actions
      case 'all':
        let allDialogues = []
        let allWorkflows = []
        // catch all dialogues
        this.context.dialogues.forEach(d => {
          allDialogues.push({ name: d.label, type: 'dialogue', result: d.block.match(/^(\w*.*)$/mg).map(i => i.trim()) })
        })
        // catch all workflows
        this.context.workflows.forEach(w => {
          if (w.block.match(/^> /)) {
            allWorkflows.push({ name: w.block.match(/^> (.*)/)[1], workflowName: w.label, type: 'workflow', result: w.block.match(/^(\w*.*)$/mg).map(i => i.trim()) })
          }
        })
        return [...allDialogues, ...allWorkflows]
    }
  }

})

module.exports = Parser
