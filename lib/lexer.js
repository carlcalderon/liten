/* lexer - inspired by the CoffeeScript lexer (https://github.com/jashkenas/coffee-script/blob/master/src/lexer.coffee) */
module.exports = (function () {

  var util = require('util'),

  // Useless BOM (http://en.wikipedia.org/wiki/Byte_order_mark)
  BOM = 65279,

  // Markup tag. defined without prefix as the first item at the current line.
  TAG = /^[a-z0-9]+/i,

  // Single or multiline comments
  COMMENT = /^\/\/(.*)|^\/\*([\s\S]*)\*\//m,

  // Match any string, single or double quoted
  STRING = /^("(\\"|[\s\S])*?"|'(\\'|[\s\S])*?')/,

  // Uncompressed straight up html markup
  MARKUP = /^<.*>/,

  // Match any dentation count both in and out
  DENT = /^([\ ]{2,})|^([\t]+)/,

  // Anything word-like (kept within CSS selector radius)
  IDENTIFIER = /^[a-zA-Z0-9-_]+/,

  // Untouched content
  UNCOMPRESSED = /^```([\s\S]*)```/,

  // Often missread as newline (\n)
  CARRIAGE_RETURN = /\r/g,

  // Matching beginning of line as anything but non-whitespace and newline.
  WHITESPACE = /^[^\n\S]+/,

  // Newline pattern
  NEWLINE = /^\n/,

  // Matches single line trailing space
  TRAILING_SPACES = /[^\n\S]+$/,

  TRIM = /^\s*([\s\S]*?)\s*$/,

  chunk = null,
  line = 0,
  dent = 0,
  options = null,
  tabWidth = 2,
  readable = false,
  tokens = [];

  function tokenize(code, opts) {

    var needle;

    options = opts || {};
    tabWidth = options.tabWidth || tabWidth;
    readable = options.readable || readable;
    line = options.line || 0;
    code = clean(code);
    needle = 0;

    while (chunk = code.slice(needle)) {
      needle += commentToken()      ||
                dentToken()         ||
                uncompressedToken() ||
                tagToken()          ||
                identifierToken()   ||
                whitespaceToken()   ||
                markupToken()       ||
                lineToken()         ||
                stringToken()       ||
                literalToken();
    }

    return tokens;

  }

  /**
   * Clean up code before lexing. BOM, carriage returns, etc are suppressed.
   * @param {String} code Raw code string
   * @return {String} Clean code
   */
  function clean(code) {
    if (code.charCodeAt(0) == BOM) {
      code = code.slice(1);
    }
    return code.replace(CARRIAGE_RETURN, '').replace(TRAILING_SPACES, '');
  }

  function tagToken() {

    var match, tag;

    if (!(match = chunk.match(TAG))) {
      return 0;
    }

    // peek behind, we require newline, BOF or dent
    if ((prev = peekBehind())) {
      if (prev != 'NEWLINE' && prev != 'INDENT') {
          return 0;
      }
    }

    tag = match[0];

    token('TAG', tag);

    return tag.length;
  }

  function whitespaceToken() {

    var match, whitespace;

    if (!(match = chunk.match(WHITESPACE))) {
      return 0;
    }

    whitespace = match[0];

    token('WHITESPACE', whitespace);

    return whitespace.length;
  }

  function uncompressedToken() {

    var match, uncompressed;

    if (!(match = chunk.match(UNCOMPRESSED))) {
      return 0;
    }

    uncompressed = trim(match[1]);

    token('UNCOMPRESSED', uncompressed);

    return match[0].length;
  }

  function identifierToken() {

    var match, identifier;

    if (!(match = chunk.match(IDENTIFIER))) {
      return 0;
    }

    identifier = match[0];

    token('IDENTIFIER', identifier);

    return identifier.length;
  }

  function dentToken() {

    var match, size, prev;

    if (!(match = chunk.match(DENT))) {
      return 0;
    }

    // peek behind, we require newline
    if ((prev = peekBehind())) {
      if (prev != 'NEWLINE') {
          return 0;
      }
    }

    if (match[1]) { // spaces
      size = Math.floor(match[1].length / tabWidth);
      if (!size) {
        token('WHITESPACE', match[1]);
      }
    } else if (match[2]) {
      size = match[2].length;
    }

    if (size >= dent) {
      token('INDENT', size);
    } else if (size < dent) {
      token('OUTDENT', size);
    }

    dent = size;

    return match[0].length;
  }

  function commentToken() {

    var comment, single, here, match;

    if (!(match = chunk.match(COMMENT))) {
      return 0;
    }

    comment = match[0];
    single = match[1];
    here = match[2];

    if (single) {
      token('COMMENT_SINGLE', trim(single))
    } else if (here) {
      token('COMMENT_HERE', trim(here));
    }
    return comment.length;
  }

  function stringToken() {

    var string, match;

    if (!(match = chunk.match(STRING))) {
      return 0;
    }

    string = match[1];

    token('STRING', string);

    return match[0].length;
  }

  function markupToken() {

    var markup, match;

    if (!(match = chunk.match(MARKUP))) {
      return 0;
    }

    markup = match[0];

    token('MARKUP', markup);

    return markup.length;
  }

  function literalToken() {

    var value, tag;
    value = chunk.charAt(0);
    tag = 'LITERAL';

    switch (value) {

      case '=': tag = 'ASSIGN'; break;
      case '@': tag = 'ATTRIBUTE'; break;
      case '#': tag = 'ID'; break;
      case '.': tag = 'CLASS'; break;
      case ':': tag = 'CONTENT'; break;
    }

    token(tag, value);

    return value.length;
  }

  function lineToken() {

    var match;

    if (!(match = chunk.match(NEWLINE))) {
      return 0;
    }

    token('NEWLINE', match[0]);

    line += 1;

    return match[0].length;
  }

  function trim(string) {

    var match = string.match(TRIM);

    if (match[1]) {
      return match[1];
    }
    return string;
  }

  function peekBehind() {
    if (tokens.length > 0) {
      if ((prev = tokens[tokens.length-1])) {
        return prev[0];
      }
    }
    return null;
  }

  function token(tag, value) {
    if (readable) {
      if (tag == 'WHITESPACE') {
        value = value.length;
      } else if (tag == 'NEWLINE') {
        value = '\\n';
      }
      tokens.push('[' + tag + ' ' + value + ']');
    } else {
      tokens.push([tag, value, line]);
    }
  }


  return {
    tokenize: tokenize
  };

}());