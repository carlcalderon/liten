/* parser */
module.exports = (function () {

  var util = require('util'),
      path = require('path'),
      fs = require('fs'),
      tools = require('./tools'),
      lexer = require('./lexer'),

  // Match ADD tokens (+)
  ADD = /add/i,

  // Match ASSIGN tokens (=)
  ASSIGN = /assign/i,

  // Match ATTRIBUTE tokens (@)
  ATTRIBUTE = /attribute/i,

  // Match BOF or EOF tokens
  BOF_EOF = /[be]of/i,

  // Match mixin call tokens (@ or +)
  CALL = /attribute|add/i,

  // Match CLASS tokens (.)
  CLASS = /^class$/i,

  // Match CONTENT tokens (:)
  CONTENT = /content/i,

  // Match any DENTATION token (in or outdent)
  DENTATION = /dent$/i,

  // Match END_OF_LINE tokens such as TERMINATOR's or EOF
  // BOF is not considered end of line.
  END_OF_LINE = /terminator|eof/i,

  // Match ID tokens (#)
  ID = /^id$/i,

  // Match IDENTIFIER tokens (found post ATTRIBUTE, CLASS, etc)
  IDENTIFIER = /identifier/i,

  // Match MARKUP (<...>)
  MARKUP = /markup/i,

  // Match mixin prefixs (@ or =)
  // ATTRIBUTE require IDENTIFIER with "mixin" value to be valid mixin.
  MIXIN_PREFIX = /attribute|assign/i,

  // Match NEWLINE tokens (BOF, TERMINATOR's or DENTATION)
  NEWLINE = /bof|terminator|dent$/i,

  // Match any PARENTHESIS (START or END)
  PARENTHESIS = /^parenthesis/i,

  // Match PARENTHESIS_END tokens
  PARENTHESIS_END = /parenthesis_end/i,

  // Match PARENTHESIS_START tokens
  PARENTHESIS_START = /parenthesis_start/i,

  // Match SEPARATOR tokens
  SEPARATOR = /separator/i,

  // Match STRING tokens
  STRING = /string/i,

  // Match STRING or NUMBER tokens
  // Use VALUE to match any kind of valid value.
  STRING_NUMBER = /string|number/i,

  // Match TAG tokens
  TAG = /tag/i,

  // Match UNCOMPRESSED tokens
  UNCOMPRESSED = /uncompressed/i,

  // Match VALUE tokens such as STRING, NUMBER or BOOLEAN
  VALUE = /string|number|boolean/i,

  // Match VARIABLE tokens ($)
  VARIABLE = /variable/i,

  // Match WHITEPSACE tokens
  WHITESPACE = /whitespace/i,

  // Match PATH tokens
  // Paths may be both INDETIFIER'S or STRING's
  PATH = /identifier|string/i,

  input   = null,
  mixins  = [],
  token   = null,
  found   = null,
  needle  = 0,
  tag     = 0,
  indent  = 0,
  host    = new Block({id: 'liten-root', type: 'root'}),
  root    = host,
  current = root,
  nodes   = null,
  opts    = {},

  inInlineTerminator = false;

  /**
   * Parses token stream from the lexer and returns a tree of nodes (Blocks).
   * Each token is tested across all possible matches in a set order.
   * @param  {Array}        lex     List of tokens
   * @param  {Object}       options Options
   * @return {Block|Object}         Node (Block) tree
   */
  function parse(lex, options) {

    options = options || {};
    opts.filePath = options.filePath || null;

    input = lex;

    while (token = input[needle]) {

      found = fileToken()         ||
              terminatorToken()   ||
              indentToken()       ||
              markupToken()       ||
              uncompressedToken() ||
              variableToken()     ||
              mixinToken()        ||
              tagToken()          ||
              callToken()         ||
              idToken()           ||
              classToken()        ||
              attributeToken()    ||
              contentToken()      ||
              whitespaceToken()   ||
              voidToken();
      if (found) needle++;
      else throwErrorWithReference('Unrecognized token ' + token[0] + ', "'+ token[1] + '"', token);
    }

    return root;
  }

  /**
   * Finds a mixin token.
   * @return {Boolean} success
   */
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
        if (IDENTIFIER.test(token[0])) {
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

  /**
   * Finds an indent token and sets the current indentation scope based on 
   * dentation direction.
   * @return {Boolean} success
   */
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

  /**
   * Finds a terminator token and corrects dentation pending on coming token
   * type.
   * @return {Boolean} success
   */
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
        current = null;
        inInlineTerminator = false;
      }

      return true;
    }

    return false;
  }

  /**
   * Finds a tag token.
   * @return {Boolean} success
   */
  function tagToken() {

    var tag;

    if (TAG.test(token[0])) {

      tag = new Block({
        type: 'tag',
        name: token[1],
        parent: host
      });

      (current || host).children.push(tag);

      current = tag;

      return true;
    }

    return false;
  }

  /**
   * Finds content token and populates the current block. Content tokens must be
   * followed by a VALUE token.
   * @return {Boolean} success
   */
  function contentToken() {

    var content, nextToken, prefix;

    if (CONTENT.test(token[0])) {

      content = new Block({type: 'content'});
      nextToken = peekAhead();

      if (STRING.test(nextToken[0])) {

        next();
        content.value = fillVariables(token[1], (current || host));

      } else if (VARIABLE.test(nextToken[0])) {

        prefix = next()[1];
        nextToken = peekAhead();

        if (IDENTIFIER.test(nextToken[0])) {

          content.value = fillVariables(prefix + next()[1], (current || host));

        } else throwExpection('IDENTIFIER', nextToken);

      } else throwExpection('STRING', nextToken);

      (current || host).children.push(content);

      return true;
    }

    return false;

  }

  /**
   * Finds an attribute token that was not matched as a mixin prefix. Attributes
   * are followed by an IDENTIFIER token and optionally ASSIGN and VALUE tokens.
   * @todo Migrate @import to it's own method.
   * @return {Boolean} success
   */
  function attributeToken() {

    var nextToken, attributeKey, attributeValue, prefix, importPath,
        importContent, importTokens, cwd;

    if (ATTRIBUTE.test(token[0])) {

      nextToken = peekAhead();

      if (IDENTIFIER.test(nextToken[0])) {

        attributeKey = next()[1];
        nextToken = peekAhead();

        // normal
        // ATTRIBUTE IDENTIFIER ASSIGN [STRING|NUMBER|BOOLEAN|VARIABLE]
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

        // import
        // ATTRIBUTE import [STRING|IDENTIFIER]
        } else if (token[1].toLowerCase() == 'import' && PATH.test(nextToken[0])) {

          // find  base directory
          cwd = process.cwd();
          if (opts.filePath != null) {
            cwd = path.resolve(opts.filePath);
            cwd = path.dirname(cwd);
          }

          // resolve corrent import path
          importPath = path.resolve(cwd, tools.unquote(next()[1]));
          if (path.extname(importPath) != '.liten') {
            importPath += '.liten';
          }

          // make sure import exist
          if (!fs.existsSync(importPath)) {
            throwErrorWithReference('File does not exist (' + importPath + ')', token);
          }

          // tokenize import
          importContent = fs.readFileSync(importPath, 'utf8');
          importTokens = lexer.tokenize(importContent, {filePath: importPath, inline: true});

          // remove @import statement
          input.splice(needle - 2, 3);

          // merge input tokens with import tokens
          input = tools.mergeArrayAt(input, importTokens, (needle - 2));

          // jump back in time
          needle -= 3;

          return true;

        // boolean
        // ATTRIBUTE IDENTIFIER TERMINATOR
        } else if (END_OF_LINE.test(nextToken[0])) {

          attributeValue = 'true';

        } else throwExpection('ASSIGN or TERMINATOR', nextToken);

      } else throwExpection('IDENTIFIER', nextToken);

      (current || host).attributes[attributeKey] = fillVariables(attributeValue, (current || host));

      return true;
    }

    return false;
  }

  /**
   * Finds a mixin call token including any arguments.
   * @return {Boolean} success
   */
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

              parameters.push(fillVariables(token[1], target));

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

  /**
   * Finds a markup token.
   * @return {Boolean} success
   */
  function markupToken() {

    if (MARKUP.test(token[0])) {
      host.children.push(new Block({type: 'markup', value: fillVariables(token[1], host)}));

      return true;
    }

    return false;
  }

  /**
   * Finds an uncompressed token.
   * @return {Boolean} success
   */
  function uncompressedToken() {

    if (UNCOMPRESSED.test(token[0])) {
      (current || host).children.push(new Block({type: 'uncompressed', value: token[1]}));

      return true;
    }

    return false;
  }

  /**
   * Finds an id token.
   * @todo allow variable IDENTIFIERs
   * @return {Boolean} success
   */
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

  /**
   * Finds a class token and appends the value to the current Block class list.
   * @return {Boolean} success
   */
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

  /**
   * Parse and variable tokens and store them in the current scope.
   * @return {Boolean} success
   */
  function variableToken() {

    var nextToken, target, variableName, variableValue;

    if (VARIABLE.test(token[0])) {

      nextToken = peekAhead();

      if (IDENTIFIER.test(nextToken[0])) {

        target = host;
        variableName = next()[1];

        if (ASSIGN.test((nextToken = peekAhead())[0])) {

          next(2);

          if (VALUE.test(token[0])) {

            variableValue = fillVariables(token[1], target);

          } else  throwExpection('STRING, NUMBER, BOOLEAN or VARIABLE', token);

        } else if (!END_OF_LINE.test(nextToken[0])) throwExpection('ASSIGN', nextToken);

        target.variables[variableName] = variableValue;

      }

      return true;
    }

    return false;
  }

  /**
   * Any token that pass all tests without a match is considered a VOID token
   * which is ignored by the parser.
   * @return {Boolean} success
   */
  function voidToken() {
    return true;
  }

  /**
   * Finds a file token (unused and may be seen as VOID).
   * @return {Boolean} success
   */
  function fileToken() {
    return BOF_EOF.test(token[0]);
  }

  /**
   * Finds a whitepsace token (unused and may be seen as VOID).
   * @return {Boolean} success
   */
  function whitespaceToken(target) {
    return WHITESPACE.test((target || token)[0]);
  }

  /**
   * Moves the needle `distance` or 1 steps further and reads the token at the
   * new position.
   * @param  {UInt}        distance Needle distance
   * @return {Array|Token}          Token at the new position
   */
  function next(distance) {
    needle += (distance || 1)
    return token = input[needle];
  }

  /**
   * Returns the token found at `distance` or 1 steps ahead.
   * @param  {UInt}        distance Needle distance
   * @return {Array|Token}          Token at needle + `distance`
   */
  function peekAhead(distance) {
    return input[needle + (distance || 1)];
  }

  /**
   * Returns the token found at `distance` or 1 steps before.
   * @param  {UInt}        distance Needle distance
   * @return {Array|Token}          Token at needle - `distance`
   */
  function peekBehind(distance) {
    return input[needle - (distance || 1)];
  }

  /**
   * Returns a mixin object matching `name`.
   * @param  {String}       name Mixin name
   * @return {Object|Mixin}      Mixin object
   */
  function getMixinByName(name) {
    var mixin = null;
    mixins.forEach(function (item) {
      if (item.name == name) mixin = item;
    });
    return mixin;
  }

  /**
   * Calls the `mixin` the the specified `parameters` and appends the result to
   * the `target`.
   * @param  {Object|Mixin} mixin      Mixin object
   * @param  {Object|Tag}   target     Target Tag object
   * @param  {Array} parameters List of parameters
   */
  function fillMixin(mixin, target, parameters) {

    var tag = tools.cloneTag(mixin.tag);
    tag.parent = root;

    function parseChild(source) {
      var index = 0;
      mixin.params.forEach(function (param) {
        // attributes
        for (var attribute in source.attributes) {
          if (util.isArray(source.attributes[attribute])) {
            for (var i = 0; i < source.attributes[attribute].length; i++) {
              source.attributes[attribute][i] = fillVariables(source.attributes[attribute][i].replace('$' + param, parameters[index]|| mixin.defaults[index]), source, true);
            }
          } else {
            source.attributes[attribute] = fillVariables(source.attributes[attribute].replace('$' + param, parameters[index]|| mixin.defaults[index]), source, true);
          }
        }

        // values
        if (source.id && typeof source.id === 'string')
          source.id = fillVariables(source.id.replace('$' + param, parameters[index] || mixin.defaults[index]), source, true);
        if (source.name && typeof source.name === 'string')
          source.name = fillVariables(source.name.replace('$' + param, parameters[index] || mixin.defaults[index]), source, true);
        if (source.value && typeof source.value === 'string')
          source.value = fillVariables(source.value.replace('$' + param, parameters[index] || mixin.defaults[index]), source, true);

        // content
        if (source.children) source.children.forEach(function (child) {
          child.parent = source;
          parseChild(child);
        });
        index++;
      });
    }

    if (tag.children) {
      tag.children.forEach(function (child) {
        child.parent = target;
        target.children.push(child);
      });
    }

    parseChild(tag);

  }

  /**
   * Replace all variable references within `value` available within and above
   * `scope`. If found within a mixin, set the `ignoreMixinScope` to true to
   * prevent unwanted parameter and variable collisions.
   * @param  {String}     value            Source string
   * @param  {Object|Tag} scope            Starting point from where we will
   *                                       collect variables.
   * @param  {Boolean}    ignoreMixinScope Ignore found references which might
   *                                       be related to mixin parameters.
   * @return {String}                      String with variables filled.
   */
  function fillVariables(value, scope, ignoreMixinScope) {

    var variableName, variableValue, match, index, result,

    inMixin = (function (fromScope) {
      while (fromScope) {
        if (fromScope.type == 'mixin') {
          return true;
        }
        fromScope = fromScope.parent;
      }
      return false;
    }(scope));

    // if we find ourselves inside a mixin block, do not replace the variables
    // just yet. let the mixin call handle that later.
    // this will ensure that mixin parameters are treated with a higher 
    // priority than regular variables.
    if (ignoreMixinScope !== true && inMixin) {
      return value;
    }

    index = -1;
    result = value;

    function getVariableValue(varName, fromScope) {

      while (fromScope) {
        if (fromScope.variables) {
          if (fromScope.variables[varName] !== undefined) {
            return fromScope.variables[varName];
          }
        }
        
        if(fromScope.tag) {
          if (fromScope.tag.parent) {
            fromScope = fromScope.tag.parent;
          }
        } else {
          fromScope = fromScope.parent;
        }
      }
    
      return undefined;
    }
    
    if (/\$[a-z][a-z0-9-_]/gi.test(value)) {

      while ((index = value.slice(index + 1,-1).indexOf('$')) > -1) {

        match = /\$([a-z][a-z0-9-_]+)/i.exec(value.slice(index));

        if (match) {

          variableName = match[1];
          variableValue = getVariableValue(variableName, scope);

          if (!ignoreMixinScope || variableValue !== undefined)
            result = result.replace(match[0], String(variableValue));

        } else throwErrorWithReference('Invalid variable.', scope);

      }

    }
    
    return result;
  }

  /**
   * @ignore
   */
  function throwError(message) {
    console.error(message);
    process.exit(1);
  }

  /**
   * @ignore
   */
  function throwErrorWithReference(message, token) {
    if (token[4] != null) {
      throwError(message + ' at line: ' + token[2] + ':' + token[3] + ' in ' + token[4]);
    } else throwError(message + ' at line: ' + token[2] + ':' + token[3]);
  }

  /**
   * @ignore
   */
  function throwExpection(expected, token) {
    throwErrorWithReference('Expected ' + expected.toUpperCase() + ', found ' + token[0] + ', "'+ token[1] + '"', token);
  }

  /**
   * Block class
   * @param {Object} options Predefined options.
   */
  function Block(options) {
    options = options || {};
    this.id = options.id || null,
    this.name = options.name || null,
    this.type = options.type || 'block',
    this.value = options.value || null,
    this.parent = options.parent || null,
    this.children = options.children || [],
    this.variables = options.variables || {},
    this.attributes = options.attributes || {}
  }

  // API
  return {
    parse: parse
  }

}());