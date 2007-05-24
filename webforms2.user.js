// ==UserScript==
// @name           Web Forms 2.0 Support (alpha)
// @description    Activates Web Forms 2.0 support on every webpage. Note that we should only do this if a page contains WF2 elements such as autofocus, required, or repetition...
// @namespace      http://code.google.com/p/webforms2
// @include        *
// ==/UserScript==

(function(){
var script = document.createElement('script');
script.setAttribute('type', 'text/javascript');
script.setAttribute('src', "http://itd017w603.multnomah.dom/dev/Weston/webforms2/webforms2.js");
//script.setAttribute('src', "http://webforms2.googlecode.com/svn/trunk/webforms2-p.js");

var parent = document.getElementsByTagName('head')[0];
if(!parent)
	parent = document.getElementsByTagName('*')[0];
parent.insertBefore(script, parent.firstChild);//document.getElementsByTagName('head')[0].appendChild(script);

})();