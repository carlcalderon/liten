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

      if (typeof object !== 'object') return object;
      if (isArray(object)) return arr(object);

      var result = {};

      for (var key in object) {
        if (key === 'parent') continue;
        if (object.hasOwnProperty(key) === true) {
          result[key] = obj(object[key]);
        }
      }

      return result;
    }

    return obj(source);
  }

  // API
  return {
    cloneTag: cloneTag
  }

}());