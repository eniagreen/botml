import XRegExp from 'xregexp'
import context from './context'

const BASIC_EXPRESSION_INTERPOLATIONS = [
  // escape characters '.' and '?'
  { search: /[\.\?]/g, replaceWith: '\\$&' },
  // '#{varName}' => '(?<varName> \d[\d\,\.\s]* )'
  { search: /#\{([a-z][\w_]*)\}/g, replaceWith: '(?<$1>\\d[\\d\\,\\.\\s]*)' },
  // '${varName}' => '(?<varName> [a-z]+ )'
  { search: /\$\{([a-z][\w_]*)\}/g, replaceWith: '(?<$1>[a-z]+)' },
  // '*{varName}' => '(?<varName> .* )'
  { search: /\*\{([a-z][\w_]*)\}/g, replaceWith: '(?<$1>.*)' },
  // '#varName' => '(?<varName> \d[\d\,\.\s]* )'
  { search: /#([a-z][\w_]*)/g, replaceWith: '(?<$1>\\d[\\d\\,\\.\\s]*)' },
  // '$varName' => '(?<varName> [a-z]+ )'
  { search: /\$([a-z][\w_]*)/g, replaceWith: '(?<$1>[a-z]+)' },
  // '#' => '(\d+)'
  { search: /(^|[\s,;—])#(?!\w)/g, replaceWith: '$1(\\d+)' },
  // '*' => '(.*)'
  { search: /(^|[\s,;—])\*(?!\w)/g, replaceWith: '$1(.*)' },
  // '[list_name]' => '(?:list_item_1|list_item_2)'
  { search: /\[(\w+)\]/g, replaceWith: (m, l) => `(${context.lists.get(l.toLowerCase()).value.join('|')})` }
]

// XRegExp-ifies a string or already-defined pattern
export function patternify (rawPattern) {
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
    pattern = rawPattern.toString().match(/^\/(.+)\/$/m)[1]
    return XRegExp(pattern)
  } else {
    // Nah, it's a basic expression
    pattern = rawPattern.trim()
    // .replace(/\(([^\)]+)\)/g, '(?:$1)?')
    BASIC_EXPRESSION_INTERPOLATIONS.forEach(({ search, replaceWith }) => {
      pattern = pattern.replace(search, replaceWith)
    })
    return XRegExp(`(?:^|[\\s,;—])${pattern}(?!\\w)`, 'ig')
  }
}

// Execute a XRegExp pattern and formats the captures as output
export function execPattern (input, pattern) {
  let captures = !pattern.label ? XRegExp.exec(input, pattern) : pattern.exec(input)
  let keys = Object.keys(captures).filter(key => key !== 'index' && key !== 'input')
  captures = keys.map(key => ({ [key.match(/^\d+$/) ? `$${parseInt(key)}` : key]: captures[key] })).splice(1)
  return captures.length > 0 ? captures.reduce((a, b) => Object.assign(a, b)) : []
}
