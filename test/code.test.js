/* eslint-env mocha */
const { assert } = require('chai')
const { runCustomTests, toArray } = require('./base')

runCustomTests('code', [{
  file: 'code.bot',
  tests: [
    {
      label: 'run a code line and play with variables',
      expectedDialogue: `
        > start
        < first name?
        > john
        < last name?
        > doe
        < Ok, I will call you "dear john doe"\\nand what is your email?
        > john@doe.com
        < your email validity: true
      `
    }
  ]
}], (test, bot) => {
  const dialogue = []
  const variables = new Map()
  bot.on('reply', reply => {
    dialogue.push(`< ${reply}`)
  })
  bot.on('setvar', str => {
    const [key, value] = str.split('=')
    let val = value
    if (value && value[0] === '$') {
      if (value.match(/^\$\d*$/) && bot.context.variables.has(val)) {
        val = bot.context.variables.get(val)
      } else if (bot.context.variables.has(value.replace(/^\$/, ''))) {
        val = bot.context.variables.get(value.replace(/^\$/, ''))
      }
    }
    bot.context.variables.set(key, val)
  })
  if (test.autostart) bot.start()
  const expectedDialogue = toArray(test.expectedDialogue)
  const inputSequence = expectedDialogue.filter(l => l.match(/^>/)).map(l => l.replace(/^>\s*/, ''))
  inputSequence.forEach(input => {
    dialogue.push(`> ${input}`)
    bot.send(input)
  })
  assert.deepEqual(dialogue.map(l => l.toLowerCase()), expectedDialogue.map(l => l.toLowerCase()))
})
