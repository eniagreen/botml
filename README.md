# BotML

[![NPM version](https://badge.fury.io/js/botml.svg)](http://badge.fury.io/js/botml)
[![NPM dependencies](https://david-dm.org/BotML/botml-js/status.svg)](https://david-dm.org/BotML/botml-js)

<abbr title="Bot Markup Language">BotML</abbr> is a declarative and powerful
**markup language for designing modern chatbots** (a.k.a. conversational bots).

## What

BotML is a textual language to write your chatbot behaviors in the simplest form ever.
See for yourself: a [calculator bot](https://github.com/BotML/botml-js/blob/master/examples/calculator.bot) written in only two lines.

## Getting started

```bash
$ npm install botml -g
```

Then either run the cli:

```bash
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

* Basic features:
  - [Dialogues](#dialogue)
  - [Lists](#list)
  - [Prompts](#prompt)
  - [Random replies](#random-replies)
  - [Workflows](#dialogue-workflow)
  - [Variables](#variable)
* Advanced features:
  - [Services integrations](#service) (APIs)
  - [Scripting](#scripting)
  - [Triggers](#trigger)
  - [Regular expressions](#regular-expression)
  - [Stanford TokensRegex compatible](https://github.com/BotML/botml-js/blob/master/examples/nlp.bot)
  - Extensions ([<abbr title="Natural Language Processing">NLP</abbr>](https://github.com/BotML/botml-js/blob/master/examples/nlp.js))

## Format

### Blocks

**Specification**

```
! BOTML <version>
```

The current version being `1`.

**Comment**

```
# This line is not interpreted
```

**Dialogue**

```
> <input>
< <output>
```

Example:

```
> hi
< hi there
```

**List**

```
= <list>
- <item>
- <item>
```

Example:

```
= fruits
- apples
- apricots
- bananas

> I like [fruits]
< Oh. I prefer [fruits].
```

**Random replies**

```
> <input>
< <reply candidate #1>
< <reply candidate #2>
```

Example:

```
> Hello
< Hi there
< Howdy?
```

**Service**

API endpoints can be leveraged as easily as:

```
# Definition
@ <name> <endpoint>
# Consumption
@ <name>($).<output>
```

Example:

```
@ geodomain http://freegeoip.net/json/$

> Where is *
@ geodomain($).city
< It is running from $.
```

**Scripting**

Scripting can be done with Javascript code evaluation.

```
> It will cost you #{price} USD
< `1000 * $price`k USD is a lot!
```

**Variable**

Variables can be either textual (*) or numeric (#)

```
> My name is *{name}
< Nice to meet you, $name

> I am #{age} years old
< Seems that you have `age`
```

**Regular Expression**

```
> /^I (?:.+\s)?(\w+) (?:.+\s)?(it|this)/
< Cool bro.
```

**Dialogue workflow**

```
# A grocery shopper must know what and how many to buy
~ grocery shopping
< What?
> #{count} ${item}
> ${item}
< How many ${item}?
> #{count}
```

Simple question for learning a notion:

```
< Where were you born?
@ geoapi($).city
> So you are from $.
```

The same question with more checks and conditional branching:

```
~ origin
< Where were you born?
> in *{city}
> near *{city}
> *{city}
@ city = geoapi($city).city
if $city == 'Heaven'
  < Then go to hell!
else
  < Gotcha. You're from $city.
```

**Trigger**

```
@ trigger('name')
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

## Examples

See the `examples/` directory.

## Alternatives

AIML, ChatScript, RiveScript, SIML
