/* tools */
module.exports = (function () {

  var utils = require('util'),
      isArray = utils.isArray;

  function cloneTag(source) {

    function arr(array) {
      var result = [];
      array.forEach(function (item){
        result.push(obj(item));
      });
      return result;
    }

    function obj(object) {

      if (typeof object === 'undefined') return null;
      if (typeof object !== 'object') return object;
      if (isArray(object)) return arr(object);

      var result = {},
          keyLength = 0;

      for (var key in object) {
        if (key === 'parent') continue;
        if (object.hasOwnProperty(key) === true) {
          result[key] = obj(object[key]);
        }
        keyLength++;
      }

      if (keyLength > 0) return result;
      return null;
    }

    return obj(source);
  }

  function toJSON(source) {
    return utils.format('%j',cloneTag(source));
  }

  // API
  return {
    cloneTag: cloneTag,
    toJSON: toJSON
  }

}());