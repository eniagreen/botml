const { context } = require('./context'),
      chunker = require('pos-chunker');

RegExp.quote = (str = '') => {
  return str.replace(/[\.\?]/g, "\\$&");
};

module.exports = (raw_pattern) => {
  let pattern;
  context.patterns.forEach( ({ label, match, func }) => {
    if (match.test(raw_pattern)) {
      pattern = func(raw_pattern);
      return;
    }
  });
  if (pattern) return pattern;

  // is it already a pattern?
  if (/^\/.+\/$/m.test(raw_pattern)) {
    pattern = raw_pattern.match(/^\/(.+)\/$/m)[1];
    return new RegExp(pattern, 'i');
  } else {
    // Nah, it's a basic expression
    pattern = RegExp.quote(raw_pattern.trim())
      .replace(/\(([^\)]+)\)/g, '(?:$1)?')
      .replace(/#/g,  '(\d+)')
      .replace(/_/g,  '([\\w\\._\\-]+)')
      .replace(/\*/g, '(.*)')
      // lists
      .replace(/\[(\w+)\]/, (m,l) => `(?:${context.lists.get(l.toLowerCase()).value.join('|')})`)
    ;
    return new RegExp(`(?:^|[\\s,;\\—])${pattern}(?!\\w)`, 'ig');
  }
}
