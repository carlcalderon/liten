/* parser */
module.exports = (function () {

  var lexer = require('./lexer'),
      util = require("util")

  LEXER_PATTERN = /\[(\w+)\s([\s\S]+?)\]\s/;

  function parse(input, options) {

    var root, block, newblock, awaitingIdentifier, awaitingValue;

    root = block = new Block();

    // loop though all definitions from the lexer input
    while (LEXER_PATTERN.test(input)) {

      lex = input.match(LEXER_PATTERN);

      if (lex) {

        switch (lex[1]) {

          case 'MARKUP':
            block.addChild(new Markup(lex[2]));
            break;

          case 'TERMINATOR':
            block.addChild(new Terminator(lex[2]));
            break;

          case 'INDENT':
            if (lex[2] > 1) {
              // invalid indentation size
            }
            if (!newblock) {
              // no indentation target
            }
            block = newblock;
            break;

          case 'OUTDENT':
            while(lex[2]--) {
              block = block.parent;
            }
            break;

          case 'TAG':
            newblock = new Tag(lex[2]);
            block.addChild(newblock);
            break;

          case 'ID':
            awaitingIdentifier = new Identifier(lex[2]);
            newblock.addChild(awaitingIdentifier);
            break;

          case 'ATTRIBUTE':
            awaitingValue = new Attribute(lex[2]);
            awaitingIdentifier = awaitingValue;
            newblock.addChild(awaitingValue);
            break;

          case 'CLASS':
            awaitingIdentifier = new Class(lex[2]);
            newblock.addChild(awaitingIdentifier);
            break;

          case 'CONTENT':
            awaitingValue = newblock;
            break;

          case 'UNCOMPRESSED':
            if (awaitingValue) {
              awaitingValue.value = lex[2];
              awaitingValue = null;
            } else {
              block.addChild(new Uncompressed(lex[2]));
            }
            break;

          case 'IDENTIFIER':
            if (awaitingIdentifier) {
              awaitingIdentifier.name = lex[2];
              awaitingIdentifier = null;
            } else if (awaitingValue) {
              awaitingValue.value = lex[2];
              awaitingValue = null;
            }
            break;

          case 'BOOLEAN':
            if (awaitingValue) {
              awaitingValue.value = Boolean(lex[2] == 'true' || lex[2] == 'on' || lex[2] == 'yes');
              awaitingValue = null;
            }
            break;

          case 'VALUE':
            if (awaitingValue) {
              awaitingValue.value = Number(lex[2]);
              awaitingValue = null;
            }
            break;

          case 'STRING':
            if (awaitingValue) {
              awaitingValue.value = lex[2];
              awaitingValue = null;
            }
            break;
        }

      }

      input = input.replace(LEXER_PATTERN, '');

    }

    return root;

  }

  // Block ---------------------------------------------------------------------
  function Block() {
    this.children = [];
    this.value = null;
    this.parent = null;
    this.type = 'block';
  }

  Block.prototype.addChild = function(child) {
    child.parent = this;
    this.children.push(child);
  };

  // Tag -----------------------------------------------------------------------
  function Tag(name) {
    Block.call(this);
    this.name = name;
    this.type = 'tag';
  }
  util.inherits(Tag, Block);

  // Markup --------------------------------------------------------------------
  function Markup(content) {
    Block.call(this);
    this.value = content;
    this.type = 'markup';
  }
  util.inherits(Markup, Block);

  // Terminator ----------------------------------------------------------------
  function Terminator(style) {
    Block.call(this);
    this.value = style;
    this.type = 'terminator';
  }
  util.inherits(Terminator, Block);

  // Uncompressed --------------------------------------------------------------
  function Uncompressed(content) {
    Block.call(this);
    this.value = content;
    this.type = 'uncompressed';
  }
  util.inherits(Uncompressed, Block);

  // Identifier ----------------------------------------------------------------
  function Identifier(style) {
    Block.call(this);
    this.style = style;
    this.type = 'identifier';
  }
  util.inherits(Identifier, Block);

  // Attribute -----------------------------------------------------------------
  function Attribute(style, name) {
    Block.call(this);
    this.style = style;
    this.name = name;
    this.type = 'attribute';
  }
  util.inherits(Attribute, Block);

  // Class ---------------------------------------------------------------------
  function Class(style) {
    Block.call(this);
    this.style = style;
    this.type = 'class';
  }
  util.inherits(Class, Block);


  return {
    parse: parse
  }

}());