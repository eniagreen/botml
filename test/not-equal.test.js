const { runDialogueTests } = require('./base')

runDialogueTests('not-equal', [{
  file: 'not-equal.bot',
  tests: [
    {
      label: 'case with not equal input',
      autostart: true,
      expectedDialogue: `
        < hello stranger. how are you?
        < howdy?
        > what?
        < I asked you how you are ; please let's start over with another answer?
        < howdy?
        > bad
        < Hmm... bye then...
      `
    }, {
      label: 'case with equal input',
      autostart: true,
      expectedDialogue: `
        < hello stranger. how are you?
        < howdy?
        > great
        < Oh, it is awesome ;)
      `
    }
  ]
}])
