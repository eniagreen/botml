'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.service = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _from = require('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var service = exports.service = function () {
  var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(name, output, onsuccess, onerror) {
    var url;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            url = _context3.default.services.get(name).value;

            url = interpolateVariables(url);
            debug('service', name, url);
            _context.next = 5;
            return (0, _request2.default)(url, function (error, response, body) {
              if (error) return onerror(error);
              try {
                var result = JSON.parse(body);
                result = output ? eval('result' + output) : result; // eslint-disable-line no-eval
                _context3.default.variables.set('$', result);
                onsuccess(result);
              } catch (e) {
                onerror(e);
              }
            });

          case 5:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function service(_x, _x2, _x3, _x4) {
    return _ref.apply(this, arguments);
  };
}();

exports.random = random;
exports.debug = debug;
exports.info = info;
exports.warn = warn;
exports.prompt = prompt;
exports.interpolateVariables = interpolateVariables;
exports.interpolateLists = interpolateLists;
exports.stats = stats;
exports.inspect = inspect;
exports.say = say;

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _child_process = require('child_process');

var _context2 = require('./context');

var _context3 = _interopRequireDefault(_context2);

var _emitter = require('./emitter');

var _emitter2 = _interopRequireDefault(_emitter);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function random(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function debug() {
  for (var _len = arguments.length, something = Array(_len), _key = 0; _key < _len; _key++) {
    something[_key] = arguments[_key];
  }

  process.env.debug ? console.log(_chalk2.default.dim('DEBUG: ' + something.join(' | '))) : false;
}

function info() {
  for (var _len2 = arguments.length, something = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    something[_key2] = arguments[_key2];
  }

  console.log(_chalk2.default.dim('INFO: ' + something.join(' | ')));
}

function warn() {
  for (var _len3 = arguments.length, something = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    something[_key3] = arguments[_key3];
  }

  console.log(_chalk2.default.dim(_chalk2.default.red('WARN:') + ' ' + something.join(' | ')));
}

function prompt(callback) {
  var stdin = process.stdin;
  var stdout = process.stdout;

  _context3.default.saidSomething = false;

  stdin.resume();
  stdout.write(_chalk2.default.bold('> '));

  stdin.once('data', function (data) {
    return callback(data.toString().trim());
  });
}

function interpolateVariables(text) {
  return text.replace(/\$([a-z][\w_\-]*)(\.[\.\w\[\]]*[\w\]])/g, function (match, variable, output) {
    // let result = context.variables.get(variable.toLowerCase())
    return eval('result' + output); // eslint-disable-line no-eval
  }).replace(/[#\$]([a-z][\w_-]*)/g, function (match, variable) {
    return _context3.default.variables.get(variable.toLowerCase());
  }).replace(/(\$\d*)/g, function (match, variable) {
    return _context3.default.variables.get(variable.toLowerCase());
  });
}

function interpolateLists(text) {
  return text.replace(/\[(\w+)\]/g, function (match, listName) {
    var list = _context3.default.lists.get(listName.toLowerCase());
    return list ? random(list.value) : listName;
  });
}

function stats() {
  var keys = (0, _keys2.default)(_context3.default);
  return keys.map(function (key) {
    var size = _context3.default[key].size;
    return size > 0 ? size + ' ' + key : undefined;
  }).filter(function (stat) {
    return stat !== undefined;
  }).join(', ');
}

function inspect(what) {
  return (0, _from2.default)(_context3.default[what]).toString();
}

function say(something) {
  // remove "<"
  something = something.replace(/^\s*<\s*/, '');
  // interpolate variables
  something = interpolateVariables(something);
  // interpolate lists
  something = interpolateLists(something);
  // Titleize
  something = something.charAt(0).toUpperCase() + something.slice(1);
  // emit the even
  _emitter2.default.emit('reply', something);
  // write
  console.log(_chalk2.default.yellow(something));
  _context3.default.saidSomething = true;
  // speak
  if (process.env.enableVoice) (0, _child_process.exec)('say -v Ava "' + something + '"');
}