const chalk = require('chalk')
const { exec, execSync } = require('child_process')
const log = require('./log')

class Utils {
  constructor (context) {
    this.context = context
    this.emitter = this.context.emitter
  }

  random (array) {
    return array[Math.floor(Math.random() * array.length)]
  }

  prompt (callback) {
    let stdin = process.stdin
    let stdout = process.stdout

    this.context.saidSomething = false

    stdin.resume()
    stdout.write(chalk.bold('> '))

    stdin.once('data', data => callback(data.toString().trim()))
  }

  interpolateVariables (text, { allowUndefined = true } = {}) {
    function prepareResult (value) {
      return !allowUndefined && value === undefined ? '' : value
    }
    return text.replace(/\$([a-z][\w_-]*)(\.[.\w[\]]*[\w\]])/g, (match, variable, output) => {
      // let result = this.context.variables.get(variable.toLowerCase())
      const value = eval(`result${output}`) // eslint-disable-line no-eval
      return prepareResult(value)
    }).replace(/[#$]\{?([a-z][\w_-]*)\}?/g, (match, variable) => {
      const value = this.context.variables.get(variable.toLowerCase())
      return prepareResult(value)
    }).replace(/(\$\d*(?![\w\d]))/g, (match, variable) => {
      const value = this.context.variables.get(variable.toLowerCase())
      return prepareResult(value)
    })
  }

  interpolateLists (text) {
    return text.replace(/\[([\w-]+)\]/g, (match, listName) => {
      let list = this.context.lists.get(listName.toLowerCase())
      return list ? this.random(list.value) : listName
    })
  }

  stats () {
    let keys = Object.keys(this.context)
    return keys.map(key => {
      let size = this.context[key].size
      return size > 0 ? `${size} ${key}` : undefined
    }).filter(stat => stat !== undefined).join(', ')
  }

  say (something) {
    // remove "<"
    something = something.replace(/^\s*<\s*/, '')
    // interpolate variables
    something = this.interpolateVariables(something)
    // interpolate lists
    something = this.interpolateLists(something)
    // Titleize
    something = something.charAt(0).toUpperCase() + something.slice(1)
    // emit the event
    this.emitter.emit('reply', something)
    // write
    log.info('[botml]', chalk.bold(`< ${something}`))
    this.context.saidSomething = true
    // speak
    if (process.env.enableVoice) exec(`say -v Ava "${something}"`)
  }

  _trackServiceVariables (serviceName, props) {
    Object.keys(props).forEach(key => {
      const value = props[key]
      this.context.variables.set(`last_service_${key}`, value)
      this.context.variables.set(`service_${serviceName}_${key}`, value)
    })
  }

  service (name, output) {
    let url = this.context.services.get(name).value
    url = this.interpolateVariables(url, { allowUndefined: false })
    url = encodeURI(url)
    log.debug('[utils]', 'service', { name, url, output })
    this._trackServiceVariables(name, { name, url, output })
    let body = execSync(`curl -s "${url}"`, { timeout: 5000 })
    let result
    try {
      result = JSON.parse(body)
    } catch (err) {
      log.error('[utils]', 'service', { name, url, output })
      throw new Error(`Could not parse the result of the service '${name}'`)
    }
    this._trackServiceVariables(name, { raw_result: result })
    log.debug('[utils]', 'service called:', name, JSON.stringify({ raw_result: result }).slice(0, 120))
    // eslint-disable-next-line no-eval
    result = output ? eval(`result${output}`) : result
    log.debug('[utils]', 'service called:', name, JSON.stringify({ result }).slice(0, 120))
    this._trackServiceVariables(name, { result })
    this.context.variables.set('$', result)
    return result
  }

  evalCode (parser, code, returns = true) {
    // eslint-disable-next-line no-useless-call
    return ((str, context) => {
      const evaled = returns ? `((context) => (${str}))` : `((context) => {${str}})`
      try {
        // eslint-disable-next-line no-eval, no-useless-call
        return eval(evaled).call(null, context)
      } catch (e) {
        log.warn('[utils]', 'evalCode', 'Error while running script', { evaled })
        return undefined
      }
    }).call(null, code, Object.assign({}, this.context, {
      say: m => this.say(m),
      service: this.service,
      emit: this.emitter.emit,
      goto: (...args) => parser.goto(...args),
      parser
    }))
  }
}

module.exports = Utils
