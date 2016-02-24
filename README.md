A white-list based HTML/CSS sanitizer that is intended to run in a DOM worker where there is no access to the DOM.  The current intent of this library is to sanitize HTML messages for the Firefox OS Gaia email app.  You can learn more about its use-case at: https://github.com/mozilla-b2g/gaia-email-libs-and-more/blob/1cba504fa6729daa89454ccb275ea66ad29c4fab/js/htmlchew.js#L26

The master branch of this repo was a main-thread implementation that uses the real DOM and its parsing super-powers.  It is frozen in time and you probably do not want to use it.  Instead, consider something like DOMpurify.js.

Tests are implemented using mocha.
