var mocha = require('mocha')
  , bleach = require('../')
  , should = require('should');

describe('bleach', function () {
  describe('cleaning', function () {
    describe('style tags', function () {
      it('should work with a complex example', function() {
        bleach.clean(
          [
            '<style type="text/css">',
            'p { color: red; background-color: blue;',
            'background-image: url("http://example.com/danger.png"); } ',
            '@font-face { font-family: "Bob";',
            ' src: url("http://example.com/bob.woff"); }',
            '#bob { background-image: url(http://example.com/bad.png);',
            '    color: purple;',
            '}',
            '</style>',
          ].join('\n'),
          {
            tags: ['style'],
            styles: ['color', 'background-color'],
          }
        ).should.equal(
          [
            '<style>',
            'p { color: red; background-color: blue; }',
            '#bob {',
            '    color: purple;',
            '}' + // trailing newline gets eaten
            '</style>'
          ].join('\n')
        );
      });

      it('should not get outwitted by comments', function() {
        bleach.clean(
          [
            '<style type="text/css">',
            'body {',
            '/* } */',
            'background-image: url(http://example.com/EVIL.png);',
            '/* { color: red; */',
            '}',
            '</style>'
          ].join('\n'),
          {
            tags: ['style'],
            attributes: { style: ['type'] },
            styles: ['color']
          }
        ).should.equal(
          [
            '<style type="text/css">',
            'body {',
            // This comment does get included because we are treating it as
            // part of the lead-in whitespace to the first rule.  (The comment
            // token does not get emitted by the tokenizer or processed by the
            // parser.)
            '/* } */',
            // this comment does not get included because it's not part of
            // a declaration.
            // '/* { color: red; */',
            '}' + // and we eat the trailing newline because we don't care...
            '</style>'
          ].join('\n'));

      });
    });
  });
});
