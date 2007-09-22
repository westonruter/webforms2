// ==UserScript==
// @name           Web Forms 2.0 Support
// @description    Activates Web Forms 2.0 support on every webpage.
// @namespace      http://code.google.com/p/webforms2/
// @include        http://tc.labs.opera.com/html/*
// @include        http://lachy.id.au/dev/markup/tests/html5/*
// @include        http://simon.html5.org/test/*
// @include        http://hasather.net/test/html/*
// @include        http://html5lib.googlecode.com/svn/trunk/*
// @include        http://www.hixie.ch/tests/adhoc/*
// @include        http://webforms2.testsuite.org/*

// ==/UserScript==

(function(){
var script = document.createElement('script');
script.setAttribute('type', 'text/javascript');
script.setAttribute('src', "http://webforms2.googlecode.com/svn/trunk/webforms2_src.js");

var parent = document.getElementsByTagName('head')[0];
if(!parent)
	parent = document.getElementsByTagName('*')[0];
parent.insertBefore(script, parent.firstChild);//document.getElementsByTagName('head')[0].appendChild(script);

})();