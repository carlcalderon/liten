/* rewriter */
module.exports = (function () {

  var util  = require("util"),
      tools = require("./tools"),

  // Match any whitespace, terminator or dent
  WHITESPACE = /whitespace|terminator|dent$/i,

  // Match out and indent
  DENT = /DENT$/i,

  // Matches tags that require caretaker
  ATTRIBUTES = /attribute|id|class/i,

  // Identifiers placed after an attribute (@) that isn't an attribute
  NONE_ATTRIBUTES = ['import', 'include', 'mixin'],

  // Matches strings
  STRING = /string/i,

  tokens           = [],
  needle           = 0,
  options          = null,
  keepComments     = false,
  input            = null,
  inlineTerminator = false,
  token            = null;

  /**
   * Takes lexer tokens and clean up unnecessary pieces such as empty lines
   * and whitespaces. All line-numbers are kept for back tracking.
   * @param  {Array}  input   Tokens
   * @param  {Object} options Options
   * @return {Array}          Tokens
   */
  function rewrite(lex, opts) {

    input            = lex;
    options          = opts || {};
    keepComments     = Boolean(options.keepComments);
    tokens           = [];
    needle           = 0;
    inlineTerminator = false;
    token            = null;

    while(token = input[needle]) {

      needle += whitespaceRewrite() ||
                commentRewrite()    ||
                terminatorRewrite() ||
                booleanRewrite()    ||
                stringRewrite()     ||
                tokenRewrite();

    }

    return tokens;
  }

  /**
   * All whitespaces are removed since they do not fill any purpose.
   * Token is consumed but not put back into buffer.
   * @return {UInt} Tokens consumed
   */
  function whitespaceRewrite() {
    if (token[0] == 'WHITESPACE') {
      return 1;
    }
    return 0;
  }

  /**
   * Removes all comment tokens unless "keepComments" is true or the comment
   * starts with a "!" character like such:
   * //! kept commnet
   * /*!kept comment
   * /**!kept comment
   * @return {UInt} Tokens consumed
   */
  function commentRewrite() {

    var first, tag;

    // do not touch the token if told to keep all comments
    if (keepComments) {
      return 0;
    }

    tag = token[0];

    if (tag == 'COMMENT' || tag == 'COMMENT_HERE') {

      first = token[1].charAt(0);
      if (first == '!') {
        tokens.push(token);
      }
      return 1;

    }
    return 0;
  }

  /**
   * Minimize terminators where empty lines and off-line values.
   * @return {UInt} Tokens consumed
   */
  function terminatorRewrite() {

    var future, eon, count, past, pastCount;

    count = 1;

    if (token[0] == 'TERMINATOR') {

      while (eon = input[needle + count]) {

        if (WHITESPACE.test(eon[0])) {
          count++;
        } else if (ATTRIBUTES.test(eon[0]) && NONE_ATTRIBUTES.indexOf(input[needle + count + 1][1]) == -1) {

          if (inlineTerminator) {
            inlineTerminator = false;
            pastCount = -1;
            while (eon = input[needle + count + pastCount]) {
              pastCount--;
              if (/bof|terminator/i.test(eon[0])) {
                return count + pastCount + 1;
              }
            }
          }
          return count;
        } else {

          tokens.push(token);
          if (token[1] == '\\') {
            inlineTerminator = true;
            pastCount = -1;
            past = input[needle + count + pastCount];
            while (!/dent$/i.test(past[0]) && (needle + count + pastCount) > 0) {
              pastCount--;
              past = input[needle + count + pastCount];
            }

            if (/dent$/i.test(past[0])) {
              future = ['INDENT', past[1] + 1, token[2], token[3]];
              tokens.push(future);
            }

          } else {
            future = input[needle + count - 1];
            if (DENT.test(future[0])) {
              tokens.push(future);
            }
          }
          return count;
        }

      }

      tokens.push(token);
      return 1;
    }
    return 0;
  }

  /**
   * Boolean values may be defined as on, off, yes, no, true or false.
   * To ensure consistency and validity, all booleans are converted to true or
   * false values.
   * @return {UInt} Tokens consumed
   */
  function booleanRewrite() {

    var booleanValue;

    if (token[0] == 'BOOLEAN') {
      booleanValue = token[1].toLowerCase();
      if (booleanValue == 'on'  ||
          booleanValue == 'yes' ||
          booleanValue == 'true') {
        token[1] = 'true';
      } else {
        token[1] = 'false';
      }
      tokens.push(token);
      return 1;
    }
    return 0;
  }

  /**
   * Quoted strings will be converted to unquoted.
   * @return {UInt} Tokens consumed
   */
  function stringRewrite() {

    if (STRING.test(token[0])) {
      token[1] = tools.unquote(token[1]);
      tokens.push(token);
      return 1;
    }
    return 0;
  }

  /**
   * No rewrite, WYSIWYG.
   * @return {UInt} Tokens consumed
   */
  function tokenRewrite() {
    tokens.push(token);
    return 1;
  }

  // API
  return {
    rewrite: rewrite
  }

}());