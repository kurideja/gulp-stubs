var through = require('through2');
var fs = require('fs');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;

const PLUGIN_NAME = 'gulp-stubs';

/**
 * @desc
 * @param {string|Buffer} file
 * @return {Array}
 */
function getMethods(file) {
  // TODO: make less jasmine-dependent by configuring description API name
  var re = /.*(describe\(.*)',/g;
  var str = file.contents.toString();
  var match;
  var descriptions = [];
  var methods;
  var methodIndent;

  while (match = re.exec(str)) {
    descriptions.push(match[1]);
  }

  descriptions = descriptions
    .map(prepareDescription)
    .filter(function(description) {
      return description.methodName;
    });

  if (!descriptions[0]) {
    return [];
  }

  methodIndent = descriptions[0].indent.length;

  methods = descriptions
    .filter(function(description) {
      return description.indent.length === methodIndent;
    })
    .map(function(description) {
      return description.methodName;
    });

  return methods;
}

/**
 * @desc Associate description with indentation
 *
 * @param {string} description
 * @return {{indent, methodName}}
 */
function prepareDescription(description) {
  return {
    indent: getIndent(description, 'describe'),
    methodName: extractMethodName(description)
  }
}

/**
 * @desc retrieves camelCase method name from string
 * E.g. method name from `describe('methodName -->` will be parsed as `methodName`
 * E.g. method name from `describe('SomeUnit -->` will be parsed as and empty string
 * @param {string} description
 * @return {string}
 */
function extractMethodName(description) {
  var re = /(\w+)/g;
  var match;
  var name;

  match = re.exec(description);
  // We want second word from given string that includes testing framework's description method name
  match = re.exec(description);

  name = match ? match[0] : '';

  if (name && name.charAt(0) === name.charAt(0).toLocaleLowerCase()) {
    return name;
  }

  return '';
}

/**
 * @desc Assume that unit file is in the same directory and has the same name but without .spec
 * @param {string} specPath
 * @return {string}
 */
function unitPath(specPath) {
  return specPath.replace('.spec', '');
}

// Plugin level function(dealing with files)
function gulpStubs(config) {
  var masterTemplate;

  if (!config.marker) {
    throw new PluginError(PLUGIN_NAME, 'Missing marker definition!');
  }

  if (config.templateUrl) {
    fs.readFile(config.templateUrl, 'utf8', function(err, contents) {
      contents = (contents || '').trim();
      if (err) {
        return console.log(err);
      }

      if (!contents) {
        throw new PluginError(PLUGIN_NAME, 'Provided template is empty')
      }

      masterTemplate = contents;
    });
  }

  return through.obj(stubMethods);

  /**
   * @desc Main handler that each file passed to plugin goes through
   * @param {string|Buffer} file
   * @param {string} enc
   * @param {Function} cb
   * @return {*}
   */
  function stubMethods(file, enc, cb) {
    var methods;

    if (file.isNull()) {
      // return empty file
      return cb(null, file);
    }

    methods = getMethods(file);

    fs.readFile(unitPath(file.path), 'utf8', function(err, contents) {
      if (!contents) {
        return;
      }

      fs.writeFile(unitPath(file.path), getStubbed(contents, methods), function(err) {
        if (err) {
          return console.log(err);
        }
      });
    });

    cb(null, file);
  }

  /**
   * @desc Gets file content with missing methods' stubs inserted
   * @param {string} contents
   * @param {Array} methods
   * @return {string}
   */
  function getStubbed(contents, methods) {
    var stubPosition = getPositionForStub(contents);
    var indent = getIndent(contents, config.marker);
    var unitName = getUnitName(contents);

    if (stubPosition === -1) {
      return contents;
    }

    methods.forEach(insertStub);

    /**
     * @desc if method is missing, inserts a generated stub right after the marker
     * @param {string} method
     */
    function insertStub(method) {
      var temp = '';
      if (contents.indexOf('function ' + method) > -1) {
        return;
      }

      temp += contents.substr(0, stubPosition);
      temp += compileStub(method, indent, unitName);
      temp += contents.substr(stubPosition);

      contents = temp;
    }

    return contents;
  }

  /**
   * @desc Figures out position for stub. It should be negative only when no marker is found
   * @param {string} contents
   * @return {*}
   */
  function getPositionForStub(contents) {
    var index = contents.indexOf(config.marker);
    var position = 0;

    if (index === -1) {
      return index;
    }
    position += index;
    position += config.marker.length;

    return position;
  }

  /**
   * @desc Creates stub that can be inserted into the code
   * @param {string} method
   * @param {string} indent
   * @param {string} unitName
   * @return {string}
   */
  function compileStub(method, indent, unitName) {
    var template = masterTemplate || 'function {name}() {}';

    template = template
      .replace(/\{name}/g, method)
      .replace(/\{unit}/, unitName)
      .replace(/^(.)/gm, indent + '$1');

    template = '\n\n' + template;

    return template;
  }
}

/**
 * @desc Uses JSDoc notation to get unit's name
 * @param {string} contents
 * @return {string}
 */
function getUnitName(contents) {
  var re = /@type {{(.*)}}/;
  var match = re.exec(contents);
  return match ? match[1] : '';
}

/**
 * @desc gets indentation, i.e. whitespace that precedes marker
 * @param {string} contents
 * @param {string} marker
 * @return {string}
 */
function getIndent(contents, marker) {
  var indent;
  var match;
  var re = /(^[\s]+)/;
  var markerLine = contents
    .split('\n')
    .filter(function(line) {
      return line.indexOf(marker) > -1;
    })
    .shift();

  match = re.exec(markerLine);
  indent = match ? match[0] : '';

  return indent;
}

module.exports = gulpStubs;
