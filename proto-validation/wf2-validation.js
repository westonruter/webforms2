
if(!window.ValidityState && document.implementation && document.implementation.hasFeature && !document.implementation.hasFeature("WebForms", "2.0")){
	



	var ValidityState = {
		
		
		__initDescendents : function(context){
			context = (context || document);
			var i,j, form, forms = context.getElementsByTagName('form');
			for(i = 0; form = forms[i]; i++){
				if(form.checkValidity)
					continue;
				form.checkValidity = ValidityState._form_checkValidity;
				if(form.addEventListener)
					form.addEventListener('submit', ValidityState.__onsubmitHandler, false);
				else
					form.attachEvent('onsubmit', ValidityState.__onsubmitHandler);
			}
			
			var tagNames = ["input","select","textarea","button"];
			var controls = context.getElementsByTagName([i])
			for(i = 0; i < tagNames.length; i++){
				controls = context.getElementsByTagName(tagNames[i]); 
				for(j = 0; control = controls[j]; j++){
					ValidityState._applyValidityInterface(control);
					ValidityState._updateValidityState.apply(control); //control._updateValidityState();
				}
			}
		},
	
		__onsubmitHandler : function(event){
			var form = event.currentTarget || event.srcElement;
			if(!form.checkValidity()){
				if(event.preventDefault)
					event.preventDefault();
				event.returnValue = false
				return false;
			}
			event.returnValue = true;
			return true;
		},
		

		_control_setCustomValidity : function(error){
			if(error){
				this.validationMessage = String(error);
				this.validity.customError = true;
			}
			else {
				this.validationMessage = "";
				this.validity.customError = false;
			}
			with(this.validity){
				valid = !(typeMismatch || rangeUnderflow || rangeOverflow || tooLong || patternMismatch || valueMissing || customError);
			}
		},
		
		_form_checkValidity : function(){
			var invalidElements = [];
			var valid = true;
			for(var i = 0; el = this.elements[i]; i++){
				if(el.checkValidity && el.willValidate == true){
					if(!el.checkValidity()){
						invalidElements.push(el);
						valid = false;
					}
				}
			}
			
			if(invalidElements.length)
				invalidElements[0].focus();
			
			return valid;
		},
		
		_control_checkValidity : function(){
			//ValidityState._updateValidityState.apply(this, [{currentTarget:this}]);
			//ValidityState._updateValidityState({currentTarget:this});
			this._updateValidityState();
			
			if(this.validity.valid){
				return true;
			}
			
			
			var canceled = false;
			
			var evt;
			try {
				if(document.createEvent)
					evt = document.createEvent("UIEvents"); //document.createEvent("RepetitionEvent")
				else if(document.createEventObject)
					evt = document.createEventObject();
				evt.initEvent("invalid", true /*canBubble*/, true /*cancelable*/);
				if(this.dispatchEvent)
					canceled = !this.dispatchEvent(evt);
				else if(this.fireEvent){
					//console.warn("fireEvent('oninvalid') for MSIE is not yet working");
					//this.fireEvent('oninvalid', invalidEvt);
				}
			}
			catch(err){
				evt = new Object();
				if(evt.initEvent)
					evt.initEvent("invalid", true /*canBubble*/, true /*cancelable*/);
				else {
					evt.type = "invalid";
					evt.cancelBubble = false;
				}
			}
			
			//Add support for event handler set with HTML attribute
			var oninvalidAttr = this.getAttribute('oninvalid');
			if(oninvalidAttr && (!this.oninvalid || typeof this.oninvalid != 'function')) //in MSIE, attribute == property
				this.oninvalid = new Function('event', oninvalidAttr);
			
			//Dispatch events for the old event model (extension to spec
			if(this.oninvalid)
				canceled = this.oninvalid(evt) === false || canceled;
			
			//do default action
			if(!canceled){
				if(!this.className.match(/\binvalid\b/))
					this.className += " invalid"; //substitute for :invalid pseudo class
					
				
				//show contextual help message
				var box = document.createElement('div');
				box.className = "_wf2_errorMsg";
				box.title = "Close this box.";
				box.id = (this.id || this.name) + "_errorMsg"; //QUESTION: does this work for MSIE?
				box.onclick = function(){
					this.parentNode.removeChild(this);
				};
				
//				var a = document.createElement('a');
//				a.href = "javascript:void(0)";
//				a.className = "closeErrorMsg";
//				a.onclick = function(){
//					this.parentNode.parentNode.removeChild(this.parentNode);
//				};
//				a.innerHTML = "\u00D7";
//				box.appendChild(a);
				
				function createLI(text){
					var li = document.createElement('li');
					li.appendChild(document.createTextNode(text));
					return li;
				}
				
				var ol = document.createElement('ol');
				if(this.validity.valueMissing)
					ol.appendChild(createLI('The value must be supplied.'));
				if(this.validity.typeMismatch)
					ol.appendChild(createLI("The value is invalid for the type '" + this.getAttribute('type') + "'."));
				if(this.validity.rangeUnderflow)
					ol.appendChild(createLI('The value must be greater than ' + this.getAttribute('min') + "."));
				if(this.validity.rangeOverflow)
					ol.appendChild(createLI('The value must be less than ' + this.getAttribute('min') + "."));
				if(this.validity.stepMismatch)
					ol.appendChild(createLI('The value has a step mismatch; it must be a value by adding multiples of ' + this.getAttribute('step') + " to " + this.getAttribute('min') + "."));
				if(this.validity.tooLong)
					ol.appendChild(createLI('The value is too long.'));
				if(this.validity.patternMismatch)
					ol.appendChild(createLI('The value does not match the pattern (regular expression) "' + this.getAttribute('pattern') + '".'));
				if(this.validity.customError)
					ol.appendChild(createLI(this.validationMessage));
				
				if(ol.childNodes.length == 1)
					ol.className = "single";
					
				box.appendChild(ol);
				//this.parentNode.insertBefore(box, this); //Inserting error message next to element in question causes problems when the element has a positioned containing block
				document.body.insertBefore(box, null); //insert at the end of the document
				
				var top = left = 0;
				var obj = this;
				if (obj.offsetParent) {
					left = obj.offsetLeft
					top = obj.offsetTop
					while (obj = obj.offsetParent) {
						left += obj.offsetLeft
						top += obj.offsetTop
					}
				}
				
				top += this.offsetHeight;
				
				box.style.top = top + "px";
				box.style.left = left + "px";
			}
			
			return false;
		},
		
		_updateValidityState : function(){ //should be called "live"
			
			//valueMissing -- The control has the required attribute set but it has not been satisfied. 
			this.validity.valueMissing = Boolean(this.getAttributeNode('required') && (this.options ? this.selectedIndex == -1 : !this.value));
			if(!this.validity.valueMissing){
				if(!this.value){
					this.validity = {
						typeMismatch    : false,
						rangeUnderflow  : false,
						rangeOverflow   : false,
						stepMismatch    : false,
						tooLong         : false,
						patternMismatch : false,
						valueMissing    : false,
						customError     : false,
						valid           : true
					};
				}
				else {
					//patternMismatch -- The value of the control with a pattern attribute doesn't match the pattern. 
					//   If the control is empty, this flag must not be set. 
					var pattern;
					if(pattern = this.getAttribute('pattern')){
						if(!/^\^/.test(pattern)) pattern = "^" + pattern;
						if(!/\$$/.test(pattern)) pattern += "$";
						var rePattern = new RegExp(pattern);
						this.validity.patternMismatch = (rePattern ? !rePattern.test(this.value) : false);
					}

					//typeMismatch -- The data entered does not match the type of the control. For example, if the UA 
					//   allows uninterpreted arbitrary text entry for month controls, and the user has entered SEP02, 
					//   then this flag would be set. This code is also used when the selected file in a file upload 
					//   control does not have an appropriate MIME type. If the control is empty, this flag must not be set. 
					
					//NOTE: this will not work for DATE types
					var step,min,max;
					if(/^-?\d+(.\d+)?(e-?\d+)?$/.test(String(this.getAttribute("step"))))
						step = Number(this.getAttribute("step"));
					if(/^-?\d+(.\d+)?(e-?\d+)?$/.test(String(this.getAttribute("min"))))
						min = Number(this.getAttribute("min"));
					if(/^-?\d+(.\d+)?(e-?\d+)?$/.test(String(this.getAttribute("max"))))
						max = Number(this.getAttribute("max"));
					
					
					var type = this.getAttribute('type');
					switch(type){
						case 'date':
						case 'datetime':
						case 'datetime-local':
							//code from http://delete.me.uk/2005/03/iso8601.html
							var regexp = "(\d\d\d\d)(-(0\d|1[0-2])(-(0\d|[1-2]\d|3[0-1])" +
								"(T(0\d|1\d|2[0-4]):([0-5]\d)(:([0-5]\d)(\.(\d+))?)?" +
								"(Z)?";
							var d = string.match(new RegExp(regexp));
							if(!d){
								this.validity.typeMismatch = true;
								break;
							}
							
							//Verify that the number of days in the month are valid
							if(d[5]){
								var date = new Date(d[1], d[3]-1, d[5]);
								if(date.getMonth() != d[3]-1){ 
									this.validity.typeMismatch = true;
									break;
								}
							}
							
							switch(type){
								case 'date':
									if(d[6]) //if time field present
										this.validity.typeMismatch = true;
									break;
								case 'datetime':
									if(!d[14]) //if missing Z
										this.validity.typeMismatch = true;
									break;
								case 'datetime-local':
									if(d[14]) //if Z provided
										this.validity.typeMismatch = true;
									break;
							}
							
							if(this.getAttribute("step") != 'any'){
								if(step == undefined)
									step = 60;
								
								//...
							}
							break;
							//this.validity.typeMismatch = !/^\d\d\d\d-(0\d|1[0-2])-(0\d|[1-2]\d|3[0-1])$/.test(this.value);
							//break;
						case 'month':
							this.validity.typeMismatch = !/^\d\d\d\d-(0\d|1[0-2])$/.test(this.value);
							break;
						case 'week':
							this.validity.typeMismatch = !/^\d\d\d\d-W(0[1-9]|[1-4]\d|5[0-2])$/.test(this.value);
							break;
						case 'time':
							this.validity.typeMismatch = !/^(0\d|1\d|2[0-4]):[0-5]\d(:[0-5]\d(.\d+)?)?$/.test(this.value);
							break;
						case 'number':
						case 'range':
							this.validity.typeMismatch = !/^-?\d+(.\d+)?(e-?\d+)?$/.test(this.value);
							if(!this.validity.typeMismatch && this.getAttribute("step") != 'any'){
								if(step == undefined)
									step = 1;
								var val = Number(this.value);
								this.validity.stepMismatch = (val == parseInt(val) && step != parseInt(step));
								this.validity.rangeUnderflow = (min != undefined && val < min);
								this.validity.rangeOverflow = (max != undefined && val > max);
							}
							break;
						case 'email':
							this.validity.typeMismatch = !/^.+@.+$/.test(this.value);
							break;
						case 'url':
							this.validity.typeMismatch = !/^(http|ftp):\/\/.+$/i.test(this.value);
							break;
					}
				}
			}
			
			
			//rangeUnderflow -- The numeric, date, or time value of a control with a min attribute is lower than 
			//   the minimum, or a file upload control has fewer files selected than the minimum. If the control 
			//   is empty or if the typeMismatch flag is set, this flag must not be set. 
			
			//rangeOverflow -- The numeric, date, or time value of a control with a max attribute is higher than 
			//   the maximum, or a file upload control has more files selected than the maximum. If the control 
			//   is empty or if the typeMismatch flag is set, this flag must not be set. 
			
			//stepMismatch -- The value is not one of the values allowed by the step attribute, and the UA will 
			//   not be rounding the value for submission. Empty values and values that caused the typeMismatch 
			//   flag to be set must not cause this flag to be set. 
			
			//tooLong -- The value of a control with a maxlength attribute is longer than the attribute allows, 
			//   and the value of the control doesn't exactly match the control's default value. 
			
			
			//customError -- The control was marked invalid from script. See the definition of the setCustomValiditiy() method.
			
			with(this.validity){
				valid = !(typeMismatch || rangeUnderflow || rangeOverflow || tooLong || patternMismatch || valueMissing || customError);
			}
			if(this.validity.valid){
				this.className = this.className.replace(/\s*\binvalid\b\s*/g, " "); //substitute for :invalid pseudo class
				var errMsg = document.getElementById((this.id || this.name) + "_errorMsg");
				if(errMsg)
					errMsg.parentNode.removeChild(errMsg);
			}
		},
		
		_applyValidityInterface : function(node){
			if(node.validity)
				return;
			
			node.validationMessage = "";
			
			//ValidityState interface
			node.validity = {
				typeMismatch    : false,
				rangeUnderflow  : false,
				rangeOverflow   : false,
				stepMismatch    : false,
				tooLong         : false,
				patternMismatch : false,
				valueMissing    : false,
				customError     : false,
				valid           : true
			};
			
			node.willValidate = true;
			
			if(node.nodeName.toLowerCase() == 'button'){
				node.setCustomValidity = function(error){
					throw Error("NOT_SUPPORTED_ERR");
				}
				node.checkValidity = function(){
					return true;
				}
				return node;
			}
			node._updateValidityState = ValidityState._updateValidityState;
			node.setCustomValidity = ValidityState._control_setCustomValidity;
			node.checkValidity = ValidityState._control_checkValidity;
				
			if(String(node.getAttribute('type')).match(/(hidden|button|reset|add|remove|move-up|move-down)/) || !node.name || node.disabled)
				node.willValidate = false;
			else if(window.RepetitionElement) {
				var parent = node;
				while(parent = parent.parentNode){
					if(parent.repetitionType == RepetitionElement.REPETITION_TEMPLATE){
						node.willValidate = false;
						break;
					}
				}
			}
			
			var handler = function(event){
				return (event.currentTarget || event.srcElement)._updateValidityState();
			};
			
			//attempt to check validity live
			if(document.addEventListener){
				node.addEventListener('change', handler, false);
				node.addEventListener('blur', handler, false);
				node.addEventListener('keyup', handler, false);
			}
			else if(window.attachEvent){
				node.attachEvent('onchange', handler);
				node.attachEvent('onblur', handler);
				node.attachEvent('onkeyup', handler);
			}
			else {
			
			}
			
			return node;
		}
//		,
//		
//		__createElementWithName : function(type, name){
//			throw Error("__createElementWithName not yet created. Browser-specific code defined immediately below.");
//		}
	}
////createElementWithName code by Anthony Lieuallen <http://www.easy-reader.net/archives/2005/09/02/death-to-bad-dom-implementations/#comment-444>
//(function(){
//	try {
//		var el = document.createElement('<div name="foo">');
//		if(el.tagName.toLowerCase() == 'div' || el.name != 'foo'){
//			throw 'create element error';
//		}
//		RepetitionElement.__createElementWithName = function(tag, name){
//			return document.createElement('<'+tag+' name="'+name+'"></'+tag+'>');
//		};
//	}
//	catch(err){
//		RepetitionElement.__createElementWithName = function(tag, name){
//			var el = document.createElement(tag);
//			el.setAttribute('name', name);
//			//el.name = name;
//			return el;
//		};
//	}
//})();
	
	//(function(){
	//add invalid style to document

	var match, dirname = ''; //get path to source directory
	var scripts = document.getElementsByTagName('head')[0].getElementsByTagName('script');
	for(var i = 0; i < scripts.length; i++){
		if(match = scripts[i].src.match(/^(.*)wf2-validation[^\/]+$/))
			dirname = match[1];
	}

	var style = document.createElement('link');
	style.setAttribute('type', "text/css");
	style.setAttribute('rel', "stylesheet");
	style.setAttribute('href', dirname + "wf2-validation.css");

	var head = document.getElementsByTagName('head')[0];
	head.insertBefore(style, head.firstChild)
	
if(document.addEventListener){
	//onDOMload for Gecko and Opera
	document.addEventListener("DOMContentLoaded", function(){
		ValidityState.__initDescendents(document);
	}, false);

	//for other browsers which do not support DOMContentLoaded use the following as a fallback to be called hopefully before all other onload handlers
	window.addEventListener("load", function(){
		ValidityState.__initDescendents(document);
	}, false);
}
////old event model used as a last-resort fallback
//else if(window.onload){ //if(window.onload != RepetitionElement._init_document)
//	var oldonload = window.onload;
//	window.onload = function(){
//		ValidityState.__initDescendents();
//		oldonload();
//	};
//}
//else window.onload = ValidityState.__initDescendents;

//onDOMload for Safari
if (/WebKit/i.test(navigator.userAgent)) { // sniff
	var _timer = setInterval(function() {
		if (/loaded|complete/.test(document.readyState)) {
			clearInterval(_timer);
			delete _timer;
			ValidityState.__initDescendents(document); // call the onload handler
		}
	}, 10);
}
//onDOMload for Internet Explorer (formerly using conditional comments)
else if(/MSIE/i.test(navigator.userAgent) && !document.addEventListener && window.attachEvent){
	//This following attached onload handler will attempt to be the first onload handler to be called and thus
	//  initiate the repetition model as early as possible if the DOMContentLoaded substitute fails.
	window.attachEvent("onload", function(){
		ValidityState.__initDescendents(document);
	});

	//document.getElementsByTagName('*')[0].addBehavior(dirname + 'repetition-model.htc'); //use this if Behaviors are employed in 0.9
	document.write("<script defer src='" + dirname + "wf2-validation-msie_init.js'><"+"/script>");

	//Dean Edward's revisited solution <http://dean.edwards.name/weblog/2005/09/busted/> (via Matthias Miller with insights from jQuery)
	//  Note that this solution will not result in its code firing before onload if there are no external images in the page; in this case, first solution above is used.
	document.write("<script id=__ie_onload defer src='//:'><\/script>"); //src value from jQuery
	var script = document.getElementById("__ie_onload");
	//var script = document.createElement('script');
	//script.setAttribute('defer', 'defer');
	//document.getElementsByTagName('head')[0].appendChild(script);
	script.onreadystatechange = function(){
		if(this.readyState == "complete"){
			ValidityState.__initDescendents(document); // call the onload handler
			this.parentNode.removeChild(this);
		}
	};
	script = null;
}



	//}
	//})();
}