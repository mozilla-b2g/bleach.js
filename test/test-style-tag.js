var mocha = require('mocha')
  , bleach = require('../')
  , should = require('should');

describe('bleach', function () {
  describe('cleaning', function () {
    describe('style tags', function () {
      it('should work with a complex example', function() {
        bleach.clean(
            '<style type="text/css">' +
            'p { color: red; background-color: blue;' +
            'background-image: url("http://example.com/danger.png"); } ' +
            '@font-face { font-family: "Bob"; ' +
            ' src: url("http://example.com/bob.woff"); }' +
            '</style>',
            {
              tags: ['style'],
              stripe: true,
              styles: ['color', 'background-color'],
            }
          ).should.equal(
            '<style>' +
            // whitespace roundtripping is implementation dependent...
            'p {color: red; background-color: blue;}' +
            '</style>'
          );
      });
    });
  });
});
