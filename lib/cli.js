#!/usr/bin/env node
'use strict';

var _botml = require('./botml');

var _botml2 = _interopRequireDefault(_botml);

var _utils = require('./utils');

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var argv = require('yargs').locale('en').usage('Usage: $0 [OPTIONS] [files...]\n       $0 [ --help | -v | --version ]').showHelpOnFail(false, 'Specify --help for available options').option('voice', { default: true, describe: 'OSX only: enable text-to-speech' }).boolean('voice').option('debug', { default: false, describe: 'Show debugging information' }).boolean('debug').help().alias('h', 'help').version().alias('v', 'version').example('$0 --voice=false alice.bot').argv;

if (argv.voice) process.env.enableVoice = true;
if (argv.debug) process.env.debug = true;

console.log(_chalk2.default.bold('BotML interactive console'));

var bot = new _botml2.default();
var files = argv._;
if (files.length === 0) {
  console.log(_chalk2.default.dim('No .bot files defined. Loading the hello.bot example. Say hi!'));
  files = ['./examples/hello.bot'];
}
bot.load(files);

function exitHandler(_ref, err) {
  var sayBye = _ref.sayBye;
  var exit = _ref.exit;

  if (sayBye) (0, _utils.say)('Bye!');
  if (err) console.error(err.stack);
  if (exit) bot.stop();
}
process.on('exit', exitHandler.bind(null, { sayBye: true }));
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

bot.start();