/* parser */
module.exports = (function () {

  var util = require("util"),

  MIXIN_PREFIX = /attribute|assign/i,
  PARENTHESIS = /^parenthesis/i,
  PARENTHESIS_START = /parenthesis_start/i,
  PARENTHESIS_END = /parenthesis_end/i,
  BOF_EOF = /[be]of/i,
  NEWLINE = /bof|terminator|dent$/i,
  IDENTIFIER = /identifier/i,
  TAG = /tag/i,
  END_OF_LINE = /terminator|eof/i,
  VARIABLE = /variable/i,
  SEPARATOR = /separator/i,

  input   = null,
  mixins  = [],
  token   = null,
  found   = null,
  needle  = 0,
  tag     = 0,
  nodes   = null,

  inMixin = false;

  function parse(lex, options) {

    input = lex;

    while (token = input[needle]) {

      found = fileToken()  ||
              mixinToken() ||
              voidToken();
      if (found) needle++;
      else throwError('Unrecognized token ' + token[0] + ', "'+ token[1] + '" at line: ' + token[2] + ':' + token[3]);
    }
    console.log(mixins);
    return nodes;
  }

  function mixinToken() {

    var previousToken, nextToken, mixin, params;

    if (MIXIN_PREFIX.test(token[0])) {

      previousToken = peekBehind();

      if (NEWLINE.test(previousToken[0])) {

        if (token[1] == '=') {
          next(1);
        } else if (peekAhead()[1].toLowerCase() == 'mixin') {
          next(2);
        } else return false;
        
        mixin = {
          name: '',
          params: []
        };

        // name
        if (isIdentifier(token)) {
          mixin.name = token[1];
        } else throwExpection('IDENTIFIER', token);

        nextToken = peekAhead();

        // params
        if (PARENTHESIS_START.test(nextToken[0])) {
          next();
          while(PARENTHESIS_END.test(next()[0]) == false) {

            if (SEPARATOR.test(token[0])) continue;
            if (VARIABLE.test(token[0])) {

              if (IDENTIFIER.test(next()[0])) {
                mixin.params.push(token[1]);
                console.log(token);
              } else throwExpection('IDENTIFIER', token);

            } else throwExpection('VARIABLE', token);

          }

        }

        mixins.push(mixin);
        inMixin = true;

        return true;

      }

    }

    return false;

  }

  function tagToken() {

  }

  function voidToken() {
    return 1;
  }

  function fileToken() {
    return BOF_EOF.test(token[0]);
  }

  function next(distance) {
    needle += (distance || 1)
    return token = input[needle];
  }

  function peekAhead(distance) {
    return input[needle + (distance || 1)];
  }

  function peekBehind(distance) {
    return input[needle - (distance || 1)];
  }

  function isIdentifier(token) {
    return IDENTIFIER.test(token[0]);
  }

  function throwError(message) {
    console.error(message);
    process.exit(1);
  }

  function throwExpection(expected, token) {
    throwError('Expected ' + expected.toUpperCase() + ', found ' + token[0] + ', "'+ token[1] + '" at line: ' + token[2] + ':' + token[3]);
  }

  return {
    parse: parse
  }

}());