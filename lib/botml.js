const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const Context = require('./context')
const Emitter = require('./emitter')
const Parser = require('./blockParser')
const log = require('./log')
const Utils = require('./utils')
const { execPattern } = require('./pattern')
const { exec } = require('child_process')

class BotML {
  constructor (files) {
    this.emitter = new Emitter()
    this.context = new Context(this.emitter)

    this.utils = new Utils(this.context)
    this.currentDialogue = undefined

    if (files) {
      if (typeof (files) === 'string') {
        this.load([ files ])
      } else {
        this.load(files)
      }
    }
  }

  load (files = []) {
    console.time('loaded in')

    files.forEach(file => {
      if (file.startsWith('http://') || file.startsWith('https://')) {
        this._loadURL(file)
      } else if (fs.lstatSync(file).isDirectory()) {
        this._loadDirectory(file)
      } else if (file.endsWith('.bot')) {
        this._loadFile(file)
      }
    })

    process.stdout.write(chalk.dim(`${this.utils.stats()} `))
    console.timeEnd('loaded in')
  }

  on (eventName, triggerFn) {
    log.debug(`event ${eventName}`)
    this.emitter.on(eventName, triggerFn)
  }

  start (withPrompt = true) {
    this.emitter.emit('start')

    // Handle the case where one of the workflows must be activated and used by
    // default when the user connects to the bot.
    if (this.context.workflows.size) {
      let workflow = new Parser(Array.from(this.context.workflows)[0][1].block, this.context)
      log.debug('Loaded workflow', workflow.label)
      this._handleDialogue(workflow)
    }

    if (withPrompt) this.prompt()
  }

  stop () {
    this.emitter.emit('quit')
    process.exit()
  }

  addPatternCapability ({ label, match }, func) {
    this.context.patterns.set(label, { label, match, func })
  }

  prompt () {
    this.utils.prompt(input => {
      this.send(input)
      this.prompt()
    })
  }

  send (input) {
    // reset
    this.context.saidSomething = false

    // 1. Check for special commands
    if (input.startsWith('/')) {
      switch (input) {
        case '/quit':
        case '/exit':
          return this.stop()
        case '/stats':
          log.info(this.utils.stats())
          this.emitter.emit('debug', this.utils.stats())
          break
        case '/inspect':
          const variables = JSON.stringify(this.context.variables)
          log.info(chalk.bold('variables'), variables)
          this.emitter.emit('debug', { variables })
          const workflows = JSON.stringify(this.context.workflows)
          log.info(chalk.bold('workflows'), workflows)
          this.emitter.emit('debug', { workflows })
          break
        case '/block':
          if (this.currentDialogue) {
            const block = this.currentDialogue.dialogue.block
            log.info(block)
            this.emitter.emit('debug', { block })
          }
          break
        case '/activators':
          log.debug('current dialogue activators:')
          const localActivators = this.currentDialogue ? this.currentDialogue.dialogue.activators() : undefined
          if (localActivators) {
            log.info(localActivators.join(' , '))
          } else {
            log.info('no local activators')
          }
          log.debug('global dialogue activators:')
          const dialogueActivators = Object.keys(this.context.dialogues).map(k => this.context.dialogues[k].activators())
          dialogueActivators.forEach(activators => {
            log.info(activators.join(' , '))
          })
          // log.debug('global workflow activators:')
          // const workflowActivators = Object.keys(this.context.workflows).map(k => this.context.workflows[k].activators())
          // workflowActivators.forEach(activators => {
          //   log.info(activators.join(' , '))
          // })
          this.emitter.emit('debug', { localActivators, dialogueActivators }) // , workflowActivators
          break
        case '/current':
          if (this.currentDialogue) {
            log.info(this.currentDialogue.label, '\n' + this.currentDialogue.dialogue.block)
            this.emitter.emit('debug', { currentDialogue: this.currentDialogue })
          } else {
            log.info('No current dialogue.')
          }
          break
        default:
          log.info('Unknown command')
      }
      return
    }

    let handle = (input, dialogue, label) => {
      dialogue.activators() &&
      dialogue.activators().filter(p => RegExp(p.source, p.flags).test(input)).some(pattern => {
        // log.debug(`match ${label}`, pattern);
        this.emitter.emit('match', label, pattern.toString())

        // capture variables
        // alpha. remove existing unnamed captures
        this.context.variables.forEach(variable => {
          if (/^\$\d*$/.test(variable)) {
            this.context.variables.delete(variable)
          }
        })

        // named and unnamed captures
        let captures = execPattern(input, pattern)
        this.context.variables.set('$', captures['$1'])
        Object.keys(captures).forEach(varName => {
          this.context.variables.set(varName, captures[varName])
        })

        if (!this.context.saidSomething) {
          return this._handleDialogue(dialogue)
        }
      })
    }

    // 2. Check for the current ongoing dialogue
    if (!this.context.saidSomething) {
      if (this.currentDialogue) {
        handle(input, this.currentDialogue.dialogue, this.currentDialogue.label)
      }
    }
    // 3. Check for a matching dialogue
    if (!this.context.saidSomething) {
      this.context.dialogues.forEach((dialogue, label) =>
        handle(input, dialogue, label)
      )
    }
    // 4. Check for a matching workflow
    if (!this.context.saidSomething) {
      this.context.workflows.forEach((workflow, label) =>
        handle(input, workflow, label)
      )
    }
    // nothing
    if (!this.context.saidSomething) {
      log.warn('No matching dialogue found.')
    }
  }

