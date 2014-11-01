var mocha = require('mocha'),
    fs = require('fs'),
    path = require('path'),
    exists = fs.existsSync || path.existsSync,
    bleach = require('../'),
    should = require('should'),
    dirscan = require('./dirscan'),
    options = {
      tags: [],
      strip: true,
      stripComments: true,
      prune: [
        'style',
        'button', // (forms)
        'datalist', // (forms)
        'script', // (script)
        'select', // (forms)
        'svg', // (svg)
        'title' // (non-body)
      ],
      asNode: true,
      maxLength: 100
    };

describe('bleach', function () {
  describe('snippets', function () {

    var outPath = path.join(__dirname, 'snippets', 'output');
    if (!exists(outPath)) {
      fs.mkdirSync(outPath, 511);
    }

    dirscan('snippets').forEach(function (test) {
      it(test.name, function () {
        var result = bleach.unescapeHTMLEntities(bleach.clean(test.source, options));

        // Write out file for our own inspection/diffs
        fs.writeFileSync(path.join(outPath, test.name) + '.html',
                         result, 'utf8');

        result.should.equal(test.expected);
      });
    });
  });
});
