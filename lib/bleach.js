// UMD boilerplate to work across node/AMD/naked browser:
// https://github.com/umdjs/umd
(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else {
        // Browser globals
        root.Bleach = factory();
    }
}(this, function () {

var ALLOWED_TAGS = [
    'a',
    'abbr',
    'acronym',
    'b',
    'blockquote',
    'code',
    'em',
    'i',
    'li',
    'ol',
    'strong',
    'ul'
];
var ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title'],
    'abbr': ['title'],
    'acronym': ['title']
};
var ALLOWED_STYLES = [];

var Node = {
  ELEMENT_NODE                :  1,
  ATTRIBUTE_NODE              :  2,
  TEXT_NODE                   :  3,
  CDATA_SECTION_NODE          :  4,
  ENTITY_REFERENCE_NODE       :  5,
  ENTITY_NODE                 :  6,
  PROCESSING_INSTRUCTION_NODE :  7,
  COMMENT_NODE                :  8,
  DOCUMENT_NODE               :  9,
  DOCUMENT_TYPE_NODE          : 10,
  DOCUMENT_FRAGMENT_NODE      : 11,
  NOTATION_NODE               : 12
};

var DEFAULTS = {
  tags: ALLOWED_TAGS,
  prune: [],
  attributes: ALLOWED_ATTRIBUTES,
  styles: ALLOWED_STYLES,
  stripMode: false,
  stripComments: true
};

var bleach = {};

/**
 * Clean a string.
 */
bleach.clean = function (html, opts) {
  if (!html) return '';

  // This is poor's man doctype/meta cleanup. I wish DOMParser works in a
  // worker but it sounds like a dream, see bug 677123.
  // Someone needs to come with a better approach but I'm running out of
  // time...
  html = html.replace(/^\s*<!DOCTYPE.+>/g, '');
  html = html.replace(/\s*<meta.+>/g, '');

  return bleach.cleanNode(html, opts);
};




/**
 */
bleach.cleanNode = function(html, opts) {
try {
  function debug(str) {
    console.log("Bleach: " + str + "\n");
  }

  opts = opts || DEFAULTS;

  var attrsByTag = opts.hasOwnProperty('attributes') ?
                    opts.attributes : DEFAULTS.attributes;
  var wildAttrs;
  if (Array.isArray(attrsByTag)) {
    wildAttrs = attrsByTag;
    attrsByTag = {};
  } else if (attrsByTag.hasOwnProperty('*')) {
    wildAttrs = attrsByTag['*'];
  } else {
    wildAttrs = [];
  }
  var sanitizeOptions = {
    ignoreComment: ('stripComments' in opts) ? opts.stripComments
                                             : DEFAULTS.stripComments,
    allowedStyles: opts.styles || DEFAULTS.styles,
    allowedTags: opts.tags || DEFAULTS.tags,
    stripMode: ('strip' in opts) ? opts.strip : DEFAULTS.strip,
    pruneTags: opts.prune || DEFAULTS.prune,
    allowedAttributesByTag: attrsByTag,
    wildAttributes: wildAttrs,
    callbackRegexp: opts.callbackRegexp || null,
    callback: opts.callbackRegexp && opts.callback || null,
  };

  var sanitizer = new HTMLSanitizer(sanitizeOptions);
  HTMLParser.HTMLParser(html, sanitizer);
  return sanitizer.output;
} catch(e) {
  console.error(e, '\n', e.stack);
}

/*
*/
};


var RE_NORMALIZE_WHITESPACE = /\s+/g;

/**
 * Returns a text snippet from an HTML string.
 */
bleach.generateSnippet = function (html, desiredLength) {
  try {
    var sanitizer = new SnippetSanitizer(desiredLength);
    HTMLParser.HTMLParser(html, sanitizer);
  } catch(e) {
    dump("Error: " + e + "\n");
  }

  return sanitizer.output;
};


var SnippetSanitizer = function(maxLength) {
  this.output = '';
  this.ignoreText = false;
  this.maxLength = maxLength;
};

SnippetSanitizer.prototype = {
  start: function(tag, attrs, unary) {
    if (unary)
      return;

    if (tag == 'blockquote' || tag == 'style') {
      this.ignoreText++;
    }
  },

  end: function(tag) {
    if (tag == 'blockquote' || tag == 'style') {
      this.ignoreText--;
    }
  },

  chars: function(text) {
    if (this.ignoreText)
      return;

    // the whitespace down to one whitespace character.
    var normalizedText = text.replace(RE_NORMALIZE_WHITESPACE, ' ');

    // If the join would create two adjacents spaces, then skip the one
    // on the thing we are concatenating.
    var length = this.output.length;
    if (length && normalizedText[0] === ' ' && this.output[length - 1] === ' ')
      normalizedText = normalizedText.substring(1);

    this.output += normalizedText;
    if (this.output.length >= this.maxLength) {
      this.output = this.output.substring(0, this.maxLength);
      // XXX We got the right numbers of chars, let's exit brutally from
      // the parser in order to avoid spending all our life in it.
      // Obviously we should do better...
      throw new Error("");
    }
  },

  comments: function(comment) {
    // Nobody care about comments here...
  }
}



var HTMLSanitizer = function(options) {
  this.output = '';

  this.ignoreComment = options.ignoreComment;
  this.allowedStyles = options.allowedStyles;
  this.allowedTags = options.allowedTags;
  this.stripMode = options.stripMode;
  this.pruneTags = options.pruneTags;
  this.allowedAttributesByTag = options.allowedAttributesByTag;
  this.wildAttributes = options.wildAttributes;
  this.ignoreText = options.ignoreText;

  this.callbackRegexp = options.callbackRegexp;
  this.callback = options.callback;

  this.isInsideStyleTag = false;
  this.isInsideStrippedTag = 0;
  // Tracks our current pruning depth
  this.isInsidePrunedTag = 0;
};

HTMLSanitizer.prototype = {
  start: function(tag, attrs, unary) {
    if (this.isInsidePrunedTag) {
      if (!unary)
        this.isInsidePrunedTag++;
      return;
    }
    if (this.pruneTags.indexOf(tag) !== -1) {
      this.isInsidePrunedTag = 1;
      return;
    }
    if (this.allowedTags.indexOf(tag) === -1) {
      // In strip mode we discard the tag rather than escaping it.
      if (this.stripMode) {
        if (!unary) {
          this.isInsideStrippedTag++;
        }
        return;
      }

      // The tag is not in the whitelist
      this.output += "&lt;" + (unary ? "/" : "") + tag + "&gt;";
      return;
    }

    this.isInsideStyleTag = (tag == "style" && !unary);

    // If a callback was specified and it matches the tag name, then invoke
    // the callback.  This happens before the attribute filtering so that
    // the function can observe dangerous attributes, but in the event of
    // the (silent) failure of this function, they will still be safely
    // removed.
    var callbackRegexp = this.callbackRegexp;
    if (callbackRegexp && callbackRegexp.test(tag)) {
      attrs = this.callback(tag, attrs);
    }

    var whitelist = this.allowedAttributesByTag[tag];
    var wildAttrs = this.wildAttributes;
    var result = "<" + tag;
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      var attrName = attr.name.toLowerCase();

      if (wildAttrs.indexOf(attrName) !== -1 ||
          (whitelist && whitelist.indexOf(attrName) !== -1)) {
        if (attrName == "style") {
          var attrValue = CSSParser.parseAttribute(attr.escaped,
                                                   this.allowedStyles);
          result += " " + attrName + '="' + attrValue + '"';
        } else {
          result += " " + attrName + '="' + attr.escaped + '"';
        }
      }
    }
    result += (unary ? "/" : "") + ">";

    this.output += result;
  },

  end: function(tag) {
    if (this.isInsidePrunedTag) {
      this.isInsidePrunedTag--;
      return;
    }
    if (this.allowedTags.indexOf(tag) === -1) {
      if (this.isInsideStrippedTag) {
        this.isInsideStrippedTag--;
        return;
      }

      this.output += "&lt;/" + tag + "&gt;";
      return;
    }

    if (this.isInsideStyleTag) {
      this.isInsideStyleTag = false;
    }

    this.output += "</" + tag + ">";
  },

  chars: function(text) {
    if (this.isInsidePrunedTag)
      return;
    if (this.isInsideStyleTag) {
      this.output += CSSParser.parseBody(text, this.allowedStyles);
      return;
    }

    this.output += escapeHTMLEntities(text);
  },

  comment: function(comment) {
    if (this.isInsidePrunedTag)
      return;
    if (this.ignoreComment)
      return;
    this.output += '<!--' + comment + '-->';
  }
};

