/**
 * Scans a directory for test files that end in .html. The contents of those
 * files will be read in, as well as a matching testDirName/expected version,
 * and then returned in a structure that can be used to pass to bleach calls for
 * tests.
 *
 * @param {String} dirName The directory name to look into. Relative to
 * the directory containing this file.
 *
 * @return {Object}
 */
var fs = require('fs');
var path = require('path');

module.exports = function(testDirName) {
  'use strict';

  var results = [];
  var names = [];

  var files = fs.readdirSync(path.join(__dirname, testDirName));
  files.forEach(function(filename) {
    var match = /^(.+)\.html$/.exec(filename);
    if (match)
      names.push(match[1]);
  });

  names.forEach(function (name) {
    var sourcePath = path.join(__dirname , testDirName, name) + '.html',
        expectedPath = path.join(__dirname, testDirName, 'expected', name) +
                                 '.html';
    results.push({
      name: name,
      source: fs.readFileSync(sourcePath, 'utf8'),
      expected: fs.readFileSync(expectedPath, 'utf8')
    });
  });

  return results;
};
