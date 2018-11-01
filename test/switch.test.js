const { runDialogueTests } = require('./base')

runDialogueTests('switch', [{
  file: 'switch.bot',
  tests: [
    {
      label: 'switch:word-->first-case-->checkpoint-->fourth-case',
      autostart: true,
      expectedDialogue: `
        < hello stranger. how are you?
        < howdy?
        > meh
        < So you feel bad huh
        < howdy?
        > ok
        < Hmm, just ok? Okay then...
      `
    }, {
      label: 'switch:word-->second-case-->workflow',
      autostart: true,
      expectedDialogue: `
        < hello stranger. how are you?
        < howdy?
        > good
        < Oh, it is not bad ;)
        < Maybe it is more than good?
        > excelent
        < Much better!
      `
    }, {
      label: 'switch:word-->default-case',
      autostart: true,
      expectedDialogue: `
        < hello stranger. how are you?
        < howdy?
        > great
        < Nice! Let's continue then...
      `
    }, {
      label: 'switch:code-->default-case-->workflow-->switch:word-->default-case',
      expectedDialogue: `
        > start email workflow
        < Your email please?
        > type@codename.co
        < Cool. We'll reach you over at type@codename.co
        < hello stranger. how are you?
        < howdy?
        > great
        < Nice! Let's continue then...
      `
    }, {
      label: 'switch:code-->first-case-->checkpoint-->default-case-->workflow-->switch:word-->first-case-->checkpoint-->second-case-->workflow',
      expectedDialogue: `
        > start email workflow
        < Your email please?
        > typecodename.co
        < This email typecodename.co seems not legit!
        < Your email please?
        > type@codename.co
        < Cool. We'll reach you over at type@codename.co
        < hello stranger. how are you?
        < howdy?
        > meh
        < So you feel bad huh
        < howdy?
        > good
        < Oh, it is not bad ;)
        < Maybe it is more than good?
        > excelent
        < Much better!
      `
    }, {
      label: 'switch:code-->third-case-->prompt-->',
      autostart: true,
      expectedDialogue: `
        < hello stranger. how are you?
        < howdy?
        > better than ever
        < Seems you really cool guy!
      `
    }
  ]
}])
