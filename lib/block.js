'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _pattern = require('./pattern');

var _utils = require('./utils');

var _context = require('./context');

var _context2 = _interopRequireDefault(_context);

var _emitter = require('./emitter');

var _emitter2 = _interopRequireDefault(_emitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Block = function () {
  function Block(text) {
    (0, _classCallCheck3.default)(this, Block);

    this._updateText(text);
  }

  (0, _createClass3.default)(Block, [{
    key: '_interpolateReferencingWorkflow',
    value: function _interpolateReferencingWorkflow(text) {
      var isReferencingWorkflow = /^\s*~\s*\[/;
      if (isReferencingWorkflow.test(text)) {
        var workflowRef = text.match(/^\s*~\s*\[([^\]]+)\]\s*$/m)[1];
        var workflow = _context2.default.workflows.get(workflowRef);
        if (workflow) {
          (0, _utils.debug)('_interpolateReferencingWorkflow', workflowRef);
          var lineToReplace = RegExp('^\\s*~\\s*\\[' + workflowRef + '\\]\\s*$', 'm');
          var workflowRawWithoutHeading = workflow.raw.replace(/^\s*~.+$\n/m, '');
          return text.replace(lineToReplace, workflowRawWithoutHeading);
        } else {
          (0, _utils.warn)('The workflow \'' + workflow + '\' does not exist.');
        }
      }
      return text;
    }
  }, {
    key: '_updateText',
    value: function _updateText(text) {
      // if the first line is a reference to a workflow, let's interpolate it
      var oldText = text;
      text = this._interpolateReferencingWorkflow(text);
      var textHasChanged = false;
      if (oldText !== text) textHasChanged = true;
      this.raw = text;
      this.activators = [];
      if (!text) return;
      this.rawType = this.raw.trimLeft()[0];
      this.type = GRAMMAR_TYPES[this.rawType];
      this.label = this.raw.match(/^\s*[<>=~\-@\?]\s*(.+)$/m)[1].trim();
      switch (this.type) {
        case 'dialogue':
          var activators = this.raw.match(/(^\s*>.*$\n)+/m);
          this.activators = activators && activators[0].split(/\s*>\s*/).filter(function (s) {
            return s;
          }).map(_pattern.patternify);
          this.raw = this.raw.replace(/(^\s*>.*$\n)+/m, '');
          this.rawType = this.raw.trimLeft()[0];
          break;
        case 'output':
          if (textHasChanged) this.process();
          break;
        case 'prompt':
          var list = this.raw.match(/^\s*\?\s*\[([^\]]+)\]/m)[1];
          var replies = _context2.default.lists.get(list);
          console.log(_chalk2.default.dim('smart replies:'), replies.value.map(function (s) {
            return '[' + s + ']';
          }).join(_chalk2.default.dim(', ')));
          _emitter2.default.emit('smart-replies', replies.value);
          break;
        case 'list':
          this.value = this.raw.replace(/^\s*=.+$\n\s*\-/m, '').split(/^\s*-\s*/m).map(function (s) {
            return s.trim();
          });
          break;
        case 'service':
          var _service = void 0;
          // Case 1. service definition
          _service = this.label.match(/^(\w+)\s+([^\s]+)\s*$/);
          // Case 2. service consumption
          if (!_service) _service = this.label.match(/^(\w+)\s*\(([^\)]*)\)(\.[\.\w\[\]]+)?\s*$/i);
          // Case 3. code evaluation
          if (!_service) {
            try {
              // let aa = interpolateVariables(this.label)
              // debug('$', aa)
            } catch (e) {
              (0, _utils.debug)('ERROR', e);
            }
          } else {
            this.label = _service[1];
            this.value = _service[2];
            this.output = _service[3];
          }
          break;
        case 'workflow':
          // remove the first line
          //          this.value = this.raw.replace(/^\s*~.+$\n/m, '')
          // // if the current line references another workflow, let's interpolate it
          // this.value = this.raw.replace(/^\s*~\s*\[([^\]]+)\]\s*$/, (m, workflow) => {
          //   let w = context.workflows.get(workflow)
          //   if (w) {
          //     this.raw = w.raw
          //   } else {
          //     warn(`The workflow '${workflow}' does not exist.`)
          //   }
          // })
          // // remove the first line
          // this.value = this.raw.replace(/^\s*~.+$\n/m, '')
          break;
      }
      // debug('updateText', this.label, this.activators, this.split('\n').join('\\'))
    }
  }, {
    key: 'toString',
    value: function toString() {
      return this.value;
    }
  }, {
    key: 'activable',
    value: function activable() {
      return this.activators !== undefined && this.activators.length > 0;
    }
  }, {
    key: 'remaining',
    value: function remaining() {
      return this.raw.length > 0;
    }
  }, {
    key: 'process',
    value: function process() {
      var _this = this;

      (0, _utils.debug)(_chalk2.default.bold('process'), this.rawType, this.raw);

      switch (this.rawType) {
        case '~':
          try {
            // referenced workflow
            var workflowName = this.raw.match(/^\s*~\s*\[([^\]]+)\]/m)[1];
            var workflow = _context2.default.workflows.get(workflowName);
            if (!workflow) throw Error;
          } catch (e) {}
          break;
        case '<':
          var responseCandidates = this.raw.match(/(^\s*<.*$\n?)+/m)[0].split(/\s*<\s*/).filter(function (s) {
            return s;
          }).map(function (s) {
            return s.trim();
          });

          var message = (0, _utils.interpolateLists)((0, _utils.random)(responseCandidates));
          try {
            message = message.replace(/`([^`]*)`/g, function (m, script) {
              return eval((0, _utils.interpolateVariables)(script));
            } // eslint-disable-line no-eval
            );
            if (message) {
              (0, _utils.say)(message);
            }
          } catch (e) {
            (0, _utils.warn)('Error while running script', e);
          }
          // remove all following lines of the bot answering
          this.next();
          return;
        // break
        case '@':
          // Case 1. Trigger
          if (this.label === 'trigger') {
            this.raw.replace(/^\s*@\s*trigger\('([^']+)'(?:\s*,\s*(.*))?\)$/m, function (match, eventName, value) {
              try {
                value = JSON.parse(value);
              } catch (e) {}
              value = value || _context2.default.variables.get('$');
              _emitter2.default.emit(eventName, value);
            });
            // Case 2. Service
          } else if (_context2.default.services.has(this.label)) {
            (0, _utils.service)(this.label, this.output, function (result) {
              (0, _utils.debug)((0, _stringify2.default)(result));
              _this.next();
              _this.process();
            }, function (error) {
              (0, _utils.warn)(error);
            });
            return; // break the loop
          } else {
            (0, _utils.warn)('TODO @');
          }
          break;
        case '>':
        case undefined:
          (0, _utils.warn)('TODO: block#process(' + this.rawType + ')');
          return; // break the loop
        default:
          (0, _utils.warn)('TODO: block#process(' + this.rawType + ')');
      }
      var before = this.raw;
      this.next();
      if (this.activable()) return;
      if (this.raw !== before) {
        this.process();
      } else {
        (0, _utils.warn)('NO CHANGE => STOPPED');
        (0, _utils.debug)(this.raw);
      }
    }
  }, {
    key: 'next',
    value: function next() {
      (0, _utils.debug)(_chalk2.default.bold('next'), 'rawType: ' + this.rawType, this.raw);

      var text = this.raw;
      if (this.rawType === '>' || this.rawType === '<') {
        // remove all following lines of same type
        text = text.replace(RegExp('(^s*' + this.rawType + '.*$\n?)+', 'm'), '');
      } else {
        // remove the current line
        text = text.replace(/^.*$\n?/m, '');
      }
      // text = text.replace(RegExp(`^\s*>.*$\n?`, 'm'), '')
      if (text !== this.raw) {
        this._updateText(text);
        if (this.type === 'service') this.process();
      } else {
        (0, _utils.warn)('text not updated', 'before: ' + this.raw.length, 'after: ' + text.length);
      }
      return this;
      // return new Block(text.trimLeft())
    }
  }]);
  return Block;
}();

exports.default = Block;


var GRAMMAR_TYPES = {
  '>': 'dialogue',
  '<': 'output',
  '?': 'prompt',
  '=': 'list',
  '@': 'service',
  '~': 'workflow'
};