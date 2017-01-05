'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _machina = require('machina');

var _machina2 = _interopRequireDefault(_machina);

var _context = require('./context');

var _context2 = _interopRequireDefault(_context);

var _emitter = require('./emitter');

var _emitter2 = _interopRequireDefault(_emitter);

var _pattern = require('./pattern');

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var TYPES = {
  '>': 'dialogue',
  '<': 'output',
  '?': 'prompt',
  '=': 'list',
  '@': 'service',
  '~': 'workflow'
};

var removeBlockCurrentLine = function removeBlockCurrentLine(block) {
  return block.replace(/^.*$\n?/m, '');
};

var removeBlockLinesOfType = function removeBlockLinesOfType(block, type) {
  return block.replace(RegExp('(^\\s*' + type + '.*$\\n)+', 'm'), '');
};

function interpolateReferencingWorkflow(text) {
  var isReferencingWorkflow = /^\s*~\s*\[/;
  if (isReferencingWorkflow.test(text)) {
    var workflowRef = text.match(/^\s*~\s*\[([^\]]+)\]\s*$/m)[1];
    var workflow = _context2.default.workflows.get(workflowRef);
    if (workflow) {
      (0, _utils.debug)('_interpolateReferencingWorkflow', workflowRef);
      var lineToReplace = RegExp('^\\s*~\\s*\\[' + workflowRef + '\\]\\s*$', 'm');
      var workflowRawWithoutHeading = workflow.block.replace(/^\s*~.+$\n/m, '');
      return text.replace(lineToReplace, workflowRawWithoutHeading);
    } else {
      (0, _utils.warn)('The workflow \'' + workflow + '\' does not exist.');
    }
  }
  return text;
}

var blockType = function blockType(block) {
  return TYPES[block.trimLeft()[0]];
};

/**
 * States:
 * - uninitialized
 * - [ dialogue | output | prompt | service | workflow ]*
 * - terminated
 */
var Parser = _machina2.default.Fsm.extend({
  initialize: function initialize(block) {
    this.type = blockType(block);
    this.block = block;
    this.startOfBlock = true;
    if (this.type === 'workflow') {
      this.label = this.block.match(/^\s*[<>=~\-@\?]\s*(.+)$/m)[1];
      this.block = removeBlockCurrentLine(this.block);
    }
  },

  initialState: 'uninitialized',

  states: {
    uninitialized: {},

    dialogue: {
      _onEnter: function _onEnter() {
        this.activators(true); // preload
        this.block = removeBlockLinesOfType(this.block, '>');
        if (this.startOfBlock) this.next(false);
        delete this.startOfBlock;
      }
    },

    output: {
      _onEnter: function _onEnter() {
        delete this.startOfBlock;

        var responseCandidates = this.block.match(/(^\s*<.*$\n?)+/m)[0].split(/\s*<\s*/).filter(function (s) {
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

        // trigger the next instruction
        this.block = removeBlockLinesOfType(this.block, '<');
        this.next();
      }
    },

    prompt: {
      _onEnter: function _onEnter() {
        var list = this.block.match(/^\s*\?\s*\[([^\]]+)\]/m)[1];
        var replies = _context2.default.lists.get(list);
        if (!replies) throw new Error('List undefined: \'' + list + '\'');
        console.log(_chalk2.default.dim('smart replies:'), replies.value.map(function (s) {
          return '[' + s + ']';
        }).join(_chalk2.default.dim(', ')));
        _emitter2.default.emit('smart-replies', replies.value);

        // trigger the next instruction
        this.block = removeBlockCurrentLine(this.block);
        this.next();
      }
    },

    service: {
      _onEnter: function _onEnter() {
        var _this = this;

        var _line$match$slice = this.line.match(/^(\w+)\s*\(([^\)]*)\)(\.[\.\w\[\]]+)?\s*$/i).slice(1);

        var _line$match$slice2 = (0, _slicedToArray3.default)(_line$match$slice, 3);

        var label = _line$match$slice2[0];
        var value = _line$match$slice2[1];
        var output = _line$match$slice2[2]; // eslint-disable-line no-unused-vars

        // Case 1. Trigger

        if (label === 'trigger') {
          this.line.replace(/^trigger\('([^']+)'(?:\s*,\s*(.*))?\)$/m, function (match, eventName, value) {
            try {
              value = JSON.parse(value);
            } catch (e) {}
            value = value || _context2.default.variables.get('$');
            _emitter2.default.emit(eventName, value);
          });
          this.block = removeBlockCurrentLine(this.block);
          this.next();

          // Case 2. Service
        } else if (_context2.default.services.has(label)) {
          (0, _utils.service)(label, output, function (result) {
            (0, _utils.debug)((0, _stringify2.default)(result));
            _this.block = removeBlockCurrentLine(_this.block);
            _this.next();
          }, function (error) {
            (0, _utils.warn)('Error while executing service \'' + label + '\'', error);
            throw error;
          });
        } else {
          throw Error('\'Unknown service: ' + label + '\'');
        }
      }
    },

    workflow: {
      _onEnter: function _onEnter() {
        this.block = interpolateReferencingWorkflow(this.block);

        // trigger the next instruction
        delete this.startOfBlock;
        this.next();
      }
    },

    terminated: {
      _onEnter: function _onEnter() {
        return (0, _utils.debug)('End of block');
      }
    }
  },

  next: function next() {
    var process = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

    this.deferUntilTransition();

    // 1. Use the current line type as current state
    var type = blockType(this.block) || 'terminated';
    (0, _utils.debug)('next', type);

    // 2. Store the first line stripped from its symbol
    if (type !== 'terminated') {
      this.line = this.block.match(/^\s*[<>=~\-@\?]\s*(.+)$/m)[1].trim();
    }

    if (!process) delete this.startOfBlock;

    // 3. Transition to the identified state
    this.transition(type);

    delete this.startOfBlock;
  },

  activators: function activators() {
    var forceReloading = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

    if (!forceReloading && this._activators) return this._activators;
    var _activators = this.block.match(/(^\s*>.*$\n)+/m);
    if (!_activators) return this._activators || [];
    this._activators = _activators && _activators[0].split(/^\s*>\s*/m).filter(function (s) {
      return s;
    });
    this._activators = this._activators.map(_pattern.patternify);
    return this._activators || [];
  },

  activable: function activable() {
    return this.activators() && this.activators().length > 0;
  },

  remaining: function remaining() {
    return this.block.length > 0;
  }
});

exports.default = Parser;