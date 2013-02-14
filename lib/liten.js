/* liten */

module.exports = (function () {

  var lexer = require('./lexer'),
      parser = require('./parser'),
      util = require('util'),

  MAJOR = 0,
  MINOR = 1,
  PATCH = 0;

  function compile(source, options) {

    options = options || {
      indentation: '  '
    };

    var tokens = lexer.tokenize(source),
        parsed = parser.parse(tokens);

    result = (function compileObject(object, depth) {

      var content = object.value || '',
          elementAttributes = {},
          classes = [],
          i = depth;
          indent = '';

      while (--i > 0) {
        indent += options.indentation;
      }

      for (i = 0; i < object.children.length; i++) {
        switch (object.children[i].type)
        {
          case 'identifier':
            elementAttributes.id = '"' + object.children[i].name + '"';
            break;
          case 'class':
            classes.push(object.children[i].name);
            break;
          case 'attribute':
            elementAttributes.name = object.children[i].value;
            break;
          default:
            content += compileObject(object.children[i], depth + 1);
            break;
        }
      };

      switch (object.type) {
        case 'block': return indent + content;
        case 'uncompressed':
        case 'markup': return indent + object.value;
        case 'terminator':
          return /\\n/.test(object.value) ? '\n' : object.value;
        case 'tag':
          var res = ((depth > 0) ? '\n' : '') + indent + '<' + object.name,
              attributes = '';
          if (classes.length) res += ' class="' + classes.join(' ') + '"';
          for (var key in elementAttributes) {
            attributes += key + '=' + elementAttributes[key] + '';
          }
          if (attributes.length) {
            res += ' ' + attributes;
          }
          res += '>';
          if (object.children.length && object.children[0].type == 'terminator')
            res += '\n';
          res += content;
          if (object.children.length && object.children[object.children.length-1].type == 'terminator')
            res += '\n' + indent + '</' + object.name + '>';
          else
            res += '</' + object.name + '>';
          return res;
      }

    }(parsed, -1));

    //console.log(util.inspect(parsed, false, null, true));

    return result;
  }

  return {
    compile: compile,
    version: [MAJOR, MINOR, PATCH].join('.')
  }

}());