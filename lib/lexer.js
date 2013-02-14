/* lexer */
module.exports = (function () {

  var stringmap = require('./stringmap'),

  registry = {
    0x01: 'MARKUP',
    0x02: 'INDENT',
    0x03: 'TAG',
    0x04: 'TERMINATOR',
    0x05: 'ATTRIBUTE',
    0x06: 'VALUE',
    0x07: 'OUTDENT',
    0x08: 'IDENTIFIER',
    0x09: 'STRING',
    0x10: 'BOOLEAN',
    0x11: 'UNCOMPRESSED',
    0x12: 'CONTENT',
    0x13: 'CLASS',
    0x14: 'ID'
  },

  MARKUP = 0x01,
  INDENT = 0x02,
  TAG = 0x03,
  TERMINATOR = 0x04,
  ATTRIBUTE = 0x05,
  VALUE = 0x06,
  OUTDENT = 0x07,
  IDENTIFIER = 0x08,
  STRING = 0x09,
  BOOLEAN = 0x10,
  UNCOMPRESSED = 0x11,
  CONTENT = 0x12,
  CLASS = 0x13,
  ID = 0x14;

  function tokenize(code, options) {

    options = options || {
      tabWidth: 2
    };

    var map, source, lines, line, needle, result, input, indentation, newindent,
    lline;

    // string map
    map = stringmap.generate(code);

    // normalize crlf
    source = map.content.replace('\r','\n');

    // split lines
    lines = source.split('\n');

    // loop though lines
    result = [];
    indentation = 0;
    for (needle = 0; needle < lines.length; needle++) {

      line = lines[needle];

      if (line.length == 0) {
        continue;
      }

      // indentation
      input = line.match(/^([\s]+)/);
      if (input) {
        newindent = Math.floor(input[1].length / options.tabWidth);
        if (newindent != indentation) {
          result.push(token((newindent - indentation > 0) ? INDENT : OUTDENT, Math.abs(newindent - indentation)));
          indentation = newindent;
        }
      }

      // line starts with a less-than operator
      // interpret as inline html
      if (/(^<)|([\s\t]<)/g.test(line)) {
        result.push(token(MARKUP, line));
        result.push(token(TERMINATOR, '\\n'));
        continue;
      }

      // uncompressed
      input = line.match(/^([\s\n]+)?(´´´(\d*?)´´´)/);
      if (input) {
        result.push(token(UNCOMPRESSED, input[2]));
        continue;
      }

      // tags and ids
      input = line.match(/(\w+)((#)([\w-_]+))?/);
      if (input) {
        result.push(token(TAG, input[1]));
        if (input[2]) {
          result.push(token(ID, input[3]));
          result.push(token(IDENTIFIER, input[4]));
        }
      }

      // attributes
      lline = line;
      while (/(@)(\w+)=((´´´(\d*?)´´´)|(\d)|(true|false|yes|no|on|off))/.test(lline)) {
        input = lline.match(/(@)(\w+)=((´´´(\d*?)´´´)|(\d)|(true|false|yes|no|on|off))/);
        if (input) {
          result.push(token(ATTRIBUTE, input[1]));
          result.push(token(IDENTIFIER, input[2]));
          if (input[4]) {
            result.push(token(STRING, input[3]));
          } else if (input[7]) {
            result.push(token(BOOLEAN, input[3]));
          } else {
            result.push(token(VALUE, input[3]));
          }
        }
        lline = lline.replace(/(@)(\w+)=((´´´(\d*?)´´´)|(\d)|(true|false|yes|no|on|off))/,'');
      }

      // classes
      lline = line;
      while (/(\.)([\w-_]+)/.test(lline)) {
        input = lline.match(/(\.)([\w-_]+)/);
        if (input) {
          result.push(token(CLASS, input[1]));
          result.push(token(IDENTIFIER, input[2]));
        }
        lline = lline.replace(/\.([\w-_]+)/, '');
      }

      // content
      input = line.match(/((:)(´´´\d*´´´))/);
      if (input) {
        result.push(token(CONTENT, input[2]));
        result.push(token(STRING, input[3]));
      }

      result.push(token(TERMINATOR, '\\n'));
    }

    map.content = result.join(' ');

    return stringmap.assemble(map);
  }

  function token(identifier, content) {
    return '[' + registry[identifier] + ' ' + content + ']';
  }


  return {
    tokenize: tokenize,
    registry: registry
  };

}());