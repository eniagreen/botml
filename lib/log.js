const chalk = require('chalk')

function stringify (arg) {
  if (typeof arg !== 'object') return arg
  return arg.block ? arg.toString() : JSON.stringify(arg)
}

function inspectArgs (args) {
  return args.map(stringify).join(' ')
}

function debug (...args) {
  if (process.env.debug) console.log(chalk.dim(`DEBUG: ${inspectArgs(args)}`)) // eslint-disable-line no-console
}

function error (...args) {
  console.error(...args) // eslint-disable-line no-console
}

function info (...args) {
  console.log(chalk.dim(`INFO:  ${inspectArgs(args)}`)) // eslint-disable-line no-console
}

function trace (...args) {
  if (process.env.debug) console.log(chalk.dim(chalk.grey(`TRACE: ${inspectArgs(args)}`))) // eslint-disable-line no-console
}

function warn (...args) {
  console.log(chalk.dim(`${chalk.red('WARN: ')} ${inspectArgs(args)}`)) // eslint-disable-line no-console
}

module.exports = {
  debug,
  error,
  info,
  trace,
  warn
}
