'use strict';

module.exports = (function () {

  var liten  = require('./liten'),
      lexer  = require('./lexer'),
      parser = require('./parser'),
      tools  = require('./tools'),
      util   = require('util'),
      path   = require('path'),
      fs     = require('fs'),

  version = '1.0.3-4',

  stdout = console.log,
  stderr = console.error,

  args = [
    { shortFlag: 'h', longFlag: 'help',      align: '\t\t', description: 'help',                                             value: false   },
    { shortFlag: 'o', longFlag: 'output',    align: '\t\t', description: 'sets the output directory',                        value: '.'     },
    { shortFlag: 'e', longFlag: 'extension', align: '\t',   description: 'sets the output file extension',                   value: '.html' },
    { shortFlag: 'p', longFlag: 'print',     align: '\t\t', description: 'print out the compiled html',                      value: false   },
    { shortFlag: 'r', longFlag: 'raw',       align: '\t\t', description: 'print out the tokens the lexer produces',          value: false   },
    { shortFlag: 't', longFlag: 'tokens',    align: '\t\t', description: 'print out the tokens the lexer/rewriter produces', value: false   },
    { shortFlag: 'n', longFlag: 'nodes',     align: '\t\t', description: 'print out the tree that the parser produces',      value: false   },
    { shortFlag: 'V', longFlag: 'verbose',   align: '\t\t', description: 'sets liten to be more elaborate',                  value: false   },
    { shortFlag: 'x', longFlag: 'xhtml',     align: '\t\t', description: 'if set, output will be xhtml compatible',          value: false   },
    { shortFlag: 'v', longFlag: 'version',   align: '\t\t', description: 'version',                                          value: false   }
  ];

  /**
   * Combine available CLI arguments in readable format along with usage info.
   * @return {String} Usage information
   */
  function usage() {

    var result      = '\nUsage: liten [options] path/to/file.liten\n\n';

    for (var i = 0; i < args.length; i++) {
      result += '  -'  + args[i].shortFlag +
                ', --' + args[i].longFlag +
                '' + args[i].align + args[i].description +
                '\n';
    }

    return result;
  }

  /**
   * Digest a list of command line arguments and perform necessary actions based
   * on argument combinations. The interpreter can handle short, long and poly
   * formated flags such as (-v, --version and -tV).
   * @param  {Array} suppliedArguments Argument list (i.e. `process.argv`)
   */
  function interpret(suppliedArguments) {

    var files          = [];
    var argument       = null;
    var potentialValue = null;
    var argumentIndex  = 2;
    var consumedChunks = 0;

    for ( ; argumentIndex < suppliedArguments.length; argumentIndex++) {
      argument = suppliedArguments[argumentIndex];

      if (isShortArgument(argument) && argument.length > 2) {
        var polyArgument = argument.split('');
        polyArgument.shift();
        suppliedArguments[argumentIndex] = '-' + polyArgument[0];
        for (var i = 1; i < polyArgument.length; i++) {
          suppliedArguments.push('-' + polyArgument[i]);
        }
      }
    }

    for (argumentIndex = 2; argumentIndex < suppliedArguments.length; argumentIndex += consumedChunks) {
      argument       = suppliedArguments[argumentIndex];
      potentialValue = null;

      if (argumentIndex < suppliedArguments.length - 1) {
        potentialValue = suppliedArguments[argumentIndex + 1];
      }

      if (isArgument(argument)) {
        consumedChunks = applyArgument(argument, potentialValue);
      } else {
        consumedChunks = 1;
        files.push(suppliedArguments[argumentIndex]);
      }
    }

    run(files);
  }

  /**
   * Perform tasks on supplied `files` list based on argument setup.
   * @param  {Array} files List of filepaths (absolute or relative)
   */
  function run(files) {

    if (getArgumentProperties('version').value) {
      stdout(version);
      process.exit(0);
    }

    if (getArgumentProperties('help').value) {
      stdout(usage());
      process.exit(0);
    }

    if (!files.length) {
      stderr('No file(s) specifed. See "liten --help".');
      process.exit(1);
    }

    var fileIndex = 0;
    for (; fileIndex < files.length; fileIndex++) {
      if (!fs.existsSync(files[fileIndex]) || !fs.statSync(files[fileIndex]).isFile()) {
        stderr('File does not exist (' + files[fileIndex] + ').');
        process.exit(3);
      }
    }

    for (fileIndex = 0; fileIndex < files.length; fileIndex++) {
      var filePath = files[fileIndex];
      var source   = fs.readFileSync(filePath, 'utf8');

      if (getArgumentProperties('tokens').value) {
        stdout(getAsTokens(source, filePath));
        process.exit(0);
      }

      if (getArgumentProperties('nodes').value) {
        stdout(getAsNodes(source, filePath));
        process.exit(0);
      }

      var result = liten.compile(source, {xhtml: getArgumentProperties('xhtml').value, filePath: filePath});

      if (getArgumentProperties('print').value) {
        stdout(result);
      } else {
        var targetDirectory = path.resolve(path.dirname(filePath), getArgumentProperties('output').value);
        var targetFilename  = /(.+)(\.\w+)+?/.exec(path.basename(filePath))[1];
        var targetExtension = getArgumentProperties('extension').value.replace(/^\./,'');
        fs.writeFileSync(path.resolve(targetDirectory, targetFilename + '.' + targetExtension), result);
      }
    }
  }

  /**
   * Returns a human readable token representation of the provided `source`
   * relative to the `filePath`. If the `raw` argument is applied the output
   * will not rewrite the source, removing unecessary whitespace and normalize
   * synonyms.
   * @param  {String} source   File content
   * @param  {String} filePath File path (absolute or relative)
   * @return {String}          Readable token representation
   */
  function getAsTokens(source, filePath) {

    var tokens    = lexer.tokenize(source, {raw: getArgumentProperties('raw').value, filePath: filePath});
    var readables = [];

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      var tag   = token[0];
      var value = token[1];
      if (tag == 'WHITESPACE') {
        value = value.length;
      } else if (tag == 'TERMINATOR') {
        value = value.replace(/\n/, '\\n');
      }
      readables.push('[' + tag + ' ' + value + ']');
    }

    if (getArgumentProperties('verbose').value) {
      return readables.join('\n');
    }
    return readables.join(' ');
  }

  /**
   * Returns the provided `source` as nodes as they are used from within the
   * parser to construct the HTML markup. This method is provided mostly for
   * liten development purpose. If the `verbose` argument is applied the output
   * of this method will not be proper JSON but rather human friendly Object
   * structure with linebreaks and basic syntax highlighting.
   * @param  {String} source   File content
   * @param  {String} filePath File path (absolute or relative)
   * @return {String}          Node object in either JSON or human friendly form
   */
  function getAsNodes(source, filePath) {
    var tokens = lexer.tokenize(source, {raw: getArgumentProperties('raw').value, filePath: filePath});
    var nodes  = parser.parse(tokens, {filePath: filePath});

    if (getArgumentProperties('verbose').value) {
      return util.inspect(tools.cloneTag(nodes, true), {depth: null, colors: true});
    }
    return tools.toJSON(nodes);
  }

  /**
   * Returns `true` if the provided argument is in short or poly form. Poly
   * formated arguments are still considered short.
   * @param  {String}  argument Argument name
   * @return {Boolean}          `true` if `argument` is short
   */
  function isShortArgument(argument) {
    return isArgument(argument) && (/^\-{1,1}/.test(argument));
  }

  /**
   * Returns `true` if the provied value is a valid command line argument
   * @param  {String}  argument Argument name
   * @return {Boolean}          `true` if valid argument
   */
  function isArgument(argument) {
    return (/^\-/.test(argument));
  }

  /**
   * Returns `true` if the provided `argument` is a interpretable argument.
   * @param  {String}  argument Argument name
   * @return {Boolean}          `true` if `argument` can be interpreted
   *                            by liten CLI
   */
  function isValidArgument(argument) {
    return !!getArgumentProperties(argument);
  }

  /**
   * Provided `argument` and `potentialValue` are inserted in the current
   * session setup, setting values and interpretation flags.
   * @param  {String} argument       Argument name
   * @param  {String} potentialValue Value to be used incase the argument
   *                                 requires it
   * @return {UInt}                  Number of consumed values
   */
  function applyArgument(argument, potentialValue) {
    if (!isValidArgument(argument)) {
      stderr('Unrecognized argument: ' + argument);
      process.exit(2);
    }

    var properties  = getArgumentProperties(argument);
    var expectValue = !!properties.value;
    var newValue    = null;

    if (expectValue) {
      if (!potentialValue || isArgument(potentialValue)) {
        stderr('Invalid or missing value for argument: ' + argument);
        process.exit(2);
      }
      properties.value = potentialValue;
      return 2;
    }

    properties.value = true;
    return 1;
  }

  /**
   * Returns the currently applied argument properties.
   * @param  {String} argument Argument name
   * @return {Object}          Properties
   */
  function getArgumentProperties(argument) {
    var cleanArgument = argument.replace('-','');
    for (var i = 0; i < args.length; i++) {
      if (args[i].shortFlag == cleanArgument || args[i].longFlag == cleanArgument) {
        return args[i];
      }
    }
    return null;
  }

  return {
    interpret: interpret
  };

}());
