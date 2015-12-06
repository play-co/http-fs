var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');
var Busboy = require('busboy');
var constants = process.binding('constants');
var glob = require('glob');

var METHODS = require('./methods');

var formParser = bodyParser.urlencoded({extended: false});

module.exports = function mountFileSystem(basePath, opts) {
  basePath = path.normalize(path.resolve(basePath));
  if (!/[\/\\]$/.test(basePath)) {
    basePath += path.sep;
  }

  var handlers = {};

  if (opts.readOnly) {
    // TODO
  } else {
    Object.keys(METHODS).forEach(function (name) {
      createHandler(opts.fs, handlers, name, METHODS[name]);
    });
  }

  var methods = {};
  Object.keys(METHODS).forEach(function (name) {
    methods[name] = METHODS[name];
  });

  if (opts.methods) {
    Object.keys(opts.methods).forEach(function (name) {
      methods[name] = opts.methods[name];
    });
  }

  Object.keys(methods).forEach(function (name) {
    createHandler(opts.fs || fs, handlers, name, methods[name]);
  });

  handlers['/_methods'] = function (basePath, request, response) {
    response.json(methods);
  };

  handlers['/_constants'] = function (basePath, request, response) {
    response.send({
      S_IFMT: constants.S_IFMT,
      S_IFDIR: constants.S_IFDIR,
      S_IFREG: constants.S_IFREG,
      S_IFBLK: constants.S_IFBLK,
      S_IFCHR: constants.S_IFCHR,
      S_IFLNK: constants.S_IFLNK,
      S_IFIFO: constants.S_IFIFO,
      S_IFSOCK: constants.S_IFSOCK,
    });
  };

  function parseForm(req, res, next) {
    if (req.is('multipart/form-data')) {

      req.files = {};
      req.fields = {};

      req.pipe(new Busboy({ headers: req.headers }))
        .on('file', function (fieldname, file, filename, encoding, mimetype) {
          var buffer = [];
          file.on('data', function (chunk) { buffer.push(chunk); });
          file.on('error', function (err) {
            // TODO?
          });

          file.on('end', function () {
            req.files[fieldname] = Buffer.concat(buffer);
          });
        })
        .on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
          req.fields[fieldname] = val;
        })
        .on('finish', onParse.bind(this, req, res));
    } else {
      formParser(req, res, function (err) {
        if (err) { next(err); }
        req.fields = req.body;
        req.files = {};
        console.log(req.fields);
        onParse(req, res);
      });
    }
  }

  function onParse(req, res) {
    try {
      handlers[req.url](basePath, req, res);
    } catch (e) {
      res.send({err: {
        message: e.message,
        stack: e.stack
      }});
    }
  }

  return function remoteFS(req, res, next) {
    if (req.method === 'POST' && handlers[req.url]) {
      parseForm(req, res, next);
    } else {
      next();
    }
  };
};

module.exports.METHODS = METHODS;

function verify(basePath, name, value) {
  if (typeof value !== 'string') {
    throw new Error('Invalid path for parameter ' + name);
  }

  value = path.normalize(path.resolve(basePath, value.replace(/^[\/\\]+/, '')));
  if (value + path.sep === basePath) {
    value += path.sep;
  } else if (value.substring(0, basePath.length) !== basePath) {
    throw new Error('Invalid path for parameter ' + name);
  }

  return value;
}

function createHandler(fs, handlers, name, opts) {
  var params = opts.params;
  var handler;
  switch (name) {
    case 'exists':
      handler = function (basePath, request, response) {
        // TODO: why is path sent as a file...
        var path = request.files['path'].toString();
        fs.exists(verify(basePath, 'path', path), function (exists) {
          response.send({res: exists});
        });
      };
      break;
    case 'glob':
      handler = function (basePath, request, response) {
        var globString = request.files.glob.toString();
        var globOptions = request.files.options ? JSON.parse(request.files.options.toString()) : null;

        glob(basePath + globString, globOptions, function (err, files) {
          // Remove the basePath from the beginning of all the file paths
          var relativePaths = [];
          files.forEach(function(filePath) {
            var relativePath = filePath.slice(basePath.length, filePath.length);
            if (relativePath.indexOf('/') !== 0) {
              relativePath = '/' + relativePath;
            }
            relativePaths.push(relativePath);
          });
          response.send({ err: err, res: relativePaths });
        });
      };
      break;
    default:
      handler = function (basePath, request, response) {
        var args = [];
        params.forEach(function (param) {
          var name = param.name;
          var value = request.fields[name] || request.files[name];
          if (Buffer.isBuffer(value) && !param.isData) {
            value = value.toString('utf-8');
          }

          if (!param.optional || value !== undefined) {
            args.push(param.isPath ? verify(basePath, name, value) : value);
          }
        });

        console.log(name, args);

        args.push(function (err, res) {
          if (err) { console.log(err); }

          response.send({err: err, res: res});
        });

        fs[name].apply(fs, args);
      };
      break;
  }

  handlers['/' + name] = handler;
}
