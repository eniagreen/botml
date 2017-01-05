'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _get2 = require('babel-runtime/helpers/get');

var _get3 = _interopRequireDefault(_get2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _emitter = require('./emitter');

var _emitter2 = _interopRequireDefault(_emitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var WatchMap = function (_Map) {
  (0, _inherits3.default)(WatchMap, _Map);

  function WatchMap(name) {
    var _ref;

    (0, _classCallCheck3.default)(this, WatchMap);

    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    var _this = (0, _possibleConstructorReturn3.default)(this, (_ref = WatchMap.__proto__ || (0, _getPrototypeOf2.default)(WatchMap)).call.apply(_ref, [this].concat(args)));

    _this.name = name;
    return _this;
  }

  (0, _createClass3.default)(WatchMap, [{
    key: 'set',
    value: function set(key, value) {
      (0, _get3.default)(WatchMap.prototype.__proto__ || (0, _getPrototypeOf2.default)(WatchMap.prototype), 'set', this).call(this, key, value);
      _emitter2.default.emit(this.name + ':set', key, value);
      _emitter2.default.emit(this.name + ':set:' + key, value);
    }
  }]);
  return WatchMap;
}(_map2.default);

var context = {
  dialogues: new _map2.default(),
  lists: new _map2.default(),
  services: new _map2.default(),
  variables: new WatchMap('variable'),
  workflows: new WatchMap('workflow'),
  patterns: new WatchMap('pattern')
};

exports.default = context;