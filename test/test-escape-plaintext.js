var mocha = require('mocha')
  , bleach = require('../')
  , should = require('should');

describe('bleach', function () {
  describe('escaping', function () {
    it('should escape plaintext for elements', function() {
      bleach.escapePlaintextIntoElementContext([
        '<p>a <strong>"simple"',
        '</strong> example</p>'
      ].join('\n')).should.equal([
        '&lt;p&gt;a &lt;strong&gt;&quot;simple&quot;',
        '&lt;&#47;strong&gt; example&lt;&#47;p&gt;'
      ].join('\n'));
    });
    
    it('should escape plaintext for attributes', function() {
      bleach.escapePlaintextIntoAttribute([
        'try">\'to escape'
      ].join('\n')).should.equal([
        'try&quot;&gt;&apos;to&#32;escape'
      ].join('\n'));
    });
  });
});