  // Scans a directory recursively looking for .bot files
  _loadDirectory (dir) {
    fs.readdirSync(dir).forEach(file => {
      file = path.resolve(dir, file)
      if (fs.lstatSync(file).isDirectory()) {
        this._loadDirectory(file)
      } else if (file.endsWith('.bot')) {
        this._loadFile(file)
      }
    })
  }

  // Fetch a .bot file from an URL
  _loadURL (url) {
    exec(`curl -s --compressed ${url}`, (error, stdout, stderr) => {
      if (error) log.warn(error)
      this._parse(stdout)
    })
  }

  // Load a .bot file
  _loadFile (file) {
    if (!file.endsWith('.bot')) return
    let content = fs.readFileSync(file).toString()
    this._parse(content)
  }

  _parse (content) {
    let blocks = content
      // remove specification
      .replace(/^!\s+BOTML\s+\d\s*/i, '')
      // remove comments
      .replace(/^#.*$\n/igm, '')
      // split blocks by linebreaks
      .split(/\n{2,}/)
      // remove empty blocks
      .filter(block => block)
      // trim each of them
      .map(block => block.trim())

    blocks.forEach(block => {
      let b = new Parser(block, this.context)
      if (!b.label) b.label = b.block.match(/^\s*[<>=~\-@?`]\s*(.+)$/m)[1]
      switch (b.type) {
        case 'service':
          b.value = b.label.match(/^(\w+)\s+([^\s]+)\s*$/)[2]
          b.label = b.label.match(/^(\w+)\s+([^\s]+)\s*$/)[1]
          break
        case 'list':
          b.value = b.block
            .replace(/^\s*=.+$\n\s*-/m, '')
            .split(/^\s*-\s*/m).map(s => s.trim())
          break
      }

      if (this.context[`${b.type}s`].has(b.label)) {
        log.warn(`${b.type} "${b.label}" already set.`)
      }
      this.context[`${b.type}s`].set(b.label, b)
    })
  }

  _handleDialogue (dialogue) {
    if (!this.currentDialogue) {
      this.emitter.emit('current-dialogue-start', dialogue.label)
    }

    this.currentDialogue = {
      label: this.currentDialogue ? this.currentDialogue.label : dialogue.label,
      dialogue: new Parser(dialogue.block, this.context) // clone
    }
    this.currentDialogue.dialogue.next()

    if (!this.currentDialogue.dialogue.remaining()) {
      this.emitter.emit('current-dialogue-end', this.currentDialogue.label)
      this.currentDialogue = undefined
    }

    return this.context.saidSomething
  }
}

// export const version = require('../package.json').version

exports['default'] = BotML
module.exports = exports['default']
