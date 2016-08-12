# BotML format

<abbr title="Bot Markup Language">BotML</abbr> is a powerful markup language for modern chatbots.

## Features

- Input & outputs
- Randomness
- Set & use lists
- Set & use services (APIs)
- Variables
- Scripting, post-processing
- Dialogue management

To do:

- RegExp compatible
- Stanford TokensRegex compatible
- Stanford Semgrex compatible

## Format

**Specification**

    ! BOTML <version>

The current version being `1`.

**Comment**

    # This line is not interpreted

**Dialogue**

    > <input>
    < <output>

Example:

    > hi
    < hi there

**List**

    = <list>
    - <item>
    - <item>

Example:

    = fruits
    - apples
    - apricots
    - bananas

    > I like [fruits]
    < Oh. I prefer [fruits].

**Service**

API endpoints can be leveraged as easily as:

    @ <name> <endpoint>

Example:

    @ geoapi http://localhost:3000/search?q=$

    > go to *
    | location = @geoapi($)
    < You want to go to $location?

**NLP**

    TODO

**Scripting**

Scripting can be done with Javascript code evaluation.

    > It will cost you #{price} USD
    < `1000 * $price`k USD is a lot!

**Variable**

Variables can be either textual (*) or numeric (#)

    > My name is *{name}
    < Nice to meet you, $name

    > I am #{age} years old
    < Seems that you have `age`

**Regular Expression**

    > I like to /move|break|stretch/ it
    < Cool bro.

**Dialogue workflow**

    # A grocery shopper must know what and how many to buy
    ~ grocery shopping
    < What?
    > #{count} ${item}
    > ${item}
    < How many ${item}?
    > #{count}

Simple question for learning a notion:

    < Where were you born?
    @ city = geoapi($)
    > So you are from $city.

The same question with more checks and conditional branching:

    ~ origin
    < Where were you born?
    > in *{city}
    > near *{city}
    > *{city}
    @ city = geoapi($city)
    if $city == 'Heaven'
    < Then go to hell!
    else
    < Gotcha. You're from $city.

**Trigger**

    @ trigger('name')

Example:

    > hi
    @ trigger('said_hi')

Then handle the 'said_hi' event in your code according to your needs.

## Example

See the `examples/` directory.

## Alternatives

AIML, ChatScript, RiveScript, SIML
