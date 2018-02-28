const { runDialogueTests } = require('./base')

runDialogueTests('dialogues', [{
  file: 'dialogues.bot',
  tests: [
    {
      label: 'reacting at the end-of-dialogue triggers another dialogue',
      autostart: true,
      expectedDialogue: `
        < hi
        > yes
        < you chose yes
      `
    },
    {
      label: 'reacting at the end-of-dialogue triggers a workflow',
      autostart: true,
      expectedDialogue: `
        < hi
        > no
        < you chose no
      `
    },
    {
      label: 'reacting at the end-of-dialogue triggers a catch-all',
      autostart: true,
      expectedDialogue: `
        < hi
        > maybe
        < you chose wrong
      `
    }
  ]
}])
