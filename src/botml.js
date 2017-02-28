import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import context from './context'
import emitter from './emitter'
import Parser from './blockParser'
import { debug, info, inspect, prompt, stats, warn } from './utils'
import { execPattern } from './pattern'
import { exec } from 'child_process'

let currentDialogue

class BotML {
  constructor (files) {
    this.context = context
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

  start (withPrompt = true) {
    emitter.emit('start')

    // Handle the case where one of the workflows must be activated and used by
    // default when the user connects to the bot.
    if (context.workflows.size) {
      let workflow = new Parser(Array.from(context.workflows)[0][1].block)
      debug('Loaded workflow', workflow.label)
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
          info(stats())
          break
        case '/inspect':
          info(chalk.bold('variables'), inspect('variables'))
          info(chalk.bold('workflows'), inspect('workflows'))
          break
        case '/block':
          if (currentDialogue) {
            info(currentDialogue.dialogue.block)
          }
          break
        case '/activators':
          debug('current dialogue activators:')
          if (currentDialogue) {
            info(currentDialogue.dialogue.activators().join(' , '))
          }
          debug('global dialogue activators:')
          context.dialogues.forEach(dialogue => {
            info(dialogue.activators().join(' , '))
          })
          break
        case '/current':
          if (currentDialogue) {
            info(currentDialogue.label, '\n' + currentDialogue.dialogue.block)
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
      dialogue.activators() &&
      dialogue.activators().filter(p => RegExp(p.source, p.flags).test(input)).some(pattern => {
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

  // async hack
  asyncSend (input) {
    return new Promise((resolve, reject) => {
      let changes = false
      let handled = false
      botml.on('reply', () => {
        resolve()
        changes = true
        handled = true
        return
      })
      //botml.on('*', () => {
      //  changes = true
      //})
      botml.send(input)
      // TODO surely there is a better way :p
      setTimeout(() => {
        if (handled) return
        if (changes) {
          resolve()
        } else {
          reject()
        }
        handled = true
        return
      }, 100)
    })
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
      let b = new Parser(block)
      if (!b.label) b.label = b.block.match(/^\s*[<>=~\-@\?]\s*(.+)$/m)[1]
      switch (b.type) {
        case 'service':
          b.value = b.label.match(/^(\w+)\s+([^\s]+)\s*$/)[2]
          b.label = b.label.match(/^(\w+)\s+([^\s]+)\s*$/)[1]
          break
        case 'list':
          b.value = b.block
              .replace(/^\s*=.+$\n\s*\-/m, '')
              .split(/^\s*-\s*/m).map(s => s.trim())
          break
      }
      if (context[`${b.type}s`].has(b.label)) {
        warn(`${b.type} "${b.label}" already set.`)
      }
      context[`${b.type}s`].set(b.label, b)
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
