# BotML

[![npm](https://img.shields.io/npm/v/botml.svg?style=flat-square)](https://www.npmjs.com/package/botml)
[![npm downloads](https://img.shields.io/npm/dt/botml.svg?style=flat-square)](https://www.npmjs.com/package/botml)
[![David](https://img.shields.io/david/BotML/botml-js.svg?style=flat-square)](https://david-dm.org/BotML/botml-js)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)
[![License](https://img.shields.io/npm/l/botml.svg?style=flat-square)](https://opensource.org/licenses/MIT)

<abbr title="Bot Markup Language">BotML</abbr> is a declarative and powerful
**markup language for designing modern chatbots** (a.k.a. conversational bots).

Anyone (developers *and* non-developers) can use it to create and **teach bots how to behave**.
Define the behavior of your chatbot using the right tiny bit of [formatting](#format) and engage the conversation in no time.
See for yourself: a [calculator bot](https://github.com/BotML/botml-js/blob/master/examples/calculator.bot) written in only two lines.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Features](#features)
- [Format](#format)
  - Basic features:
    - [Dialogues](#dialogue)
    - [Lists](#list)
    - [Prompts](#prompt)
    - [Random replies](#random-replies)
    - [Workflows](#dialogue-workflow)
    - [Variables](#variable)
  - Advanced features:
    - [Services integrations](#service) (APIs)
    - [Scripting](#scripting)
    - [Triggers](#trigger)
    - [Regular expressions](#regular-expression)
    - [Stanford TokensRegex compatible](https://github.com/BotML/botml-js/blob/master/examples/nlp.bot)
    - Extensions ([<abbr title="Natural Language Processing">NLP</abbr>](https://github.com/BotML/botml-js/blob/master/examples/nlp.js))
- [Examples](#examples)
- [Contribute](#contribute)
- [License](#license)

## Install

This project uses [node](http://nodejs.org) and [npm](https://npmjs.com). Go check them out if you don't have them locally installed.

```sh
$ npm i -g botml
```

This will install both the `botml` node package and the `bot` client.

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

Lists can also be used in prompts.

**Prompt**

```
? [list]

= <list>
- <item>
- <item>
```

Example:

```
> I need a pizza
< What kind of pizza?
? [pizza_types]

= pizza_types
- Peperroni
- Margherita
- Hawaiian
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

## Contribute

Feel free to dive in! [Open an issue](https://github.com/BotML/botml-js/issues/new) or submit PRs.

## License

MIT (c) Codename
