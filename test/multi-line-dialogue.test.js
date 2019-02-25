const { runDialogueTests } = require('./base')

runDialogueTests('multi-line-dialogue', [{
  file: 'multi-line-dialogue.bot',
  tests: [
    {
      label: 'multi-line-dialogue:switch-->first-case-->workflow',
      autostart: true,
      expectedDialogue: `
        < Hi there!\nHow are you?\n😃
        > okay
        < Could you tell me...
        < What's stopping you to feel great?
        < Your mood?
        < You didn't get enough sleep?
        < Are you ill?
        > have to more sleeping
        < Okay then
        < Bye bye 
        < 🙂
      `
    },
    {
      label: 'multi-line-dialogue:switch-->second-case',
      autostart: true,
      expectedDialogue: `
        < Hi there!
        < How are you?
        < 😃
        > good
        < Ohhh...
        < This is great
        < 😉
      `
    },
    {
      label: 'multi-line-dialogue:switch-->third-case-->jumpto-->default-case-->checkpoint-->second-case',
      autostart: true,
      expectedDialogue: `
        < Hi there!
        < How are you?
        < 😃
        > bad
        < But Why?
        < I don't understand
        < 🤔
        > good
        < Ohhh...
        < This is great
        < 😉
      `
    },
    {
      label: 'multi-line-dialogue:switch-->default-case-->second-case',
      autostart: true,
      expectedDialogue: `
        < Hi there!
        < How are you?
        < 😃
        > yummy
        < I don't understand
        < 🤔
        > good
        < Ohhh...
        < This is great
        < 😉
      `
    }
  ]
}])
