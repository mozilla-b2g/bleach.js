var mocha = require('mocha')
  , bleach = require('../')
  , should = require('should');

describe('bleach', function () {
  describe('cleaning', function () {

    it('should return nothing when given nothing', function () {
      bleach.clean('').should.equal('');
    });

    describe('with comments', function () {
      var comment = '<!-- this is a comment -->'
        , openComment = '<!-- this is an open comment'
        , otherComment = '<!-- this is another comment-->'
        , htmlWithComment = '<!-- comment -->Just text';

      it('should strip comments', function () {
        bleach.clean(comment).should.equal('');
      });

      it('should strip open comments', function () {
        bleach.clean(openComment).should.equal('');
      });

      it('should not strip comments if stripComments = false', function () {
        bleach.clean(comment, {stripComments: false}).should.equal(comment);
        bleach.clean(otherComment, {stripComments: false})
          .should.equal(otherComment);
      });

      it('should strip comment from html string', function () {
        bleach.clean(htmlWithComment).should.equal('Just text');
      });

      it('should not strip comment from html string if stripComments = false',
         function () {
        bleach.clean(htmlWithComment, {stripComments: false})
          .should.equal(htmlWithComment);
      });
    });

    // our parser had some sketchy issues with attributes
    describe('nefariously quoted html attributes', function() {
      it('should properly escape double-quotes', function() {
        var singleQuoteWithDoubleQuotes =
              "<abbr title='evil\" bad=\"moohaha'></abbr>",
            escapedSingleQuoted =
              '<abbr title="evil&quot; bad=&quot;moohaha"></abbr>';
        bleach.clean(singleQuoteWithDoubleQuotes)
          .should.equal(escapedSingleQuoted);

        var unquotedWithEmbeddedDoubleQuotes =
              '<abbr title=evil"lessbad></abbr>',
            escapedUnquoted =
              '<abbr title="evil&quot;lessbad"></abbr>';
        bleach.clean(unquotedWithEmbeddedDoubleQuotes)
          .should.equal(escapedUnquoted);
      });
    });

    describe('style/script tags', function() {
      // the regexp originally was greedy on which could do bad things.
      it('should not be too greedy', function() {
        // the greedy would indeed escape the <b> tags here.
        var doubleStyle =
              '<style>disappear </style>should <b>be</b> present' +
              '<style> disappear2</style>',
            escapedDoubleStyle =
              '&lt;style&gt;disappear &lt;/style&gt;should <b>be</b> present' +
              '&lt;style&gt; disappear2&lt;/style&gt;',
            strippedDoubleStyle =
              'disappear should <b>be</b> present disappear2',
            prunedDoubleStyle =
              'should <b>be</b> present';

        bleach.clean(doubleStyle)
          .should.equal(escapedDoubleStyle);
        bleach.clean(doubleStyle, {strip: true})
          .should.equal(strippedDoubleStyle);
        bleach.clean(doubleStyle, {prune: ['style']})
          .should.equal(prunedDoubleStyle);
      });

      it('should not let case-sensitivity make it too greedy', function() {
        var doubleStyle =
              '<style>disappear </STYLE>should <b>be</b> present' +
              '<STYLE> disappear2</style>',
            escapedDoubleStyle =
              '&lt;style&gt;disappear &lt;/style&gt;should <b>be</b> present' +
              '&lt;style&gt; disappear2&lt;/style&gt;',
            strippedDoubleStyle =
              'disappear should <b>be</b> present disappear2',
            prunedDoubleStyle =
              'should <b>be</b> present';

        bleach.clean(doubleStyle)
          .should.equal(escapedDoubleStyle);
        bleach.clean(doubleStyle, {strip: true})
          .should.equal(strippedDoubleStyle);
        bleach.clean(doubleStyle, {prune: ['style']})
          .should.equal(prunedDoubleStyle);
      });
    });

    describe('normalish html', function () {
      it('should do nothing to non-html string', function () {
        bleach.clean('no html string').should.equal('no html string');
      });

      it('should allow safe html', function () {
        var strongHtml = 'an <strong>allowed</strong> tag'
          , emHtml = 'another <strong>good</strong> tag';
        bleach.clean(strongHtml).should.equal(strongHtml);
        bleach.clean(emHtml).should.equal(emHtml);
      });

      it('should allow safe html', function () {
        var strongHtml = 'an <strong>allowed</strong> tag'
          , emHtml = 'another <strong>good</strong> tag';
        bleach.clean(strongHtml).should.equal(strongHtml);
        bleach.clean(emHtml).should.equal(emHtml);
      });

      it('should fix bad html', function () {
        bleach.clean('a <em>fixed tag')
          .should.equal('a <em>fixed tag</em>');
      });

      it('should strip out attributes', function () {
        var tags = ['span', 'br']
          , attrs = {span: ['style']}
          , html = 'a <br/><span style="color:red">test</span>';
        bleach.clean(html, {tags: tags, attributes: attrs})
              .should.equal('a <br/><span style="">test</span>');
      });

      it('should strip out attributes, round 2', function () {
        var attrs = {'a': ['rel', 'href']}
          , html = '<a href="http://xx.com" rel="alternate">xx.com</a>';

        bleach.clean(html).should.equal('<a href="http://xx.com">xx.com</a>');
        bleach.clean(html, {attributes: attrs}).should.equal(html);
      });

      it('should remove disallowed html', function () {
        bleach.clean('a <script>safe()</script> test')
          .should.equal('a &lt;script&gt;safe()&lt;/script&gt; test');

        bleach.clean('a <style>body{}</style> test')
          .should.equal('a &lt;style&gt;body{}&lt;/style&gt; test');
      });

      it('should remove hrefs on elements that should not have them', function () {
        bleach.clean('<em href="fail">no link</em>')
          .should.equal('<em>no link</em>');
      });

      it('should convert bare entities to escaped entities', function () {
        bleach.clean('an & entity').should.equal('an &amp; entity');
        bleach.clean('an < entity').should.equal('an &lt; entity');
        bleach.clean('tag < <em>and</em> entity')
              .should.equal('tag &lt; <em>and</em> entity');
        bleach.clean('&amp;').should.equal('&amp;');
      });

      it('should not mess with existing entities', function () {
        var s = '&lt;em&gt;strong&lt;/em&gt;';
        bleach.clean(s).should.equal(s);
      });

      it('should serialize?', function () {
        var s = '<table></table>';
        bleach.clean(s, {tags: ['table']}).should.equal(s);
//        bleach.linkify('<table>test</table>').should.equal('test<table></table>');
        bleach.clean('<p>test</p>', {tags: ['p']}).should.equal('<p>test</p>');
      });

      it('should handle no href links', function () {
        var s = '<a name="anchor">x</a>';
//        bleach.linkify(s).should.equal(s);
//        bleach.linkify(s, {nofollow: false}).should.equal(s);
      });

      it('should handle weird strings', function () {
        var s = '</3';
        bleach.clean(s).should.equal('&lt;/3');
      });

      it('should strip the **** outta some tags', function () {
        var s;
        bleach.clean('a test <em>with</em> <b>html</b> tags', {strip: true})
              .should.equal('a test <em>with</em> <b>html</b> tags');
        bleach.clean('a test <em>with</em> <img src="http://example.com/"> <b>html</b> tags', {strip: true})
              .should.equal('a test <em>with</em>  <b>html</b> tags');

        s = '<p><a href="http://example.com/">link text</a></p>';
        bleach.clean(s, {tags: ['p'], strip: true})
              .should.equal('<p>link text</p>');

        s = '<p><span>multiply <span>nested <span>text</span></span></span></p>';
        bleach.clean(s, {tags: ['p'], strip: true})
              .should.equal('<p>multiply nested text</p>');

        s = '<p><a href="http://example.com/"><img src="http://example.com/"></a></p>';
        bleach.clean(s, {tags: ['p', 'a'], strip: true})
              .should.equal('<p><a href="http://example.com/"></a></p>');
      });

      it('should allow styles when styles are allowed', function () {
        var ATTR = ['style']
          , STYLE = ['color']
          , blank = '<b style=""></b>'
          , s = '<b style=" color: blue;"></b>';
        bleach.clean('<b style="top:0"></b>', {attributes: ATTR})
              .should.equal(blank);
        bleach.clean(s, {attributes: ATTR, styles: STYLE}).should.equal(s);
        bleach.clean('<b style="top: 0; color: blue;"></b>',
                     {attributes: ATTR, styles: STYLE}).should.equal(s);
      });

      it('should be an idempotent transformation', function () {
        var dirty = '<span>invalid & </span> < extra http://link.com<em>'
          , clean = bleach.clean(dirty);
//          , linked = bleach.linkify(dirty);
        bleach.clean(clean).should.equal(clean);
//        bleach.linkify(linked).should.equal(linked);
      });

      it('should output lowercase HTML', function () {
        var dirty = '<EM CLASS="FOO">BAR</EM>'
          , clean = '<em class="FOO">BAR</em>';
        bleach.clean(dirty, {attributes: ['class']}).should.equal(clean);
      });


      it('should handle wildcard attributes', function () {
        var ATTR = {'*': ['id'], 'img': ['src'] }
          , TAG = ['img', 'em']
          , dirty = 'both <em id="foo" style="color: black">can</em> have <img id="bar" src="foo"/>'
          , clean = 'both <em id="foo">can</em> have <img id="bar" src="foo"/>';
        bleach.clean(dirty, {tags: TAG, attributes: ATTR}).should.equal(clean);
      });

      it('should prune entire sub-trees when specified', function() {
        var style = 'before <style>p { color: red; }</style>after';
        bleach.clean(style, { prune: ['style'] })
          .should.equal('before after');

        var svgSansNS = '<svg><g>foo</g></svg>';
        var svgWithNS = '<g:svg><g:g>foo</g></svg>';
        bleach.clean(svgSansNS, { prune:['svg'] })
          .should.equal('');
        bleach.clean(svgWithNS, { prune:['svg'] })
          .should.equal('');
      });

      it('should prioritize prune over legal tags', function() {
        var style = 'before <style>p { color: red; }</style>after';
        bleach.clean(style, { tags: ['style'], prune: ['style'] })
          .should.equal('before after');
      });

      it('should not get confused by unbalanced tags while pruning',
         function() {
        var depth1 =
              '<prune><bogus></prune>foo <b>bar</b>',
            depth2 =
              '<prune><bogus><prune><bogus></prune></prune>' +
              'foo <b>bar</b>';
        bleach.clean(depth1, { tags: ['b'], prune: ['prune'], strip: true })
          .should.equal('foo <b>bar</b>');
      });
    });
  });
});

/*
def test_xml_render():
    parser = html5lib.HTMLParser()
    eq_(bleach._render(parser.parseFragment('')), '')

def test_wildcard_attributes():
    ATTR = {
        '*': ['id'],
        'img': ['src'],
    }
    TAG = ['img', 'em']
    dirty = (u'both <em id="foo" style="color: black">can</em> have '
             u'<img id="bar" src="foo"/>')
    clean = u'both <em id="foo">can</em> have <img id="bar" src="foo">'
    eq_(clean, bleach.clean(dirty, tags=TAG, attributes=ATTR))


def test_sarcasm():
    """Jokes should crash.<sarcasm/>"""
    dirty = u'Yeah right <sarcasm/>'
    clean = u'Yeah right &lt;sarcasm/&gt;'
    eq_(clean, bleach.clean(dirty))
*/
