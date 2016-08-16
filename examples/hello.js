// Prerequisites
let node_version = parseInt(process.versions.node[0]);
if (node_version < 6) return console.error("Node >= 6.0 is needed.");
const chalk = require('chalk');

// Initialization
const BotML = require('../lib/botml');
let bot = new BotML('./examples/hello.bot');

// Capture all events
bot.on('*', (event, ...args) => console.log(chalk.dim('Received event'), event, chalk.dim(JSON.stringify(args))));

// Start the chatbot
bot.start();

// Bonus: gracefull terminate the bot on Ctrl-C
process.on('SIGINT', bot.stop);
