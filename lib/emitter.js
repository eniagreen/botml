'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _get4 = require('babel-runtime/helpers/get');

var _get5 = _interopRequireDefault(_get4);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _events = require('events');

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var WatchEmitter = function (_EventEmitter) {
  (0, _inherits3.default)(WatchEmitter, _EventEmitter);

  function WatchEmitter() {
    (0, _classCallCheck3.default)(this, WatchEmitter);
    return (0, _possibleConstructorReturn3.default)(this, (WatchEmitter.__proto__ || (0, _getPrototypeOf2.default)(WatchEmitter)).apply(this, arguments));
  }

  (0, _createClass3.default)(WatchEmitter, [{
    key: 'emit',
    value: function emit(eventName) {
      var _get2, _get3;

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      _utils.debug.apply(undefined, ['emitting', eventName].concat(args));
      (_get2 = (0, _get5.default)(WatchEmitter.prototype.__proto__ || (0, _getPrototypeOf2.default)(WatchEmitter.prototype), 'emit', this)).call.apply(_get2, [this, eventName].concat(args));
      (_get3 = (0, _get5.default)(WatchEmitter.prototype.__proto__ || (0, _getPrototypeOf2.default)(WatchEmitter.prototype), 'emit', this)).call.apply(_get3, [this, '*', eventName].concat(args));
    }
  }]);
  return WatchEmitter;
}(_events.EventEmitter);

var emitter = new WatchEmitter();

exports.default = emitter;