const chalk = require('chalk')

function inspectArgs (args) {
  return args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' | ')
}

function debug (...args) {
  if (process.env.debug) console.log(chalk.dim(`DEBUG: ${inspectArgs(args)}`))
}

function info (...args) {
  console.log(chalk.dim(`INFO: ${inspectArgs(args)}`))
}

function warn (...args) {
  console.log(chalk.dim(`${chalk.red('WARN:')} ${inspectArgs(args)}`))
}

module.exports = {
  debug,
  info,
  warn
}
