/* eslint-env mocha */
const { assert } = require('chai')
const Botml = require('../lib/botml')
// process.env.debug = false

function toArray (text) {
  return text.toString().split(/\n/).map(l => l.trim()).filter(l => l)
}

function runDialogueTests (description, testCases) {
  return runCustomTests(description, testCases, (test, bot) => {
    const dialogue = []
    bot.on('reply', reply => {
      dialogue.push(`< ${reply}`)
    })
    if (test.autostart) bot.start(false)
    const expectedDialogue = toArray(test.expectedDialogue)
    const inputSequence = expectedDialogue.filter(l => l.match(/^>/)).map(l => l.replace(/^>\s*/, ''))
    inputSequence.forEach(input => {
      dialogue.push(`> ${input}`)
      bot.send(input)
    })
    assert.deepEqual(dialogue.map(l => l.toLowerCase()), expectedDialogue.map(l => l.toLowerCase()))
  })
}

function runCustomTests (description, testCases, testFunction) {
  describe(description, function () {
    testCases.forEach(testCase => {
      describe(testCase.file, () => {
        testCase.tests.forEach(test => {
          it(test.label, () => {
            let bot = new Botml(`./test/mocks/${testCase.file}`)
            testFunction(test, bot)
          })
        })
      })
    })
  })
}

module.exports = {
  runDialogueTests,
  runCustomTests,
  toArray
}
