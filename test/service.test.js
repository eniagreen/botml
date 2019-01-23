const { runDialogueTests } = require('./base')

runDialogueTests('service', [{
  file: 'service.bot',
  tests: [
    {
      label: 'call a service and exploit its result',
      expectedDialogue: `
        > geolocate a web domain
        < For which domain?
        > google.com
        < It is running from United States
      `
    }
  ]
}])
