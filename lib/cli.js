#!/usr/bin/env node

const BotML = require('./botml'),
      { say } = require('./utils');

const chalk = require('chalk');
let argv = require('yargs')
  .locale('en')
  .wrap(70)
  .usage(`Usage: $0 [OPTIONS] [files...]
       $0 [ --help | -v | --version ]`)
  .showHelpOnFail(false, 'Specify --help for available options')
  .option('voice', { default: true, describe: "OSX only: enable text-to-speech" })
  .boolean('voice')
  .option('debug', { default: false, describe: "Show debugging information" })
  .boolean('debug')
  .help('help')
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .example('$0 --voice=false ./examples/')
//  .epilog('Copyright 2016')
  .argv;

if (argv.voice) process.env.enableVoice = true;
if (argv.debug) process.env.debug = true;

console.log(chalk.bold("BotML interactive console"));

let botml = new BotML();
let files = argv._;
if (files.length === 0) {
  console.log(chalk.dim('No .bot files defined. Loading the hello.bot example.'));
  files = [ './examples/hello.bot' ];
};
botml.load(files);

function exitHandler (options, err) {
  if (options.sayBye) say('Bye!');
  if (err) console.error(err.stack);
  if (options.exit) process.exit();
}
process.on('exit', exitHandler.bind(null, { sayBye: true }));
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

botml.start();
