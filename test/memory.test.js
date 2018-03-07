const Botml = require('../lib/botml')
const { iterate } = require('leakage')

describe('botml', () => {
  it('does not leak when doing stuff', () => {
    iterate(() => {
      const instance = new Botml('../examples/hello.bot')
    })
  })
})