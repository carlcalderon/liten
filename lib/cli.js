/* cli */
module.exports = (function () {

  var liten  = require('./liten'),
      lexer  = require('./lexer'),
      parser = require('./parser'),
      tools  = require('./tools'),
      util   = require('util'),
      path   = require('path'),
      fs     = require('fs'),

  version = '1.0.2-1',

  stdout = console.log,
  stderr = console.error,

  args = [
    ['h', 'help',    'help',                                             false],
    ['o', 'output',  'sets the output directory',                        '.'],
    ['p', 'print',   'print out the compiled html',                      false],
    ['r', 'raw',     'print out the tokens the lexer produces',          false],
    ['t', 'tokens',  'print out the tokens the lexer/rewriter produces', false],
    ['n', 'nodes',   'print out the tree that the parser produces',      false],
    ['V', 'verbose', 'sets liten to be more elaborate',                  false],
    ['x', 'xhtml',   'if set, output will be xhtml compatible',          false],
    ['v', 'version', 'version',                                          false],
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

    var needle, value, match, i, j, opts, awaiting, files, source, result,
        tokens, token, tag, nodes, readables;

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

    // insert default opts
    for (needle = 0; needle < args.length; needle++) {
      opts[args[needle][1]] = opts[args[needle][1]] || args[needle][3];
    }

    // output version
    if (opts.version) {
      stdout(version);
      process.exit(0);
    }

    // output help
    if (opts.help) {
      stdout(usage());
      process.exit(0);
    }

    // validate files
    if (!files.length) {
      stderr('No files specifed. See "liten --help".');
      process.exit(1);
    }

    for (i = 0; i < files.length; i++) {
      if (!fs.existsSync(files[i])) {
        stderr('File does not exist (' + files[i] + ').');
        process.exit(1);
      }
    }

    for (i = 0; i < files.length; i++) {
      // read source file
      source = fs.readFileSync(files[i], 'utf8');

      // output tokens
      // any token not human-readable such as terminators and whitespace will
      // be converted prior to output
      if (opts.tokens) {
        tokens = lexer.tokenize(source, {raw: opts.raw, filePath: files[i]});
        readables = [],
        token = null;
        for (i = 0; i < tokens.length; i++) {
          token = tokens[i];
          tag = token[0];
          value = token[1];
          if (tag == 'WHITESPACE') {
            value = value.length;
          } else if (tag == 'TERMINATOR') {
            value = value.replace(/\n/, '\\n');
          }
          readables.push('[' + tag + ' ' + value + ']');
        }
        stdout(readables.join(' '));
        process.exit(0);
      }

      // output nodes
      if (opts.nodes) {
        tokens = lexer.tokenize(source, {raw: opts.raw, filePath: files[i]});
        nodes = parser.parse(tokens, {filePath: files[i]});

        if (opts.verbose) {
          stdout(util.inspect(tools.cloneTag(nodes, true), {depth: null, colors: true}));
        } else stdout(tools.toJSON(nodes));
        process.exit(0);

      }

      result = liten.compile(source, {xhtml: opts.xhtml, filePath: files[i]});

      if (opts.print) {
        stdout(result);
      } else {
        fs.writeFileSync(path.resolve(process.cwd(), opts.output, /(.+)(\.\w+)+?/.exec(path.basename(files[i]))[1] + '.html'), result);
      }
    }
  }

  return {
    interpret: interpret
  }

}());
