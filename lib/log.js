const chalk = require('chalk')

function stringify (arg) {
  if (typeof arg !== 'object') return arg
  return arg.block ? arg.toString() : JSON.stringify(arg)
}

function inspectArgs (args) {
  return args.map(stringify).join(' ')
}

function debug (...args) {
  if (process.env.debug) console.log(chalk.dim(`DEBUG: ${inspectArgs(args)}`))
}

function error (...args) {
  console.error(...args)
}

function info (...args) {
  console.log(chalk.dim(`INFO:  ${inspectArgs(args)}`))
}

function trace (...args) {
  if (process.env.debug) console.log(chalk.dim(chalk.grey(`TRACE: ${inspectArgs(args)}`)))
}

function warn (...args) {
  console.log(chalk.dim(`${chalk.red('WARN: ')} ${inspectArgs(args)}`))
}

module.exports = {
  debug,
  error,
  info,
  trace,
  warn
}
