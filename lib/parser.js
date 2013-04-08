/* parser */
module.exports = (function () {

  var util = require("util"),

  MIXIN_PREFIX = /attribute|assign/i,
  PARENTHESIS = /^parenthesis/i,
  PARENTHESIS_START = /parenthesis_start/i,
  PARENTHESIS_END = /parenthesis_end/i,
  BOF_EOF = /[be]of/i,
  NEWLINE = /bof|terminator|dent$/i,
  DENTATION = /dent$/i,
  IDENTIFIER = /identifier/i,
  TAG = /tag/i,
  CONTENT = /content/i,
  STRING = /string/i,
  END_OF_LINE = /terminator|eof/i,
  VARIABLE = /variable/i,
  SEPARATOR = /separator/i,
  ATTRIBUTE = /attribute/i,
  ASSIGN = /assign/i,
  CALL = /attribute|add/i,

  input   = null,
  mixins  = [],
  token   = null,
  found   = null,
  needle  = 0,
  tag     = 0,
  indent  = 0,
  host    = new Tag({id: 'liten-root'}),
  root    = host,
  current = root;
  nodes   = null,

  inInlineTerminator = false;

  function parse(lex, options) {

    input = lex;

    while (token = input[needle]) {

      found = fileToken()       ||
              terminatorToken() ||
              indentToken()     ||
              mixinToken()      ||
              tagToken()        ||
              callToken()       ||
              attributeToken()  ||
              contentToken()    ||
              voidToken();
      if (found) needle++;
      else throwError('Unrecognized token ' + token[0] + ', "'+ token[1] + '" at line: ' + token[2] + ':' + token[3]);
    }
    console.log(util.inspect(mixins, {depth: null, colors: true}));
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
          params: [],
          tag: new Tag({name: 'mixin-host'})
        };
        console.log('mixin host:',host.name);
        mixin.tag.parent = host;

        // name
        if (isIdentifier(token)) {
          mixin.name = token[1];
          mixin.tag.name += '-' + token[1];
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
              } else throwExpection('IDENTIFIER', token);

            } else throwExpection('VARIABLE', token);

          }

        }

        mixins.push(mixin);

        current = mixin.tag;

        return true;

      }

    }

    return false;

  }

  function indentToken() {

    var diff;

    if (DENTATION.test(token[0])) {

      diff = token[1] - indent;

      // indent
      if (indent < token[1]) {

        if (diff > 1) {
          throwError('Invalid indentation depth, expected 1 got ' + diff + ', at line: ' + token[2] + ':' + token[3]);
        }

        host = current;
        console.log(current.name, 'is now host');

      // same level
      } else if (diff == 0) {

        // no change
        return true;

      // outdent
      } else {

        console.log('outdent', diff)

        while (diff++ && host.parent != null) {
          host = host.parent;
          console.log('up: ' + host.name);
        }

      }

      indent = token[1];
      current = null;

      return true;
    }
    return false;
  }

  function terminatorToken() {
    
    var nextToken;

    if (END_OF_LINE.test(token[0])) {

      nextToken = peekAhead();

      if (token[1] == '\\') {

        if (!inInlineTerminator) host = current;

        inInlineTerminator = true;

      } else if (DENTATION.test(nextToken[0]) == false) {
        indent = 0;
        host = root;
        inInlineTerminator = false;
      }

      return true;
    }
    return false;
  }

  function tagToken() {

    if (TAG.test(token[0])) {

      current = new Tag({
        name: token[1],
        parent: host
      });

      host.children.push(current);

      console.log(token[1],'child to',host.name);

      return true;
    }

    return false;
  }

  function contentToken() {

    var content, nextToken, prefix;

    if (CONTENT.test(token[0])) {

      content = new Content();
      nextToken = peekAhead();

      if (STRING.test(nextToken[0])) {

        next();
        content.value = token[1];

      } else if (VARIABLE.test(nextToken[0])) {

        prefix = next()[1];
        nextToken = peekAhead();

        if (IDENTIFIER.test(nextToken[0])) {

          content.value = prefix + next()[1];

        } else throwExpection('IDENTIFIER', nextToken);

      } else throwExpection('STRING', nextToken);

      (current || host).children.push(content);

      return true;
    }

    return false;

  }

  function attributeToken() {

    var nextToken, attributeKey, attributeValue, prefix;

    if (ATTRIBUTE.test(token[0])) {

      nextToken = peekAhead();

      if (IDENTIFIER.test(nextToken[0])) {

        attributeKey = next()[1];
        nextToken = peekAhead();
        
        if (ASSIGN.test(nextToken[0])) {

          next();
          nextToken = peekAhead();
          
          if (STRING.test(nextToken[0])) {

            attributeValue = next()[1];

          } else if (VARIABLE.test(nextToken[0])) {

            prefix = next()[1];
            nextToken = peekAhead();

            if (IDENTIFIER.test(nextToken[0])) {

              attributeValue = prefix + next()[1];

            } else throwExpection('IDENTIFIER', nextToken);

          } else throwExpection('STRING or VARIABLE', nextToken);

        } else throwExpection('ASSIGN', nextToken);

      } else throwExpection('IDENTIFIER', nextToken);

      (current || host).attributes[attributeKey] = attributeValue;

      return true;
    }

    return false;
  }

  function callToken() {
    // START HERE!
  }

  function voidToken() {
    return true;
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

  function Tag(options) {
    options = options || {};
    this.id = options.id || null,
    this.name = options.name || null,
    this.parent = options.parent || null,
    this.children = options.children || [],
    this.attributes = options.attributes || {}
  }

  function Content(value) {
    this.value = value || null;
  }

  return {
    parse: parse
  }

}());