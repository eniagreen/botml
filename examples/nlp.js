// Prerequisites
try {
  require('pos')
  require('pos-chunker')
  require('chalk')
} catch (e) {
  // eslint-disable-next-line no-console
  console.error('First: npm i pos pos-chunker chalk\n')
}
const chalk = require('chalk')

// Initialization
const Botml = require('../lib/botml')
let bot = new Botml()

// NLP
const pos = require('pos')
const chunker = require('pos-chunker')
function extractPOS (sentence) {
  let words = new pos.Lexer().lex(sentence)
  return new pos.Tagger().tag(words).map(t => `${t[0]}/${t[1]}`).join(' ')
}
bot.addPatternCapability(
  { label: 'TokensRegex',
    match: /\[\s*\{\s*(?:word|tag|lemma|ner|normalized):/i
  }, (pattern) => ({
    label: 'TokensRegex',
    test: (input) => chunker.chunk(extractPOS(input), pattern).indexOf('{') > -1,
    exec: (input) => {
      let pos = extractPOS(input)
      let chunks = chunker.chunk(pos, pattern)
      // let test = chunks.indexOf('{') > -1
      let match = chunks.match(/\{([^}]+)\}/gi).map(s => s.replace(/^\{([^}]+)\}$/, '$1').replace(/\/\w+/g, ''))
      // console.log([input, pos, chunks, test, match].join('\n\n'))
      return match
    },
    toString: () => pattern.toString()
  })
)

// Capture all events
// eslint-disable-next-line no-console
bot.on('*', (event, ...args) => console.log(chalk.dim('Received event'), event, chalk.dim(JSON.stringify(args))))

// Load & start the chatbot
bot.load(['./examples/nlp.bot'])
bot.start()

// Bonus: gracefull terminate the bot on Ctrl-C
process.on('SIGINT', bot.stop)
