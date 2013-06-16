/* lexer - inspired by the CoffeeScript lexer (https://github.com/jashkenas/coffee-script/blob/master/src/lexer.coffee) */
module.exports = (function () {

  var util     = require('util'),
      rewriter = require('./rewriter'),

  // Useless BOM (http://en.wikipedia.org/wiki/Byte_order_mark)
  BOM = 65279,

  // Markup tag. defined without prefix as the first item at the current line.
  TAG = /^[a-z0-9]+/i,

  // Single or multiline comments
  COMMENT = /^\/\/(.*)|^\s*\/\*\*?([\s\S]*?)\*\//,

  // Match any string, single or double quoted
  STRING = /^("(\\"|[\s\S])*?"|'(\\'|[\s\S])*?')/,

  // Match any integer number as well as hex
  NUMBER = /^0x[a-f0-9]{2,6}|^\d+/i,

  // Boolean match
  BOOLEAN = /^(on|off|yes|no|true|false)[\W]/i,

  // Uncompressed straight up html markup
  MARKUP = /^<!.+>|^<!-{2,}[\s\S]*-{2,}>|^<[\s\S]+\/>|^<[\s\S]+?>([\s\S]+?<\/[\s\S]+?>)?/,

  // Match any dentation count both in and out
  DENT = /^([\ ]{2,})|^([\t]+)/,

  // Anything word-like (kept within CSS selector radius)
  IDENTIFIER = /^[a-z][a-z0-9-_]+/i,

  // Untouched content
  UNCOMPRESSED = /^```([\s\S]*?)```/,

  // Often missread as newline (\n)
  CARRIAGE_RETURN = /\r/g,

  // Matching beginning of line as anything but non-whitespace and newline.
  WHITESPACE = /^[^\n\S]+/,

  // Newline pattern
  TERMINATOR = /^(\n)|^\s*(\\{1})\s*/,

  // Matches single line trailing space
  TRAILING_SPACES = /[^\n\S]+$/,

  // Any content surrounded by whitespace will match
  TRIM = /^\s*([\s\S]*?)\s*$/,

  chunk    = null,
  line     = 1,
  col      = 1,
  needle   = 0,
  dent     = 0,
  options  = null,
  tabWidth = -1,
  filePath = null,
  inline   = false,
  tokens   = [];

  /**
   * Consume raw code and produce a stream of tokens. These tokens are then run
   * through the rewriter to elimiate any excess tokens not valuable for the
   * final product. Passing "raw=true" as an option will return the token stream
   * without cleaning from the rewriter (may cause errors).
   * @param  {String} code Code input
   * @param  {Object} opts Options
   * @return {Array}       Token stream
   */
  function tokenize(code, opts) {

    var diff;

    options  = opts || {};
    tabWidth = options.tabWidth || -1;
    filePath = options.filePath || null;
    inline   = Boolean(options.inline);
    code     = clean(code);
    needle   = 0;
    diff     = 0;
    col      = 1;
    dent     = 0;
    tokens   = [];

    // BOF
    if (!inline) token('BOF', '');

    while (chunk = code.slice(needle)) {
      diff = commentToken()      ||
             dentToken()         ||
             uncompressedToken() ||
             tagToken()          ||
             booleanToken()      ||
             identifierToken()   ||
             markupToken()       ||
             stringToken()       ||
             numberToken()       ||
             lineToken()         ||
             whitespaceToken()   ||
             literalToken();
      needle += diff;
      col += diff;
    }

    // EOF
    if (inline) {
      token('TERMINATOR', '\n');
    } else {
      token('EOF', '');
    }

    // ignore the rewriter
    if (options.raw === true) {
      return tokens;
    }

    // rewrite and return
    return rewriter.rewrite(tokens);

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

  /**
   * Tags are similar to identifiers with one exception; they begin right after
   * a new line or dent. Tag tokens are considered the beginning of a node.
   * @return {UInt} Characters consumed
   */
  function tagToken() {

    var match, tag;

    if (!(match = chunk.match(TAG))) {
      return 0;
    }

    // peek behind, we require newline, BOF or dent
    if ((prev = peekBehind())) {
      if (!(/terminator|dent$|bof/i.test(prev))) {
          return 0;
      }
    }

    tag = match[0];

    token('TAG', tag);

    return tag.length;
  }

  /**
   * Any kind of whitespace except or new lines and dents. This token is most
   * likely not a part of the final result since the rewriter will remove any
   * whitespace not filling a perticular purpose.
   * @return {UInt} Characters consumed
   */
  function whitespaceToken() {

    var match, whitespace;

    if (!(match = chunk.match(WHITESPACE))) {
      return 0;
    }

    whitespace = match[0];

    token('WHITESPACE', whitespace);

    return whitespace.length;
  }

  /**
   * liten recognize three apostrophes "```" as the beginning or end of an
   * uncompressed chunk of code. This is useful when you want to define other
   * types of languages such as JavaScript or PHP without treating it as liten
   * syntax.
   * @return {UInt} Characters consumed
   */
  function uncompressedToken() {

    var match, uncompressed, lines;

    if (!(match = chunk.match(UNCOMPRESSED))) {
      return 0;
    }

    lines = match[1].split('\n');

    if (lines != null) {
      line += (lines.length - 1) || 0;
    }

    uncompressed = trim(match[1]);

    token('UNCOMPRESSED', uncompressed);

    return match[0].length;
  }

  /**
   * Identifiers are lengths of word characters not matching any other type of
   * token.
   * @return {UInt} Characters consumed
   */
  function identifierToken() {

    var match, identifier;

    if (!(match = chunk.match(IDENTIFIER))) {
      return 0;
    }

    identifier = match[0];

    token('IDENTIFIER', identifier);

    return identifier.length;
  }

  /**
   * Finds and kind of dent in the code structure and produce INDENT or OUTDENT
   * tokens pending on direction. If the current block of code is indented and
   * the current chunk has the same indentation as the previous line, the
   * current chunk will still be considered indented, hence output INDENT with
   * a value of 0.
   * @return {UInt} Characters consumed
   */
  function dentToken() {

    var match, size, prev;

    if (!(match = chunk.match(DENT))) {
      if (peekBehind() == 'TERMINATOR') {
        dent = 0;
      }
      return 0;
    }

    // peek behind, we require newline
    if ((prev = peekBehind())) {
      if (prev != 'TERMINATOR') {
        return 0;
      }
    }

    if (tabWidth == -1) {
      tabWidth = (match[1] || match[2]).length;
    }
    if (match[1]) { // spaces
      size = Math.floor(match[1].length / tabWidth);
      if (size == 0) {
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

  /**
   * Regular ECMAScript style comments.
   * @return {UInt} Characters consumed
   */
  function commentToken() {

    var comment, single, here, match;

    if (!(match = chunk.match(COMMENT))) {
      return 0;
    }

    comment = match[0];
    single = match[1];
    here = match[2];

    if (single) {
      token('COMMENT', trim(single))
    } else if (here) {
      token('COMMENT_HERE', trim(here));
    }
    return comment.length;
  }

  /**
   * Tokenize single or double quote strings.
   * @return {UInt} Characters consumed
   */
  function stringToken() {

    var string, match;

    if (!(match = chunk.match(STRING))) {
      return 0;
    }

    string = match[1];

    token('STRING', string);

    return match[0].length;
  }

  /**
   * Boolean token matched as "on", "off", "yes", "no", "true" or "false".
   * @return {UInt} Characters consumed
   */
  function booleanToken() {

    var bool, match;

    if (!(match = chunk.match(BOOLEAN))) {
      return 0;
    }

    bool = match[1];

    token('BOOLEAN', bool);

    return match[0].length;
  }

  /**
   * liten allow straigt up markup beginning with the "<" char. Note that single
   * line comments without double dashes "--" will not extend over multiple
   * lines. However, comments using dashes and regular tags will. Comments typed
   * this way will stay throughout the compilation process since they are
   * interpreted as unmodified markup.
   * @return {UInt} Characters consumed
   */
  function markupToken() {

    var markup, match;

    if (!(match = chunk.match(MARKUP))) {
      return 0;
    }

    markup = match[0];

    token('MARKUP', markup);

    return markup.length;
  }

  /**
   * Single char tokens which include math and value prefixes.
   * @return {UInt} Characters consumed, in this case; always 1
   */
  function literalToken() {

    var value, tag;
    value = chunk.charAt(0);
    tag = 'LITERAL';

    switch (value) {

      case '=': tag = 'ASSIGN'; break;
      case '+': tag = 'ADD'; break;
      case '*': tag = 'MULTIPLY'; break;
      case '@': tag = 'ATTRIBUTE'; break;
      case '#': tag = 'ID'; break;
      case '.': tag = 'CLASS'; break;
      case ':': tag = 'CONTENT'; break;
      case '(': tag = 'PARENTHESIS_START'; break;
      case ')': tag = 'PARENTHESIS_END'; break;
      case ',': tag = 'SEPARATOR'; break;
      case '$': tag = 'VARIABLE'; break;
    }

    token(tag, value);

    return 1;
  }

  /**
   * Match and produce a terminator token. Inline terminators "/" will consume
   * surrounding whitespace.
   * @return {UInt} Characters consumed
   */
  function lineToken() {

    var match;

    if (!(match = chunk.match(TERMINATOR))) {
      return 0;
    }

    token('TERMINATOR', match[1] || match[2]);

    line += 1;
    col = 0;

    return match[0].length;
  }

  /**
   * Match and produce a number token.
   * @return {UInt} Characters consumed
   */
  function numberToken() {

    var match;

    if (!(match = chunk.match(NUMBER))) {
      return 0;
    }

    token('NUMBER', match[0]);

    return match[0].length;
  }

  /**
   * Removes any whitespace surrounding valuable content.
   * @param  {String} string Input
   * @return {String}        Clean string
   */
  function trim(string) {

    var match = string.match(TRIM);

    if (match[1]) {
      return match[1];
    }
    return string;
  }

  /**
   * Returns the previous token or null.
   * @return {Array} Previous token or null.
   */
  function peekBehind() {
    if (tokens.length > 0) {
      if ((prev = tokens[tokens.length - 1])) {
        return prev[0];
      }
    }
    return null;
  }

  /**
   * Adds a token to the token stream.
   * @param  {String} tag   Token tag
   * @param  {Object} value Anything
   */
  function token(tag, value) {
    tokens.push([tag, value, line, col, filePath]);
  }

  // API
  return {
    tokenize: tokenize
  };

}());