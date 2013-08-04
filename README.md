# liten

A HTML pre-processor with a sassy flavor.

[Try online!](http://carlcalderon.github.io/liten/)

## Installation

liten is available from the node package manager (npm).

    npm install -g liten

## Usage

Simple as shooting fish in a barrel.

    $ liten index.liten

## Hello World

    html

        head

            title: "Hello World"

        body

            nav#menu
                ol
                    li \ a @href = "#home" :"home"
                    li \ a @href = "#work" :"work"
                    li \ a @href = "#about" :"about"

            h1: "Hello World"
            p
              .first-paragraph
              :"Lorem ipsum dolor sit amet..."


## Author

Carl Calderon: [@carlcalderon][twitter]

## License

liten is licensed under [Apache License, Version 2.0][apache]

[try]:http://carlcalderon.github.io/liten/
[twitter]:https://twitter.com/carlcalderon
[apache]:http://www.apache.org/licenses/LICENSE-2.0.html