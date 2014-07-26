/* liten */

'use strict';

module.exports = (function () {

  var lexer  = require('./lexer'),
      parser = require('./parser'),
      tools  = require('./tools'),
      util   = require('util'),

  unquote = tools.unquote,

  options = {
    indentUsingSpaces: true,
    allowVoidChildren: false,
    tabWith: 2,
    xhtml: false,
    filePath: null
  },

  VOID_ELEMENTS = [
    'area', 'base', 'br','col', 'command', 'embed', 'hr', 'img', 'input',
    'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'
  ];

  function compile(source, opts) {
    opts = opts || {};
    options.indentUsingSpaces = opts.indentUsingSpaces || options.indentUsingSpaces;
    options.allowVoidChildren = opts.allowVoidChildren || options.allowVoidChildren;
    options.tabWith           = opts.tabWith || options.tabWith;
    options.xhtml             = Boolean(opts.xhtml);
    options.filePath          = opts.filePath || null;

    var parserOptions = {
      filePath: options.filePath,
      allowVoidChildren: options.allowVoidChildren
    };
    var tokens = lexer.tokenize(source);
    var parsed = parser.parse(tokens, parserOptions);

    return (function compileObject(object, depth) {

      var indent      = '',
          spaces      = depth,
          result      = [],
          attributes  = [],
          children    = [],
          tagName     = null,
          targetDepth = depth;

      // create intentation
      if (options.indentUsingSpaces) {
        spaces *= options.tabWith;
        while (spaces-- > 0) {
          indent += ' ';
        }
      } else {
        while (spaces-- > 0) {
          indent += '\t';
        }
      }

      // tag
      if (object.name) {

        tagName = unquote(object.name);
        result.push(indent + '<' + tagName);


        // id
        if (object.id) {
          result.push(' id="' + unquote(object.id) + '"');
        }

        // attributes
        if (object.attributes) {
          for (var attribute in object.attributes) {
            if (object.attributes.hasOwnProperty(attribute)) {
              if (util.isArray(object.attributes[attribute])) {
                attributes.push(attribute + '="' + object.attributes[attribute].join(' ') + '"');
              } else {
                attributes.push(attribute + '="' + unquote(object.attributes[attribute]) + '"');
              }
            }
          }
          if (attributes.length) {
            result.push(' ');
          }
          result.push(attributes.join(' '));
        }

        // children
        if (object.children) {
          if (object.children.length == 1 && object.children[0].type == 'content') {
            targetDepth = -1;
          }
          object.children.forEach(function (child) {
            children.push(compileObject(child, targetDepth + 1));
          });
        }
        targetDepth = depth;

        result = [result.join('')];

        // add closing tag (if necessary)
        if (options.xhtml || (VOID_ELEMENTS.indexOf(tagName) == -1 || options.allowVoidChildren && VOID_ELEMENTS.indexOf(tagName) >= 0 && children.length)) {
          if (children.length) {
            result.push('>');
            result = [result.join('')];
            result.push(children.join('\n'));
            if (object.children.length == 1 && object.children[0].type == 'content') {
              result.push('</' + tagName + '>');
              result = [result.join('')];
            } else {
              result.push(indent + '</' + tagName + '>');
            }
          } else if (options.xhtml) {
            result.push('/>');
            result = [result.join('')];
          } else {
            result.push('></' + tagName + '>');
            result = [result.join('')];
          }
        } else {
          result.push('>');
          result = [result.join('')];
        }
        // combine and return result
        return result.join('\n');
      }

      if (object.value) {
        return indent + object.value;
      }

      if (object.parent === null) {
        object.children.forEach(function (child) {
          result.push(compileObject(child, targetDepth + 1));
        });
        return result.join('\n');
      }

    }(parsed, -1));
  }

  return {
    compile: compile
  };

}());