/*
 * HTML Parser By John Resig (ejohn.org)
 * Although the file only calls out MPL as a valid license, the upstream is
 * available under Apache 2.0 and John Resig has indicated by e-mail to
 * asuth@mozilla.com on 2013-03-13 that Apache 2.0 is fine.  So we are using
 * it under Apache 2.0.
 * http://ejohn.org/blog/pure-javascript-html-parser/
 *
 * Original code by Erik Arvidsson, tri-licensed under Apache 2.0, MPL 1.1
 * (probably implicitly 1.1+), or GPL 2.0+ (as visible in the file):
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 *
 * // Use like so:
 * HTMLParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 */

var HTMLParser = (function(){
  // NOTE: tag regexps changed to ignore name-spaces!
  // via (?:[-A-Za-z0-9_]+:)? to eat the namespace bit
  // Regular Expressions for parsing tags and attributes
  var startTag = /^<(?:[-A-Za-z0-9_]+:)?([-A-Za-z0-9_]+)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
    endTag = /^<\/(?:[-A-Za-z0-9_]+:)?([-A-Za-z0-9_]+)[^>]*>/,
    attr = /([-A-Za-z0-9_]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g;

  // Empty Elements - HTML 4.01
  var empty = makeMap("area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed");

  // Block Elements - HTML 4.01
  var block = makeMap("address,applet,blockquote,button,center,dd,del,dir,div,dl,dt,fieldset,form,frameset,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,p,pre,script,table,tbody,td,tfoot,th,thead,tr,ul");

  // Inline Elements - HTML 4.01
  var inline = makeMap("a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");

  // Elements that you can, intentionally, leave open
  // (and which close themselves)
  var closeSelf = makeMap("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");

  // Attributes that have their values filled in disabled="disabled"
  var fillAttrs = makeMap("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected");

  // Special Elements (can contain anything)
  var special = makeMap("script,style");

  var HTMLParser = this.HTMLParser = function( html, handler ) {
    var index, chars, match, stack = [], last = html;
    stack.last = function(){
      return this[ this.length - 1 ];
    };

    while ( html ) {
      chars = true;

      // Make sure we're not in a script or style element
      if ( !stack.last() || !special[ stack.last() ] ) {

        // Comment
        if ( html.indexOf("<!--") == 0 ) {
          index = html.indexOf("-->");

                                        // WHATWG spec says the text can't start
                                        // with the closing tag.
          if ( index >= 5 ) {
            if ( handler.comment )
              handler.comment( html.substring( 4, index ) );
            html = html.substring( index + 3 );
            chars = false;
          } else {
            // The comment does not have a end. Let's return the whole string as a comment then.
            if ( handler.comment )
              handler.comment( html.substring( 4, -1 ) );
            html = '';
            chars = false;
          }

        // end tag
        } else if ( html.indexOf("</") == 0 ) {
          match = html.match( endTag );

          if ( match ) {
            html = html.substring( match[0].length );
            match[0].replace( endTag, parseEndTag );
            chars = false;
          }

        // start tag
        } else if ( html.indexOf("<") == 0 ) {
          match = html.match( startTag );

          if ( match ) {
            html = html.substring( match[0].length );
            match[0].replace( startTag, parseStartTag );
            chars = false;
          }
        }

        if ( chars ) {
          index = html.indexOf("<");

          if (index === 0) {
            // This is not a valid tag in regards of the parser.
            var text = html.substring(0, 1);
            html = html.substring(1);
          } else {
            var text = index < 0 ? html : html.substring( 0, index );
            html = index < 0 ? "" : html.substring( index );
          }

          if ( handler.chars )
            handler.chars( text );
        }

      } else {
        html = html.replace(new RegExp("(.*)<\/" + stack.last() + "[^>]*>"), function(all, text){
          text = text.replace(/<!--(.*?)-->/g, "$1")
                     .replace(/<!\[CDATA\[(.*?)]]>/g, "$1");

          if ( handler.chars )
            handler.chars( text );

          return "";
        });

        parseEndTag( "", stack.last() );
      }

      if ( html == last ) {
        console.log(html);
        console.log(last);
        throw "Parse Error: " + html;
      }
      last = html;
    }

    // Clean up any remaining tags
    parseEndTag();

    function parseStartTag( tag, tagName, rest, unary ) {
      tagName = tagName.toLowerCase();

      if ( block[ tagName ] ) {
        while ( stack.last() && inline[ stack.last() ] ) {
          parseEndTag( "", stack.last() );
        }
      }

      if ( closeSelf[ tagName ] && stack.last() == tagName ) {
        parseEndTag( "", tagName );
      }

      unary = empty[ tagName ] || !!unary;

      if ( !unary )
        stack.push( tagName );

      if ( handler.start ) {
        var attrs = [];

        rest.replace(attr, function(match, name) {
          // The attr regexp capture groups:
          // 1: attribute name
          // 2: double-quoted attribute value
          // 3: single-quoted attribute value
          // 4: un-quoted attribute value
          // We need to escape double-quotes because of the risks in there.
          var value = arguments[2] ? arguments[2] :
            arguments[3] ? arguments[3] :
            arguments[4] ? arguments[4] :
            fillAttrs[name] ? name : "";

          attrs.push({
            name: name,
            value: value,
            escaped: value.replace(/"/g, '&quot;')
          });
        });

        if ( handler.start )
          handler.start( tagName, attrs, unary );
      }
    }

    function parseEndTag( tag, tagName ) {
      // If no tag name is provided, clean shop
      if ( !tagName )
        var pos = 0;

      // Find the closest opened tag of the same type
      else
        for ( var pos = stack.length - 1; pos >= 0; pos-- )
          if ( stack[ pos ] == tagName )
            break;

      if ( pos >= 0 ) {
        // Close all the open elements, up the stack
        for ( var i = stack.length - 1; i >= pos; i-- )
          if ( handler.end )
            handler.end( stack[ i ] );

        // Remove the open elements from the stack
        stack.length = pos;
      }
    }
  };

  function makeMap(str){
    var obj = {}, items = str.split(",");
    for ( var i = 0; i < items.length; i++ )
      obj[ items[i] ] = true;
    return obj;
  }

  return this;
})();

var RE_IS_WS = /^[\s]*$/;

var CSSParser = {
  parseAttribute: function (data, allowedStyles) {
    var attrValue = "";

    var pairs = data.split(";");
    for (var j = 0; j < pairs.length; j++) {
      if (RE_IS_WS.test(pairs[j])) {
        attrValue += pairs[j];
        continue;
      }
      var pair = pairs[j].split(":");

      var key = pair[0].trim();
      if (allowedStyles.indexOf(key) !== -1) {
        attrValue += pair[0] + ":" + pair[1] + ";";
      }
    }

    return attrValue;
  },

  parseBody: function (data, allowedStyles) {
    var body = "";

    var rules = data.split(/}/);
    for (var i = 0; i < rules.length; i++) {
      if (!rules[i].length)
        continue;

      var rule = rules[i].split(/{/);
      var key = rule[0].trim();
      // We only want style rules (type 1).  All other rule types are at-rules
      // and prefixed with an '@' sign.  Specifically, @charset (2), @import
      // (3), @media (4), @font-face (5), @page (6), @keyframes (7, keyframe is
      // 8), (9 is reserved), @namespace (10), @supports (12), @document (13),
      // @font-feature-values (14), @viewport (15), @region (16)
      if (key.length && key[0] === '@')
        continue;
      var value = this.parseAttribute(rule[1], allowedStyles);
      if (value)
        body += rule[0] + '{' + value + '}';
    }

    return body;
  }
};


var entities = {
  34 : 'quot',
  38 : 'amp',
  39 : 'apos',
  60 : 'lt',
  62 : 'gt',
  160 : 'nbsp',
  161 : 'iexcl',
  162 : 'cent',
  163 : 'pound',
  164 : 'curren',
  165 : 'yen',
  166 : 'brvbar',
  167 : 'sect',
  168 : 'uml',
  169 : 'copy',
  170 : 'ordf',
  171 : 'laquo',
  172 : 'not',
  173 : 'shy',
  174 : 'reg',
  175 : 'macr',
  176 : 'deg',
  177 : 'plusmn',
  178 : 'sup2',
  179 : 'sup3',
  180 : 'acute',
  181 : 'micro',
  182 : 'para',
  183 : 'middot',
  184 : 'cedil',
  185 : 'sup1',
  186 : 'ordm',
  187 : 'raquo',
  188 : 'frac14',
  189 : 'frac12',
  190 : 'frac34',
  191 : 'iquest',
  192 : 'Agrave',
  193 : 'Aacute',
  194 : 'Acirc',
  195 : 'Atilde',
  196 : 'Auml',
  197 : 'Aring',
  198 : 'AElig',
  199 : 'Ccedil',
  200 : 'Egrave',
  201 : 'Eacute',
  202 : 'Ecirc',
  203 : 'Euml',
  204 : 'Igrave',
  205 : 'Iacute',
  206 : 'Icirc',
  207 : 'Iuml',
  208 : 'ETH',
  209 : 'Ntilde',
  210 : 'Ograve',
  211 : 'Oacute',
  212 : 'Ocirc',
  213 : 'Otilde',
  214 : 'Ouml',
  215 : 'times',
  216 : 'Oslash',
  217 : 'Ugrave',
  218 : 'Uacute',
  219 : 'Ucirc',
  220 : 'Uuml',
  221 : 'Yacute',
  222 : 'THORN',
  223 : 'szlig',
  224 : 'agrave',
  225 : 'aacute',
  226 : 'acirc',
  227 : 'atilde',
  228 : 'auml',
  229 : 'aring',
  230 : 'aelig',
  231 : 'ccedil',
  232 : 'egrave',
  233 : 'eacute',
  234 : 'ecirc',
  235 : 'euml',
  236 : 'igrave',
  237 : 'iacute',
  238 : 'icirc',
  239 : 'iuml',
  240 : 'eth',
  241 : 'ntilde',
  242 : 'ograve',
  243 : 'oacute',
  244 : 'ocirc',
  245 : 'otilde',
  246 : 'ouml',
  247 : 'divide',
  248 : 'oslash',
  249 : 'ugrave',
  250 : 'uacute',
  251 : 'ucirc',
  252 : 'uuml',
  253 : 'yacute',
  254 : 'thorn',
  255 : 'yuml',
  402 : 'fnof',
  913 : 'Alpha',
  914 : 'Beta',
  915 : 'Gamma',
  916 : 'Delta',
  917 : 'Epsilon',
  918 : 'Zeta',
  919 : 'Eta',
  920 : 'Theta',
  921 : 'Iota',
  922 : 'Kappa',
  923 : 'Lambda',
  924 : 'Mu',
  925 : 'Nu',
  926 : 'Xi',
  927 : 'Omicron',
  928 : 'Pi',
  929 : 'Rho',
  931 : 'Sigma',
  932 : 'Tau',
  933 : 'Upsilon',
  934 : 'Phi',
  935 : 'Chi',
  936 : 'Psi',
  937 : 'Omega',
  945 : 'alpha',
  946 : 'beta',
  947 : 'gamma',
  948 : 'delta',
  949 : 'epsilon',
  950 : 'zeta',
  951 : 'eta',
  952 : 'theta',
  953 : 'iota',
  954 : 'kappa',
  955 : 'lambda',
  956 : 'mu',
  957 : 'nu',
  958 : 'xi',
  959 : 'omicron',
  960 : 'pi',
  961 : 'rho',
  962 : 'sigmaf',
  963 : 'sigma',
  964 : 'tau',
  965 : 'upsilon',
  966 : 'phi',
  967 : 'chi',
  968 : 'psi',
  969 : 'omega',
  977 : 'thetasym',
  978 : 'upsih',
  982 : 'piv',
  8226 : 'bull',
  8230 : 'hellip',
  8242 : 'prime',
  8243 : 'Prime',
  8254 : 'oline',
  8260 : 'frasl',
  8472 : 'weierp',
  8465 : 'image',
  8476 : 'real',
  8482 : 'trade',
  8501 : 'alefsym',
  8592 : 'larr',
  8593 : 'uarr',
  8594 : 'rarr',
  8595 : 'darr',
  8596 : 'harr',
  8629 : 'crarr',
  8656 : 'lArr',
  8657 : 'uArr',
  8658 : 'rArr',
  8659 : 'dArr',
  8660 : 'hArr',
  8704 : 'forall',
  8706 : 'part',
  8707 : 'exist',
  8709 : 'empty',
  8711 : 'nabla',
  8712 : 'isin',
  8713 : 'notin',
  8715 : 'ni',
  8719 : 'prod',
  8721 : 'sum',
  8722 : 'minus',
  8727 : 'lowast',
  8730 : 'radic',
  8733 : 'prop',
  8734 : 'infin',
  8736 : 'ang',
  8743 : 'and',
  8744 : 'or',
  8745 : 'cap',
  8746 : 'cup',
  8747 : 'int',
  8756 : 'there4',
  8764 : 'sim',
  8773 : 'cong',
  8776 : 'asymp',
  8800 : 'ne',
  8801 : 'equiv',
  8804 : 'le',
  8805 : 'ge',
  8834 : 'sub',
  8835 : 'sup',
  8836 : 'nsub',
  8838 : 'sube',
  8839 : 'supe',
  8853 : 'oplus',
  8855 : 'otimes',
  8869 : 'perp',
  8901 : 'sdot',
  8968 : 'lceil',
  8969 : 'rceil',
  8970 : 'lfloor',
  8971 : 'rfloor',
  9001 : 'lang',
  9002 : 'rang',
  9674 : 'loz',
  9824 : 'spades',
  9827 : 'clubs',
  9829 : 'hearts',
  9830 : 'diams',
  338 : 'OElig',
  339 : 'oelig',
  352 : 'Scaron',
  353 : 'scaron',
  376 : 'Yuml',
  710 : 'circ',
  732 : 'tilde',
  8194 : 'ensp',
  8195 : 'emsp',
  8201 : 'thinsp',
  8204 : 'zwnj',
  8205 : 'zwj',
  8206 : 'lrm',
  8207 : 'rlm',
  8211 : 'ndash',
  8212 : 'mdash',
  8216 : 'lsquo',
  8217 : 'rsquo',
  8218 : 'sbquo',
  8220 : 'ldquo',
  8221 : 'rdquo',
  8222 : 'bdquo',
  8224 : 'dagger',
  8225 : 'Dagger',
  8240 : 'permil',
  8249 : 'lsaquo',
  8250 : 'rsaquo',
  8364 : 'euro'
};

function escapeHTMLEntities(text) {
  text = text.replace(/&([a-z]+);/gi, "__IGNORE_ENTITIES_HACK__$1;");
  text = text.replace(/[\u00A0-\u2666<>\&]/g, function(c) {
    return '&' + entities[c.charCodeAt(0)] + ';';
  });
  return text.replace(/__IGNORE_ENTITIES_HACK__([a-z]+);/gi, "&$1;");
};


return bleach;

})); // close out UMD boilerplate
