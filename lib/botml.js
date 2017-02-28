'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _from = require('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _context = require('./context');

var _context2 = _interopRequireDefault(_context);

var _emitter = require('./emitter');

var _emitter2 = _interopRequireDefault(_emitter);

var _blockParser = require('./blockParser');

var _blockParser2 = _interopRequireDefault(_blockParser);

var _utils = require('./utils');

var _pattern = require('./pattern');

var _child_process = require('child_process');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var currentDialogue = void 0;

var BotML = function () {
  function BotML(files) {
    (0, _classCallCheck3.default)(this, BotML);

    this.context = _context2.default;
    if (files) {
      if (typeof files === 'string') {
        this.load([files]);
      } else {
        this.load(files);
      }
    }
  }

  (0, _createClass3.default)(BotML, [{
    key: 'load',
    value: function load() {
      var _this = this;

      var files = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

      console.time('loaded in');

      files.forEach(function (file) {
        if (file.startsWith('http://') || file.startsWith('https://')) {
          _this._loadURL(file);
        } else if (_fs2.default.lstatSync(file).isDirectory()) {
          _this._loadDirectory(file);
        } else if (file.endsWith('.bot')) {
          _this._loadFile(file);
        }
      });

      process.stdout.write(_chalk2.default.dim((0, _utils.stats)() + ' '));
      console.timeEnd('loaded in');
    }
  }, {
    key: 'on',
    value: function on(eventName, triggerFn) {
      (0, _utils.debug)('event ' + eventName);
      _emitter2.default.on(eventName, triggerFn);
    }
  }, {
    key: 'start',
    value: function start() {
      var withPrompt = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

      _emitter2.default.emit('start');

      // Handle the case where one of the workflows must be activated and used by
      // default when the user connects to the bot.
      if (_context2.default.workflows.size) {
        var workflow = new _blockParser2.default((0, _from2.default)(_context2.default.workflows)[0][1].block);
        (0, _utils.debug)('Loaded workflow', workflow.label);
        this._handleDialogue(workflow);
      }

      if (withPrompt) this.prompt();
    }
  }, {
    key: 'stop',
    value: function stop() {
      _emitter2.default.emit('quit');
      process.exit();
    }
  }, {
    key: 'addPatternCapability',
    value: function addPatternCapability(_ref, func) {
      var label = _ref.label;
      var match = _ref.match;

      _context2.default.patterns.set(label, { label: label, match: match, func: func });
    }
  }, {
    key: 'prompt',
    value: function prompt() {
      var _this2 = this;

      (0, _utils.prompt)(function (input) {
        _this2.send(input);
        _this2.prompt();
      });
    }
  }, {
    key: 'send',
    value: function send(input) {
      var _this3 = this;

      // reset
      _context2.default.saidSomething = false;

      // 1. Check for special commands
      if (input.startsWith('/')) {
        switch (input) {
          case '/quit':
          case '/exit':
            return this.stop();
          case '/stats':
            (0, _utils.info)((0, _utils.stats)());
            break;
          case '/inspect':
            (0, _utils.info)(_chalk2.default.bold('variables'), (0, _utils.inspect)('variables'));
            (0, _utils.info)(_chalk2.default.bold('workflows'), (0, _utils.inspect)('workflows'));
            break;
          case '/block':
            if (currentDialogue) {
              (0, _utils.info)(currentDialogue.dialogue.block);
            }
            break;
          case '/activators':
            (0, _utils.debug)('current dialogue activators:');
            if (currentDialogue) {
              (0, _utils.info)(currentDialogue.dialogue.activators().join(' , '));
            }
            (0, _utils.debug)('global dialogue activators:');
            _context2.default.dialogues.forEach(function (dialogue) {
              (0, _utils.info)(dialogue.activators().join(' , '));
            });
            break;
          case '/current':
            if (currentDialogue) {
              (0, _utils.info)(currentDialogue.label, '\n' + currentDialogue.dialogue.block);
            } else {
              (0, _utils.info)('No current dialogue.');
            }
            break;
          default:
            (0, _utils.info)('Unknown command');
        }
        return;
      }

      var handle = function handle(input, dialogue, label) {
        dialogue.activators() && dialogue.activators().filter(function (p) {
          return RegExp(p.source, p.flags).test(input);
        }).some(function (pattern) {
          // debug(`match ${label}`, pattern);
          _emitter2.default.emit('match', label, pattern.toString());

          // capture variables
          // alpha. remove existing unnamed captures
          _context2.default.variables.forEach(function (variable) {
            if (/^\$\d*$/.test(variable)) {
              _context2.default.variables.delete(variable);
            }
          });

          // named and unnamed captures
          var captures = (0, _pattern.execPattern)(input, pattern);
          _context2.default.variables.set('$', captures['$1']);
          (0, _keys2.default)(captures).forEach(function (varName) {
            _context2.default.variables.set(varName, captures[varName]);
          });

          if (!_context2.default.saidSomething) {
            return _this3._handleDialogue(dialogue);
          }
        });
      };

      // 2. Check for the current ongoing dialogue
      if (!_context2.default.saidSomething) {
        if (currentDialogue) {
          handle(input, currentDialogue.dialogue, currentDialogue.label);
        }
      }
      // 3. Check for a matching dialogue
      if (!_context2.default.saidSomething) {
        _context2.default.dialogues.forEach(function (dialogue, label) {
          return handle(input, dialogue, label);
        });
      }
      // 4. Check for a matching workflow
      if (!_context2.default.saidSomething) {
        _context2.default.workflows.forEach(function (workflow, label) {
          return handle(input, workflow, label);
        });
      }
      // nothing
      if (!_context2.default.saidSomething) {
        (0, _utils.warn)('No matching dialogue found.');
      }
    }

    // async hack

  }, {
    key: 'asyncSend',
    value: function asyncSend(input) {
      return new _promise2.default(function (resolve, reject) {
        var changes = false;
        var handled = false;
        botml.on('reply', function () {
          resolve();
          changes = true;
          handled = true;
          return;
        });
        //botml.on('*', () => {
        //  changes = true
        //})
        botml.send(input);
        // TODO surely there is a better way :p
        setTimeout(function () {
          if (handled) return;
          if (changes) {
            resolve();
          } else {
            reject();
          }
          handled = true;
          return;
        }, 100);
      });
    }

    // Scans a directory recursively looking for .bot files

  }, {
    key: '_loadDirectory',
    value: function _loadDirectory(dir) {
      var _this4 = this;

      _fs2.default.readdirSync(dir).forEach(function (file) {
        file = _path2.default.resolve(dir, file);
        if (_fs2.default.lstatSync(file).isDirectory()) {
          _this4._loadDirectory(file);
        } else if (file.endsWith('.bot')) {
          _this4._loadFile(file);
        }
      });
    }

    // Fetch a .bot file from an URL

  }, {
    key: '_loadURL',
    value: function _loadURL(url) {
      var _this5 = this;

      (0, _child_process.exec)('curl -s --compressed ' + url, function (error, stdout, stderr) {
        if (error) (0, _utils.warn)(error);
        _this5._parse(stdout);
      });
    }

    // Load a .bot file

  }, {
    key: '_loadFile',
    value: function _loadFile(file) {
      if (!file.endsWith('.bot')) return;
      var content = _fs2.default.readFileSync(file).toString();
      this._parse(content);
    }
  }, {
    key: '_parse',
    value: function _parse(content) {
      var blocks = content.replace(/^!\s+BOTML\s+\d\s*/i, '') // remove specification
      .replace(/^#.*$\n/igm, '') // remove comments
      .split(/\n{2,}/) // split blocks by linebreaks
      .filter(function (block) {
        return block;
      }) // remove empty blocks
      .map(function (block) {
        return block.trim();
      }); // trim each of them

      blocks.forEach(function (block) {
        var b = new _blockParser2.default(block);
        if (!b.label) b.label = b.block.match(/^\s*[<>=~\-@\?]\s*(.+)$/m)[1];
        switch (b.type) {
          case 'service':
            b.value = b.label.match(/^(\w+)\s+([^\s]+)\s*$/)[2];
            b.label = b.label.match(/^(\w+)\s+([^\s]+)\s*$/)[1];
            break;
          case 'list':
            b.value = b.block.replace(/^\s*=.+$\n\s*\-/m, '').split(/^\s*-\s*/m).map(function (s) {
              return s.trim();
            });
            break;
        }
        if (_context2.default[b.type + 's'].has(b.label)) {
          (0, _utils.warn)(b.type + ' "' + b.label + '" already set.');
        }
        _context2.default[b.type + 's'].set(b.label, b);
      });
    }
  }, {
    key: '_handleDialogue',
    value: function _handleDialogue(dialogue) {
      if (!currentDialogue) {
        _emitter2.default.emit('current-dialogue-start', dialogue.label);
      }

      currentDialogue = {
        label: currentDialogue ? currentDialogue.label : dialogue.label,
        dialogue: new _blockParser2.default(dialogue.block) // clone
      };
      currentDialogue.dialogue.next();

      if (!currentDialogue.dialogue.remaining()) {
        _emitter2.default.emit('current-dialogue-end', currentDialogue.label);
        currentDialogue = undefined;
      }

      return _context2.default.saidSomething;
    }
  }]);
  return BotML;
}();

// export const version = require('../package.json').version

exports['default'] = BotML;
module.exports = exports['default'];