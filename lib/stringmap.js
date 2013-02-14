/* string map */
module.exports = (function () {

  var STRING_PATTERN = function () {
    return /([^\\])(("(\\"|.)*?")|('(\\'|.)*?'))/;
  }

  var UNCOMPRESSED_PATTERN = function () {
    return /```[\n\s]*([\s\S]*?)\s*?```/;
  }

  function generate(input, options) {

    options = options || {};

    var content, strings = [], result = input;

    // loop through uncompressed and replace with placeholders
    while ((content = UNCOMPRESSED_PATTERN().exec(result)) != null) {
      result = result.replace(UNCOMPRESSED_PATTERN(), '´´´' + strings.length + '´´´');
      strings.push(content[1]);
    }

    // loop though all strings and replace with placeholders
    while ((content = STRING_PATTERN().exec(result)) != null) {
      result = result.replace(STRING_PATTERN(), '$1´´´' + strings.length + '´´´');
      strings.push(content[2]);
    }

    return {
      content: result,
      map: strings
    }

  }

  function assemble(map) {

    var placeholderPattern = function () {
      return /´´´(\d+)´´´/;
    },

    index = 0, result = map.content;

    while(placeholderPattern().exec(result) != null) {
      index = result.match(placeholderPattern())[1];
      result = result.replace(placeholderPattern(), map.map[index]);
    }

    return result;

  }

  return {
    generate: generate,
    assemble: assemble
  };

}());