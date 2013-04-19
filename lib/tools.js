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
   * @return {Object}              (clean) Clone
   */
  function cloneTag(source, removeEmpty) {

    removeEmpty = removeEmpty || false;

    function arr(array) {
      var result = [];
      array.forEach(function (item){
        result.push(obj(item));
      });
      return result;
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
        if (key === 'parent') continue;
        if (object.hasOwnProperty(key) === true) {
          if (!removeEmpty || removeEmpty && object[key] != null)
            value = obj(object[key]);
            if (!removeEmpty || removeEmpty && value != null)
              result[key] = value
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
   * Any empty fields will be removedto reduce bloating.
   * @param  {Object} source Source
   * @return {String}        JSON string
   */
  function toJSON(source) {
    return utils.format('%j',cloneTag(source, true));
  }

  // API
  return {
    cloneTag: cloneTag,
    toJSON: toJSON
  }

}());