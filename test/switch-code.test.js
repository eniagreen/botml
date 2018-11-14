const { runDialogueTests } = require('./base')

runDialogueTests('switch-code', [{
  file: 'switch-code.bot',
  tests: [
    {
      label: 'switch:code-->first-case',
      expectedDialogue: `
        > start email workflow
        < Your email please?
        > forgot
        < Did you forget your email. Please return here when you recollect.
      `
    }, {
      label: 'switch:code-->default-case',
      expectedDialogue: `
        > start email workflow
        < Your email please?
        > example@gmail.com
        < Cool. We'll reach you over at example@gmail.com
      `
    }, {
      label: 'switch:code-->second-case-->default-case',
      expectedDialogue: `
        > start email workflow
        < Your email please?
        > examplegmail.com
        < This email examplegmail.com seems not legit!
        < Your email please?
        > example@gmail.com
        < Cool. We'll reach you over at example@gmail.com
      `
    }
  ]
}])
