const chalk = require('chalk'),
      { exec } = require('child_process'),
      { context } = require('./context');

let utils = {
  random: (array) => array[Math.floor(Math.random() * array.length)],

  debug: (...something) => process.env.debug ? console.log(chalk.dim(`DEBUG: ${something.join(' | ')}`)) : false,

  info: (...something) => console.log(chalk.dim(`INFO: ${something.join(' | ')}`)),

  warn: (message) => console.log(chalk.dim(`${chalk.red('WARN:')} ${message.replace(/TODO/g, () => chalk.underline('TODO'))}`)),

  prompt: (callback) => {
    let stdin = process.stdin,
        stdout = process.stdout;

    context.saidSomething = false;

    stdin.resume();
    stdout.write(chalk.bold('> '));

    stdin.once('data', data => callback(data.toString().trim()) );
  },

  interpolateVariables: (text) => {
    return text.replace(/(\$[\w\d_\-]*)/g, (match, variable) =>
      context.variables.get(variable.toLowerCase())
    )
  },

  interpolateLists: (text) => {
    return text.replace(/\[(\w+)\]/g, (match, listName) => {
      let list = context.lists.get(listName.toLowerCase());
      return list ? utils.random(list.value) : listName;
    });
  },

  say: (something) => {
    // remove "<"
    something = something.replace(/^\s*<\s*/, '');
    // interpolate variables
    something = utils.interpolateVariables(something),
    // interpolate lists
    something = utils.interpolateLists(something),
    // Titleize
    something = something.charAt(0).toUpperCase() + something.slice(1);
    // write
    console.log(chalk.yellow(something));
    context.saidSomething = true;
    // speak
    if (process.env.enableVoice) exec(`say "${something}"`);
  }
};

module.exports = utils;
