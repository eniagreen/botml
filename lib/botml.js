const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const Block = require('./block')
const { debug, info, inspect, prompt, stats, warn } = require('./utils')
const { context, emitter } = require('./context')
const { execPattern } = require('./pattern')
const { exec } = require('child_process')

let currentDialogue

module.exports = class BotML {
  constructor (files) {
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
    debug(`event ${eventName}`)
    emitter.on(eventName, triggerFn)
  }

  start () {
    emitter.emit('start')

    // Handle the case where one of the workflows must be activated and used by
    // default when the user connects to the bot.
    if (context.workflows.size) {
      let workflow = new Block(Array.from(context.workflows)[0][1].raw)
      debug('Loaded workflow', workflow.label)
      this._handleDialogue(workflow)
    }

    this.prompt()
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
          info(stats())
          break
        case '/inspect':
          info(chalk.bold('variables'), inspect('variables'))
          info(chalk.bold('workflows'), inspect('workflows'))
          break
        case '/activators':
          if (currentDialogue) {
            info(currentDialogue.dialogue.activators.join(' , '))
          }
          context.dialogues.forEach(dialogue =>
            info(dialogue.activators.join(' , '))
          )
          break
        case '/current':
          if (currentDialogue) {
            info(currentDialogue.label, '\n' + currentDialogue.dialogue.raw)
          } else {
            info('No current dialogue.')
          }
          break
        default:
          info('Unknown command')
      }
      return
    }

    let handle = (input, dialogue, label) => {
      dialogue.activators &&
      dialogue.activators.filter(p => p.test(input)).some(pattern => {
        // debug(`match ${label}`, pattern);
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
      warn('No matching dialogue found.')
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
      if (error) warn(error)
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
      let b = new Block(block)
      if (context[`${b.type}s`].has(b.label)) {
        warn(`${b.type} "${b.label}" already set.`)
      }
      context[`${b.type}s`].set(b.label.toLowerCase(), b)
    })
  }

  _handleDialogue (dialogue) {
    if (!currentDialogue) {
      emitter.emit('current-dialogue-start', dialogue.label)
    }

    currentDialogue = {
      label: currentDialogue ? currentDialogue.label : dialogue.label,
      dialogue: new Block(dialogue.raw) // clone
    }

    currentDialogue.dialogue.process()

    if (!currentDialogue.dialogue.remaining()) {
      emitter.emit('current-dialogue-end', currentDialogue.label)
      currentDialogue = undefined
    }

    return context.saidSomething
  }
}
