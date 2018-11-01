const { runDialogueTests } = require('./base')

runDialogueTests('reference-list', [{
  file: 'reference-list.bot',
  tests: [
    {
      label: 'start vegetables/alcohol reference-list',
      expectedDialogue: `
        > start
        < What do you want to buy?
        > onion
        < Nice! Choose a drink.
        > beer
        < Great! 
      `
    }, {
      label: 'start fruits/water reference-list',
      expectedDialogue: `
        > start
        < What do you want to buy?
        > apple
        < Nice! Choose a drink.
        > water
        < Great!  
      `
    }
  ]
}])
