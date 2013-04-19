/* liten */
module.exports = (function () {

  var lexer = require('./lexer'),
      parser = require('./parser'),
      util = require('util'),

  MAJOR = 0,
  MINOR = 1,
  PATCH = 1,

  options = {
    indentUsingSpaces: true,
    tabWith: 2
  },

  NO_CLOSING_TAG = ['input', 'br', 'img'];

  function compile(source, opts) {
    opts = opts || {};
    options.indentUsingSpaces = opts.indentUsingSpaces || options.indentUsingSpaces;
    options.tabWith = opts.tabWith || options.tabWith;
    options.xhtml = Boolean(opts.xhtml);

    var tokens = lexer.tokenize(source),
        parsed = parser.parse(tokens);

    return (function compileObject(object, depth) {

      var indent = '',
          spaces = depth,
          rows = null,
          result = [],
          attributes = [],
          children = [],
          tagName = null,
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
          result.push(' id="' + unquote(object.id) + '"')
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
          if (attributes.length)
            result.push(' ');
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
        if (options.xhtml || (NO_CLOSING_TAG.indexOf(tagName) == -1 || NO_CLOSING_TAG.indexOf(tagName) >= 0  && children.length)) {
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
          } else {
            result.push('/>');
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
        rows = unquote(object.value).split('\n')
        for (var i = 0; i < 1/*rows.length*/; i++) {
          rows[i] = indent + rows[i];
        }
        return rows.join('\n');
      }

      if (object.parent === null) {
        object.children.forEach(function (child) {
          result.push(compileObject(child, targetDepth + 1));
        });
        return result.join('\n');
      }

    }(parsed, -1));
  }

  function unquote(string) {
    var match = /^[\"\']?(.+?)[\"\']?$/.exec(string);
    if (match)
      return match[1];
    return string;
  }

  return {
    compile: compile,
    version: [MAJOR, MINOR, PATCH].join('.')
  }

}());