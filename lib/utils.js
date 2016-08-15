const chalk = require('chalk'),
      { exec } = require('child_process'),
      { context } = require('./context'),
      request = require('request');

let utils = {
  random: (array) => array[Math.floor(Math.random() * array.length)],

  debug: (...something) => process.env.debug ? console.log(chalk.dim(`DEBUG: ${something.join(' | ')}`)) : false,

  info: (...something) => console.log(chalk.dim(`INFO: ${something.join(' | ')}`)),

  warn: (...something) => console.log(chalk.dim(`${chalk.red('WARN:')} ${something.join(' | ')}`)),

  prompt: (callback) => {
    let stdin = process.stdin,
        stdout = process.stdout;

    context.saidSomething = false;

    stdin.resume();
    stdout.write(chalk.bold('> '));

    stdin.once('data', data => callback(data.toString().trim()) );
  },

  interpolateVariables: (text) => {
    return text.replace(/(\$[\w\d_\-]*)(\.[\.\w\d\[\]]*[\w\d\]])/g, (match, variable, output) => {
      let result = context.variables.get(variable.toLowerCase());
      return eval(`result${output}`);
    }).replace(/(\$[\w\d_\-]*)/g, (match, variable) =>
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
  },

  service: (name, output, onsuccess, onerror) => {
    let url = context.services.get(name).value;
    url = utils.interpolateVariables(url);
    utils.debug("service", name, url);
    request(url, (error, response, body) => {
      if (error) return onerror(error);
      try {
        //utils.debug("BODY", body);
        let result = JSON.parse(body);
        result = output ? eval(`result${output}`) : result;
        context.variables.set('$', result);
        onsuccess(result);
      } catch (e) {
        onerror(e);
      }
    });
  }
};

module.exports = utils;
