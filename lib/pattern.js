const { context } = require('./context')

RegExp.quote = (str = '') => {
  return str.replace(/[\.\?]/g, '\\$&')
}

module.exports = (rawPattern) => {
  let pattern
  context.patterns.forEach(({ label, match, func }) => {
    if (match.test(rawPattern)) {
      pattern = func(rawPattern)
      return
    }
  })
  if (pattern) return pattern

  // is it already a pattern?
  if (/^\/.+\/$/m.test(rawPattern)) {
    pattern = rawPattern.match(/^\/(.+)\/$/m)[1]
    return RegExp(pattern, 'i')
  } else {
    // Nah, it's a basic expression
    pattern = RegExp.quote(rawPattern.trim())
      .replace(/\(([^\)]+)\)/g, '(?:$1)?')
      .replace(/#/g, '(\\d+)')
      .replace(/\*/g, '(.*)')
      // lists
      .replace(/\[(\w+)\]/, (m, l) => `(?:${context.lists.get(l.toLowerCase()).value.join('|')})`)

    return RegExp(`(?:^|[\\s,;\\—])${pattern}(?!\\w)`, 'ig')
  }
}
