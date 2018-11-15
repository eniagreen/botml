const Botml = require('botml')
const bot = new Botml('https://raw.githubusercontent.com/codename-co/botml/master/examples/hello.bot')
bot.on('start', () => {
  console.log('Bot is ready!')
})
bot.start()
