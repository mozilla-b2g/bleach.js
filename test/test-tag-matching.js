var mocha = require('mocha'),
    bleach = require('../'),
    should = require('should'),
    dirscan = require('./dirscan'),
    fs = require('fs'),
    path = require('path'),
    exists = fs.existsSync || path.existsSync,
    options = require('./unclean-options');

describe('bleach', function () {

  /**
   * Tests the use of <a> tags around
   * @return {[type]}
   */
  describe('tag-matching', function () {

    var outPath = path.join(__dirname, 'tag-matching', 'output');
    if (!exists(outPath)) {
      fs.mkdirSync(outPath, 511);
    }

    dirscan('tag-matching').forEach(function (test) {
      it(test.name, function () {
        var result = bleach.clean(test.source, options);

        // Write out file for our own inspection/diffs
        fs.writeFileSync(path.join(outPath, test.name) + '.html',
                         result, 'utf8');

        result.should.equal(test.expected);
      });
    });
  });
});
