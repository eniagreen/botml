const { context } = require('./context');

module.exports = (raw_pattern) => {
  raw_pattern = raw_pattern.trim();
  let pattern;
  // is it already a pattern?
  if (/^\/.+\/$/.test(raw_pattern)) {
    pattern = raw_pattern.match(/^\/(.+)\/$/)[1];
  } else {
    pattern = raw_pattern
      .replace(/\*/g, '(.*)')
      .replace(/_/g, '(.+)')
      .replace(/#/g, '(\d+)')
      // lists
      .replace(/\[(\w+)\]/, (m,l) => `(?:${context.lists.get(l.toLowerCase()).value.join('|')})`)
    ;
  }
  return new RegExp(`(?:^|[\\s,;\\—])${pattern}(?!\\w)`, 'ig');
}
