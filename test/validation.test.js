const { runDialogueTests } = require('./base')

runDialogueTests('validation', [{
  file: 'validation.bot',
  tests: [
    {
      label: 'use code, parser and blockHistory to handle validation scenarios',
      expectedDialogue: `
        > start
        < let's start
        < your email please?
        > no
        < you said: no
        < validation error
        < your email please?
        > I said no
        < you said: I said no
        < validation error
        < your email please?
        > NEVER EVER!
        < you said: NEVER EVER!
        < validation error
        < your email please?
        > user@example.org
        < you said: user@example.org
        < validation ok
        < thank you
        < end of workflow
      `
    }
  ]
}])
