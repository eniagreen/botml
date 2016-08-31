'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

exports.patternify = patternify;
exports.execPattern = execPattern;

var _xregexp = require('xregexp');

var _xregexp2 = _interopRequireDefault(_xregexp);

var _context = require('./context');

var _context2 = _interopRequireDefault(_context);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var BASIC_EXPRESSION_INTERPOLATIONS = [
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
{ search: /\[(\w+)\]/g, replaceWith: function replaceWith(m, l) {
    return '(' + _context2.default.lists.get(l.toLowerCase()).value.join('|') + ')';
  } }];

// XRegExp-ifies a string or already-defined pattern
function patternify(rawPattern) {
  var pattern = void 0;
  _context2.default.patterns.forEach(function (_ref) {
    var label = _ref.label;
    var match = _ref.match;
    var func = _ref.func;

    if (match.test(rawPattern)) {
      pattern = func(rawPattern);
      return;
    }
  });
  if (pattern) return pattern;

  // is it already a pattern?
  if (/^\/.+\/$/m.test(rawPattern)) {
    pattern = rawPattern.toString().match(/^\/(.+)\/$/m)[1];
    return (0, _xregexp2.default)(pattern);
  } else {
    // Nah, it's a basic expression
    pattern = rawPattern.trim();
    // .replace(/\(([^\)]+)\)/g, '(?:$1)?')
    BASIC_EXPRESSION_INTERPOLATIONS.forEach(function (_ref2) {
      var search = _ref2.search;
      var replaceWith = _ref2.replaceWith;

      pattern = pattern.replace(search, replaceWith);
    });
    return (0, _xregexp2.default)('(?:^|[\\s,;—])' + pattern + '(?!\\w)', 'ig');
  }
}

// Execute a XRegExp pattern and formats the captures as output
function execPattern(input, pattern) {
  var captures = !pattern.label ? _xregexp2.default.exec(input, pattern) : pattern.exec(input);
  var keys = (0, _keys2.default)(captures).filter(function (key) {
    return key !== 'index' && key !== 'input';
  });
  captures = keys.map(function (key) {
    return (0, _defineProperty3.default)({}, key.match(/^\d+$/) ? '$' + parseInt(key) : key, captures[key]);
  }).splice(1);
  return captures.length > 0 ? captures.reduce(function (a, b) {
    return (0, _assign2.default)(a, b);
  }) : [];
}