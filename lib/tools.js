/* tools */
module.exports = (function () {

  var utils = require('util'),
      isArray = utils.isArray;

  /**
   * Clones an object (designed for parser Tags).
   * Result will not contain parent circular references.
   * @param  {Object|Tag} source   Object to clone.
   * @param  {Boolean} removeEmpty If null, undefined or empty arrays should be
   *                               removed from the result or not.
   * @param  {Boolean} keepParent  Keep fields with name "parent" or not.
   * @return {Object}              (clean) Clone
   */
  function cloneTag(source, removeEmpty, keepParent) {

    if (typeof source !== 'object') {
      return null;
    }

    removeEmpty = Boolean(removeEmpty);
    keepParent = Boolean(keepParent);

    function arr(array) {
      var resultArray = [];
      array.forEach(function (item){
        resultArray.push(obj(item));
      });
      return resultArray;
    }

    function obj(object) {

      var result, keyLength, value;

      if (typeof object === 'undefined') return null;
      if (typeof object !== 'object') return object;
      if (isArray(object)) {
        if (object.length) return arr(object);
        return null;
      }

      result    = {};
      keyLength = 0;
      value     = null;

      for (var key in object) {
        if (key === 'parent') {
          if (!keepParent)
            continue;
          else
            result[key] = object[key];
        }
        if (object.hasOwnProperty(key) === true) {
          if (!removeEmpty || removeEmpty && object[key] != null) {
            value = obj(object[key]);
            if (!removeEmpty || removeEmpty && value != null)
              result[key] = value
          }
        }
        keyLength++;
      }

      if (keyLength > 0) return result;
      return null;
    }

    return obj(source);
  }

  /**
   * Creates a JSON string representation of the source object.
   * Any empty fields will be removed to reduce bloating.
   * @param  {Object} source Source
   * @return {String}        JSON string
   */
  function toJSON(source) {
    return utils.format('%j', cloneTag(source, true));
  }

  /**
   * Removes starting or trailing single or double quotes from a string.
   * @param  {String} string Input
   * @return {String}        Unquoted string
   */
  function unquote(string) {
    var match = /(^"([\s\S]+?)"$)|(^'([\s\S]+?)'$)/m.exec(string);
    if (match) {
      if (match[2]) return match[2];
      else return match[4];
    }
    return string;
  }

  /**
   * Concatenates two arrays into 1 at a specific index in the target array.
   * @param  {Array}  target Array which host the index
   * @param  {Array}  input  Array which will be inserted into target
   * @param  {Number} index  Index where input will be placed in target
   * @return {Array}         Concatenated arrays.
   */
  function mergeArrayAt(target, input, index) {
    index = index || target.length;
    return target
            .slice(0, index)
            .concat(input)
            .concat(target.slice(index));
  }

  // API
  return {
    cloneTag: cloneTag,
    toJSON: toJSON,
    unquote: unquote,
    mergeArrayAt: mergeArrayAt
  }

}());