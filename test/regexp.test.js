/* eslint-env mocha */
const assert = require('chai').assert
const { patternify, execPattern } = require('../lib/pattern.js')
const Context = require('../lib/context.js')

const INPUT_TEXT = 'I would like to buy 10 potatoes'

let tests = [
  // part of sentence
  { pattern: /like/, shouldMatch: true },
  // named variables
  { pattern: '/^I would (?<verb>.+) to/', shouldMatch: true, captures: { '$1': 'like', verb: 'like' } },
  // captures
  { pattern: '/^I (.*) to (.*) (\\d+) (?<what>.*)/', shouldMatch: true, captures: { '$1': 'would like', '$2': 'buy', '$3': '10', '$4': 'potatoes', what: 'potatoes' } }
]

describe('Regular expressions', function () {
  tests.forEach(test => {
    describe(`"${test.pattern}"`, () => {
      let pat = patternify(test.pattern, new Context())
      it(`should ${test.shouldMatch ? '' : 'not '}match`, () => {
        if (test.shouldMatch) {
          assert.match(INPUT_TEXT, pat)
        } else {
          assert.notMatch(INPUT_TEXT, pat)
        }
      })
      if (test.captures) {
        it('should have the right captures', () => {
          let captures = execPattern(INPUT_TEXT, pat)
          assert.deepEqual(captures, test.captures)
        })
      }
    })
  })
})
