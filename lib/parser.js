/* parser */
module.exports = (function () {

  var util = require('util'),
      tools = require('./tools'),

  ADD = /add/i,
  ASSIGN = /assign/i,
  ATTRIBUTE = /attribute/i,
  BOF_EOF = /[be]of/i,
  CALL = /attribute|add/i,
  CLASS = /^class$/i,
  CONTENT = /content/i,
  DENTATION = /dent$/i,
  END_OF_LINE = /terminator|eof/i,
  ID = /^id$/i,
  IDENTIFIER = /identifier/i,
  MARKUP = /markup/i,
  MIXIN_PREFIX = /attribute|assign/i,
  NEWLINE = /bof|terminator|dent$/i,
  PARENTHESIS = /^parenthesis/i,
  PARENTHESIS_END = /parenthesis_end/i,
  PARENTHESIS_START = /parenthesis_start/i,
  SEPARATOR = /separator/i,
  STRING = /string/i,
  STRING_NUMBER = /string|number/i,
  TAG = /tag/i,
  UNCOMPRESSED = /uncompressed/i,
  VALUE = /string|number|boolean/i,
  VARIABLE = /variable/i,

  input   = null,
  mixins  = [],
  token   = null,
  found   = null,
  needle  = 0,
  tag     = 0,
  indent  = 0,
  host    = new Block({id: 'liten-root', type: 'root'}),
  root    = host,
  current = root;
  nodes   = null,

  inInlineTerminator = false;

  function parse(lex, options) {

    input = lex;

    while (token = input[needle]) {

      found = fileToken()         ||
              terminatorToken()   ||
              indentToken()       ||
              markupToken()       ||
              uncompressedToken() ||
              mixinToken()        ||
              tagToken()          ||
              callToken()         ||
              idToken()           ||
              classToken()        ||
              attributeToken()    ||
              contentToken()      ||
              voidToken();
      if (found) needle++;
      else throwErrorWithReference('Unrecognized token ' + token[0] + ', "'+ token[1] + '"', token);
    }
    return root;
  }

  function mixinToken() {

    var previousToken, nextToken, mixin, params, prefix;

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
          defaults: [],
          tag: new Block({type: 'mixin', name: 'mixin-host'})
        };

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
                // placeholder for potential default helps to keep indexing of
                // parameters and their defaults in sync.
                mixin.defaults.push(null);

              } else throwExpection('IDENTIFIER', token);

            } else if (ASSIGN.test(token[0])) {

              nextToken = peekAhead();

              if (VALUE.test(nextToken[0])) {

                mixin.defaults[mixin.params.length - 1] = next()[1];

              } else if (VARIABLE.test(nextToken[0])) {

                prefix = next()[1];

                if (IDENTIFIER.test(next()[0])) {

                  mixin.defaults[mixin.params.length - 1] = prefix + next()[1];

                } else throwExpection('IDENTIFIER', token);

              } else throwExpection('STRING, NUMBER, BOOLEAN or VARIABLE', token);

            } else throwExpection('VARIABLE or ASSIGN', token);

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

    var diff, nextToken;

    if (DENTATION.test(token[0])) {

      diff = token[1] - indent;

      // indent
      if (indent < token[1]) {

        if (diff > 1) {
          throwError('Invalid indentation depth, expected 1 got ' + diff + ', at line: ' + token[2] + ':' + token[3]);
        }

        host = current;

      // same level
      } else if (diff == 0) {

        current = null;
        // no change
        return true;

      // outdent
      } else {

        while (diff++ && host.parent != null) {
          host = host.parent;
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

      current = new Block({
        type: 'tag',
        name: token[1],
        parent: host
      });

      host.children.push(current);

      return true;
    }

    return false;
  }

  function contentToken() {

    var content, nextToken, prefix;

    if (CONTENT.test(token[0])) {

      content = new Block({type: 'content'});
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

          if (VALUE.test(nextToken[0])) {

            attributeValue = next()[1];

          } else if (VARIABLE.test(nextToken[0])) {

            prefix = next()[1];
            nextToken = peekAhead();

            if (IDENTIFIER.test(nextToken[0])) {

              attributeValue = prefix + next()[1];

            } else throwExpection('IDENTIFIER', nextToken);

          } else throwExpection('STRING, NUMBER, BOOLEAN or VARIABLE', nextToken);

        } else throwExpection('ASSIGN', nextToken);

      } else throwExpection('IDENTIFIER', nextToken);

      (current || host).attributes[attributeKey] = attributeValue;

      return true;
    }

    return false;
  }

  function callToken() {

    var nextToken, mixin, target, parameters, prefix;

    if (CALL.test(token[0])) {

      nextToken = peekAhead();

      if (token[1] == '+') {
        next(1);
      } else if (peekAhead()[1].toLowerCase() == 'include') {
        next(2);
      } else return false;

      mixin = getMixinByName(token[1]);

      if (!mixin) throwErrorWithReference('No mixin with name "' + mixinName + '" found', token);

      target = (current || host);

      nextToken = peekAhead();
      parameters = [];

      // params
      if (PARENTHESIS_START.test(nextToken[0])) {
        next();
        while(PARENTHESIS_END.test(next()[0]) == false) {

          if (SEPARATOR.test(token[0])) continue;
          if (VALUE.test(token[0])) {

              parameters.push(token[1]);

          } else if (VARIABLE.test(token[0])) {

            prefix = token[1];
            nextToken = peekAhead();

            if (IDENTIFIER.test(nextToken[0])) {

              parameters.push(prefix + next()[1]);

            } else throwExpection('IDENTIFIER', nextToken);

          } else throwExpection('STRING, NUMBER, BOOLEAN or VARIABLE', token);

        }

      }

      fillMixin(mixin, target, parameters);

      return true;

    }

    return false;
  }

  function markupToken() {

    if (MARKUP.test(token[0])) {
      host.children.push(new Block({type: 'markup', value: token[1]}));

      return true;
    }

    return false;
  }

  function uncompressedToken() {

    if (UNCOMPRESSED.test(token[0])) {
      (current || host).children.push(new Block({type: 'uncompressed', value: token[1]}));

      return true;
    }

    return false;
  }

  function idToken() {

    var nextToken;

    if (ID.test(token[0])) {

      nextToken = peekAhead();

      if (IDENTIFIER.test(nextToken[0])) {

        (current || host).id = next()[1];

      } else throwExpection('IDENTIFIER', nextToken);

      return true;
    }

    return false;
  }

  function classToken() {

    var nextToken, target;

    if (CLASS.test(token[0])) {

      nextToken = peekAhead();

      if (IDENTIFIER.test(nextToken[0])) {

        target = (current || host);

        target.attributes = target.attributes || {};
        target.attributes.class = target.attributes.class || [];

        target.attributes.class.push(next()[1]);

      } else throwExpection('IDENTIFIER', nextToken);

      return true;
    }

    return false;
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

  function getMixinByName(name) {
    var mixin = null;
    mixins.forEach(function (item) {
      if (item.name == name) mixin = item;
    });
    return mixin;
  }

  function fillMixin(mixin, target, parameters) {

    var tag = tools.cloneTag(mixin.tag);

    function parseChild(source) {
      var index = 0;
      mixin.params.forEach(function (param) {
        // attributes
        for (var attribute in source.attributes) {
          source.attributes[attribute] = source.attributes[attribute].replace('$' + param, parameters[index]|| mixin.defaults[index]);
        }

        if (source.id && typeof source.id === 'string')
          source.id = source.id.replace('$' + param, parameters[index] || mixin.defaults[index]);
        if (source.name && typeof source.name === 'string')
          source.name = source.name.replace('$' + param, parameters[index] || mixin.defaults[index]);
        if (source.value && typeof source.value === 'string')
          source.value = source.value.replace('$' + param, parameters[index] || mixin.defaults[index]);

        // content
        if (source.children) source.children.forEach(function (child) {
          parseChild(child);
        });
        index++;
      });
    }

    parseChild(tag);

    if (tag.children) {
      tag.children.forEach(function (child) {
        child.parent = target;
        target.children.push(child);
      });
    }

  }

  function throwError(message) {
    console.error(message);
    process.exit(1);
  }

  function throwErrorWithReference(message, token) {
    throwError(message + ' at line: ' + token[2] + ':' + token[3]);
  }

  function throwExpection(expected, token) {
    throwError('Expected ' + expected.toUpperCase() + ', found ' + token[0] + ', "'+ token[1] + '" at line: ' + token[2] + ':' + token[3]);
  }

  function Block(options) {
    options = options || {};
    this.id = options.id || null,
    this.name = options.name || null,
    this.type = options.type || 'block',
    this.value = options.value || null,
    this.parent = options.parent || null,
    this.children = options.children || [],
    this.attributes = options.attributes || {}
  }

  return {
    parse: parse
  }

}());