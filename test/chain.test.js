const { runDialogueTests } = require('./base')

runDialogueTests('chaining', [{
  file: 'chain.bot',
  tests: [
    {
      label: 'trigger a simple dialogue (dialogue precedes workflows)',
      expectedDialogue: `
        > 1
        < 2
      `
    },
    {
      label: 'trigger a simple dialogue (dialogue is set after workflows)',
      expectedDialogue: `
        > 3
        < 4
      `
    },
    {
      label: 'chain simple dialogues',
      expectedDialogue: `
        > 1
        < 2
        > 3
        < 4
        > 1
        < 2
      `
    },
    {
      label: 'trigger a workflow twice',
      expectedDialogue: `
        > work
        < flow
        > work
        < flow again
        > work
        < flow
        > work
        < flow again
      `
    },
    {
      label: 'chain dialogues and workflows',
      expectedDialogue: `
        > 1
        < 2
        > work
        < flow
        > 3
        < 4
        > work
        < flow
        > work
        < flow again
        > 1
        < 2
      `
    },
    {
      label: 'chain dialogues, workflows and catch-alls',
      expectedDialogue: `
        > 1
        < 2
        > work
        < flow
        > bob
        < catch
        > work
        < flow
        > work
        < flow again
        > work
        < flow
        > 1
        < 2
      `
    }
  ]
}])
