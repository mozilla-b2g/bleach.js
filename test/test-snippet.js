var mocha = require('mocha'),
    fs = require('fs'),
    path = require('path'),
    bleach = require('../'),
    should = require('should'),
    snippets = [],
    options = {
      tags: [],
      strip: true,
      stripComments: true,
      prune: [
        'style',
        '!DOCTYPE',
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


var names = [];
function scanForTestfiles() {
  var files = fs.readdirSync(path.join(__dirname, 'snippets'));
  files.forEach(function(filename) {
    var match = /^(.+)\.html$/.exec(filename);
    if (match)
      names.push(match[1]);
  });
}
scanForTestfiles();

names.forEach(function (name) {
  var sourcePath = path.join(__dirname , 'snippets', name) + '.html',
      expectedPath = path.join(__dirname, 'snippets', 'expected', name) +
                               '.html';
  snippets.push({
    name: name,
    source: fs.readFileSync(sourcePath, 'utf8'),
    expected: fs.readFileSync(expectedPath, 'utf8')
  });
});

describe('bleach', function () {
  describe('snippets', function () {

    snippets.forEach(function (snippet) {
      it(snippet.name, function () {
        var result = bleach.unescapeHTMLEntities(bleach.clean(snippet.source, options));
        //console.log('----');
        //console.log(result);
        //console.log('----');
        result.should.equal(snippet.expected);
      });
    });
  });
});
