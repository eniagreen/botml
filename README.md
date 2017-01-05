# BotML

[![npm](https://img.shields.io/npm/v/botml.svg?style=flat-square)](https://www.npmjs.com/package/botml)
[![npm downloads](https://img.shields.io/npm/dt/botml.svg?style=flat-square)](https://www.npmjs.com/package/botml)
[![David](https://img.shields.io/david/BotML/botml-js.svg?style=flat-square)](https://david-dm.org/BotML/botml-js)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)
[![test](https://img.shields.io/badge/test-live-blue.svg?style=flat-square)](https://tonicdev.com/npm/botml)
[![License](https://img.shields.io/npm/l/botml.svg?style=flat-square)](https://opensource.org/licenses/MIT)

[<abbr title="Bot Markup Language">BotML</abbr>](https://codename.co/botml/) is
a declarative and powerful **markup language for designing modern chatbots**
(a.k.a. conversational bots).

Anyone (developers *and* non-developers) can use it to create and **teach bots
how to behave**.
Define the behavior of your chatbot using the right tiny bit of
[formatting](#format) and engage the conversation in no time.
See for yourself: a [calculator bot](https://github.com/BotML/botml-js/blob/master/examples/calculator.bot)
written in only two lines.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Features](#features)
- [Format](#format)
- [Examples](#examples)
- [Contribute](#contribute)
- [License](#license)

## Install

This project uses [node](http://nodejs.org) and [npm](https://npmjs.com).
Go check them out if you don't have them locally installed.

```sh
$ npm i -g botml
```

This will install both the `botml` node package and the `bot` client.

*Optionally, if you use Atom as an editor, you may want to install syntax
highlighting with the [`language-botml`](https://atom.io/packages/language-botml)
package.*

## Usage

Either run the cli:

```sh
$ bot
```

or use it in your code:

```js
var BotML = require('botml');
var bot = new BotML('alice.bot');
bot.start();
```

## Features

Existing features are of two sorts: basic features that cover a basic bot needs,
and advanced features that enable richer conversational capabilities.

Basic features:

- [Dialogues](#dialogue)
- [Random replies](#random-replies)
- [Lists](#list)
- [Prompts](#prompt)
- [Workflows](#dialogue-workflow)
- [Variables](#variable)

Advanced features:

- [Services integrations](#service) (APIs)
- [Scripts](#script)
- [Triggers](#trigger)
- [Regular expressions](#regular-expression)
- [Stanford TokensRegex](#stanford-tokensregex)
- [Natural Language Processing](#natural-language-processing)

## Format

The format aims to achieve the most by using the least.
With the right and minimal set of conventions, it can be very powerful.

The general syntax follows **3 important conventions**:

1. The text *must* be written into blocks of lines separated by at least two
   line breaks ;
2. Each line *must* start with a one-character symbol that defines its type ;
3. A block type is inferred by the symbol of its heading line.

The most basic `.bot` file would be:

```
! BOTML 1

> Hello
< Hello human!
```

### Blocks

#### Specification

The specification line is needed to tell BotML that it can load the file.

This *must* be the first line of any `.bot` file.

```
! BOTML 1
```

The `1` stands for the current version of the format.

#### Comment

Comments can help make your `.bot` file clearer.

They *can* be used as standalone blocks or can be inserted within actionable
blocks.

They *cannot* be used inline.

```
# COMMENT
```

#### Dialogue

Dialogues are the core concept of any bot. It defines how the human and the bot
can interact.

A dialogue *must* start with a `>` line, that defines what sentence(s) can
activate the bot to respond.

There *must* be one or multiple `<` lines *after* that define the bot
response(s).

There *can* be multiple back and forth by repeating this sequence within the
same block.

```
> MESSAGE
< MESSAGE
```

Example:

```
> Hi
< Hello there. Who are you?
> *
< Nice to meet you.
```

#### Random replies

Random replies in [dialogues](#dialogue) make a bot feel less rigid.
When answering to a human, the bot chooses randomly in the reply candidates.
Only one of the multiple reply candidates can be chosen by the bot.

```
> MESSAGE
< REPLY CANDIDATE #1
< REPLY CANDIDATE #2
```

Example:

```
> Hello
< Hi there
< Howdy?
```

#### List

Lists are helpful to assemble similar notions, or alternatives.

A list *must* start with a `=` line, that defines the list name.

It *must* have at least one list item but *can* have more. Each list item starts
with the `-` symbol.

```
= LIST_NAME
- LIST_ITEM
- LIST_ITEM
```

It *can* be referenced in a `>` line for referencing multiple variants of
an input pattern.

It *can* be referenced in a `<` line for referencing randomly one of the
list items as a response.

It *can* be referenced in a `?` line ([prompt](#prompt)) for referencing
multiple predefined choices.

Referencing a list is done by wrapping the list name with brackets:
`[LIST_NAME]`.

Example:

```
= random_fruit
- apples
- apricots
- bananas

> I like [random_fruit]
< Oh. I prefer [random_fruit].

# which is the equivalent to:
#  > I like apples
#  > I like apricots
#  > I like bananas
#  < Oh. I prefer apples
#  < Oh. I prefer apricots
#  < Oh. I prefer bananas
```

Lists can also be used in [prompts](#prompt).

#### Prompt

Prompts are predefined quick replies in reaction to a specific situation.

They *must* be placed after a `<` line, at the end of a [dialogue](#dialogue).

They *must* reference a [list](#list) to access all the quick replies.

The number of quick replies *should* be kept minimal.

```
= LIST_NAME
- LIST_ITEM
- LIST_ITEM

? [LIST_NAME]
```

Example:

```
= pizza_types
- Peperroni
- Margherita
- Hawaiian

> I need a pizza
< What kind of pizza?
? [pizza_types]
```

#### Service

Services can leverage external APIs endpoints.

A service *must* be declared in its own block starting with the `@` sign.
It consists of a name and an JSON-formatted API endpoint (over http or https).

It *can* (and most of the time *should*) accept a parameter by using the `$`
sign within its endpoint.

```
@ SERVICE_NAME ENDPOINT
```

It *can* be consumed within a dialogue.

When the ENDPOINT has a `$` sign, it *must* accept a parameter whose value will
replace the `$` sign.

The result of the service call can be filtered using an optional OUTPUT.
It's a selector whose format is `/(\.\w)+/`.

```
@ SERVICE_NAME( PARAMETER )[ OUTPUT ]
```

Example:

```
@ geo_domain http://freegeoip.net/json/$

> Where is *{domain}
@ geo_domain($domain).city
< It is running from $.
```

#### Script

Scripts can be used to evaluate code.

The language of the code is dependent of the language used of the parser used.
The `botml-js` parser is in Javascript, thus Javascript code can be used.

It *must* be inline within [dialogues](#dialogue) wrapped in `\``.

It *can* access named [variables](#variable).

Example:

```
> It will cost you #{price} USD
< `1000 * $price`k USD is a lot!
```

#### Variable

Variables are the way to detect, format, store and reuse meaningful information.

A variable *can* be captured within a `>` line ([dialogue](#dialogue)).

It *must* be either textual (`$`), numeric (`#`) or alphanumeric (`*`).

It *can* be used in `<` lines.

```
> My name is *{name}
< Nice to meet you, $name

> I am #{age} years old
< Seems that you have `age`
```

The variable format is `${VARIABLE_NAME}` (with its numeric and alphanumeric
equivalents). But for convenient of use, the format `$VARIABLE_NAME` can be used
too for textual and numeric variables.

A special `$` variable always refers to the last matching value of a dialogue or
the result of the previous line (the result of a service consumption for
instance).

#### Regular Expression

Regular expressions can be used in `>` lines to have more control on what to
detect.

A regular expression *must* be wrapped in `/` and *cannot* be mixed with
[basic expressions](#basic-expressions).

```
> /^I (?:.+\s)?(\w+) (?:.+\s)?(it|this)/
< Cool bro.
```

In fact, the [XRegExp](http://xregexp.com/) library is used under the hood,
giving you access to leading named captures, inline comments and mode modifiers.

#### Dialogue workflow

Dialogue workflows are a superset of the classical dialogues.

A workflow *can* be used to determine a precise flow of conversation.

It *must* start with a `~` line, that defines the list name.

Only one workflow *can* start with a `<` dialogue. Such a workflow will be
activated and used by default when the user connects to the bot.

```
~ grocery shopping
> I want to buy *{items}
< How many $items?
> #{count} $items
> #{count}
< There you go.
```

#### Trigger

Triggers are a way for the bot to be integrated with an other program.

There are two types of events: standard events and custom events.

**Standard events** are as follow:

- `'start'`
- `'patterns:set:NAME'` with one String parameter: value
- `'patterns:set'` with two String parameters: pattern name & value
- `'match'` with two String parameters: label, pattern
- `'current-dialogue-start'` with one String parameter: dialogueLabel
- `'reply'` with one String parameter: message
- `'smart-replies'` with one Array parameter: replies
- `'current-dialogue-end'` with one String parameter: dialogueLabel
- `'variable:set'` with two String parameters: variable name & value
- `'variable:set:NAME'` with one String parameter: value
- `'quit'`
- `'*'` catches *all* the standard and custom events

**Custom events** *can* be triggered within [dialogues](#dialogue).

A custom event *must* have a name.

It *can* have parameters. Parameters *can* rely on named [variables](#variable).

```
@ trigger( 'EVENT_NAME' [, PARAMETER] )
```

Example:

```
> hello
< hi
@ trigger('said_hi')
```

Then handle the 'said_hi' event in your code according to your needs:

```js
bot.on('said_hi', () => console.log('The bot said hi'));
```

#### Stanford TokensRegex

[TokensRegex](http://nlp.stanford.edu/software/tokensregex.shtml) is a framework
for defining advanced patterns based of priori Natural Language Processing such
as Named Entities and Parts-of-Speech tagging.

```
> ([ner: PERSON]+) /was|is/ /an?/ []{0,3} /painter|artist/
< An accomplished artist you say.
```

This feature is enabled through code integration.
See [an example](https://github.com/BotML/botml-js/blob/master/examples/nlp.bot).

#### Natural Language Processing

<abbr title="Natural Language Processing">NLP</abbr> can be enabled through
code integration.
See [an example](https://github.com/BotML/botml-js/blob/master/examples/nlp.js).

## Examples

See the [`examples/`](https://github.com/BotML/botml-js/tree/master/examples) directory.

## Contribute

Feel free to dive in! [Open an issue](https://github.com/BotML/botml-js/issues/new) or submit PRs.

## License

MIT (c) Codename
