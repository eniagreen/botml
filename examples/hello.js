// Prerequisites
const chalk = require('chalk')

// Initialization
const Botml = require('../lib/botml')
let bot = new Botml('./examples/hello.bot')

// Capture all events
// eslint-disable-next-line no-console
bot.on('*', (event, ...args) => console.log(chalk.dim('Received event'), event, chalk.dim(JSON.stringify(args))))
// Start the chatbot
bot.start()

// Bonus: gracefull terminate the bot on Ctrl-C
process.on('SIGINT', bot.stop)
