# BotML

[![NPM version](https://badge.fury.io/js/botml.svg)](http://badge.fury.io/js/botml)
[![NPM dependencies](https://david-dm.org/BotML/botml-js/status.svg)](https://david-dm.org/BotML/botml-js)

<abbr title="Bot Markup Language">BotML</abbr> is a declarative and powerful markup language for modern chatbots.

## How to use

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
var bot = new BotML(['alice.bot']);
bot.start();
```

## Features

- Input & outputs
- Randomness
- Set & use lists
- Set & use services (APIs)
- Variables
- RegExp compatible
- Scripting, post-processing
- Dialogue management

To do:

- Named variables
- Stanford TokensRegex compatible
- Stanford Semgrex compatible

## Format

### Blocks

**Specification**

```bash
! BOTML <version>
```

The current version being `1`.

**Comment**

```bash
# This line is not interpreted
```

**Dialogue**

```bash
> <input>
< <output>
```

Example:

```bash
> hi
< hi there
```

**List**

```bash
= <list>
- <item>
- <item>
```

Example:

```bash
= fruits
- apples
- apricots
- bananas

> I like [fruits]
< Oh. I prefer [fruits].
```

**Service**

API endpoints can be leveraged as easily as:

```bash
# Definition
@ <name> <endpoint>
# Consumption
@ <name>($).<output>
```

Example:

```bash
@ geodomain http://freegeoip.net/json/$

> Where is *
@ geodomain($).city
< It is running from $.
```

**Scripting**

Scripting can be done with Javascript code evaluation.

```bash
> It will cost you #{price} USD
< `1000 * $price`k USD is a lot!
```

**Variable**

Variables can be either textual (*) or numeric (#)

```bash
> My name is *{name}
< Nice to meet you, $name

> I am #{age} years old
< Seems that you have `age`
```

**Regular Expression**

```bash
> I like to /move|break|stretch/ it
< Cool bro.
```

**Dialogue workflow**

```bash
# A grocery shopper must know what and how many to buy
~ grocery shopping
< What?
> #{count} ${item}
> ${item}
< How many ${item}?
> #{count}
```

Simple question for learning a notion:

```bash
< Where were you born?
@ geoapi($).city
> So you are from $.
```

The same question with more checks and conditional branching:

```bash
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

```bash
@ trigger('name')
```

Example:

```bash
> hello
< hi
@ trigger('said_hi')
```

Then handle the 'said_hi' event in your code according to your needs.

## Example

See the `examples/` directory.

## Alternatives

AIML, ChatScript, RiveScript, SIML
