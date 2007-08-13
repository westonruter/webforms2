/*
 * Wrapper for Web Forms 2.0 Cross-browser Implementation <http://code.google.com/p/repetitionmodel/>
 * Copyright: 2007, Weston Ruter <http://weston.ruter.net/>
 * License: GNU General Public License, Free Software Foundation
 *          <http://creativecommons.org/licenses/GPL/2.0/>
 * 
 * The comments contained in this code are largely quotations from the 
 * WebForms 2.0 specification: <http://whatwg.org/specs/web-forms/current-work/>
 *
 * Usage: <script type="text/javascript" src="webforms2-loader.js"></script>
 */


if(document.implementation && document.implementation.hasFeature && 
  !document.implementation.hasFeature('WebForms', '2.0'))
{
	//get path to source directory
	var scripts = document.getElementsByTagName('head')[0].getElementsByTagName('script'), match, dirname = '';
	for(var i = 0; i < scripts.length; i++){
		if(match = scripts[i].src.match(/^(.*)webforms2-loader\.js$/))
			dirname = match[1];
	}

	//load script
	if(document.write)
		document.write("<script type='text/javascript' src='" + dirname + "webforms2-p.js'></script>");
	else {
		var script = document.createElement('script');
		script.setAttribute('type', 'text/javascript');
		script.setAttribute('src', dirname + 'webforms2-p.js');
		document.getElementsByTagName('head')[0].appendChild(script);
	}
}
