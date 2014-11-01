var mocha = require('mocha'),
    fs = require('fs'),
    path = require('path'),
    exists = fs.existsSync || path.existsSync,
    bleach = require('../'),
    should = require('should'),
    dirscan = require('./dirscan'),
    options = require('./unclean-options');

describe('bleach', function () {
  describe('unclean', function () {

    var outPath = path.join(__dirname, 'unclean', 'output');
    if (!exists(outPath)) {
      fs.mkdirSync(outPath, 511);
    }

    dirscan('unclean').forEach(function (test) {
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
