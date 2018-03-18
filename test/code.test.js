const { runDialogueTests } = require('./base')

runDialogueTests('code', [{
  file: 'code.bot',
  tests: [
    {
      label: 'run a code line and play with variables',
      expectedDialogue: `
        > start who
        < first name?
        > john
        < last name?
        > doe
        < Ok, I will call you "dear john doe"\\nand what is your email?
        > john@doe.com
        < your email validity: true
      `
    },
    {
      label: 'run a code that relies on context',
      expectedDialogue: `
        > start using context
        < let's start\\ngive me a number
        > 9
        < psst!
        < here!
        < did you just hear that?
        < You just gave me the number 9
      `
    },
    {
      label: 'run into triggers',
      expectedDialogue: `
        > go triggers go
        < action 1 done
        < action 2 done
        < action 3 and 4 done
      `
    }
  ]
}])
