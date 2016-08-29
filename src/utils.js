import chalk from 'chalk'
import { exec, execSync } from 'child_process'
import context from './context'
import emitter from './emitter'

export function random (array) {
  return array[Math.floor(Math.random() * array.length)]
}

export function debug (...something) {
  process.env.debug ? console.log(chalk.dim(`DEBUG: ${something.join(' | ')}`)) : false
}

export function info (...something) {
  console.log(chalk.dim(`INFO: ${something.join(' | ')}`))
}

export function warn (...something) {
  console.log(chalk.dim(`${chalk.red('WARN:')} ${something.join(' | ')}`))
}

export function prompt (callback) {
  let stdin = process.stdin
  let stdout = process.stdout

  context.saidSomething = false

  stdin.resume()
  stdout.write(chalk.bold('> '))

  stdin.once('data', data => callback(data.toString().trim()))
}

export function interpolateVariables (text) {
  return text.replace(/\$([a-z][\w_\-]*)(\.[\.\w\[\]]*[\w\]])/g, (match, variable, output) => {
    // let result = context.variables.get(variable.toLowerCase())
    return eval(`result${output}`) // eslint-disable-line no-eval
  }).replace(/[#\$]([a-z][\w_-]*)/g, (match, variable) => {
    return context.variables.get(variable.toLowerCase())
  }).replace(/(\$\d*)/g, (match, variable) => {
    return context.variables.get(variable.toLowerCase())
  })
}

export function interpolateLists (text) {
  return text.replace(/\[(\w+)\]/g, (match, listName) => {
    let list = context.lists.get(listName.toLowerCase())
    return list ? random(list.value) : listName
  })
}

export function stats () {
  let keys = Object.keys(context)
  return keys.map(key => {
    let size = context[key].size
    return size > 0 ? `${size} ${key}` : undefined
  }).filter(stat => stat !== undefined).join(', ')
}

export function inspect (what) {
  return Array.from(context[what]).toString()
}

export function say (something) {
  // remove "<"
  something = something.replace(/^\s*<\s*/, '')
  // interpolate variables
  something = interpolateVariables(something)
  // interpolate lists
  something = interpolateLists(something)
  // Titleize
  something = something.charAt(0).toUpperCase() + something.slice(1)
  // emit the even
  emitter.emit('reply', something)
  // write
  console.log(chalk.yellow(something))
  context.saidSomething = true
  // speak
  if (process.env.enableVoice) exec(`say -v Ava "${something}"`)
}

export function service (name, output, onsuccess, onerror) {
  let url = context.services.get(name).value
  url = interpolateVariables(url)
  debug('service', name, url)
  try {
    let body = execSync(`curl -s --compressed ${url}`, { timeout: 1000 })
    let result = JSON.parse(body)
    result = output ? eval(`result${output}`) : result // eslint-disable-line no-eval
    context.variables.set('$', result)
    onsuccess(result)
  } catch (e) {
    onerror(e)
  }
}
