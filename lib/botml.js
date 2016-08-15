const fs = require('fs'),
      path = require('path'),
      chalk = require('chalk'),
      Block = require('./block'),
      pattern = require('./pattern'),
      { debug, info, prompt, random, warn } = require('./utils'),
      { context, stats, inspect } = require('./context');

let currentDialogue;

module.exports = class BotML {
  load(paths = []) {
    console.time("loaded in");

    paths.forEach( path => {
      if (fs.lstatSync(path).isDirectory()) {
        this._loadDirectory(path);
      } else if (path.endsWith('.bot')) {
        this._loadFile(path);
      }
    });

    process.stdout.write(chalk.dim(`${stats()} `));
    console.timeEnd("loaded in");
  }

  start() {
    this.prompt();
  }

  prompt() {
    if (context.workflows.size) {
      let workflow = Array.from(context.workflows)[0][1];
      debug("Loaded workflow", workflow.label);
      workflow.process();
    }
    prompt(input => {
      // 1. Check for special commands
      if (input.startsWith('/')) {
        switch(input) {
          case '/quit':
          case '/exit':
            process.exit();
          case '/stats':
            info(stats());
            return this.prompt();
          case '/inspect':
            info(inspect('variables'));
            return this.prompt();
          case '/activators':
            if (currentDialogue)
              info(currentDialogue.dialogue.activators.join(' , '));
            context.dialogues.forEach( dialogue =>
              info(dialogue.activators.join(' , '))
            );
          case '/current':
            if (currentDialogue) {
              info(currentDialogue.label, '\n'+currentDialogue.dialogue.raw);
            } else {
              info('No current dialogue.')
            }
            return this.prompt();
          default:
            info('Unknown command');
            return this.prompt();
        }
      }

      let handle = (input, dialogue, label) => {
        dialogue.activators &&
        dialogue.activators.filter(p => p.test(input)).some(pattern => {
          debug(`match ${label}`, pattern);

          // capture variables
          // alpha. remove existing unnamed captures
          context.variables.forEach( variable => {
            if (/^\$\d*$/.test(variable))
              context.variables.delete(variable)
          });

          // a. unnamed captures
          let captures = input.match(pattern);
          context.variables.set('$', RegExp.lastParen);
          captures.forEach((capture, index) => {
            context.variables.set(`$${index}`, capture);
          });
          // b. named captures
          /*pattern.source.replace(/([\$#_])\{(\w+)\}/g, (match, type, variable) =>
            // TODO handle types #, _, $, *
            context.variables.set(`$${variable}`, variable)
            // Use https://www.npmjs.com/package/xregexp
          );*/

          return this._handleDialogue(dialogue);
        });
      };

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
        );
      }
      // 4. Check for a matching workflow
      if (!context.saidSomething) {
        context.workflows.forEach((workflow, label) =>
          handle(input, workflow, label)
        );
      }
      // nothing
      if (!context.saidSomething) {
        warn('No matching dialogue found.');
      }
      this.prompt();
    });
  }

  // Scans a directory recursively looking for .bot files
  _loadDirectory(dir) {
    fs.readdirSync(dir).forEach( file => {
      file = path.resolve(dir, file);
      if (fs.lstatSync(file).isDirectory()) {
        this._loadDirectory(file);
      } else if (file.endsWith('.bot')) {
        this._loadFile(file);
      }
    });
  }

  // Load a .bot file
  _loadFile(file) {
    if (!file.endsWith('.bot')) return;
    let content = fs.readFileSync(file).toString();
    this._parse(content);
  }

  _parse(content) {
    let blocks = content
      .replace(/^!\s+BOTML\s+\d\s*/i, '')   // remove specification
      .replace(/^#.*$\n/igm, '')            // remove comments
      .split(/\n{2,}/)                      // split blocks by linebreaks
      .map( block => block.trim() )         // trim each of them
    blocks.forEach( block => {
      let b = new Block(block);
      if (context[`${b.type}s`].has(b.label))
        warn(`${b.type} "${b.label}" already set.`);
      context[`${b.type}s`].set(b.label.toLowerCase(), b);
    });
  }

  _handleDialogue(dialogue) {
    currentDialogue = {
      label: currentDialogue ? currentDialogue.label : dialogue.label,
      dialogue: new Block(dialogue.raw) // clone
    };

    currentDialogue.dialogue.process();

    if (!currentDialogue.dialogue.remaining()) {
      debug("end of dialogue");
      currentDialogue = undefined;
    }

    return context.saidSomething;
  }
}
