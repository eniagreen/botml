const { context } = require('./context');

RegExp.quote = (str = '') => {
  return str.replace(/[\.\?]/g, "\\$&");
};

module.exports = (raw_pattern) => {
  raw_pattern = RegExp.quote(raw_pattern.trim());
  let pattern;
  // is it already a pattern?
  if (/^\/.+\/$/.test(raw_pattern)) {
    pattern = raw_pattern.match(/^\/(.+)\/$/)[1];
  } else {
    pattern = raw_pattern
      .replace(/\(([^\)]+)\)/g, '(?:$1)?')
      .replace(/#/g,  '(\d+)')
      .replace(/_/g,  '([\\w\\._\\-]+)')
      .replace(/\*/g, '(.*)')
      // lists
      .replace(/\[(\w+)\]/, (m,l) => `(?:${context.lists.get(l.toLowerCase()).value.join('|')})`)
    ;
  }
  return new RegExp(`(?:^|[\\s,;\\—])${pattern}(?!\\w)`, 'ig');
}
