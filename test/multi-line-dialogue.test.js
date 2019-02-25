const { runDialogueTests } = require('./base')

runDialogueTests('multi-line-dialogue', [{
  file: 'multi-line-dialogue.bot',
  tests: [
    {
      label: 'multi-line-dialogue:switch-->first-case-->workflow',
      autostart: true,
      expectedDialogue: `
        < Hi there!\\nHow are you?\\n😃
        > okay
        < Could you tell me\\nWhat's stopping you to feel great?
        < Your mood?\\nYou didn't get enough sleep?\\nAre you ill?
        > have to more sleeping
        < Okay then\\nBye bye \\n🙂
      `
    },
    {
      label: 'multi-line-dialogue:switch-->second-case',
      autostart: true,
      expectedDialogue: `
        < Hi there!\\nHow are you?\\n😃
        > good
        < Ohhh\\nThis is great\\n😉
      `
    },
    {
      label: 'multi-line-dialogue:switch-->third-case-->jumpto-->default-case-->checkpoint-->second-case',
      autostart: true,
      expectedDialogue: `
        < Hi there!\\nHow are you?\\n😃
        > bad
        < But Why?
        < I don't understand\\n🤔
        > good
        < Ohhh\\nThis is great\\n😉
      `
    },
    {
      label: 'multi-line-dialogue:switch-->default-case-->second-case',
      autostart: true,
      expectedDialogue: `
        < Hi there!\\nHow are you?\\n😃
        > yummy
        < I don't understand\\n🤔
        > good
        < Ohhh\\nThis is great\\n😉
      `
    }
  ]
}])
