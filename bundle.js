(function(e){if("function"==typeof bootstrap)bootstrap("liten",e);else if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else if("undefined"!=typeof ses){if(!ses.ok())return;ses.makeLiten=e}else"undefined"!=typeof window?window.liten=e():global.liten=e()})(function(){var define,ses,bootstrap,module,exports;
return (function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
var events = require('events');

exports.isArray = isArray;
exports.isDate = function(obj){return Object.prototype.toString.call(obj) === '[object Date]'};
exports.isRegExp = function(obj){return Object.prototype.toString.call(obj) === '[object RegExp]'};


exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(exports.inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  for(var x = args[i]; i < len; x = args[++i]){
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + exports.inspect(x);
    }
  }
  return str;
};

},{"events":2}],3:[function(require,module,exports){
/* liten */
module.exports = (function () {

  var lexer = require('./lexer'),
      parser = require('./parser'),
      tools = require('./tools'),
      util = require('util'),

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
    'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

  function compile(source, opts) {
    opts = opts || {};
    options.indentUsingSpaces = opts.indentUsingSpaces || options.indentUsingSpaces;
    options.allowVoidChildren = opts.allowVoidChildren || options.allowVoidChildren;
    options.tabWith = opts.tabWith || options.tabWith;
    options.xhtml = Boolean(opts.xhtml);
    options.filePath = opts.filePath || null;

    var tokens = lexer.tokenize(source),
        parsed = parser.parse(tokens, {
          filePath: options.filePath,
          allowVoidChildren: options.allowVoidChildren
        });

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
        return indent + object.value.replace(/^\s*/, '');
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
  }

}());
},{"util":1,"./lexer":4,"./parser":5,"./tools":6}],7:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.exit = function () {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(require,module,exports){
(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

})(require("__browserify_process"))
},{"__browserify_process":7}],6:[function(require,module,exports){
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

    removeEmpty = removeEmpty || false;

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
    var match = /^[\"\']?([\s\S]+?)[\"\']$/m.exec(string);
    if (match)
      return match[1];
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
    return target.slice(0, index).concat(input).concat(target.slice(index));
  }

  // API
  return {
    cloneTag: cloneTag,
    toJSON: toJSON,
    unquote: unquote,
    mergeArrayAt: mergeArrayAt
  }

}());
},{"util":1}],8:[function(require,module,exports){
(function(process){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

})(require("__browserify_process"))
},{"__browserify_process":7}],9:[function(require,module,exports){
// nothing to see here... no file methods for the browser

},{}],4:[function(require,module,exports){
(function(){/* lexer - inspired by the CoffeeScript lexer (https://github.com/jashkenas/coffee-script/blob/master/src/lexer.coffee) */
module.exports = (function () {

  var util     = require('util'),
      rewriter = require('./rewriter'),

  // Useless BOM (http://en.wikipedia.org/wiki/Byte_order_mark)
  BOM = 65279,

  // Markup tag. defined without prefix as the first item at the current line.
  TAG = /^[a-z0-9]+/i,

  // Single or multiline comments
  COMMENT = /^\/\/(.*)|^\s*\/\*\*?([\s\S]*?)\*\//,

  // Match any string, single or double quoted
  STRING = /^("(\\"|[\s\S])*?"|'(\\'|[\s\S])*?')/,

  // Match any integer number as well as hex
  NUMBER = /^0x[a-f0-9]{2,6}|^\d+/i,

  // Boolean match
  BOOLEAN = /^(on|off|yes|no|true|false)[\W]/i,

  // Uncompressed straight up html markup
  MARKUP = /^<!.+>|^<!-{2,}[\s\S]*-{2,}>|^<[\s\S]+\/>|^<[\s\S]+?>([\s\S]+?<\/[\s\S]+?>)?/,

  // Match any dentation count both in and out
  DENT = /^([\ ]{2,})|^([\t]+)/,

  // Anything word-like (kept within CSS selector radius)
  IDENTIFIER = /^[a-z][a-z0-9-_]+/i,

  // Untouched content
  UNCOMPRESSED = /^```([\s\S]*?)```/,

  // Often missread as newline (\n)
  CARRIAGE_RETURN = /\r/g,

  // Matching beginning of line as anything but non-whitespace and newline.
  WHITESPACE = /^[^\n\S]+/,

  // Newline pattern
  TERMINATOR = /^(\n)|^\s*(\\{1})\s*/,

  // Matches single line trailing space
  TRAILING_SPACES = /[^\S]+$/,

  // Any content surrounded by whitespace will match
  TRIM = /^\s*([\s\S]*?)\s*$/,

  chunk    = null,
  line     = 1,
  col      = 1,
  needle   = 0,
  dent     = 0,
  options  = null,
  tabWidth = -1,
  filePath = null,
  inline   = false,
  tokens   = [];

  /**
   * Consume raw code and produce a stream of tokens. These tokens are then run
   * through the rewriter to elimiate any excess tokens not valuable for the
   * final product. Passing "raw=true" as an option will return the token stream
   * without cleaning from the rewriter (may cause errors).
   * @param  {String} code Code input
   * @param  {Object} opts Options
   * @return {Array}       Token stream
   */
  function tokenize(code, opts) {

    var diff;

    options  = opts || {};
    tabWidth = options.tabWidth || -1;
    filePath = options.filePath || null;
    inline   = Boolean(options.inline);
    code     = clean(code);
    needle   = 0;
    diff     = 0;
    line     = 1;
    col      = 1;
    dent     = 0;
    tokens   = [];

    // BOF
    if (!inline) token('BOF', '');

    while (chunk = code.slice(needle)) {
      diff = commentToken()      ||
             dentToken()         ||
             uncompressedToken() ||
             tagToken()          ||
             booleanToken()      ||
             identifierToken()   ||
             markupToken()       ||
             stringToken()       ||
             numberToken()       ||
             lineToken()         ||
             whitespaceToken()   ||
             literalToken();
      needle += diff;
      col += diff;
    }

    // EOF
    if (inline) {
      token('TERMINATOR', '\n');
    } else {
      token('EOF', '');
    }

    // ignore the rewriter
    if (options.raw === true) {
      return tokens;
    }

    // rewrite and return
    return rewriter.rewrite(tokens);

  }

  /**
   * Clean up code before lexing. BOM, carriage returns, etc are suppressed.
   * @param {String} code Raw code string
   * @return {String} Clean code
   */
  function clean(code) {
    if (code.charCodeAt(0) == BOM) {
      code = code.slice(1);
    }
    return rtrim(code.replace(CARRIAGE_RETURN, ''));
  }

  /**
   * Tags are similar to identifiers with one exception; they begin right after
   * a new line or dent. Tag tokens are considered the beginning of a node.
   * @return {UInt} Characters consumed
   */
  function tagToken() {

    var match, tag;

    if (!(match = chunk.match(TAG))) {
      return 0;
    }

    // peek behind, we require newline, BOF or dent
    if ((prev = peekBehind())) {
      if (!(/terminator|dent$|bof/i.test(prev))) {
          return 0;
      }
    }

    tag = match[0];

    token('TAG', tag);

    return tag.length;
  }

  /**
   * Any kind of whitespace except or new lines and dents. This token is most
   * likely not a part of the final result since the rewriter will remove any
   * whitespace not filling a perticular purpose.
   * @return {UInt} Characters consumed
   */
  function whitespaceToken() {

    var match, whitespace;

    if (!(match = chunk.match(WHITESPACE))) {
      return 0;
    }

    whitespace = match[0];

    token('WHITESPACE', whitespace);

    return whitespace.length;
  }

  /**
   * liten recognize three apostrophes "```" as the beginning or end of an
   * uncompressed chunk of code. This is useful when you want to define other
   * types of languages such as JavaScript or PHP without treating it as liten
   * syntax.
   * @return {UInt} Characters consumed
   */
  function uncompressedToken() {

    var match, uncompressed, lines;

    if (!(match = chunk.match(UNCOMPRESSED))) {
      return 0;
    }

    appendLines(match[1]);
    
    uncompressed = rtrim(match[1]);

    token('UNCOMPRESSED', uncompressed);

    return match[0].length;
  }

  /**
   * Identifiers are lengths of word characters not matching any other type of
   * token.
   * @return {UInt} Characters consumed
   */
  function identifierToken() {

    var match, identifier;

    if (!(match = chunk.match(IDENTIFIER))) {
      return 0;
    }

    identifier = match[0];

    token('IDENTIFIER', identifier);

    return identifier.length;
  }

  /**
   * Finds and kind of dent in the code structure and produce INDENT or OUTDENT
   * tokens pending on direction. If the current block of code is indented and
   * the current chunk has the same indentation as the previous line, the
   * current chunk will still be considered indented, hence output INDENT with
   * a value of 0.
   * @return {UInt} Characters consumed
   */
  function dentToken() {

    var match, size, prev;

    if (!(match = chunk.match(DENT))) {
      if (peekBehind() == 'TERMINATOR') {
        dent = 0;
      }
      return 0;
    }

    // peek behind, we require newline
    if ((prev = peekBehind())) {
      if (prev != 'TERMINATOR') {
        return 0;
      }
    }

    if (tabWidth == -1) {
      tabWidth = (match[1] || match[2]).length;
    }
    if (match[1]) { // spaces
      size = Math.floor(match[1].length / tabWidth);
      if (size == 0) {
        token('WHITESPACE', match[1]);
      }
    } else if (match[2]) {
      size = match[2].length;
    }

    if (size >= dent) {
      token('INDENT', size);
    } else if (size < dent) {
      token('OUTDENT', size);
    }

    dent = size;

    return match[0].length;
  }

  /**
   * Regular ECMAScript style comments.
   * @return {UInt} Characters consumed
   */
  function commentToken() {

    var comment, single, here, match;

    if (!(match = chunk.match(COMMENT))) {
      return 0;
    }

    comment = match[0];
    single = match[1];
    here = match[2];

    if (single) {
      token('COMMENT', trim(single))
    } else if (here) {

      appendLines(here);

      token('COMMENT_HERE', trim(here));
    }
    return comment.length;
  }

  /**
   * Tokenize single or double quote strings.
   * @return {UInt} Characters consumed
   */
  function stringToken() {

    var string, match;

    if (!(match = chunk.match(STRING))) {
      return 0;
    }

    string = match[1];

    appendLines(string);

    token('STRING', string);

    return match[0].length;
  }

  /**
   * Boolean token matched as "on", "off", "yes", "no", "true" or "false".
   * @return {UInt} Characters consumed
   */
  function booleanToken() {

    var bool, match;

    if (!(match = chunk.match(BOOLEAN))) {
      return 0;
    }

    bool = match[1];

    token('BOOLEAN', bool);

    return match[0].length;
  }

  /**
   * liten allow straigt up markup beginning with the "<" char. Note that single
   * line comments without double dashes "--" will not extend over multiple
   * lines. However, comments using dashes and regular tags will. Comments typed
   * this way will stay throughout the compilation process since they are
   * interpreted as unmodified markup.
   * @return {UInt} Characters consumed
   */
  function markupToken() {

    var markup, match;

    if (!(match = chunk.match(MARKUP))) {
      return 0;
    }

    markup = match[0];

    appendLines(markup);

    token('MARKUP', markup);

    return markup.length;
  }

  /**
   * Single char tokens which include math and value prefixes.
   * @return {UInt} Characters consumed, in this case; always 1
   */
  function literalToken() {

    var value, tag;
    value = chunk.charAt(0);
    tag = 'LITERAL';

    switch (value) {

      case '=': tag = 'ASSIGN'; break;
      case '+': tag = 'ADD'; break;
      case '*': tag = 'MULTIPLY'; break;
      case '@': tag = 'ATTRIBUTE'; break;
      case '#': tag = 'ID'; break;
      case '.': tag = 'CLASS'; break;
      case ':': tag = 'CONTENT'; break;
      case '(': tag = 'PARENTHESIS_START'; break;
      case ')': tag = 'PARENTHESIS_END'; break;
      case ',': tag = 'SEPARATOR'; break;
      case '$': tag = 'VARIABLE'; break;
    }

    token(tag, value);

    return 1;
  }

  /**
   * Match and produce a terminator token. Inline terminators "/" will consume
   * surrounding whitespace.
   * @return {UInt} Characters consumed
   */
  function lineToken() {

    var match;

    if (!(match = chunk.match(TERMINATOR))) {
      return 0;
    }

    token('TERMINATOR', match[1] || match[2]);

    if (match[1]) {
      line += 1;
      col = 0;
    }

    return match[0].length;
  }

  /**
   * Match and produce a number token.
   * @return {UInt} Characters consumed
   */
  function numberToken() {

    var match;

    if (!(match = chunk.match(NUMBER))) {
      return 0;
    }

    token('NUMBER', match[0]);

    return match[0].length;
  }

  /**
   * Removes any whitespace surrounding valuable content.
   * @param  {String} string Input
   * @return {String}        Clean string
   */
  function trim(string) {

    var match = string.match(TRIM);

    if (match[1]) {
      return match[1];
    }
    return string;
  }

  /**
   * Removes any trailing whitespace after valuable content.
   * @param  {String} string Input
   * @return {String}        Clean string
   */
  function rtrim(string) {

    return string.replace(TRAILING_SPACES, '');
  }

  /**
   * Returns the previous token or null.
   * @return {Array} Previous token or null.
   */
  function peekBehind() {
    if (tokens.length > 0) {
      if ((prev = tokens[tokens.length - 1])) {
        return prev[0];
      }
    }
    return null;
  }

  /**
   * Adds a token to the token stream.
   * @param  {String} tag   Token tag
   * @param  {Object} value Anything
   */
  function token(tag, value) {
    tokens.push([tag, value, line, col, filePath]);
  }

  /**
   * Line count of the given `value` is added to the overall line counter since
   * the lexer may match multiline tokens such as strings and uncompressed that
   * collect new lines as well.
   * @param  {String} value Potential muliline content
   */
  function appendLines(value) {
    line += value.split('\n').length - 1;
  }

  // API
  return {
    tokenize: tokenize
  };

}());
})()
},{"util":1,"./rewriter":10}],5:[function(require,module,exports){
(function(process){/* parser */
module.exports = (function () {

  var util = require('util'),
      path = require('path'),
      fs = require('fs'),
      tools = require('./tools'),
      lexer = require('./lexer'),

  // Match ADD tokens (+)
  ADD = /add/i,

  // Match ASSIGN tokens (=)
  ASSIGN = /assign/i,

  // Match ATTRIBUTE tokens (@)
  ATTRIBUTE = /attribute/i,

  // Match BOF or EOF tokens
  BOF_EOF = /[be]of/i,

  // Match mixin call tokens (@ or +)
  CALL = /attribute|add/i,

  // Match CLASS tokens (.)
  CLASS = /^class$/i,

  // Match CONTENT tokens (:)
  CONTENT = /content/i,

  // Match any DENTATION token (in or outdent)
  DENTATION = /dent$/i,

  // Match END_OF_LINE tokens such as TERMINATOR's or EOF
  // BOF is not considered end of line.
  END_OF_LINE = /terminator|eof/i,

  // Match ID tokens (#)
  ID = /^id$/i,

  // Match IDENTIFIER tokens (found post ATTRIBUTE, CLASS, etc)
  IDENTIFIER = /identifier/i,

  // Match MARKUP (<...>)
  MARKUP = /markup/i,

  // Match mixin prefixs (@ or =)
  // ATTRIBUTE require IDENTIFIER with "mixin" value to be valid mixin.
  MIXIN_PREFIX = /attribute|assign/i,

  // Match NEWLINE tokens (BOF, TERMINATOR's or DENTATION)
  NEWLINE = /bof|terminator|dent$/i,

  // Match any PARENTHESIS (START or END)
  PARENTHESIS = /^parenthesis/i,

  // Match PARENTHESIS_END tokens
  PARENTHESIS_END = /parenthesis_end/i,

  // Match PARENTHESIS_START tokens
  PARENTHESIS_START = /parenthesis_start/i,

  // Match SEPARATOR tokens
  SEPARATOR = /separator/i,

  // Match STRING tokens
  STRING = /string/i,

  // Match STRING or NUMBER tokens
  // Use VALUE to match any kind of valid value.
  STRING_NUMBER = /string|number/i,

  // Match TAG tokens
  TAG = /tag/i,

  // Match UNCOMPRESSED tokens
  UNCOMPRESSED = /uncompressed/i,

  // Match VALUE tokens such as STRING, NUMBER or BOOLEAN
  VALUE = /string|number|boolean/i,

  // Match VARIABLE tokens ($)
  VARIABLE = /variable/i,

  // Match WHITEPSACE tokens
  WHITESPACE = /whitespace/i,

  // Match PATH tokens
  // Paths may be both INDETIFIER'S or STRING's
  PATH = /identifier|string/i,

  // List of elements which do not allow child content
  // This can be ignored using the allowVoidChildren option
  VOID_ELEMENTS = [
    'area', 'base', 'br','col', 'command', 'embed', 'hr', 'img', 'input',
    'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'],

  input   = null,
  mixins  = null,
  token   = null,
  found   = null,
  needle  = 0,
  tag     = 0,
  indent  = 0,
  host    = null,
  root    = null,
  current = null,
  nodes   = null,
  opts    = {},

  inInlineTerminator = false;

  /**
   * Parses token stream from the lexer and returns a tree of nodes (Blocks).
   * Each token is tested across all possible matches in a set order.
   * @param  {Array}        lex     List of tokens
   * @param  {Object}       options Options
   * @return {Block|Object}         Node (Block) tree
   */
  function parse(lex, options) {

    options = options || {};
    opts.filePath = options.filePath || null;
    opts.allowVoidChildren = Boolean(options.allowVoidChildren);

    mixins  = [],
    token   = null,
    found   = null,
    needle  = 0,
    tag     = 0,
    indent  = 0,
    host    = new Block({id: 'liten-root', type: 'root'}),
    root    = host,
    current = root,
    nodes   = null,

    input = lex;

    while (token = input[needle]) {

      found = fileToken()         ||
              terminatorToken()   ||
              indentToken()       ||
              markupToken()       ||
              uncompressedToken() ||
              variableToken()     ||
              mixinToken()        ||
              tagToken()          ||
              callToken()         ||
              idToken()           ||
              classToken()        ||
              attributeToken()    ||
              contentToken()      ||
              whitespaceToken()   ||
              voidToken();
      if (found) needle++;
      else throwErrorWithReference('Unrecognized token ' + token[0] + ', "'+ token[1] + '"', token);
    }

    return root;
  }

  /**
   * Finds a mixin token.
   * @return {Boolean} success
   */
  function mixinToken() {

    var previousToken, nextToken, mixin, params, prefix;

    if (MIXIN_PREFIX.test(token[0])) {

      previousToken = peekBehind();

      if (NEWLINE.test(previousToken[0])) {

        if (token[1] == '=') {
          next(1);
        } else if (peekAhead()[1].toLowerCase() == 'mixin') {
          next(2);
        } else return false;

        mixin = {
          name: '',
          params: [],
          defaults: [],
          tag: new Block({type: 'mixin', name: 'mixin-host'})
        };

        mixin.tag.parent = host;

        // name
        if (IDENTIFIER.test(token[0])) {
          mixin.name = token[1];
          mixin.tag.name += '-' + token[1];
        } else throwExpection('IDENTIFIER', token);

        nextToken = peekAhead();

        // params
        if (PARENTHESIS_START.test(nextToken[0])) {
          next();
          while(PARENTHESIS_END.test(next()[0]) == false) {

            if (SEPARATOR.test(token[0])) continue;
            if (VARIABLE.test(token[0])) {

              if (IDENTIFIER.test(next()[0])) {

                mixin.params.push(token[1]);
                // placeholder for potential default helps to keep indexing of
                // parameters and their defaults in sync.
                mixin.defaults.push(null);

              } else throwExpection('IDENTIFIER', token);

            } else if (ASSIGN.test(token[0])) {

              nextToken = peekAhead();

              if (VALUE.test(nextToken[0]) || UNCOMPRESSED.test(nextToken[0])) {

                mixin.defaults[mixin.params.length - 1] = next()[1];

              } else if (VARIABLE.test(nextToken[0])) {

                prefix = next()[1];

                if (IDENTIFIER.test(next()[0])) {

                  mixin.defaults[mixin.params.length - 1] = prefix + next()[1];

                } else throwExpection('IDENTIFIER', token);

              } else throwExpection('STRING, NUMBER, BOOLEAN, UNCOMPRESSED or VARIABLE', token);

            } else throwExpection('VARIABLE or ASSIGN', token);

          }

        }

        mixins.push(mixin);

        current = mixin.tag;

        return true;

      }

    }

    return false;

  }

  /**
   * Finds an indent token and sets the current indentation scope based on 
   * dentation direction.
   * @return {Boolean} success
   */
  function indentToken() {

    var diff, nextToken;

    if (DENTATION.test(token[0])) {

      diff = token[1] - indent;

      // indent
      if (indent < token[1]) {

        if (diff > 1) {
          throwError('Invalid indentation depth, expected 1 got ' + diff + ', at line: ' + token[2] + ':' + token[3]);
        }

        host = current;

      // same level
      } else if (diff == 0) {

        current = null;
        // no change
        return true;

      // outdent
      } else {

        while (diff++ && host.parent != null) {
          host = host.parent;
        }

      }

      indent = token[1];
      current = null;

      return true;
    }
    return false;
  }

  /**
   * Finds a terminator token and corrects dentation pending on coming token
   * type.
   * @return {Boolean} success
   */
  function terminatorToken() {

    var nextToken;

    if (END_OF_LINE.test(token[0])) {

      nextToken = peekAhead();

      if (token[1] == '\\') {

        if (!inInlineTerminator) host = current;

        inInlineTerminator = true;

      } else if (DENTATION.test(nextToken[0]) == false) {
        indent = 0;
        host = root;
        current = null;
        inInlineTerminator = false;
      }

      return true;
    }

    return false;
  }

  /**
   * Finds a tag token.
   * @return {Boolean} success
   */
  function tagToken() {

    var tag, isVoidElement;

    if (TAG.test(token[0])) {

      isVoidElement = VOID_ELEMENTS.indexOf(token[1].toLowerCase()) > -1;

      tag = new Block({
        type: isVoidElement ? 'void' : 'tag',
        name: token[1],
        parent: host
      });

      if ((current || host).type == 'void')
        throwErrorWithReference('Void element (' + (current || host).name + ') may not contain children or content', token);

      (current || host).children.push(tag);

      current = tag;

      return true;
    }

    return false;
  }

  /**
   * Finds content token and populates the current block. Content tokens must be
   * followed by a VALUE token.
   * @return {Boolean} success
   */
  function contentToken() {

    var content, nextToken, prefix;

    if (CONTENT.test(token[0])) {

      if ((current || host).type == 'void')
        throwErrorWithReference('Void element (' + (current || host).name + ') may not contain children or content', token);

      content = new Block({type: 'content'});
      nextToken = peekAhead();

      if (STRING.test(nextToken[0])) {

        next();
        content.value = fillVariables(token[1], (current || host));

      } else if (VARIABLE.test(nextToken[0])) {

        prefix = next()[1];
        nextToken = peekAhead();

        if (IDENTIFIER.test(nextToken[0])) {

          content.value = fillVariables(prefix + next()[1], (current || host));

        } else throwExpection('IDENTIFIER', nextToken);

      } else throwExpection('STRING', nextToken);

      (current || host).children.push(content);

      return true;
    }

    return false;

  }

  /**
   * Finds an attribute token that was not matched as a mixin prefix. Attributes
   * are followed by an IDENTIFIER token and optionally ASSIGN and VALUE tokens.
   * @todo Migrate @import to it's own method.
   * @return {Boolean} success
   */
  function attributeToken() {

    var nextToken, attributeKey, attributeValue, prefix, importPath,
        importContent, importTokens, cwd;

    if (ATTRIBUTE.test(token[0])) {

      nextToken = peekAhead();

      if (IDENTIFIER.test(nextToken[0])) {

        attributeKey = next()[1];
        nextToken = peekAhead();

        // normal
        // ATTRIBUTE IDENTIFIER ASSIGN [STRING|NUMBER|BOOLEAN|VARIABLE]
        if (ASSIGN.test(nextToken[0])) {

          next();
          nextToken = peekAhead();

          if (VALUE.test(nextToken[0]) || UNCOMPRESSED.test(nextToken[0])) {

            attributeValue = next()[1];

          } else if (VARIABLE.test(nextToken[0])) {

            prefix = next()[1];
            nextToken = peekAhead();

            if (IDENTIFIER.test(nextToken[0])) {

              attributeValue = prefix + next()[1];

            } else throwExpection('IDENTIFIER', nextToken);

          } else throwExpection('STRING, NUMBER, BOOLEAN, UNCOMPRESSED or VARIABLE', nextToken);

        // import
        // ATTRIBUTE import [STRING|IDENTIFIER]
        } else if (token[1].toLowerCase() == 'import' && PATH.test(nextToken[0])) {

          // find  base directory
          cwd = process.cwd();
          if (opts.filePath != null) {
            cwd = path.resolve(opts.filePath);
            cwd = path.dirname(cwd);
          }

          // resolve corrent import path
          importPath = path.resolve(cwd, tools.unquote(next()[1]));
          if (path.extname(importPath) != '.liten') {
            importPath += '.liten';
          }

          // make sure import exist
          if (!fs.existsSync(importPath)) {
            throwErrorWithReference('File does not exist (' + importPath + ')', token);
          }

          // tokenize import
          importContent = fs.readFileSync(importPath, 'utf8');
          importTokens = lexer.tokenize(importContent, {filePath: importPath, inline: true});

          // remove @import statement
          input.splice(needle - 2, 3);

          // merge input tokens with import tokens
          input = tools.mergeArrayAt(input, importTokens, (needle - 2));

          // jump back in time
          needle -= 3;

          return true;

        // boolean
        // ATTRIBUTE IDENTIFIER TERMINATOR
        } else if (END_OF_LINE.test(nextToken[0])) {

          attributeValue = 'true';

        } else throwExpection('ASSIGN or TERMINATOR', nextToken);

      } else throwExpection('IDENTIFIER', nextToken);

      (current || host).attributes[attributeKey] = fillVariables(attributeValue, (current || host));

      return true;
    }

    return false;
  }

  /**
   * Finds a mixin call token including any arguments.
   * @return {Boolean} success
   */
  function callToken() {

    var nextToken, mixin, target, parameters, prefix;

    if (CALL.test(token[0])) {

      nextToken = peekAhead();

      if (token[1] == '+') {
        next(1);
      } else if (peekAhead()[1].toLowerCase() == 'include') {
        next(2);
      } else return false;

      mixin = getMixinByName(token[1]);

      if (!mixin) throwErrorWithReference('No mixin with name "' + mixinName + '" found', token);

      target = (current || host);

      if (target.type == 'void')
        throwErrorWithReference('Void element (' + target.name + ') may not contain children or content', token);

      nextToken = peekAhead();
      parameters = [];

      // params
      if (PARENTHESIS_START.test(nextToken[0])) {
        next();
        while(PARENTHESIS_END.test(next()[0]) == false) {

          if (SEPARATOR.test(token[0])) continue;
          if (VALUE.test(token[0])) {

              parameters.push(fillVariables(token[1], target));

          } else if (UNCOMPRESSED.test(token[0])) {

            parameters.push(token[1]);

          } else if (VARIABLE.test(token[0])) {

            prefix = token[1];
            nextToken = peekAhead();

            if (IDENTIFIER.test(nextToken[0])) {

              parameters.push(prefix + next()[1]);

            } else throwExpection('IDENTIFIER', nextToken);

          } else throwExpection('STRING, NUMBER, BOOLEAN, UNCOMPRESSED or VARIABLE', token);

        }

      }

      fillMixin(mixin, target, parameters);

      return true;

    }

    return false;
  }

  /**
   * Finds a markup token.
   * @return {Boolean} success
   */
  function markupToken() {

    if (MARKUP.test(token[0])) {

      if (host.type == 'void')
        throwErrorWithReference('Void element (' + host.name + ') may not contain children or content', token);

      host.children.push(new Block({type: 'markup', value: fillVariables(token[1], host)}));

      return true;
    }

    return false;
  }

  /**
   * Finds an uncompressed token.
   * @return {Boolean} success
   */
  function uncompressedToken() {

    if (UNCOMPRESSED.test(token[0])) {

      if ((current || host).type == 'void')
        throwErrorWithReference('Void element (' + (current || host).name + ') may not contain children or content', token);

      (current || host).children.push(new Block({type: 'uncompressed', value: token[1]}));

      return true;
    }

    return false;
  }

  /**
   * Finds an id token.
   * @todo allow variable IDENTIFIERs
   * @return {Boolean} success
   */
  function idToken() {

    var nextToken;

    if (ID.test(token[0])) {

      nextToken = peekAhead();

      if (IDENTIFIER.test(nextToken[0])) {

        (current || host).id = next()[1];

      } else throwExpection('IDENTIFIER', nextToken);

      return true;
    }

    return false;
  }

  /**
   * Finds a class token and appends the value to the current Block class list.
   * @return {Boolean} success
   */
  function classToken() {

    var nextToken, target;

    if (CLASS.test(token[0])) {

      nextToken = peekAhead();

      if (IDENTIFIER.test(nextToken[0])) {

        target = (current || host);

        target.attributes = target.attributes || {};
        target.attributes.class = target.attributes.class || [];

        target.attributes.class.push(next()[1]);

      } else throwExpection('IDENTIFIER', nextToken);

      return true;
    }

    return false;
  }

  /**
   * Parse and variable tokens and store them in the current scope.
   * @return {Boolean} success
   */
  function variableToken() {

    var nextToken, target, variableName, variableValue;

    if (VARIABLE.test(token[0])) {

      nextToken = peekAhead();

      if (IDENTIFIER.test(nextToken[0])) {

        target = host;
        variableName = next()[1];

        if (ASSIGN.test((nextToken = peekAhead())[0])) {

          next(2);

          if (VALUE.test(token[0])) {

            variableValue = fillVariables(token[1], target);

          } else  throwExpection('STRING, NUMBER, BOOLEAN or VARIABLE', token);

        } else if (!END_OF_LINE.test(nextToken[0])) throwExpection('ASSIGN', nextToken);

        target.variables[variableName] = variableValue;

      }

      return true;
    }

    return false;
  }

  /**
   * Any token that pass all tests without a match is considered a VOID token
   * which is ignored by the parser.
   * @return {Boolean} success
   */
  function voidToken() {
    return true;
  }

  /**
   * Finds a file token (unused and may be seen as VOID).
   * @return {Boolean} success
   */
  function fileToken() {
    return BOF_EOF.test(token[0]);
  }

  /**
   * Finds a whitepsace token (unused and may be seen as VOID).
   * @return {Boolean} success
   */
  function whitespaceToken(target) {
    return WHITESPACE.test((target || token)[0]);
  }

  /**
   * Moves the needle `distance` or 1 steps further and reads the token at the
   * new position.
   * @param  {UInt}        distance Needle distance
   * @return {Array|Token}          Token at the new position
   */
  function next(distance) {
    needle += (distance || 1)
    return token = input[needle];
  }

  /**
   * Returns the token found at `distance` or 1 steps ahead.
   * @param  {UInt}        distance Needle distance
   * @return {Array|Token}          Token at needle + `distance`
   */
  function peekAhead(distance) {
    return input[needle + (distance || 1)];
  }

  /**
   * Returns the token found at `distance` or 1 steps before.
   * @param  {UInt}        distance Needle distance
   * @return {Array|Token}          Token at needle - `distance`
   */
  function peekBehind(distance) {
    return input[needle - (distance || 1)];
  }

  /**
   * Returns a mixin object matching `name`.
   * @param  {String}       name Mixin name
   * @return {Object|Mixin}      Mixin object
   */
  function getMixinByName(name) {
    var mixin = null;
    mixins.forEach(function (item) {
      if (item.name == name) mixin = item;
    });
    return mixin;
  }

  /**
   * Calls the `mixin` the the specified `parameters` and appends the result to
   * the `target`.
   * @param  {Object|Mixin} mixin      Mixin object
   * @param  {Object|Tag}   target     Target Tag object
   * @param  {Array} parameters List of parameters
   */
  function fillMixin(mixin, target, parameters) {

    var tag = tools.cloneTag(mixin.tag);
    tag.parent = root;

    function parseChild(source) {
      var index = 0;
      mixin.params.forEach(function (param) {
        // attributes
        for (var attribute in source.attributes) {
          if (util.isArray(source.attributes[attribute])) {
            for (var i = 0; i < source.attributes[attribute].length; i++) {
              source.attributes[attribute][i] = fillVariables(source.attributes[attribute][i].replace('$' + param, parameters[index]|| mixin.defaults[index]), source, true);
            }
          } else {
            source.attributes[attribute] = fillVariables(source.attributes[attribute].replace('$' + param, parameters[index]|| mixin.defaults[index]), source, true);
          }
        }

        // values
        if (source.id && typeof source.id === 'string')
          source.id = fillVariables(source.id.replace('$' + param, parameters[index] || mixin.defaults[index]), source, true);
        if (source.name && typeof source.name === 'string')
          source.name = fillVariables(source.name.replace('$' + param, parameters[index] || mixin.defaults[index]), source, true);
        if (source.value && typeof source.value === 'string')
          source.value = fillVariables(source.value.replace('$' + param, parameters[index] || mixin.defaults[index]), source, true);

        // content
        if (source.children) source.children.forEach(function (child) {
          child.parent = source;
          parseChild(child);
        });
        index++;
      });
    }

    if (tag.children) {
      tag.children.forEach(function (child) {
        child.parent = target;
        target.children.push(child);
      });
    }

    parseChild(tag);

  }

  /**
   * Replace all variable references within `value` available within and above
   * `scope`. If found within a mixin, set the `ignoreMixinScope` to true to
   * prevent unwanted parameter and variable collisions.
   * @param  {String}     value            Source string
   * @param  {Object|Tag} scope            Starting point from where we will
   *                                       collect variables.
   * @param  {Boolean}    ignoreMixinScope Ignore found references which might
   *                                       be related to mixin parameters.
   * @return {String}                      String with variables filled.
   */
  function fillVariables(value, scope, ignoreMixinScope) {

    var variableName, variableValue, match, index, result,

    inMixin = (function (fromScope) {
      while (fromScope) {
        if (fromScope.type == 'mixin') {
          return true;
        }
        fromScope = fromScope.parent;
      }
      return false;
    }(scope));

    // if we find ourselves inside a mixin block, do not replace the variables
    // just yet. let the mixin call handle that later.
    // this will ensure that mixin parameters are treated with a higher 
    // priority than regular variables.
    if (ignoreMixinScope !== true && inMixin) {
      return value;
    }

    index = -1;
    result = value;

    function getVariableValue(varName, fromScope) {

      while (fromScope) {
        if (fromScope.variables) {
          if (fromScope.variables[varName] !== undefined) {
            return fromScope.variables[varName];
          }
        }
        
        if(fromScope.tag) {
          if (fromScope.tag.parent) {
            fromScope = fromScope.tag.parent;
          }
        } else {
          fromScope = fromScope.parent;
        }
      }
    
      return undefined;
    }
    
    if (/\$[a-z][a-z0-9-_]/gi.test(value)) {

      while ((index = value.slice(index + 1,-1).indexOf('$')) > -1) {

        match = /\$([a-z][a-z0-9-_]+)/i.exec(value.slice(index));

        if (match) {

          variableName = match[1];
          variableValue = getVariableValue(variableName, scope);

          if (!ignoreMixinScope || variableValue !== undefined)
            result = result.replace(match[0], String(variableValue));

        } else throwErrorWithReference('Invalid variable.', scope);

      }

    }
    
    return result;
  }

  /**
   * @ignore
   */
  function throwError(message) {
    console.error(message);
    process.exit(1);
  }

  /**
   * @ignore
   */
  function throwErrorWithReference(message, token) {
    if (token[4] != null) {
      throwError(message + ' at line: ' + token[2] + ':' + token[3] + ' in ' + token[4]);
    } else throwError(message + ' at line: ' + token[2] + ':' + token[3]);
  }

  /**
   * @ignore
   */
  function throwExpection(expected, token) {
    throwErrorWithReference('Expected ' + expected.toUpperCase() + ', found ' + token[0] + ', "'+ token[1] + '"', token);
  }

  /**
   * Block class
   * @param {Object} options Predefined options.
   */
  function Block(options) {
    options = options || {};
    this.id = options.id || null,
    this.name = options.name || null,
    this.type = options.type || 'block',
    this.value = options.value || null,
    this.parent = options.parent || null,
    this.children = options.children || [],
    this.variables = options.variables || {},
    this.attributes = options.attributes || {}
  }

  // API
  return {
    parse: parse
  }

}());
})(require("__browserify_process"))
},{"util":1,"path":8,"fs":9,"./tools":6,"./lexer":4,"__browserify_process":7}],10:[function(require,module,exports){
/* rewriter */
module.exports = (function () {

  var util  = require("util"),
      tools = require("./tools"),

  // Match any whitespace, terminator or dent
  WHITESPACE = /whitespace|terminator|dent$/i,

  // Match out and indent
  DENT = /DENT$/i,

  // Matches tags that require caretaker
  ATTRIBUTES = /attribute|id|class/i,

  // Identifiers placed after an attribute (@) that isn't an attribute
  NONE_ATTRIBUTES = ['import', 'include', 'mixin'],

  // Matches strings
  STRING = /string/i,

  tokens           = [],
  needle           = 0,
  options          = null,
  keepComments     = false,
  input            = null,
  inlineTerminator = false,
  token            = null;

  /**
   * Takes lexer tokens and clean up unnecessary pieces such as empty lines
   * and whitespaces. All line-numbers are kept for back tracking.
   * @param  {Array}  input   Tokens
   * @param  {Object} options Options
   * @return {Array}          Tokens
   */
  function rewrite(lex, opts) {

    input            = lex;
    options          = opts || {};
    keepComments     = Boolean(options.keepComments);
    tokens           = [];
    needle           = 0;
    inlineTerminator = false;
    token            = null;

    while(token = input[needle]) {

      needle += whitespaceRewrite() ||
                commentRewrite()    ||
                terminatorRewrite() ||
                booleanRewrite()    ||
                stringRewrite()     ||
                tokenRewrite();

    }

    return tokens;
  }

  /**
   * All whitespaces are removed since they do not fill any purpose.
   * Token is consumed but not put back into buffer.
   * @return {UInt} Tokens consumed
   */
  function whitespaceRewrite() {
    if (token[0] == 'WHITESPACE') {
      return 1;
    }
    return 0;
  }

  /**
   * Removes all comment tokens unless "keepComments" is true or the comment
   * starts with a "!" character like such:
   * //! kept commnet
   * /*!kept comment
   * /**!kept comment
   * @return {UInt} Tokens consumed
   */
  function commentRewrite() {

    var first, tag;

    // do not touch the token if told to keep all comments
    if (keepComments) {
      return 0;
    }

    tag = token[0];

    if (tag == 'COMMENT' || tag == 'COMMENT_HERE') {

      first = token[1].charAt(0);
      if (first == '!') {
        tokens.push(token);
      }
      return 1;

    }
    return 0;
  }

  /**
   * Minimize terminators where empty lines and off-line values.
   * @return {UInt} Tokens consumed
   */
  function terminatorRewrite() {

    var future, eon, count, past, pastCount;

    count = 1;

    if (token[0] == 'TERMINATOR') {

      while (eon = input[needle + count]) {

        if (WHITESPACE.test(eon[0])) {
          count++;
        } else if (ATTRIBUTES.test(eon[0]) && NONE_ATTRIBUTES.indexOf(input[needle + count + 1][1]) == -1) {

          if (inlineTerminator) {
            inlineTerminator = false;
            pastCount = -1;
            while (eon = input[needle + count + pastCount]) {
              pastCount--;
              if (/bof|terminator/i.test(eon[0])) {
                return count + pastCount + 1;
              }
            }
          }
          return count;
        } else {

          tokens.push(token);
          if (token[1] == '\\') {
            inlineTerminator = true;
            pastCount = -1;
            past = input[needle + count + pastCount];
            while (!/dent$/i.test(past[0]) && (needle + count + pastCount) > 0) {
              pastCount--;
              past = input[needle + count + pastCount];
            }

            if (/dent$/i.test(past[0])) {
              future = ['INDENT', past[1] + 1, token[2], token[3]];
              tokens.push(future);
            }

          } else {
            future = input[needle + count - 1];
            if (DENT.test(future[0])) {
              tokens.push(future);
            }
          }
          return count;
        }

      }

      tokens.push(token);
      return 1;
    }
    return 0;
  }

  /**
   * Boolean values may be defined as on, off, yes, no, true or false.
   * To ensure consistency and validity, all booleans are converted to true or
   * false values.
   * @return {UInt} Tokens consumed
   */
  function booleanRewrite() {

    var booleanValue;

    if (token[0] == 'BOOLEAN') {
      booleanValue = token[1].toLowerCase();
      if (booleanValue == 'on'  ||
          booleanValue == 'yes' ||
          booleanValue == 'true') {
        token[1] = 'true';
      } else {
        token[1] = 'false';
      }
      tokens.push(token);
      return 1;
    }
    return 0;
  }

  /**
   * Quoted strings will be converted to unquoted.
   * @return {UInt} Tokens consumed
   */
  function stringRewrite() {

    if (STRING.test(token[0])) {
      token[1] = tools.unquote(token[1]);
      tokens.push(token);
      return 1;
    }
    return 0;
  }

  /**
   * No rewrite, WYSIWYG.
   * @return {UInt} Tokens consumed
   */
  function tokenRewrite() {
    tokens.push(token);
    return 1;
  }

  // API
  return {
    rewrite: rewrite
  }

}());
},{"util":1,"./tools":6}]},{},[3])(3)
});
;