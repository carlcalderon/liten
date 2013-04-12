/* rewriter */
module.exports = (function () {

  var util = require("util"),

  // Match any whitespace, terminator or dent
  WHITESPACE = /whitespace|terminator|dent$/i,

  // Match out and indent
  DENT = /DENT$/i,

  // Matches tags that require caretaker
  VALUE = /attribute|id|class/i,

  tokens       = [],
  needle       = 0,
  options      = null,
  keepComments = false,
  input        = null,
  token        = null;

  /**
   * Takes lexer tokens and clean up unnecessary pieces such as empty lines
   * and whitespaces. All line-numbers are kept for back tracking.
   * @param  {Array}  input   Tokens
   * @param  {Object} options Options
   * @return {Array}          Tokens
   */
  function rewrite(lex, opts) {

    input        = lex;
    options      = opts || {};
    keepComments = Boolean(options.keepComments);

    while(token = input[needle]) {

      needle += whitespaceRewrite() ||
                commentRewrite()    ||
                terminatorRewrite() ||
                booleanRewrite()    ||
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
   * @return {[type]} [description]
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

    var future, eon, count;

    count = 1;

    if (token[0] == 'TERMINATOR') {

      while (eon = input[needle + count]) {

        if (WHITESPACE.test(eon[0])) {
          count++;
        } else if (VALUE.test(eon[0])) {
          return count;
        } else {
          tokens.push(token);
          future = input[needle + count - 1];
          if (DENT.test(future[0])) {
            tokens.push(future);
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