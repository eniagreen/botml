const { runDialogueTests } = require('./base')

runDialogueTests('service', [{
  file: 'service.bot',
  tests: [
    {
      label: 'call a service and exploit its result',
      expectedDialogue: `
        > start
        < The domain google.com is located in United States
      `
    }
  ]
}])
