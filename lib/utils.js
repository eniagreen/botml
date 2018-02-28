const chalk = require('chalk')
const { exec, execSync } = require('child_process')
const context = require('./context')
const emitter = require('./emitter')
const log = require('./log')

function random (array) {
  return array[Math.floor(Math.random() * array.length)]
}

function prompt (callback) {
  let stdin = process.stdin
  let stdout = process.stdout

  context.saidSomething = false

  stdin.resume()
  stdout.write(chalk.bold('> '))

  stdin.once('data', data => callback(data.toString().trim()))
}

function interpolateVariables (text) {
  return text.replace(/\$([a-z][\w_-]*)(\.[.\w[\]]*[\w\]])/g, (match, variable, output) => {
    // let result = context.variables.get(variable.toLowerCase())
    return eval(`result${output}`) // eslint-disable-line no-eval
  }).replace(/[#$]\{?([a-z][\w_-]*)\}?/g, (match, variable) => {
    return context.variables.get(variable.toLowerCase())
  }).replace(/(\$\d*(?:[\w\d]))/g, (match, variable) => {
    return context.variables.get(variable.toLowerCase())
  })
}

function interpolateLists (text) {
  return text.replace(/\[(\w+)\]/g, (match, listName) => {
    let list = context.lists.get(listName.toLowerCase())
    return list ? random(list.value) : listName
  })
}

function stats () {
  let keys = Object.keys(context)
  return keys.map(key => {
    let size = context[key].size
    return size > 0 ? `${size} ${key}` : undefined
  }).filter(stat => stat !== undefined).join(', ')
}

function say (something) {
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

function _trackServiceVariables (serviceName, props) {
  Object.keys(props).forEach(key => {
    const value = props[key]
    context.variables.set(`last_service_${key}`, value)
    context.variables.set(`service_${serviceName}_${key}`, value)
  })
}

function service (name, output, onsuccess, onerror) {
  let url = context.services.get(name).value
  url = interpolateVariables(url)
  log.debug('service', { name, url, output })
  _trackServiceVariables(name, { name, url, output })
  try {
    let body = execSync(`curl -s --compressed "${url}"`, { timeout: 4000 })
    let result = JSON.parse(body)
    _trackServiceVariables(name, { raw_result: result })
    console.log('service called:', name, { result })
    // eslint-disable-next-line no-eval
    result = output ? eval(`result${output}`) : result
    console.log('service called:', name, { result })
    _trackServiceVariables(name, { result })
    context.variables.set('$', result)
    onsuccess(result)
  } catch (e) {
    onerror(e)
  }
}

function evalCode (code, returns = false) {
  // eslint-disable-next-line no-useless-call
  return ((str, context) => {
    const evaled = returns ? `((context) => (${str}))` : `((context) => {${str}})`
    try {
      // eslint-disable-next-line no-eval, no-useless-call
      return eval(evaled).call(null, context)
    } catch (e) {
      log.warn('Error while running script', e, { evaled })
      return undefined
    }
  }).call(null, code, Object.assign({}, context, { say, service, emit: emitter.emit }))
}

module.exports = {
  random,
  prompt,
  interpolateVariables,
  interpolateLists,
  stats,
  say,
  service,
  evalCode
}
