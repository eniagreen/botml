/* eslint-env mocha */
const { assert } = require('chai')
const { patternify, execPattern } = require('../../lib/pattern.js')
const decache = require('decache')

const TEST_CASES = [{
  file: 'references.bot',
  tests: [
    {
      label: 'auto start',
      autostart: true,
      inputSequence: [],
      expectedDialogue: `
        < hi
      `
    }, {
      label: 'reference sub workflows',
      inputSequence: ['test'],
      expectedDialogue: `
        > test
        < main flow
        < sub flow 1
        < sub flow 2
      `
    }
  ]
}]

describe('Workflows', function () {
  TEST_CASES.forEach(testCase => {
    describe(testCase.file, () => {
      testCase.tests.forEach(test => {
        it(test.label, () => {
          decache('../../lib/botml')
          const Botml = require('../../lib/botml')
          let bot = new Botml(`test/workflows/${testCase.file}`)
          process.on('SIGINT', bot.stop)
          const dialogue = []
          bot.on('reply', reply => {
            dialogue.push(`< ${reply}`)
          })
          if (test.autostart) bot.start()
          test.inputSequence.forEach(input => {
            dialogue.push(`> ${input}`)
            bot.send(input)
          })
          assert.equal(dialogue.join('').toLowerCase(), test.expectedDialogue.split(/\n/).filter(l => l).map(l => l.trim()).join(''))
        })
      })
    })
  })
})
