const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const Context = require('./context')
const emitter = require('./emitter')
const Parser = require('./blockParser')
const log = require('./log')
const { prompt, stats } = require('./utils')
const { execPattern } = require('./pattern')
const { exec } = require('child_process')

let currentDialogue

class BotML {
  constructor (files) {
    this.context = new Context()
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

    process.stdout.write(chalk.dim(`${stats()} `))
    console.timeEnd('loaded in')
  }

  on (eventName, triggerFn) {
    log.debug(`event ${eventName}`)
    emitter.on(eventName, triggerFn)
  }

  start (withPrompt = true) {
    emitter.emit('start')

    // Handle the case where one of the workflows must be activated and used by
    // default when the user connects to the bot.
    if (context.workflows.size) {
      let workflow = new Parser(Array.from(context.workflows)[0][1].block)
      log.debug('Loaded workflow', workflow.label)
      this._handleDialogue(workflow)
    }

    if (withPrompt) this.prompt()
  }

  stop () {
    emitter.emit('quit')
    process.exit()
  }

  addPatternCapability ({ label, match }, func) {
    context.patterns.set(label, { label, match, func })
  }

  prompt () {
    prompt(input => {
      this.send(input)
      this.prompt()
    })
  }

  send (input) {
    // reset
    context.saidSomething = false

    // 1. Check for special commands
    if (input.startsWith('/')) {
      switch (input) {
        case '/quit':
        case '/exit':
          return this.stop()
        case '/stats':
          log.info(stats())
          emitter.emit('debug', stats())
          break
        case '/inspect':
          const variables = JSON.stringify(context.variables)
          log.info(chalk.bold('variables'), variables)
          emitter.emit('debug', { variables })
          const workflows = JSON.stringify(context.workflows)
          log.info(chalk.bold('workflows'), workflows)
          emitter.emit('debug', { workflows })
          break
        case '/block':
          if (currentDialogue) {
            const block = currentDialogue.dialogue.block
            log.info(block)
            emitter.emit('debug', { block })
          }
          break
        case '/activators':
          log.debug('current dialogue activators:')
          const localActivators = currentDialogue ? currentDialogue.dialogue.activators() : undefined
          if (localActivators) {
            log.info(localActivators.join(' , '))
          } else {
            log.info('no local activators')
          }
          log.debug('global dialogue activators:')
          const dialogueActivators = Object.keys(context.dialogues).map(k => context.dialogues[k].activators())
          dialogueActivators.forEach(activators => {
            log.info(activators.join(' , '))
          })
          // log.debug('global workflow activators:')
          // const workflowActivators = Object.keys(context.workflows).map(k => context.workflows[k].activators())
          // workflowActivators.forEach(activators => {
          //   log.info(activators.join(' , '))
          // })
          emitter.emit('debug', { localActivators, dialogueActivators/*, workflowActivators*/ })
          break
        case '/current':
          if (currentDialogue) {
            log.info(currentDialogue.label, '\n' + currentDialogue.dialogue.block)
            emitter.emit('debug', { currentDialogue })
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
        emitter.emit('match', label, pattern.toString())

        // capture variables
        // alpha. remove existing unnamed captures
        context.variables.forEach(variable => {
          if (/^\$\d*$/.test(variable)) {
            context.variables.delete(variable)
          }
        })

        // named and unnamed captures
        let captures = execPattern(input, pattern)
        context.variables.set('$', captures['$1'])
        Object.keys(captures).forEach(varName => {
          context.variables.set(varName, captures[varName])
        })

        if (!context.saidSomething) {
          return this._handleDialogue(dialogue)
        }
      })
    }

    // 2. Check for the current ongoing dialogue
    if (!context.saidSomething) {
      if (currentDialogue) {
        handle(input, currentDialogue.dialogue, currentDialogue.label)
      }
    }
    // 3. Check for a matching dialogue
    if (!context.saidSomething) {
      context.dialogues.forEach((dialogue, label) =>
        handle(input, dialogue, label)
      )
    }
    // 4. Check for a matching workflow
    if (!context.saidSomething) {
      context.workflows.forEach((workflow, label) =>
        handle(input, workflow, label)
      )
    }
    // nothing
    if (!context.saidSomething) {
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
      .replace(/^!\s+BOTML\s+\d\s*/i, '') // remove specification
      .replace(/^#.*$\n/igm, '')          // remove comments
      .split(/\n{2,}/)                    // split blocks by linebreaks
      .filter(block => block)             // remove empty blocks
      .map(block => block.trim())         // trim each of them

    blocks.forEach(block => {
      let b = new Parser(block)
      if (!b.label) b.label = b.block.match(/^\s*[<>=~\-@?]\s*(.+)$/m)[1]
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
    if (!currentDialogue) {
      emitter.emit('current-dialogue-start', dialogue.label)
    }

    currentDialogue = {
      label: currentDialogue ? currentDialogue.label : dialogue.label,
      dialogue: new Parser(dialogue.block) // clone
    }
    currentDialogue.dialogue.next()

    if (!currentDialogue.dialogue.remaining()) {
      emitter.emit('current-dialogue-end', currentDialogue.label)
      currentDialogue = undefined
    }

    return context.saidSomething
  }
}

// export const version = require('../package.json').version

exports['default'] = BotML
module.exports = exports['default']
