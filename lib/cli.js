/* cli */

module.exports = (function () {

  var liten  = require('./liten'),
      lexer  = require('./lexer'),
      parser = require('./parser'),
      util   = require('util'),
      fs     = require('fs'),

  stdout = console.log,
  stderr = console.error,

  args = [
    ['h', 'help',    'help',                                        false],
    ['o', 'output',  'sets the output directory',                   false],
    ['p', 'print',   'print out the compiled html',                 false],
    ['t', 'tokens',  'print out the tokens the lexer produces',     false],
    ['n', 'nodes',   'print out the tree that the parser produces', false],
    ['v', 'version', 'version',                                     false],
  ];

  function usage() {
    var result = '\nUsage: liten [options] path/to/file.liten\n\n';

    for (var i = 0; i < args.length; i++) {
      result += '  -'  + args[i][0] +
                ', --' + args[i][1] +
                '\t\t' + args[i][2] +
                '\n';
    }

    return result;
  }

  function interpret(argv) {

    var needle, value, match, i, j, opts, awaiting, files, source, result;

    opts = {};
    files = [];
    needle = 2;
    while(needle < argv.length) {

      value = argv[needle];
      arg = null;
      i = 0;

      // command or setting
      if (match = value.match(/(-+)([\w-]+)/)) {

        // long argument
        if (match[1].length > 1) {

          for (i = 0; i < args.length; i++) {
            if (args[i][1] == match[2]) {
              arg = args[i]
              opts[arg[1]] = !arg[3]
              if (typeof arg[3] == 'boolean') {
                awaiting = null;
              } else {
                awaiting = arg[1];
              }
              break;
            }

          }

          if (arg == null) {
            stderr('Unrecognized argument: --' + match[2]);
          }

        // short argument
        } else {

          list = match[2].split('');
          for (i = 0; i < list.length; i++) {
            for (j = 0; j < args.length; j++) {
              if (args[j][0] == list[i]) {
                arg = args[j]
                opts[arg[1]] = !arg[3]
                if (typeof arg[3] == 'boolean') {
                  awaiting = null;
                } else {
                  awaiting = arg[1];
                }
                break;
              }
            }
            if (arg == null) {
              stderr('Unrecognized argument: -' + list[i]);
            }
          }

        }

      // value
      } else {

        if (awaiting) {
          opts[awaiting] = value;
          awaiting = null;
        } else {
          files.push(value);
        }

      }

      needle++;
    }

    // output version
    if (opts.version) {
      stdout(liten.version);
      process.exit(0);
    }

    if (opts.help) {
      stdout(usage());
      process.exit(0);
    }

    // validate files
    if (!files.length) {
      stderr('No files specifed. See "liten --help".');
      process.exit(1);
    }

    for (var i = 0; i < files.length; i++) {
      if (!fs.existsSync(files[i])) {
        stderr('File does not exist (' + files[i] + ').');
        process.exit(1);
      }
    }

    source = fs.readFileSync(files[0], 'utf8');

    // output tokens
    if (opts.tokens) {
      var tokens = lexer.tokenize(source);
      stdout(tokens);
      process.exit(0);
    }

    // output nodes
    if (opts.nodes) {
      var tokens = lexer.tokenize(source),
          nodes = parser.parse(tokens);

      (function removeParent(object) {
        delete object.parent;
        for (var i = 0; i < object.children.length; i++) {
          removeParent(object.children[i]);
        }
      }(nodes));

      stdout(util.format('%j',nodes));
      process.exit(0);

    }

    result = liten.compile(source);

    if (opts.print) {
      stdout(result);
    }

  }

  return {
    interpret: interpret
  }

}());
