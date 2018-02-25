/* eslint-env mocha */
const { assert } = require('chai')
const { patternify, execPattern } = require('../lib/pattern.js')
const decache = require('decache')
// process.env.debug = false

const TEST_CASES = [{
  file: 'workflows.bot',
  tests: [
    {
      label: 'auto start',
      autostart: true,
      expectedDialogue: toArray`
        < hi
      `
    }, {
      label: 'start workflow from a global activator',
      expectedDialogue: toArray`
        > start workflow from a global activator
        < step 1
        < step 2
      `
    }, {
      label: 'start workflow from a workflow activator',
      expectedDialogue: toArray`
        > start workflow from a workflow activator
        < step 1
        < step 2
      `
    }, {
      label: 'do not start a workflow from an invalid activator',
      expectedDialogue: toArray`
        > something else
        < catch
      `
    }, {
      label: 'complete a workflow',
      expectedDialogue: toArray`
        > start workflow from a workflow activator
        < step 1
        < step 2
        > whatever
        < step 3
        > this
        < step 4
        < step 5
        < step 6
      `
    }
  ]
}]

function toArray (text) {
  return text.toString().split(/\n/).map(l => l.trim()).filter(l => l)
}

describe('Workflows', function () {
  TEST_CASES.forEach(testCase => {
    describe(testCase.file, () => {
      testCase.tests.forEach(test => {
        it(test.label, () => {
          decache('../lib/botml')
          const Botml = require('../lib/botml')
          let bot = new Botml(`./test/mocks/${testCase.file}`)
          process.on('SIGINT', bot.stop)
          const dialogue = []
          bot.on('reply', reply => {
            dialogue.push(`< ${reply}`)
          })
          if (test.autostart) bot.start()
          const expectedDialogue = test.expectedDialogue
          const inputSequence = expectedDialogue.filter(l => l.match(/^>/)).map(l => l.replace(/^>\s*/, ''))
          inputSequence.forEach(input => {
            dialogue.push(`> ${input}`)
            bot.send(input)
          })
          assert.deepEqual(dialogue.map(l => l.toLowerCase()), expectedDialogue.map(l => l.toLowerCase()))
        })
      })
    })
  })
})
