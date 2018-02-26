const { runDialogueTests } = require('./base')

runDialogueTests('workflows', [{
  file: 'workflows.bot',
  tests: [
    {
      label: 'auto start',
      autostart: true,
      expectedDialogue: `
        < hi
      `
    }, {
      label: 'start workflow from a global activator',
      expectedDialogue: `
        > start workflow from a global activator
        < step 1
        < step 2
      `
    }, {
      label: 'start workflow from a workflow activator',
      expectedDialogue: `
        > start workflow from a workflow activator
        < step 1
        < step 2
      `
    }, {
      label: 'do not start a workflow from an invalid activator',
      expectedDialogue: `
        > something else
        < catch
      `
    }, {
      label: 'complete a workflow',
      expectedDialogue: `
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
    }, {
      label: 'another referencing workflow',
      expectedDialogue: `
        > start workflow-a
        < ok?
        > ok
        < b
      `
    }
  ]
}])
