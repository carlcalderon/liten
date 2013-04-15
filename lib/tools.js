/* tools */
module.exports = (function () {

  var utils = require('util'),
      isArray = utils.isArray;

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

      if (typeof object === 'undefined') return null;
      if (typeof object !== 'object') return object;
      if (isArray(object)) {
        if (object.length) return arr(object);
        return null;
      }

      var result = {},
          keyLength = 0,
          value = null;

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

  function toJSON(source) {
    return utils.format('%j',cloneTag(source, true));
  }

  // API
  return {
    cloneTag: cloneTag,
    toJSON: toJSON
  }

}());