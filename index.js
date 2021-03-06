var gulp = module.parent.require('gulp');
var path = require('path');

var file = require('gulp-file');
var mergeStream = require('merge-stream');

// parseExtensions takes in a list of extensions and outputs an array of the
// relevant folders. This filters out extensions that don't have a relevant (for example, an extension that doesn't have styles)
//
// inputExtensions: array of extension names
// folder: string, either 'lib' or 'styles'
function parseExtensions(inputExtensions, folder) {
  var extensions = [];
  inputExtensions.forEach(function(extName) {
    var ext = require('../' + extName);
    if (typeof ext.lib === 'undefined') {
      return;
    }
    var extension = {
      name: extName,
      path: path.join(path.dirname(require.resolve(extName)), folder),
      folder: folder
    };
    extension.glob = path.join(extension.path, '/**/*');
    extensions.push(extension)
  });
  return extensions;
}
// sourceExtensions generates a stream of sources from an extensions struct (genearted by parseExtensions)
function sourceExtensions(extensions, folder) {
  var sources = [];
  extensions.forEach(function(ext) {
    sources.push(gulp.src(ext.glob, { base: 'node_modules' }));
  });
  return sources;
}

// bundleType: 'library' or 'css'
function solarCompileCssFiles(inputExts, bundleType) {
  var folder = '';
  var filename = '';
  if (bundleType === 'library') {
    folder = 'lib';
    filename = '_solar-library-bundle.scss';
  } else if (bundleType === 'css') {
    folder = 'styles';
    filename = 'solar-css-bundle.scss';
  } else {
    // ERROR (this should never be reached since this is private)
    throw 'bundleType must be "packet" or "bundle"'
  }

  var extensions = parseExtensions(inputExts, folder);
  var sources = sourceExtensions(extensions);

  var contents = '// THIS IS AN AUTOGENERATED SOLAR ' + bundleType.toUpperCase() + ' BUNDLE\n';
  if (bundleType === 'css') {
    contents += "@import 'solar-library-bundle';\n\n";
  }
  extensions.forEach(function(ext) {
    contents += '@import "' + ext.name + '/' + folder + '/index";\n';
  });
  sources.push(file(filename, contents, { src: true }));
  return mergeStream(sources);
}

// takes in array of extension names, outputs a solar packet (lib)
function libraryBundle(inputExts) {
  return solarCompileCssFiles(inputExts, 'library');
}
// takes in array of extension names, outputs an uncompiled solar bundle (styles)
// TODO: cacheing: right now, a build runs libraryBundle twice
// TODO: More advanced: sourcemap
function cssBundle(inputExts) {
  // return solarCompileCssFiles(inputExts, 'css');
  // TODO: for some super weird reason, solar/styles/_index.scss isn't showing up
  // BUG: We just need some way of waiting until all files finished before sending to sass
  return mergeStream(solarCompileCssFiles(inputExts, 'library'), solarCompileCssFiles(inputExts, 'css'))
  //   .pipe(require('gulp-sass')())
}

module.exports = solar = {
  libraryBundle: libraryBundle,
  cssBundle: cssBundle,
};
