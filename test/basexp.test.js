/* eslint-env mocha */
const assert = require('chai').assert
const { patternify, execPattern } = require('../lib/pattern.js')
const Context = require('../lib/context.js')

const INPUT_TEXT = 'I would like to buy 10 potatoes'

let tests = [
  // exact same sentence
  { pattern: INPUT_TEXT, shouldMatch: true },
  // part of sentence
  { pattern: 'would', shouldMatch: true },
  // part of word
  { pattern: 'wou', shouldMatch: false },
  // one of
  { pattern: '(I|You) would like', shouldMatch: true, captures: { '$1': 'I' } },
  // special characters
  { pattern: 'I would like *', shouldMatch: true, captures: { '$1': 'to buy 10 potatoes' } },
  { pattern: 'buy # potatoes', shouldMatch: true, captures: { '$1': '10' } },
  // named variables
  { pattern: 'I would $verb to', shouldMatch: true, captures: { '$1': 'like', verb: 'like' } },
  { pattern: 'I would ${verb} to', shouldMatch: true, captures: { '$1': 'like', verb: 'like' } },
  // captures
  { pattern: 'I * to * # *{what}', shouldMatch: true, captures: { '$1': 'would like', '$2': 'buy', '$3': '10', '$4': 'potatoes', what: 'potatoes' } }
]

describe('Basic expressions', function () {
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
