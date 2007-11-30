/*
 * Web Forms 2.0 Cross-browser Implementation <http://code.google.com/p/webforms2/>
 * Version: 0.5.2 (2007-11-29)
 * Copyright: 2007, Weston Ruter <http://weston.ruter.net/>
 * License: GNU General Public License, Free Software Foundation
 *          <http://creativecommons.org/licenses/GPL/2.0/>
 * 
 * The comments contained in this code are largely quotations from the 
 * WebForms 2.0 specification: <http://whatwg.org/specs/web-forms/current-work/>
 *
 * Usage: <script type="text/javascript" src="webforms2_src.js"></script>
 */

if(!window.$wf2){
var $wf2 = {};

if(document.implementation && document.implementation.hasFeature && 
  !document.implementation.hasFeature('WebForms', '2.0')){

$wf2 = {
	version : '0.5.2',
	isInitialized : false,
	libpath : '',
	
	hasElementExtensions : (window.HTMLElement && HTMLElement.prototype),
	hasGettersAndSetters : ($wf2.__defineGetter__ && $wf2.__defineSetter__),
	
	onDOMContentLoaded : function(){
		if($wf2.isInitialized)
			return;
		$wf2.isInitialized = true;  //Safari needs this here for some reason
		
		var i,j,k,node;
		
		//Include stylesheet
		var style = document.createElement('link');
		style.setAttribute('type', 'text/css');
		style.setAttribute('rel', 'stylesheet');
		style.setAttribute('href', $wf2.libpath + 'webforms2.css');
		var parent = document.getElementsByTagName('head')[0];
		if(!parent)
			parent = document.getElementsByTagName('*')[0];
		parent.insertBefore(style, parent.firstChild);

		//The zero point for datetime  controls is 1970-01-01T00:00:00.0Z, for datetime-local is
		//   1970-01-01T00:00:00.0, for date controls is 1970-01-01, for month controls is 1970-01, for week
		//   controls is 1970-W01 (the week starting 1969-12-29 and containing 1970-01-01), and for time controls
		//   is 00:00.
		$wf2.zeroPoint = {};
		$wf2.zeroPoint.datetime          = $wf2.parseISO8601("1970-01-01T00:00:00.0Z");
		$wf2.zeroPoint['datetime-local'] = $wf2.parseISO8601("1970-01-01T00:00:00.0");
		$wf2.zeroPoint.date              = $wf2.zeroPoint.datetime; //parseISO8601("1970-01-01"); //.zeroPointDatetime; //1970-01-01 (UTC)
		$wf2.zeroPoint.month             = $wf2.zeroPoint.datetime; //parseISO8601("1970-01"); //1970-01 (UTC)
		$wf2.zeroPoint.week              = $wf2.parseISO8601("1970-W01"); //(UTC)
		$wf2.zeroPoint.time              = $wf2.zeroPoint.datetime; //parseISO8601("00:00"); //00:00 (UTC)

		//## Fetching data from external resources ##################################
		$wf2.xhr = null;
		if(window.XMLHttpRequest)
			$wf2.xhr = new XMLHttpRequest();
		else if(window.ActiveXObject){
			try {
				$wf2.xhr = new ActiveXObject("Msxml2.XMLHTTP");
			} catch(e){
				try {
					$wf2.xhr = new ActiveXObject("Microsoft.XMLHTTP");
				} catch(e){}
			}
		}
		if($wf2.xhr){
			$wf2.prefillSelectElements();
			$wf2.prefillFormElements();
		}

		//Initialize Repetition Behaviors ****************************************
		//Before load events are fired, but after the entire document has been parsed and after forms with data 
		//   attributes are prefilled (if necessary), UAs must iterate through every node in the document, depth 
		//   first, looking for templates so that their initial repetition blocks can be created. ... UAs should not 
		//   specifically wait for images and style sheets to be loaded before creating initial repetition blocks 
		//   as described above.
		$wf2.initRepetitionBlocks();
		$wf2.initRepetitionTemplates();
		$wf2.initRepetitionButtons('add');
		$wf2.initRepetitionButtons('remove');
		$wf2.initRepetitionButtons('move-up');
		$wf2.initRepetitionButtons('move-down');
		$wf2.updateAddButtons();
		$wf2.updateMoveButtons();
	
		// Initialize Non-Repetition Behaviors ****************************************
		if(document.addEventListener){
			document.addEventListener('mousedown', $wf2.clearInvalidIndicators, false);
			document.addEventListener('keydown', $wf2.clearInvalidIndicators, false);
		}
		else if(document.attachEvent){
			document.attachEvent('onmousedown', $wf2.clearInvalidIndicators);
			document.attachEvent('onkeydown', $wf2.clearInvalidIndicators);
		}
		
		$wf2.initNonRepetitionFunctionality();
	},


	/*##############################################################################################
	 # Section: Fetching data from external resources
	 ##############################################################################################*/

	prefillSelectElements : function(){
		//If a select element or a datalist element being parsed has a data attribute, then as soon
		//   as the element and all its children have been parsed and added to the document, the
		//   prefilling process described here should start.
		var select, selects = $wf2.getElementsByTagNames.apply(document.documentElement, ['select', 'datalist']); //$wf2.getElementsByTagNamesAndAttribute.apply(document.documentElement, [['select', 'datalist']]); //, 'data'
		for(var i = 0; select = selects[i]; i++){
			//If a select element or a datalist element has a data  attribute, it must be a URI or
			//   IRI that points to a well-formed XML file whose root element is a select element
			//   in the http://www.w3.org/1999/xhtml namespace. The MIME type must be an XML MIME
			//   type [RFC3023], preferably application/xml. It should not be application/xhtml+xml
			//   since the root element is not html.
			//UAs must process this file if it has an XML MIME type [RFC3023], if it is a well-formed
			//   XML file, and if the root element is the right root element in the right namespace.
			//   If any of these conditions are not met, UAs must act as if the attribute was not
			//   specified, although they may report the error to the user. UAs are expected to
			//   correctly handle namespaces, so the file may use prefixes, etc.
			var xmlDoc = $wf2.loadDataURI(select);
			if(///\bxml\b/.test(xhr.getResponseHeader('Content-Type') && 
			   xmlDoc &&
			   xmlDoc.documentElement &&
			   /:?\bselect$/i.test(xmlDoc.documentElement.nodeName) &&
			   xmlDoc.documentElement.namespaceURI == 'http://www.w3.org/1999/xhtml'
			   )
			{
				var root = xmlDoc.documentElement;
				//1. Unless the root element of the file has a type attribute with the exact literal
				//   string incremental, the children of the select or datalist  element in the original
				//   document must all be removed from the document.
				if(root.getAttribute('type') != 'incremental'){
					while(select.lastChild)
						select.removeChild(select.lastChild);
				}
				
				//2. The entire contents of the select element in the referenced document are imported
				//   into the original document and appended as children of the select or datalist
				//   element. (Even if importing into a text/html document, the newly imported nodes
				//   will still be namespaced.)
				//3. All nodes outside the select (such as style sheet processing instructions, whitespace
				//   text nodes, and DOCTYPEs) are ignored, as are attributes (other than type) on the
				//   select element.
				node = root.firstChild;
				while(node){
					//select.appendChild(node.cloneNode(true)); //MSIE BUG: Throws "No such interface supported" exception
					select.appendChild($wf2.cloneNode(node));
					node = node.nextSibling;
				}
			}
		}
	},

	prefillFormElements : function(){
		//-- Seeding a form with initial values -------------------------------
		//Before load events are fired, but after the entire document has been parsed and after select
		//   elements have been filled from external data sources (if necessary), forms with data attributes
		//   are prefilled.
		var frm, frms = document.getElementsByTagName('form'); //$wf2.getElementsByTagNamesAndAttribute.apply(document.documentElement, [['form'], 'data']);
		for(var i = 0; frm = frms[i]; i++){
			//If a form has a data attribute, it must be a URI or IRI that points to a well-formed XML file
			//   whose root element is a formdata element in the http://n.whatwg.org/formdata namespace. The
			//   MIME type must be an XML MIME type [RFC3023], preferably application/xml.
			//UAs must process this file if these conditions are met. If any of these conditions are not met,
			//   UAs must act as if the attribute was not specified, although they may report the error to
			//   the user. UAs are expected to correctly handle namespaces, so the file may use prefixes, etc.
			var xmlDoc = $wf2.loadDataURI(frm);
			if(///\bxml\b/.test(xhr.getResponseHeader('Content-Type') && 
			   xmlDoc &&
			   xmlDoc.documentElement &&
			   /:?\bformdata$/.test(xmlDoc.documentElement.nodeName) &&
			   xmlDoc.documentElement.namespaceURI == 'http://n.whatwg.org/formdata'
			   )
			{
				var rt;
				var root = xmlDoc.documentElement;
				//1. Unless the root element has a type attribute with the exact literal string incremental,
				//   the form must be reset to its initial values as specified in the markup.
				if(root.getAttribute('type') != 'incremental')
					frm.reset();

				//The algorithm must be processed in the order given above, meaning any clear  elements are
				//   handled before any repeat  elements which are handled before the field elements, regardless
				//   of the order in which the elements are given. (Note that this implies that this process
				//   cannot be performed incrementally.)
				
				//clear elements in the http://n.whatwg.org/formdata namespace that are children of
				//   the root element, have a non-empty template attribute, have no other non-namespaced
				//   attributes (ignoring xmlns attributes), and have no content, must be processed...:
				//The template attribute should contain the ID of an element in the document. If the
				//   template attribute specifies an element that is not a repetition template, then
				//   the clear element is ignored.
				var clr, clrs = root.getElementsByTagName('clear'); //getElementsByTagNameNS('http://n.whatwg.org/formdata', 'clr')
				for(j = 0; clr = clrs[j]; j++){
					if(clr.namespaceURI == 'http://n.whatwg.org/formdata' &&
					   clr.parentNode == root &&
					   !clr.firstChild &&
					   (rt = document.getElementById(clr.getAttribute('template'))) &&
					   rt.getAttribute('repeat') == 'template'
					   /*Examining of non-namespaced attributes skipped*/
					   )
					{
						//The user must make a note of the list of repetition blocks associated with that
						//   template that are siblings of the template, and must then go through this list,
						//   removing each repetition block in turn.
						//Note that we cannot use rt.repetitionBlocks since the repetition behavior has
						//   not yet been initialized.
						var attr,node,next;
						node = rt.parentNode.firstChild;
						while(node){
							if(node.nodeType == 1 && (attr = node.getAttributeNode('repeat')) && attr.value != 'template'){
								next = node.nextSibling;
								node.parentNode.removeChild(node);
								node = next;
							}
							else node = node.nextSibling;
						}
					}
				}
				
				//repeat elements in the http://n.whatwg.org/formdata namespace that are children of
				//   the root element, have a non-empty template attribute and an index  attribute that
				//   contains only one or more digits in the range 0-9 with an optional leading minus
				//   sign (U+002D, "-"), have no other non-namespaced attributes (ignoring xmlns
				//   attributes), and have no content, must be processed as follows:
				//The template attribute should contain the ID of an element in the document. If the
				//   template attribute specifies an element that is not a repetition template, then
				//   the repeat element is ignored.
				var index, rpt, rpts = root.getElementsByTagName('repeat');
				for(j = 0; rpt = rpts[j]; j++){
					if(rpt.namespaceURI == 'http://n.whatwg.org/formdata' &&
					   rpt.parentNode == root &&
					   !rpt.firstChild &&
					   (rt = document.getElementById(rpt.getAttribute('template'))) &&
					   rt.getAttribute('repeat') == 'template' &&
					   /^-?\d+$/.test(index = rpt.getAttribute('index'))
					   /*Examining of non-namespaced attributes skipped*/
					   )
					{
						//If the template attribute specifies a repetition template and that template
						//   already has a repetition block with the index specified by the index attribute,
						//   then the element is ignored.
						//for(j = 0; j < rt.repetitionBlocks.length; j++){
						//	if(rt.repetitionBlocks[j].repetititionIndex == index){
						//		hasIndex = true;
						//		break;
						//	}
						//}
						var hasIndex,attr,node,next;
						node = rt.parentNode.firstChild;
						while(node){
							if(node.nodeType == 1 && (attr = node.getAttributeNode('repeat')) && attr.value == index){
								hasIndex = true;
								break;
							}
							node = node.nextSibling;
						}
						
						if(!hasIndex){
							//Otherwise, the specified template's addRepetitionBlockByIndex()  method is
							//   called, with a null first argument and the index specified by the repeat
							//   element's index attribute as the second.
							$wf2.addRepetitionBlockByIndex.apply(rt, [null, index]);
						}
					}
				}
				
				//field elements in the http://n.whatwg.org/formdata namespace that are children of
				//   the root element, have a non-empty name  attribute, either an index attribute
				//   that contains only one or more digits in the range 0-9 or no index attribute at
				//   all, have no other non-namespaced attributes (ignoring xmlns  attributes), and
				//   have either nothing or only text and CDATA nodes as children, must be used to
				//   initialize controls...
				var fld, flds = root.getElementsByTagName('field');
				var formElements = $wf2.getFormElements.apply(frm);
				for(j = 0; fld = flds[j]; j++){
					var indexAttr = fld.getAttributeNode('index');
					var name = fld.getAttribute('name');
					if(!name || (indexAttr && !/^\d+$/.test(indexAttr.value)))
					   /*Examining of non-namespaced attributes skipped*/
					   /*Verification of the presence of text and CDATA nodes below*/
						continue;
					//First, the form control that the field references must be identified. 
					var value = '';
					for(k = 0; node = fld.childNodes[k]; k++){
						if(node.nodeType == 3 /*text*/ || node.nodeType == 4 /*CDATA*/)
							value += node.data;
						else break; //only text and CDATA nodes allowed
					}
					var ctrl, count = 0;
					for(k = 0; ctrl = formElements[k]; k++){
						//console.info(ctrl.name + ' == ' + name)
						if(ctrl.type == 'image'){
							//For image controls, instead of using the name given by the name attribute,
							//   the field's name is checked against two names, the first being the value
							//   of the name attribute with the string .x appended to it, and the second
							//   being the same but with .y appended instead. If an image control's name
							//   is the empty string (e.g. if its name attribute is omitted) then the
							//   names x and y must be used instead. Thus image controls are handled as
							//   if they were two controls.
							if(ctrl.name ?
								  (ctrl.name + '.x' == name || ctrl.name + '.y' == name)
								: (name == 'x' || name == 'y') ){

								if(!indexAttr || ++count-1 >= indexAttr.value)	
									break;
							}
						}
						//This is done by walking the list of form controls associated with the form until
						//   one is found that has a name exactly equal to the name given in the field
						//   element's name attribute, skipping as many such matches as is specified in
						//   the index attribute, or, if the index attribute was omitted, skipping over
						//   any type="radio" and type="checkbox" controls that have the exact name given
						//   but have a value that is not exactly the same as the contents of the field element.
						// SPECIFICATION DEFICIENCY: Note that this is not completely true. If the value of
						//   a field element is empty, then it should not be skipped if it associated with
						//   a radio button or checkbox. For example, the specification states four paragraphs
						//   later, "The only values that would have an effect in this example are "", which
						//   would uncheck the checkbox, and "green", which would check the checkbox."
						else if(ctrl.name == name){
							if(indexAttr){
								if(++count-1 < indexAttr.value)	
									continue;
							}
							else if((ctrl.type == 'radio' || ctrl.type == 'checkbox') &&
									 (value && ctrl.value != value))
								continue;
							break;
						}
					}
					
					//If the identified form control is a file upload control, a push button control, or
					//   an image control, then the field element is now skipped.
					if(ctrl.type == 'file' || ctrl.type == 'button' || ctrl.type == 'image')
						continue;

					//Next, if the identified form control is not a multiple-valued control (a multiple-
					//   valued control is one that can generate more than one value on submission, such
					//   as a <select multiple="multiple">), or if it is a multiple-valued control but it
					//   is the first time the control has been identified by a field element in this
					//   data file that was not ignored, then it is set to the given value (the contents
					//   of the field  element), removing any previous values (even if these values were
					//   the result of processing previous field elements in the same data file).
					if(!ctrl.getAttributeNode('multiple') || !ctrl.wf2Prefilled){
						//If the element cannot be given the value specified, the field element is
						//   ignored and the control's value is left unchanged. For example, if a
						//   checkbox has its value attribute set to green and the field element
						//   specifies that its value should be set to blue, it won't be changed from
						//   its current value. (The only values that would have an effect in this
						//   example are "", which would uncheck the checkbox, and "green", which would
						//   check the checkbox.)
						if(ctrl.type == 'checkbox' || ctrl.type == 'radio'){
							if(!value)
								ctrl.checked = false;
							else if(ctrl.value == value)
								ctrl.checked = true;
							else break;
						}
						else if(ctrl.nodeName.toLowerCase() == 'select'){
							ctrl.selectedIndex = -1;
							for(var opt,k = 0; opt = ctrl.options[k]; k++){
								if(opt.value ? opt.value == value : opt.text == value){
									opt.selected = true;
									break;
								}
							}
						}
						//Another example would be a datetime control where the specified value is
						//   outside the range allowed by the min  and max attributes. The format
						//   must match the allowed formats for that type for the value to be set.
						else {
							ctrl.value = value;
							$wf2.updateValidityState(ctrl);
							if(!ctrl.validity.valid){
								ctrl.value = ctrl.defaultValue;
								$wf2.updateValidityState(ctrl);
							}
						}
						ctrl.wf2Prefilled = true; //TRACE
					}
					//Otherwise, this is a subsequent value for a multiple-valued control, and the
					//   given value (the contents of the field element) should be added to the list of
					//   values that the element has selected.
					//If the element is a multiple-valued control and the control already has the given
					//   value selected, but it can be given the value again, then that occurs. 
					else if(ctrl.getAttributeNode('multiple')){
						for(var opt,k = 0; opt = ctrl.options[k]; k++){
							if(!opt.selected && (opt.value ? opt.value == value : opt.text == value)){
								opt.selected = true;
								break;
							}
						}
					}
					
					//if(ctrl){
					//	
					//}
				}
				
				//A formchange event is then fired on all the form controls of the form.
				var formElements = $wf2.getFormElements.apply(frm);
				for(j = 0; j < formElements.length; j++){
					//onformchange();
					//fireEvent()
				}
			}
		}
	},

	/*##############################################################################################
	 # Section: Repetition Model
	 ##############################################################################################*/

	//## REPETITION TEMPLATE #############################################################
	repetitionTemplates:[],
	constructRepetitionTemplate : function(){
		if(this.wf2Initialized)
			return;
		this.wf2Initialized = true; //SAFARI needs this to be here for some reason...
		
		this.style.display = 'none'; //This is also specified via a stylesheet
		this.repetitionType = RepetitionElement.REPETITION_TEMPLATE;
		if(!this.repetitionIndex)
			this.repetitionIndex = 0;
		this.repetitionTemplate = null; //IMPLEMENT GETTER
		if(!this.repetitionBlocks)
			this.repetitionBlocks = []; //IMPLEMENT GETTER
		var _attr;
		this.repeatStart = /^\d+$/.test(_attr = this.getAttribute('repeat-start')) ? parseInt(_attr) : 1;
		this.repeatMin   = /^\d+$/.test(_attr = this.getAttribute('repeat-min'))   ? parseInt(_attr) : 0;
		this.repeatMax   = /^\d+$/.test(_attr = this.getAttribute('repeat-max'))   ? parseInt(_attr) : Number.MAX_VALUE; //Infinity;
		
		if(!this.addRepetitionBlock) this.addRepetitionBlock = function(refNode, index){
			return $wf2.addRepetitionBlock.apply(this, [refNode, index]); //wrapper to save memory?
		};
		if(!this.addRepetitionBlockByIndex)
			this.addRepetitionBlockByIndex = this.addRepetitionBlock/*ByIndex*/; //one method implements both algorithms
		
		//Any form controls inside a repetition template are associated with their forms' templateElements 
		//   DOM attributes, and are not present in the forms' elements DOM attributes.
		
		//On the HTMLFormElement, the templateElements attribute contains the list of form controls associated 
		//   with this form that form part of repetition templates. It is defined in more detail in the section 
		//   on the repetition model. (Image controls are part of this array, when appropriate.) The controls 
		//   in the elements and templateElements lists must be in document order. 
		var frm = this;
		while(frm = frm.parentNode){
			if(frm.nodeName.toLowerCase() == 'form')
				break;
		}
		
		var _templateElements;
		//IMAGE???, fieldset not included
		if(frm && (_templateElements = $wf2.getElementsByTagNames.apply(this, ['button','input','select','textarea','isindex'])).length){
			//INCORRECT IMPLEMENTATION: this should append the new elements onto the frm.templateElements array and then sort them in document order?
			//each time that a nesting repetition block is instantiated, the form's templateElemenents property becomes invalid
			
			//frm.templateElements = _templateElements;

			//Controls in the templateElements attribute cannot be successful; controls inside repetition templates can never be submitted.
			//   Therefore disable all elements in the template; however, due to the issue below, the original disabled state must be stored in the field's class attribute as "disabled"
			//   this storing of the original disabled state will enable the elements in cloned blocks to be disabled as originally coded in the template
			//ISSUE: inputs retain disabled (but not defaultDisabled) attribue after returning to page from back button or reload
			//   see http://weblogs.mozillazine.org/gerv/archives/2006/10/firefox_reload_behaviour.html
			// As a workaround... this implementation requires that authors, in addition to supplying a DISABLED attribute (for Opera), to include a class name "disabled"
			for(var el, i = 0; el = _templateElements[i]; i++)
				el.disabled = true;
			
			//IMPLEMENTATION DEFICIENCY: unable to remove frm.templateElements from frm.elements
		}
		
		//Repetition blocks without a repeat-template attribute are associated with their first following sibling 
		//   that is a repetition template, if there is one.
		var attr,sibling = this.parentNode.firstChild;
		while(sibling && sibling != this){
			if(sibling.nodeType == 1 && (attr = sibling.getAttributeNode('repeat')) && /^-?\d+$/.test(attr.value) && !sibling.getAttribute('repeat-template')){
			//if(sibling.repetitionType == RepetitionElement.REPETITION_BLOCK && !sibling.getAttribute('repeat-template')){
			//console.info(sibling)
				sibling.repetitionTemplate = this;
				sibling.setAttribute('repeat-template', this.id);
				this.repetitionBlocks.push(sibling);
			}
			sibling = sibling.nextSibling;
		}
		//while(sibling = sibling.previousSibling){
		//	if(sibling.repetitionType == RepetitionElement.REPETITION_BLOCK && !sibling.getAttribute('repeat-template')){
		//		sibling.repetitionTemplate = this;
		//		sibling.setAttribute('repeat-template', this.id);
		//		this.repetitionBlocks.unshift(sibling);
		//	}
		//}
	
		//the UA must invoke the template's replication behaviour as many times as the repeat-start attribute 
		//   on the same element specifies (just once, if the attribute is missing or has an invalid value). 
		//   Then, while the number of repetition blocks associated with the repetition template is less than 
		//   the template's repeat-min attribute, the template's replication behaviour must be further invoked. 
		//   (Invoking the template's replication behaviour means calling its addRepetitionBlock() method).
		//for(var i = 0; i < Math.max(this.repeatStart, this.repeatMin); i++)
		for(var i = 0; (i < this.repeatStart || this.repetitionBlocks.length < this.repeatMin); i++)
			this.addRepetitionBlock();
		
		$wf2.repetitionTemplates.push(this);
		this.wf2Initialized = true;
	},
	
	initRepetitionTemplates : function(parentNode){
		//UAs must iterate through every node in the document, depth first, looking for templates so that their 
		//   initial repetition blocks can be created. 
		//var repetitionTemplates = cssQuery("*[repeat=template]", parentNode);
		var repetitionTemplates = $wf2.getElementsByTagNamesAndAttribute.apply((parentNode || document.documentElement), [['*'], 'repeat', 'template']);
		for(var i = 0, rt; i < repetitionTemplates.length; i++)
			$wf2.constructRepetitionTemplate.apply(repetitionTemplates[i]);
	},


	//## REPETITION BLOCK  #############################################################
	constructRepetitionBlock : function(){
		if(this.wf2Initialized)
			return;
			
		this.style.display = ''; //This should preferrably be specified via a stylesheet
		this.repetitionType = RepetitionElement.REPETITION_BLOCK;
		var _attr;
		this.repetitionIndex = /^\d+$/.test(_attr = this.getAttribute('repeat')) ? parseInt(_attr) : 0;
		this.repetitionBlocks = null;
		
		//find this block's repetition template
		this.repetitionTemplate = null; //IMPLEMENT GETTER
		var node;
		
		if((node = document.getElementById(this.getAttribute('repeat-template'))) && 
		   node.getAttribute('repeat') == 'template')
		{
			this.repetitionTemplate = node;
		}
		else {
			node = this;
			while(node = node.nextSibling){
				if(node.nodeType == 1 && node.getAttribute('repeat') == 'template'){
					this.repetitionTemplate = node;
					break;
				}
			}
		}
		
		if(!this.removeRepetitionBlock) this.removeRepetitionBlock = function(){ 
			return $wf2.removeRepetitionBlock.apply(this); //wrapper to save memory
		};
		if(!this.moveRepetitionBlock) this.moveRepetitionBlock = function(distance){ 
			return $wf2.moveRepetitionBlock.apply(this, [distance]); //wrapper to save memory
		};
		this.wf2Initialized = true;
	},

	initRepetitionBlocks : function(parentNode){
		//var repetitionBlocks = cssQuery('*[repeat]:not([repeat="template"])', parentNode); //:not([repeat="template"])
		var repetitionBlocks = $wf2.getElementsByTagNamesAndAttribute.apply((parentNode || document.documentElement), [['*'], 'repeat', 'template', true]);
		for(var i = 0; i < repetitionBlocks.length; i++)
			$wf2.constructRepetitionBlock.apply(repetitionBlocks[i]);
	},
	
	
	//## Repetition buttons #############################################################
	repetitionButtonDefaultLabels : {
		'add' : 'Add',
		'remove' : 'Remove',
		'move-up' : 'Move-up',
		'move-down' : 'Move-down'
	},
	
	constructRepetitionButton : function(btnType){
		if(this.wf2Initialized)
			return;
		this.htmlTemplate = $wf2.getHtmlTemplate(this); //IMPLEMENT GETTER
		if(!this.firstChild)
			this.appendChild(document.createTextNode($wf2.repetitionButtonDefaultLabels[btnType]));
		
		//user agents must automatically disable remove, move-up, and move-down buttons when they are not in a repetition 
		//   block. [NOT IMPLEMENTED:] This automatic disabling does not affect the DOM disabled  attribute. It is an intrinsic property of these buttons.
		if(btnType != 'add')
			this.disabled = !$wf2.getRepetitionBlock(this);
		//user agents must automatically disable add buttons (irrespective of the value of the disabled 
		//   DOM attribute [NOT IMPLEMENTED]) when the buttons are not in a repetition block that has an 
		//   associated template and their template attribute is either not specified or does not have 
		//   an ID that points to a repetition template...
		else {
			var rb;		
			this.disabled = !(((rb = $wf2.getRepetitionBlock(this)) && rb.repetitionTemplate)
								||
								this.htmlTemplate
							 );
		}

		if(this.addEventListener)
			this.addEventListener('click', $wf2.clickRepetitionButton, false);
		else if(this.attachEvent)
			this.attachEvent('onclick', $wf2.clickRepetitionButton);
		else this.onclick = $wf2.clickRepetitionButton;
		
		this.wf2Initialized = true;
	},

	initRepetitionButtons : function(btnType, parent){
		var i;
		if(!parent)
			parent = document.documentElement;

		//change INPUTs to BUTTONs
		var inpts = $wf2.getElementsByTagNamesAndAttribute.apply(parent, [['input'], 'type', btnType]);
		for(i = 0; i < inpts.length; i++){
			var btn = document.createElement('button');
			for(var j = 0, attr; attr = inpts[i].attributes[j]; j++)
				btn.setAttribute(attr.nodeName, inpts[i].getAttribute(attr.nodeName)); //MSIE returns correct value with getAttribute but not nodeValue
			inpts[i].parentNode.replaceChild(btn, inpts[i]);
			btn = null;
		}

		//construct all buttons
		var btns = $wf2.getElementsByTagNamesAndAttribute.apply(parent, [['button'], 'type', btnType]);
		for(var i = 0; i < btns.length; i++)
			$wf2.constructRepetitionButton.apply(btns[i], [btnType]);
	},

	clickRepetitionButton : function(e){
		if(e && e.preventDefault)
			e.preventDefault(); //Keep default submission behavior from executing

		//If the event is canceled (btn.returnValue === false, set within onclick handler), then the default action will not occur.
		var btn;
		if(e && e.target)
			btn = e.target;
		else if(window.event)
			btn = event.srcElement;
		else if(this.nodeName.toLowerCase() == 'button')
			btn = this;
		var btnType = String(btn.getAttribute('type')).toLowerCase();
		
		//Prevent the onclick handler from firing afterwards (would fire after movement action)
		//  ISSUE: This only works in Firefox
		if(btn.onclick){
			btn._onclick = btn.onclick;
			btn.removeAttribute('onclick');
			btn.onclick = null; 
		}

		//Terminate if an onclick handler was called beforehand and returned a false value
		//   passed via the button's returnValue property. Handlers defined by HTML attributes
		//   are called before those assigned by onclick DOM properties.
		if(btn.returnValue !== undefined && !btn.returnValue){
			btn.returnValue = undefined;
			return false;
		}
		
		//Ensure that a user-supplied onclick handler is fired before the repetition behavior is executed
		//  and terminate if this onclick handler returns a false value
		//  Note that handlers defined in onclick HTML attributes are executed before clickRepetitionButton
		if(btn._onclick && btn.returnValue === undefined){ //  && !btn.getAttributeNode("onclick") //&& btn.hasAttribute && !btn.hasAttribute("onclick") //NOTE: MSIE fires this afterwards???			btn.returnValue = btn._onclick(e);
			btn.returnValue = btn._onclick(e);
			if(btn.returnValue !== undefined && !btn.returnValue){
				btn.returnValue = undefined;
				return false;
			}
		}
		btn.returnValue = undefined;
		
		//ISSUE: How do we ensure that the MSIE and DOM Level 2 Event handlers are executed beforehand?
		
		var block;
		if(btnType != 'add'){
			block = $wf2.getRepetitionBlock(btn);
			
			//user agents must automatically disable remove, move-up, and move-down buttons when they are not in a repetition 
			//   block. [NOT IMPLEMENTED:] This automatic disabling does not affect the DOM disabled  attribute. It is an intrinsic property of these buttons.
			this.disabled = !block;
			
			if(block){
				if(btnType.indexOf('move') === 0){
					block._clickedMoveBtn = btn;
					block.moveRepetitionBlock(btnType == 'move-up' ? -1 : 1);
				}
				else if(btnType == 'remove'){
					block.removeRepetitionBlock();
				}
			}
		}
		else {
			var rt;
			//If an add button with a template attribute is activated, and its template attribute gives the ID 
			//   of an element in the document that is a repetition template as defined above, then that 
			//   template's replication behaviour is invoked. (Specifically, in scripting-aware environments, 
			//   the template's addRepetitionBlock() method is called with a null argument.) In the case of 
			//   duplicate IDs, the behaviour should be the same as with getElementById().
			if(btn.htmlTemplate)
				rt = btn.htmlTemplate;
			else {
			//If an add button without a template attribute is activated, and it has an ancestor that is a 
			//   repetition block that is not an orphan repetition block, then the repetition template associated 
			//   with that repetition block has its template replication behaviour invoked with the respective 
			//   repetition block as its argument. (Specifically, in scripting-aware environments, the template's 
			//   addRepetitionBlock() method is called with a reference to the DOM Element node that represents 
			//   the repetition block.)
				block = $wf2.getRepetitionBlock(btn);
				if(block && block.repetitionTemplate)
					rt = block.repetitionTemplate;
			}
			if(rt)
				rt.addRepetitionBlock();
			else
				btn.disabled = true; //NOTE: THIS IS NOT A VALID IMPLEMENTATION
		}
		return false;
	},
	
	//## AddRepetitionBlock algorithm #############################################################
	
	//Element addRepetitionBlock(in Node refNode);
	addRepetitionBlock : function(refNode, index){ //addRepetitionBlockByIndex functionalty enabled if @index defined
		//if(refNode && !refNode.nodeType)
		//	throw Error("Exception: WRONG_ARGUMENTS_ERR");

		//if(this.repetitionType == RepetitionElement.REPETITION_TEMPLATE)
		if(this.getAttribute('repeat') != 'template')
			throw $wf2.DOMException(9); //NOT_SUPPORTED_ERR

		//if addRepetitionBlock called before repetition constructors called (by pre-filling forms)
		if(!this.repetitionBlocks)
			this.repetitionBlocks = [];
		if(!this.repetitionIndex)
			this.repetitionIndex = 0;
		if(!this.repeatMin)
			this.repeatMin = 0;
		if(!this.repeatMax)
			this.repeatMax = Number.MAX_VALUE;
		if(!this.repeatStart)
			this.repeatStart = 1;

		//1. If the template has no parent node or its parent node is not an element, then the method must abort 
		//   the steps and do nothing. 
		if(this.parentNode == null)
			return null;
			
		//[furthermore, if this template is the child of another template (not the child of an instance, a block) return false]
		var node = this;
		while(node = node.parentNode){
			//if(node.repetitionType == RepetitionElement.REPETITION_TEMPLATE)
			if(node.nodeType == 1 && node.getAttribute('repeat') == 'template')
				return false;
		}
		
		//2. The template examines its preceding siblings, up to the start of the parent element. For each sibling 
		//   that is a repetition block whose associated template is this template, if the repetition block's index 
		//   is greater than or equal to the template's index, then the template's index is increased to the repetition 
		//   block's index plus one. The total number of repetition blocks associated with this template that were 
		//   found is used in the next step.
		//QUESTION: Why not just use this.repetitionBlocks.length????????????
		var sibling = this.previousSibling;
		var currentBlockCount = 0;
		while(sibling != null){
			if(sibling.nodeType == 1){
				var repeatAttr,repeatTemplateAttr;
				repeat = parseInt(sibling.getAttribute('repeat'));
				repeatTemplateAttr = sibling.getAttributeNode('repeat-template');
				
				//if(sibling.repetitionType == RepetitionElement.REPETITION_BLOCK && sibling.repetitionTemplate == this)
				if(!isNaN(repeat) && (!repeatTemplateAttr || repeatTemplateAttr.value == this.id))
				{
					//Old Note: sibling.getAttribute('repeat') is used instead of sibling.repetitionIndex because appearantly
					//      the sibling is not yet bound to the document and so the getters are not available
					//this.repetitionIndex = Math.max(this.repetitionIndex, parseInt(sibling.getAttribute('repeat'))+1);
					this.repetitionIndex = Math.max(this.repetitionIndex, repeat+1);
					currentBlockCount++;
				}
			}
			sibling = sibling.previousSibling;
		}
		
		//3. If the repetition template has a repeat-max attribute and that attribute's value is less than or equal 
		//   to the number of repetition blocks associated with this template that were found in the previous step, 
		//   the UA must stop at this step, returning a null value.
		if(this.repeatMax <= currentBlockCount)
			return null;
			
		//4. If this algorithm was invoked via the addRepetitionBlockByIndex()  method, and the value of the method's 
		//   index argument is greater than the template's index, then the template's index is set to the value of the 
		//   method's index argument.
		if(index !== undefined && index > this.repetitionIndex)
			this.repetitionIndex = index;

		//(the following steps are out of order to facilitate a custom cloneNode to cope for MSIE and Gecko issues)
		
		//9. If the new repetition block has an ID attribute (that is, an attribute specifying an ID, regardless 
		//   of the attribute's namespace or name), then that attribute's value is used as the template name in 
		//   the following steps. Otherwise, the template has no name. (If there is more than one ID attribute, 
		//   the "first" one in terms of node order is used. [DOM3CORE]) 
		//   [Since this step was moved here, it uses 'this' and not 'block', which hasn't been created yet]
		//var IDAttr = block.getAttributeNode('id') ? block.getAttributeNode('id') : block.getAttributeNode('name'); //DETECT ID TYPE For others?
		var IDAttrName = this.getAttribute('id') ? 'id' : this.getAttribute('name') ? 'name' : ''; //NOTE: hasAttribute not implemented in MSIE
		var IDAttrValue = this.getAttribute(IDAttrName);

		//5. A clone of the template is made. The resulting element is the new repetition block element.
		//   [Note that the DOM cloneNode method is not invoked in this implementation due to MSIE 
		//   errors, such as not being able to modify the name attribute of an existing node and strange Gecko behavior
		//   regarding the inconsistant correspondence of an input node's value attribute and value property.
		//   Instead of invoking the native cloneNode method, each element is copied manually when it is iterated over.]
		//	 [Note: step 11 of the the specification's algorithm has been merged into step 5. See note at step 11 below]
		//(11). If the template has a name and it is not being ignored (see the previous two steps), then, for every 
		//      attribute on the new element, and for every attribute in every descendant of the new element: if the 
		//      attribute starts with a zero-width non-breaking space character (U+FEFF) then that character is 
		//      removed from the attribute; otherwise, any occurrences of a string consisting of an opening square 
		//      bracket (U+005B, "[") or a modifier letter half triangular colon (U+02D1), the template's name, 
		//      and a closing square bracket (U+005D, "]") or a middle dot (U+00B7), are replaced by the new 
		//      repetition block's index. This is performed regardless of the types, names, or namespaces of attributes, 
		//      and is done to all descendants, even those inside nested forms, nested repetition templates, and so forth.
		var block;
		
		//(10). If the template has a name (see the previous step), and that name contains either an opening square 
		//      bracket (U+005B, "[") a modifier letter half triangular colon (U+02D1), a closing square bracket 
		//      (U+005D, "]") or a middle dot (U+00B7), then the template's name is ignored for the purposes of 
		//      [this] step.
		var replaceValue = this.repetitionIndex;
		var reTemplateName, processAttr;
		if(IDAttrValue && !/\u005B|\u02D1|\u005D|\u00B7/.test(IDAttrValue)){ //VALID LOGIC?
			reTemplateName = new RegExp("(\\[|\u02D1)" + IDAttrValue + "(\\]|\u00B7)", 'g'); //new RegExp('(\\u005B|\\u02D1)' + IDAttrValue + '(\\u005D|\\u00B7)', 'g');
			processAttr = function(attrVal){ //Function that processes an attribute value as defined in step 11
				if(!attrVal) 
					return attrVal;
				attrVal = attrVal.toString();
				if(attrVal.indexOf("\uFEFF") === 0)
					return attrVal.replace(/^\uFEFF/, '');
				return attrVal.replace(reTemplateName, replaceValue);
			};
		}
		block = $wf2.cloneNode(this, processAttr);
		block.wf2Initialized = false;
		reTemplateName = null;
		
		//6. If this algorithm was invoked via the addRepetitionBlockByIndex()  method, the new repetition block 
		//   element's index is set to the method's index argument. Otherwise, the new repetition block element's 
		//   index is set to the template's index. [Note: if called by addRepetitionBlockByIndex() then the 
		//   template's repetitionIndex has already been set to the index argument. Redundant algorithm step.]
		//block.repetitionIndex = this.repetitionIndex; //this is set in the constructor for the repetitionBlock
		//7. If the new repetition block element is in the http://www.w3.org/1999/xhtml namespace, then the 
		//   repeat attribute in no namespace on the cloned element has its value changed to the new block's 
		//   index. Otherwise, the repeat attribute in the http://www.w3.org/1999/xhtml namespace has its value 
		//   changed to the new block's index.
		//if(block.namespaceURI == 'http://www.w3.org/1999/xhtml')
			block.setAttribute('repeat', this.repetitionIndex); //when inserted into DOM, constructor sets block.repetitionIndex
		//else
		//	block.setAttributeNS('http://www.w3.org/1999/xhtml', 'repeat', this.repetitionIndex);
		
		//8. If the new repetition block element is in the http://www.w3.org/1999/xhtml namespace, then any 
		//   repeat-min, repeat-max, or repeat-start attributes in no namespace are removed from the element. 
		//   Otherwise, any repeat-min, repeat-max, or repeat-start attributes in the http://www.w3.org/1999/xhtml 
		//   namespace are removed instead.

		//if(block.namespaceURI == 'http://www.w3.org/1999/xhtml'){
			block.removeAttribute('repeat-min');
			block.removeAttribute('repeat-max');
			block.removeAttribute('repeat-start');
		//}
		//else {
		//	block.removeAttributeNS('http://www.w3.org/1999/xhtml', 'repeat-min');
		//	block.removeAttributeNS('http://www.w3.org/1999/xhtml', 'repeat-max');
		//	block.removeAttributeNS('http://www.w3.org/1999/xhtml', 'repeat-start');
		//}
		
		//(steps 9 and 10 moved to before step 5 (operates on this repetition template, and not on cloned block))


		//11. (Note: the algorithm below which most closely follows the algorithm as described in the specification,
		//    this has been merged into the cloning of the template in step 5. This has been done because of MSIE 
		//    errors, such as not being able to modify the name attribute of an existing node and strange Gecko behavior
		//    regarding the inconsistant correspondence of an input node's value attribute and value property.)
		//if(IDAttrValue && !ignoreName){
		//	var reTemplateName = new RegExp('(?:\\u005B|\\u02D1)' + IDAttrValue + '(?:\\u005D|\\u00B7)', 'g');
		//	function processAttrs(node){
		//		var i,attr;
		//		for(i = 0; node.attributes && i < node.attributes.length; i++){
		//			if(!(attr = node.attributes[i]).nodeValue)
		//				continue;
		//			
		//			if(String(attr.nodeValue).indexOf("\uFEFF") === 0)
		//				attr.nodeValue = attr.nodeValue.replace(/^\uFEFF/, '');
		//				
		//			else if(reTemplateName.test(attr.nodeValue))
		//				attr.nodeValue = attr.nodeValue.replace(reTemplateName, block.getAttribute('repeat'));
		//		}
		//		for(i = 0; i < node.childNodes.length; i++)
		//			processAttrs(node.childNodes[i]);
		//	}
		//	processAttrs(block);
		//}

			
		//12. If the template has a name (see the earlier steps): If the new repetition block element is in the 
		//    http://www.w3.org/1999/xhtml namespace, then the repeat-template attribute in no namespace on the 
		//    cloned element has its value set to the template's name. Otherwise, the repeat-template attribute 
		//    in the http://www.w3.org/1999/xhtml namespace has its value set to the template's name. (This 
		//    happens even if the name was ignored for the purposes of the previous step.)
		if(IDAttrName){
			//if(block.namespaceURI == "http://www.w3.org/1999/xhtml")
				block.setAttribute('repeat-template', IDAttrValue); //block.setAttributeNS(null, 'repeat-template', IDAttr.nodeValue);
			//else 
			//	block.setAttributeNS('http://www.w3.org/1999/xhtml', 'repeat-template', IDAttr.nodeValue);
			
			
			//13. The attribute from which the template's name was derived, if any, and even if it was ignored, is 
			//    removed from the new repetition block element. (See the previous four steps.)
			block.removeAttribute(IDAttrName);
		}

		//14. If the first argument to the method was null, then the template once again crawls through its 
		//    previous siblings, this time stopping at the first node (possibly the template itself) whose 
		//    previous sibling is a repetition block (regardless of what that block's template is) or the first 
		//    node that has no previous sibling, whichever comes first. The new element is the inserted into the 
		//    parent of the template, immediately before that node. Mutation events are fired if appropriate.
		if(!refNode){
			refNode = this;
			while(refNode.previousSibling && refNode.previousSibling.repetitionType != RepetitionElement.REPETITION_BLOCK)
				refNode = refNode.previousSibling;
			this.parentNode.insertBefore(block, refNode);
			this.repetitionBlocks.push(block);
		}
		//15. Otherwise, the new element is inserted into the parent of the node that was passed to the method 
		//    as the first argument, immediately after that node (before the node's following sibling, if any). 
		//    Mutation events are fired if appropriate.
		else {
			refNode.parentNode.insertBefore(block, refNode.nextSibling);
			this.repetitionBlocks.push(block);
			if($wf2.sortNodes)
				this.repetitionBlocks.sort($wf2.sortNodes);
		}
		
		//16. The template's index is increased by one. 
		this.repetitionIndex++;
		
		//[apply constructors to the new repetition block, and to the new remove buttons, add buttons, etc]
		$wf2.constructRepetitionBlock.apply(block);
		$wf2.initRepetitionTemplates(block);
		
		$wf2.initRepetitionButtons('add', block);
		$wf2.initRepetitionButtons('remove', block);
		$wf2.initRepetitionButtons('move-up', block);
		$wf2.initRepetitionButtons('move-down', block);
		
		//In addition, user agents must automatically disable add buttons (irrespective of the value of the 
		//   disabled DOM attribute) when the buttons are not in a repetition block that has an associated 
		//   template and their template attribute is either not specified or does not have an ID that points 
		//   to a repetition template, and, when the repetition template's repeat-max attribute is less than 
		//   or equal to the number of repetition blocks that are associated with that template and that have 
		//   the same parent. This automatic disabling does not affect the DOM disabled attribute. It is an 
		//   intrinsic property of these buttons.
		if($wf2.isInitialized){ //if buttons not yet initialized, will initially be called by _init_document
			$wf2.updateAddButtons(this);
			$wf2.updateMoveButtons(this.parentNode);
		}
		
		//Setup block with the other WF2 behavior
		$wf2.initNonRepetitionFunctionality(block);
		//var els = $wf2.getElementsByTagNamesAndAttribute.apply(block, [['*'], "autofocus"]); //ISSUE: Any form control (except hidden and output controls) can have an autofocus attribute specified. //var elName = els[i].nodeName.toLowerCase(); if(elName == 'output' || (elName == 'input' && els[i].type == 'hidden'))
		//for(var i = 0; i < els.length; i++)
		//	$wf2.initAutofocusElement(els[i]);

		//17. An added event with no namespace, which bubbles but is not cancelable and has no default action, 
		//    must be fired on the repetition template using the RepetitionEvent interface, with the repetition 
		//    block's DOM node as the context information in the element  attribute.
		var addEvt;
		try {
			if(document.createEvent)
				addEvt = document.createEvent('UIEvents'); //document.createEvent("RepetitionEvent")
			else if(document.createEventObject)
				addEvt = document.createEventObject();
			RepetitionEvent._upgradeEvent.apply(addEvt);
			addEvt.initRepetitionEvent('added', true /*canBubble*/, false /*cancelable*/, block);
			if(this.dispatchEvent)
				this.dispatchEvent(addEvt);
			else if(this.fireEvent){
				//console.warn("fireEvent('onadd') for MSIE is not yet working");
				//this.fireEvent('onadded', addEvt);
			}
		}
		catch(err){
			addEvt = new Object();
			RepetitionEvent._upgradeEvent.apply(addEvt);
			addEvt.initRepetitionEvent('added', true /*canBubble*/, false /*cancelable*/, block);
		}

		//Add support for event handler set with HTML attribute 
		var handlerAttr;
		if((handlerAttr = this.getAttribute('onadded')) && (!this.onadded || typeof this.onadded != 'function')){  //in MSIE, attribute == property
			this.onadded = new Function('event', handlerAttr);
		}
		//Deprecated
		else if((handlerAttr = this.getAttribute('onadd')) && (!this.onadd || typeof this.onadd != 'function')){
			this.onadd = new Function('event', handlerAttr);
		}

		try {
			//Dispatch events for the old event model (extension to spec)
			if(this.onadded){
				//this.onadded(addEvt); 
				this.onadded.apply(this, [addEvt]); //for some reason, exceptions cannot be caught if using the method above in MSIE
			}
			else if(this.onadd){ //deprecated
				//this.onadd(addEvt);
				this.onadd.apply(this, [addEvt]); 
			}
		}
		catch(err){
			//throw exception within setTimeout so that the current execution will not be aborted
			setTimeout(function(){
				throw err;
			}, 0); //using 0 milliseconds done at <http://novemberborn.net/javascript/threading-quick-tip>
		}

		//18. The return value is the newly cloned element.
		return block;
	},
	//Element addRepetitionBlockByIndex(in Node refNode, in long index);
	addRepetitionBlockByIndex : function(refNode, index){
		$wf2.addRepetitionBlock.apply(this, [refNode, index])
	},
	
	//## RemoveRepetitionBlock algorithm #############################################################
	
	//void removeRepetitionBlock();
	removeRepetitionBlock : function(){
		if(this.repetitionType != RepetitionElement.REPETITION_BLOCK)
			throw $wf2.DOMException(9); //NOT_SUPPORTED_ERR

		//1. The node is removed from its parent, if it has one. Mutation events are fired if appropriate. 
		//   (This occurs even if the repetition block is an orphan repetition block.)
		var parentNode = this.parentNode; //save for updateMoveButtons
		var block = parentNode.removeChild(this);
		$wf2.updateMoveButtons(parentNode);
		
		//The following loop used to appear within step #3 below; 
		//  this caused problems because the program state was incorrect when onremoved was called (repetitionBlocks was not modified)
		if(this.repetitionTemplate != null){
			for(var i = 0; i < this.repetitionTemplate.repetitionBlocks.length; i++){
				if(this.repetitionTemplate.repetitionBlocks[i] == this){
					this.repetitionTemplate.repetitionBlocks.splice(i,1);
					break;
				}
			}
		}

		//2. If the repetition block is not an orphan, a removed event with no namespace, which bubbles but 
		//   is not cancelable and has no default action, must be fired on the element's repetition template, 
		//   using the RepetitionEvent interface, with the repetition block's DOM node as the context information 
		//   in the element attribute.
		if(this.repetitionTemplate != null){
			var removeEvt;
			try {
				if(document.createEvent)
					removeEvt = document.createEvent('UIEvents'); //document.createEvent("RepetitionEvent")
				else if(document.createEventObject)
					removeEvt = document.createEventObject();
				RepetitionEvent._upgradeEvent.apply(removeEvt);
				removeEvt.initRepetitionEvent('removed', true /*canBubble*/, false /*cancelable*/, this);
				if(this.repetitionTemplate.dispatchEvent)
					this.repetitionTemplate.dispatchEvent(removeEvt);
				else if(this.repetitionTemplate.fireEvent){
					//console.warn("fireEvent('onremoved') for MSIE is not yet working");
					//this.repetitionTemplate.fireEvent('onremoved', removeEvt);
				}
			}
			catch(err){
				removeEvt = new Object();
				RepetitionEvent._upgradeEvent.apply(removeEvt);
				removeEvt.initRepetitionEvent('removed', true /*canBubble*/, false /*cancelable*/, this);
			}
			
			//Add support for event handler set with HTML attribute
			var handlerAttr;
			if((handlerAttr = this.repetitionTemplate.getAttribute('onremoved')) &&
				    (!this.repetitionTemplate.onremoved || typeof this.repetitionTemplate.onremoved != 'function')) //in MSIE, attribute == property
			{  
				this.repetitionTemplate.onremoved = new Function('event', handlerAttr);
			}
			//Deprecated
			else if((handlerAttr = this.repetitionTemplate.getAttribute('onremove')) &&
					 (!this.repetitionTemplate.onremove || typeof this.repetitionTemplate.onremove != 'function'))
			{
				this.repetitionTemplate.onremove = new Function('event', handlerAttr);
			}

			try {
				//Dispatch events for the old event model (extension to spec)
				if(this.repetitionTemplate.onremoved){
					//this.repetitionTemplate.onremoved(removeEvt);	
					this.repetitionTemplate.onremoved.apply(this, [removeEvt]); //for some reason, exceptions cannot be caught if using the method above in MSIE
				}
				else if(this.repetitionTemplate.onremove){ //deprecated
					//this.repetitionTemplate.onremove(removeEvt);
					this.repetitionTemplate.onremove.apply(this, [removeEvt]); 
				}
			}
			catch(err){
				//throw exception within setTimeout so that the current execution will not be aborted
				setTimeout(function(){
					throw err;
				}, 0);
			}
		}

		//3. If the repetition block is not an orphan, then while the remaining number of repetition blocks 
		//   associated with the original element's repetition template and with the same parent as the template 
		//   is less than the template's repeat-min attribute and less than its repeat-max attribute, the 
		//   template's replication behaviour is invoked (specifically, its addRepetitionBlock() method is called). 
		if(this.repetitionTemplate != null){
//			//BUG: The following needs to be moved before the call to onremoved
//			var t = this.repetitionTemplate;
//			for(var i = 0; i < t.repetitionBlocks.length; i++){
//				if(t.repetitionBlocks[i] == this){
//					t.repetitionBlocks.splice(i,1);
//					break;
//				}
//			}
			if(this.repetitionTemplate.repetitionBlocks.length < this.repetitionTemplate.repeatMin 
			     && this.repetitionTemplate.repetitionBlocks.length < this.repetitionTemplate.repeatMax)
			{
				this.repetitionTemplate.addRepetitionBlock();
			}

			//enable add buttons
			if(this.repetitionTemplate.repetitionBlocks.length < this.repetitionTemplate.repeatMax){
				//var addBtns = cssQuery("button[type=add]");
				var addBtns = $wf2.getElementsByTagNamesAndAttribute.apply(document.documentElement, [['button'], 'type', 'add']);
				for(i = 0; i < addBtns.length; i++){
					if(addBtns[i].htmlTemplate == this.repetitionTemplate)
						addBtns[i].disabled = false;
				}
			}
		}
	},

	//## MoveRepetitionBlock algorithm #############################################################
	 
	//void moveRepetitionBlock(in long distance);
	moveRepetitionBlock : function(distance){
		if(this.repetitionType != RepetitionElement.REPETITION_BLOCK)
			throw $wf2.DOMException(9); //NOT_SUPPORTED_ERR
		
		//1. If distance is 0, or if the repetition block has no parent, nothing happens and the algorithm ends here.
		if(distance == 0 || this.parentNode == null)
			return;
		
		//2. Set target, a reference to a DOM Node, to the repetition block being moved.
		//   [Furthermore, move the reference to this block in the template's repetitionBlocks HTMLCollection to 
		//   reflect the new position that it is being moved to.]
		var target = this;
		if(this.repetitionTemplate){
			var pos = 0;
			var rp = this.repetitionTemplate.repetitionBlocks;
			while(pos < rp.length && rp[pos] != this)
				pos++;
			rp.splice(pos, 1);
			rp.splice(distance < 0 ? Math.max(pos+distance, 0) : Math.min(pos+distance, rp.length), 0, this);
		}
		
		//3. If distance is negative: while distance is not zero and target's previousSibling is defined and is 
		//   not a repetition template, set target to this previousSibling and, if it is a repetition block, 
		//   increase distance by one (make it less negative by one).
		if(distance < 0){
			while(distance != 0 && target.previousSibling && 
			      target.previousSibling.repetitionType != RepetitionElement.REPETITION_TEMPLATE)
			{
				target = target.previousSibling;
				if(target.repetitionType == RepetitionElement.REPETITION_BLOCK)
					distance++;
			}
		}
		//4. Otherwise, distance is positive: while distance  is not zero and target's nextSibling is defined 
		//   and is not a repetition template, set target to this nextSibling and, if it is a repetition block, 
		//   decrease distance by one. After the loop, set target to target's nextSibling (which may be null).
		else {
			while(distance != 0 && target.nextSibling && target.nextSibling.repetitionType != RepetitionElement.REPETITION_TEMPLATE){
				target = target.nextSibling;
				if(target.repetitionType == RepetitionElement.REPETITION_BLOCK)
					distance--;
			}
			target = target.nextSibling;
		}
		
		//5. Call the repetition block's parent node's insertBefore()  method with the newChild argument 
		//   being the repetition block and the refChild argument being target (which may be null by this 
		//   point). Mutation events are fired if appropriate. 
		this.parentNode.insertBefore(this, target);
		
		//Keep focus on the move button which was clicked
		if(this._clickedMoveBtn){
			this._clickedMoveBtn.focus();
			this._clickedMoveBtn = null;
		}
		
		//In addition, user agents must automatically disable move-up buttons (irrespective of the 
		//   value of the disabled DOM attribute) when their repetition block could not be moved any 
		//   higher according to the algorithm above, and when the buttons are not in a repetition 
		//   block. Similarly, user agents must automatically disable move-down buttons when their 
		//   repetition block could not be moved any lower according to the algorithm above, and 
		//   when the buttons are not in a repetition block. This automatic disabling does not affect 
		//   the DOM disabled  attribute. It is an intrinsic property of these buttons.
		$wf2.updateMoveButtons(this.parentNode);
		
		//6. A moved event with no namespace, which bubbles but is not cancelable and has no default action, 
		//   must be fired on the element's repetition template (if it has one), using the RepetitionEvent 
		//   interface, with the repetition block's DOM node as the context information in the element  attribute.
		if(this.repetitionTemplate != null){
			var moveEvt;
			try {
				if(document.createEvent)
					moveEvt = document.createEvent('UIEvents'); //document.createEvent("RepetitionEvent")
				else if(document.createEventObject)
					moveEvt = document.createEventObject();
				RepetitionEvent._upgradeEvent.apply(moveEvt);
				moveEvt.initRepetitionEvent('moved', true /*canBubble*/, false /*cancelable*/, this);
				if(this.repetitionTemplate.dispatchEvent)
					this.repetitionTemplate.dispatchEvent(moveEvt);
				else if(this.repetitionTemplate.fireEvent){
					//console.warn("fireEvent('onmoved') for MSIE is not yet working");
					//this.fireEvent('onmoved', moveEvt);
				}
			}
			catch(err){
				moveEvt = new Object();
				RepetitionEvent._upgradeEvent.apply(moveEvt);
				moveEvt.initRepetitionEvent('moved', true /*canBubble*/, false /*cancelable*/, this);
			}
			
			//Add support for event handler set with HTML attribute---------------------
			var handlerAttr;
			if((handlerAttr = this.repetitionTemplate.getAttribute('onmoved')) &&
				    (!this.repetitionTemplate.onmoved || typeof this.repetitionTemplate.onmoved != 'function')) //in MSIE, attribute == property
			{  
				this.repetitionTemplate.onmoved = new Function('event', handlerAttr);
			}
			//Deprecated
			else if(handlerAttr = this.repetitionTemplate.getAttribute('onmove'))
			{
				if(!this.repetitionTemplate.onmove || typeof this.repetitionTemplate.onmove != 'function'){
					this.repetitionTemplate.onmove = new Function('event', handlerAttr);
				}

				//For MSIE, onmove is already an event, and attributes are equal to properties, so attribute value can be function.
				//  The 'event' argument must be added to the function argument list.
				var funcMatches;
				if(typeof handlerAttr == 'function' && (funcMatches = handlerAttr.toString().match(/^\s*function\s+anonymous\(\s*\)\s*\{((?:.|\n)+)\}\s*$/))){
					this.repetitionTemplate.onmove = new Function('event', funcMatches[1]);
				}
			}
			
			
//			var onmovedAttr = this.repetitionTemplate.getAttribute('onmoved') 
//			                   || /* deprecated */ this.repetitionTemplate.getAttribute('onmove');
			
			//For MSIE, onmove is already an event, and attributes are equal to properties, so attribute value can be function.
			//  The 'event' argument must be added to the function argument list.
//			var funcMatches;
//			if(typeof onmovedAttr == 'function' && (funcMatches = onmovedAttr.toString().match(/^\s*function\s+anonymous\(\s*\)\s*\{((?:.|\n)+)\}\s*$/))){
//				this.repetitionTemplate.onmoved = new Function('event', funcMatches[1]);
//			}
			
			//If the onmove attribute has been set but the property (method) has not
//			if(onmovedAttr && !this.repetitionTemplate.onmoved)
//				this.repetitionTemplate.onmoved = new Function('event', onmovedAttr);
			
			//This need not be done in MSIE since onmove is already an event, and attributes == properties
			//if(onmoveAttr && typeof onmoveAttr != 'function' /* for MSIE */ && 
			//      (!this.repetitionTemplate.onmove || typeof this.repetitionTemplate.onmove != 'function')
			//   ){
			//	this.repetitionTemplate.onmove = new Function('event', onmoveAttr);
			//}

			try {
				//Dispatch events for the old event model (extension to spec)
				if(this.repetitionTemplate.onmoved){
					//this.repetitionTemplate.onmoved(moveEvt);
					this.repetitionTemplate.onmoved.apply(this, [moveEvt]);
				}
				else if(this.repetitionTemplate.onmove){ //deprecated
					//this.repetitionTemplate.onmove(moveEvt);
					this.repetitionTemplate.onmove.apply(this, [moveEvt]);
				}
			}
			catch(err){
				//throw exception within setTimeout so that the current execution will not be aborted
				setTimeout(function(){
					throw err;
				}, 0); //using 0 milliseconds done at <http://novemberborn.net/javascript/threading-quick-tip>
			}
		}
	},
	
	//## Other helper functions for the repetition model behaviors ##############################
	getRepetitionBlock : function(node){
		while(node = node.parentNode){
			if(node.repetitionType == RepetitionElement.REPETITION_BLOCK){
				return node;
			}
		}
		return null;
	},

	getHtmlTemplate : function(button){
		var attr = button.getAttribute('template');
		var node;
		if(attr && (node = document.getElementById(attr)) && node.getAttribute('repeat') == 'template' /*node.repetitionType == RepetitionElement.REPETITION_TEMPLATE*/)
			return node;
		return null;
	},
	
	updateAddButtons : function(rt){
		//In addition, user agents must automatically disable add buttons (irrespective of the value of the 
		//   disabled DOM attribute) when the buttons are not in a repetition block that has an associated 
		//   template and their template attribute is either not specified or does not have an ID that points 
		//   to a repetition template, and, when the repetition template's repeat-max attribute is less than 
		//   or equal to the number of repetition blocks that are associated with that template and that have 
		//   the same parent. This automatic disabling does not affect the DOM disabled attribute. It is an 
		//   intrinsic property of these buttons.
		
		var repetitionTemplates = rt ? [rt] : $wf2.repetitionTemplates;
		
		//var btns = cssQuery("button[type=add]");
		var btns = $wf2.getElementsByTagNamesAndAttribute.apply(document.documentElement, [['button'], 'type', 'add']);
		for(var i = 0; i < btns.length; i++){
			for(var t, j = 0; t = repetitionTemplates[j]; j++){
				if(btns[i].htmlTemplate == t && t.repetitionBlocks.length >= t.repeatMax){
					btns[i].disabled = true;
				}
			}
		}
	},

	updateMoveButtons : function(parent){
		//In addition, user agents must automatically disable move-up buttons (irrespective of the value of 
		//   the disabled DOM attribute) when their repetition block could not be moved any higher according 
		//   to the algorithm above, and when the buttons are not in a repetition block. Similarly, user agents 
		//   must automatically disable move-down buttons when their repetition block could not be moved any 
		//   lower according to the algorithm above, and when the buttons are not in a repetition block. This 
		//   automatic disabling does not affect the DOM disabled  attribute. It is an intrinsic property of 
		//   these buttons.
		
		var i;
		var rbs = [];
		
		//update all move buttons if a repetition block's parent was not given
		if(!parent){
			var visitedParents = [];
			//var rbs = cssQuery('*[repeat]:not([repeat="template"])');
			//var rbs = $wf2.getElementsByProperty('repetitionType', RepetitionElement.REPETITION_BLOCK);
			rbs = $wf2.getElementsByTagNamesAndAttribute.apply(document.documentElement, [['*'], 'repeat', 'template', true]);
			for(i = 0; block = rbs[i]; i++){
				//if(!visitedParents.some(function(i){return i == block.parentNode})){
				if(!$wf2.arrayHasItem(visitedParents, block.parentNode)){
					$wf2.updateMoveButtons(block.parentNode);
					visitedParents.push(block.parentNode);
				}
			}
			return;
		}
		
		//get all of the repetition block siblings
		var j,btn,block;
		var child = parent.firstChild;
		while(child){
			if(child.repetitionType == RepetitionElement.REPETITION_BLOCK)
				rbs.push(child);
			child = child.nextSibling;
		}
		
		//disable or enable movement buttons within each block
		for(i = 0; block = rbs[i]; i++){
			//var moveUpBtns = cssQuery("button[type=move-up]", block);
			var moveUpBtns = $wf2.getElementsByTagNamesAndAttribute.apply(block, [['button'], 'type', 'move-up']);
			for(j = 0; btn = moveUpBtns[j]; j++){
				btn.disabled = 
					//if the button is not in a repetition block
					!(rb = $wf2.getRepetitionBlock(btn))
					 ||
					//when their repetition block could not be moved any lower
					(i == 0);
			}
			//var moveDownBtns = cssQuery("button[type=move-down]", block);
			var moveDownBtns = $wf2.getElementsByTagNamesAndAttribute.apply(block, [['button'], 'type', 'move-down']);
			for(j = 0; btn = moveDownBtns[j]; j++){
				btn.disabled = 
					//if the button is not in a repetition block
					!(rb = $wf2.getRepetitionBlock(btn))
					 ||
					//when their repetition block could not be moved any higher
					(i == rbs.length-1);
			}
		}
	},

	/*#############################################################################################
	 # Section: Extensions to the input element
	 ##############################################################################################*/
	
	initNonRepetitionFunctionality : function(parent){
		parent = (parent || document.documentElement);
		var i,j, frm, frms = parent.getElementsByTagName('form');
		for(i = 0; frm = frms[i]; i++){
			if(frm.checkValidity)
				continue;
			frm.checkValidity = $wf2.formCheckValidity;
			if(frm.addEventListener)
				frm.addEventListener('submit', $wf2.onsubmitValidityHandler, false);
			else
				frm.attachEvent('onsubmit', $wf2.onsubmitValidityHandler);
		}
		
		var ctrl, ctrls = $wf2.getElementsByTagNames.apply(parent, ['input','select','textarea']);//parent.getElementsByTagName([i]);
		for(i = 0; ctrl = ctrls[i]; i++){
			$wf2.applyValidityInterface(ctrl);
			$wf2.updateValidityState(ctrl); //ctrl._updateValidityState();
		}
		
		//Autofocus **********************************************************
		//Authors must not set the autofocus attribute on multiple enabled elements in a document.
		//  If multiple elements with the autofocus attribute set are inserted into a document, each one
		//  will be processed as described above, as they are inserted. This means that during document
		//  load, for example, the last focusable form control in document order with the attribute set
		//  will end up with the focus.
		var els = $wf2.getElementsByTagNamesAndAttribute.apply(document.documentElement, [['*'], 'autofocus']); //ISSUE: Any form control (except hidden and output controls) can have an autofocus attribute specified. //var elName = els[i].nodeName.toLowerCase(); if(elName == 'output' || (elName == 'input' && els[i].type == 'hidden'))
		if(parent.getAttribute('autofocus'))
			els.unshift(parent);
		for(i = 0; i < els.length; i++)
			$wf2.initAutofocusElement(els[i]);

		// Maxlength for textareas ******************************************************
		var textareas = $wf2.getElementsByTagNamesAndAttribute.apply(parent, [['textarea'], 'maxlength']);
		if(parent.nodeName.toLowerCase() == 'textarea')
			textareas.unshift(parent);
		for(i = 0; i < textareas.length; i++)
			textareas[i].maxLength = parseInt(textareas[i].getAttribute('maxlength'));
		//TODO: we must dynamically apply this behavior for new textareas (via repetition model or eventlistener)
	},
	
	initAutofocusElement : function(el){
		//skip if already initialized
		if(el.autofocus === false || el.autofocus === true) //(el.autofocus !== undefined) does not work due to MSIE's handling of attributes
			return;
		el.autofocus = true;
		
		//[autofocus if] the control is not disabled
		if(el.disabled)
			return;

		//[control] is of a type normally focusable in the user's operating environment
		//Don't focus on the control if it is not visible or nor displayed
		var node = el;
		while(node && node.nodeType == 1){
			if($wf2.getElementStyle(node, 'visibility') == 'hidden' || $wf2.getElementStyle(node, 'display') == 'none')
				return;
			node = node.parentNode;
		}

		//Then the UA should focus the control, as if the control's focus() method was invoked.
		//  UAs with a viewport should also scroll the document enough to make the control visible,
		//  [[even if it is not of a type normally focusable.]] //WHAT DOES THIS MEAN?
		el.focus(); //BUG: in Gecko this does not work within DOMNodeInserted event handler, but the following does; setTimeout(function(){el.focus();}, 0);
	},

	/*#############################################################################################
	 # Section: Form Validation model
	 ##############################################################################################*/

	formCheckValidity : function(){
		var i, el, valid = true;
		
		//When a form is submitted, user agents must act as if they used the following algorithm.
		//   First, each element in that form's elements list is added to a temporary list (note that
		//   the elements list is defined to be in document order).
		
		//An invalid event must be fired on each element that, when checked, is found to fail to
		//   comply with its constraints (i.e. each element whose validity.valid DOM attribute is
		//   false) and is still a member of the form after the event has been handled.
		//var _elements = [];
		var formElements = $wf2.getFormElements.apply(this);
		//for(i = 0; i < formElements.length; i++)
		//	_elements.push(formElements[i]);
		for(i = 0; el = formElements[i]; i++){
			//Then, each element in this list whose willValidate DOM attribute is true is checked for validity
			if(el.checkValidity && el.willValidate == true){
				if(!el.checkValidity())
					valid = false;
			}
		}
		
		if(!valid && $wf2.invalidIndicators.length){ //second condition needed because modal in oninvalid handler may cause indicators to disappear before this is reached
			$wf2.invalidIndicators[0].errorMsg.className += " wf2_firstErrorMsg";
			
			//scroll to near the location where invalid control is
			el = $wf2.invalidIndicators[0].target;
			if(el.style.display == 'none' || !el.offsetParent){
				while(el && (el.nodeType != 1 || (el.style.display == 'none' || !el.offsetParent)))
					el = el.previousSibling;
				var cur = el;
				var top = 0;
				if(cur && cur.offsetParent) {
					top = cur.offsetTop;
					while (cur = cur.offsetParent)
						top += cur.offsetTop;
				}
				scrollTo(0, top);
			}
			//focus on the first invalid control and make sure error message is visible
			else {
				el.focus();
				//NOTE: We should only do this if the control's style.bottom == 0
				scrollBy(0, $wf2.invalidIndicators[0].errorMsg.offsetHeight);
			}
		}
		return valid;
	},
	
	controlCheckValidity : function(){
		$wf2.updateValidityState(this);
		if(this.validity.valid)
			return true;
		
		var canceled = false;
		
		var evt;
		try {
			if(document.createEvent)
				evt = document.createEvent('Events'); //document.createEvent("RepetitionEvent")
			else if(document.createEventObject)
				evt = document.createEventObject();
			evt.initEvent('invalid', true /*canBubble*/, true /*cancelable*/);
			evt.srcElement = this;
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
				evt.initEvent('invalid', true /*canBubble*/, true /*cancelable*/);
			else {
				evt.type = 'invalid';
				evt.cancelBubble = false;
			}
			evt.target = evt.srcElement = this;
		}
		
		var oninvalidAttr = this.getAttribute('oninvalid');
		if(oninvalidAttr && (!this.oninvalid || typeof this.oninvalid != 'function')) //in MSIE, attribute == property
			this.oninvalid = new Function('event', oninvalidAttr);

		try {
			//Dispatch events for the old event model
			if(this.oninvalid){
				//canceled = this.oninvalid(evt) === false || canceled; 
				canceled = this.oninvalid.apply(this, [evt]) === false || canceled; //for some reason, exceptions cannot be caught if using the method above in MSIE
			}
		}
		catch(err){
			//throw exception within setTimeout so that the current execution will not be aborted
			setTimeout(function(){
				throw err;
			}, 0);
		}

		//Determine if this radio/checkbox already has an invalid indicator
		var hasInvalidIndicator = false;
		if(this.type == 'radio' || this.type == 'checkbox'){
			for(var i = 0; i < $wf2.invalidIndicators.length; i++){
				if(this.form[this.name][0] == $wf2.invalidIndicators[i].target){
					hasInvalidIndicator = true;
					break;
				}
			}
		}

		//Do default action
		if(!canceled && !hasInvalidIndicator) //(!(this.form && this.form[this.name]) || !this.form[this.name].wf2HasInvalidIndicator)
			$wf2.addInvalidIndicator(this);
		return false;
	},

	//Frequently used regular expressions //W(?:0[1-9]|[1-4]\d|5[0-2])|
	//monthRegExp : /^\d\d\d\d-(0\d|1[0-2])$/,
	//weekRegExp : /^(\d\d\d\d)-W(0[1-9]|[1-4]\d|5[0-2])$/,
	//timeRegExp : /^(0\d|1\d|2[0-4]):([0-5]\d)(:[0-5]\d(.\d+)?)?$/,
	numberRegExp : /^-?\d+(.\d+)?(e-?\d+)?$/,
	//numberOrAnyRegExp : /^(any|-?\d+(.\d+)?(e-?\d+)?)$/i,
	urlRegExp : /^(\w+):(\/\/)?.+$/i,
	emailRegExp : /^\S+@\S+$/i,
	
	//Zero points for datetime-related types (set in onDOMContentLoaded function)
//	zeroPointDatetime      : null,
//	zeroPointDatetimeLocal : null,
//	zeroPointDate          : null,
//	zeroPointMonth         : null,
//	zeroPointWeek          : null,
//	zeroPointTime          : null,
	
	//This function is called "live" 
	updateValidityState : function(node){
		//if(node.form && node.form[node.name] && node.form[node.name].wf2HasInvalidIndicator)
		//	return;
		
		var minAttrNode, maxAttrNode, valueAttrNode;
		minAttrNode = node.getAttributeNode('min');
		maxAttrNode = node.getAttributeNode('max');
		node.min = undefined; //wf2Min
		node.max = undefined; //wf2Max
		node.step = undefined; //wf2Step
		valueAttrNode = node.getAttributeNode('value');
		
		node.validity = $wf2.createValidityState();
		
		//var type = node.type ? node.type.toLowerCase() : 'text';
		//var type = (node.type ? node.getAttribute('type').toLowerCase() :
		//                       (node.nodeName.toLowerCase() == 'input' ? 'text' : ''));
		var type = (node.getAttribute('type') ? node.getAttribute('type').toLowerCase() : node.type);
		var isTimeRelated = (type == 'datetime' || type == 'datetime-local' || type == 'time'); //datetime, datetime-local, time
		var isDateRelated = (type == 'date' || type == 'month' || type == 'week'); //date, month, week
		var isNumberRelated = (type == 'number' || type == 'range'); //number, range
		var isFileInput = (type == 'file');
		var doCheckPrecision = (isTimeRelated || isDateRelated || isNumberRelated); //datetime, datetime-local, time, date, month, week, number, range
		var doMaxLengthCheck = doCheckPrecision || node.nodeName.toLowerCase() == 'textarea'; //datetime, datetime-local, time, date, month, week, number, range, textarea
		var doCheckRange = (doCheckPrecision || isFileInput); //datetime, datetime-local, time, date, month, week, number, range, file
		var isRadioOrCheckbox = (type == 'radio' || type == 'checkbox');
		var doRequiredCheck = (doMaxLengthCheck  || //datetime, datetime-local, time, date, month, week, number, range, textarea
							   isFileInput       ||
							   type == 'email'   ||
							   type == 'url'     ||
							   type == 'text'    ||
							   type == 'password'||
							   isRadioOrCheckbox);
		
		//If a control has its type attribute changed to another type, then the user agent must reinterpret the min and
		//   max  attributes. If an attribute has an invalid value according to the new type, then the appropriate
		//   default must be used (and not, e.g., the default appropriate for the previous type). Control values that
		//   no longer match the range allowed for the control must be handled as described in the error handling section.
		//if(!node.wf2PreviousType)
		//	node.wf2PreviousType == type;
		//else if(type != node.wf2PreviousType){
		//	throw Error("Currently unable to change the type of a control."); //TODO
		//}
		
		if(type == 'range'){
			//For this type...min defaults to 0...and value defaults to the min value.
			node.min = (minAttrNode && $wf2.numberRegExp.test(minAttrNode.value)) ? Number(minAttrNode.value) : 0;
			if((!valueAttrNode || !valueAttrNode.specified) && node.value === '' && !node.wf2ValueProvided){ //(!valueAttrNode || !valueAttrNode.specified) && 
				node.setAttribute('value', node.min);
				node.value = node.min;
				node.wf2ValueProvided = true;
			}
		}
		
		node.wf2Value = node.value;

		//valueMissing -- The control has the required attribute set but it has not been satisfied.
		//The required attribute applies to all form controls except controls with the type hidden,
		//   image inputs, buttons (submit, move-up, etc), and select and output elements. For
		//   disabled or readonly controls, the attribute has no effect.
		if(doRequiredCheck && node.willValidate){
			//For checkboxes, the required  attribute shall only be satisfied when one or more of
			//  the checkboxes with that name in that form are checked.
			//For radio buttons, the required attribute shall only be satisfied when exactly one of
			//  the radio buttons in that radio group is checked. 
			if(isRadioOrCheckbox){
				if(node.form && node.form[node.name]){
					var isRequired = false;
					var hasChecked = false;
					for(var i = 0; i < node.form[node.name].length; i++){
						if(node.form[node.name][i].getAttributeNode('required'))
							isRequired = true;
						if(node.form[node.name][i].checked)
							hasChecked = true;
					}
					node.validity.valueMissing = (isRequired && !hasChecked);
				}
			}
			//The required attribute applies to all form controls except controls with the type hidden,
			//   image inputs, buttons (submit, move-up, etc), and select and output elements. For
			//   disabled or readonly controls, the attribute has no effect.
			else if(node.getAttributeNode('required')){
				//if(node.options)
				//	node.validity.valueMissing = (node.selectedIndex == -1);
				//For other controls, any non-empty value shall satisfy the required condition,
				//   including a simple whitespace character.
				//else
					node.validity.valueMissing = (node.value == '');
			}
			//if(node.options ? node.selectedIndex == -1 : node.value === '')
			//	node.validity.valueMissing = true;
			//
		}
		if(!node.validity.valueMissing && node.value){
			//patternMismatch -- The value of the control with a pattern attribute doesn't match the pattern. 
			//   If the control is empty, this flag must not be set.
			//If the pattern attribute is present but empty, it doesn't match any value, and thus the
			//   patternMismatch flag shall be set whenever the control's value isn't empty.
			var patternAttr = node.getAttributeNode('pattern');
			if(patternAttr){
				//the pattern attribute must match the entire value, not just any subset (somewhat as if
				//   it implied a ^(?: at the start of the pattern and a )$ at the end).
				var rePattern = new RegExp("^(?:" + patternAttr.value + ")$");
				//The pattern must be compiled with the global, ignoreCase, and multiline flags disabled
				rePattern.global = false;
				rePattern.ignoreCase = false;
				rePattern.multiline = false;
				//When the pattern is not a valid regular expression, it is ignored for the purposes of
				//   validation, as if it wasn't specified.
				if(rePattern)
					node.validity.patternMismatch = !rePattern.test(node.value);
			}
			
			//typeMismatch -- The data entered does not match the type of the control. For example, if the UA 
			//   allows uninterpreted arbitrary text entry for month controls, and the user has entered SEP02, 
			//   then this flag would be set. This code is also used when the selected file in a file upload 
			//   control does not have an appropriate MIME type. If the control is empty, this flag must not be set.
			if(isDateRelated || isTimeRelated)
				node.validity.typeMismatch = ((node.wf2Value = $wf2.parseISO8601(node.value, type)) == null);
			else {
				switch(type){
					case 'number':
					case 'range':
						node.validity.typeMismatch = !$wf2.numberRegExp.test(node.value);
	//						if(!node.validity.typeMismatch && node.getAttribute("step") != 'any'){
	//							if(node.step == undefined)
	//								node.step = 1;
	//							var val = Number(node.value);
	//							node.validity.stepMismatch = (val == parseInt(val) && node.step != parseInt(node.step));
	//						}
						break;
					case 'email':
						//An e-mail address, following the format of the addr-spec  token defined in RFC 2822 section
						//   3.4.1 [RFC2822], but excluding the CFWS  subtoken everywhere, and excluding the FWS
						//   subtoken everywhere except in the quoted-string subtoken. UAs could, for example, offer
						//   e-mail addresses from the user's address book. (See below for notes on IDN.)
						//http://www.ietf.org/rfc/rfc2822						
						node.validity.typeMismatch = !$wf2.emailRegExp.test(node.value);
						break;
					case 'url':
						//An IRI, as defined by [RFC3987] (the IRI token, defined in RFC 3987 section 2.2). UAs could,
						//   for example, offer the user URIs from his bookmarks. (See below for notes on IDN.) The value
						//   is called url (as opposed to iri or uri) for consistency with CSS syntax and because it is
						//   generally felt authors are more familiar with the term "URL" than the other, more technically
						//   correct terms.
						//http://www.ietf.org/rfc/rfc3987
						node.validity.typeMismatch = !$wf2.urlRegExp.test(node.value);
						break;
				}
			}
			
			if(!node.validity.patternMismatch && !node.validity.typeMismatch){
				//To limit the range of values allowed by some of the above types, two new attributes are introduced, which
				//   apply to the date-related, time-related, numeric, and file upload types: min and max
				
				//rangeUnderflow -- The numeric, date, or time value of a control with a min attribute is lower than 
				//   the minimum, or a file upload control has fewer files selected than the minimum. If the control 
				//   is empty or if the typeMismatch flag is set, this flag must not be set. 
				//rangeOverflow -- The numeric, date, or time value of a control with a max attribute is higher than 
				//   the maximum, or a file upload control has more files selected than the maximum. If the control 
				//   is empty or if the typeMismatch flag is set, this flag must not be set. 
				if(doCheckRange){
					if(isNumberRelated){
						//For numeric types (number  and range) the value must exactly match the number type (numberRegExp)
						if(type == 'range'){
							//For this type...max defaults to 100
							node.max = (maxAttrNode && $wf2.numberRegExp.test(maxAttrNode.value)) ? Number(maxAttrNode.value) : 100;
							//node.min is set at the beginning of this function so that the min value can be set as the default value
						}
						else {
							if(minAttrNode && $wf2.numberRegExp.test(minAttrNode.value))
								node.min = Number(minAttrNode.value);
							if(maxAttrNode && $wf2.numberRegExp.test(maxAttrNode.value))
								node.max = Number(maxAttrNode.value);
						}
						node.validity.rangeUnderflow = (node.min != undefined && Number(node.value) < node.min);
						node.validity.rangeOverflow  = (node.max != undefined && Number(node.value) > node.max);
					}
					//For file types it must be a sequence of digits 0-9, treated as a base ten integer.
					else if(type == 'file'){
						if(minAttrNode && /^\d+$/.test(minAttrNode.value))
							node.min = Number(minAttrNode.value);
						//If absent, or if the minimum value is not in exactly the expected format, there
						//   is no minimum restriction, except for the ... file types, where the default is zero.
						else node.min = 0;
						if(maxAttrNode && /^\d+$/.test(maxAttrNode.value))
							node.max = Number(maxAttrNode.value);
						//If absent, or if the maximum value is not in exactly the expected format, there is no
						//  maximum restriction (beyond those intrinsic to the type), except for ... the file
						//  type, where the default is 1.
						else node.max = 1;
						
						//node.validity.rangeUnderflow = (node.min != undefined && Number(node.value) < node.min);
						//node.validity.rangeOverflow  = (node.max != undefined && Number(node.value) > node.max);
					}
					//Date related
					else {
						//For date and time types it must match the relevant format mentioned for that type, all fields
						//   having the right number of digits, with the right separating punctuation.
						if(minAttrNode){
							node.min = $wf2.parseISO8601(minAttrNode.value, type);
							node.validity.rangeUnderflow = (node.min && node.wf2Value < node.min);
						}
						if(maxAttrNode){
							node.max = $wf2.parseISO8601(maxAttrNode.value, type);
							node.validity.rangeOverflow = (node.max && node.wf2Value > node.max);
						}
					}
				}
				//The step attribute controls the precision allowed for the date-related, time-related, and numeric types.
				if(doCheckPrecision && !node.validity.rangeUnderflow && !node.validity.rangeOverflow){
					//stepMismatch -- The value is not one of the values allowed by the step attribute, and the UA will 
					//   not be rounding the value for submission. Empty values and values that caused the typeMismatch 
					//   flag to be set must not cause this flag to be set.
					
					var stepAttrNode = node.getAttributeNode('step');
					if(!stepAttrNode){
						//The step attribute [for types datetime, datetime-local, and time] ... defaulting to 60 (one minute).
						//For time controls, the value of the step attribute is in seconds, although it may be a fractional
						//   number as well to allow fractional times.  The default value of the step
						//   attribute for datetime, datetime-local and time controls is 60 (one minute).
						//The step [for type date] attribute specifies the precision in days, defaulting to 1.
						//The step [for type month] attribute specifies the precision in months, defaulting to 1.
						//The step [for type week] attribute specifies the precision in weeks, defaulting to 1.
						//For date controls, the value of the step attribute is in days, weeks, or months, for the date,
						//   week, and month  types respectively. The format is a non-negative integer; one or more digits
						//   0-9 interpreted as base ten. If the step is zero, it is interpreted as the default. The default
						//   for the step  attribute for these control types is 1.
						//The step [for types number and range] attribute specifies the precision, defaulting to 1.
						node.step = isTimeRelated ? 60 : 1;
					}
					//The literal value 'any' may be used as the value of the step attribute. This keyword indicates that
					//   any value may be used (within the bounds of other restrictions placed on the control).
					else if(stepAttrNode.value == 'any')
						node.step = 'any'; //isStepAny = true;
					//The format of the step attribute is the number format described above, except that
					//   the value must be greater than zero.
					else if($wf2.numberRegExp.test(stepAttrNode.value) && stepAttrNode.value > 0)
						node.step = Number(stepAttrNode.value);
					else
						node.step = isTimeRelated ? 60 : 1;
					
					if(node.step != 'any'){
						node.wf2StepDatum = null;
						if(minAttrNode)
							node.wf2StepDatum = node.min;
						else if(maxAttrNode)
							node.wf2StepDatum = node.max;
						else
							node.wf2StepDatum = $wf2.zeroPoint[type] ? $wf2.zeroPoint[type] : 0;
						
						//The zero point for datetime  controls is 1970-01-01T00:00:00.0Z, for datetime-local is
						//   1970-01-01T00:00:00.0, for date controls is 1970-01-01, for month controls is 1970-01,
						//   for week controls is 1970-W01 (the week starting 1969-12-29 and containing 1970-01-01),
						//   and for time controls is 00:00.
						var _step = node.step;
						if(type == 'month'){
							var month1 = node.wf2StepDatum.getUTCFullYear()*12 + node.wf2StepDatum.getUTCMonth();
							var month2 = node.wf2Value.getUTCFullYear()*12 + node.wf2Value.getUTCMonth();
							node.validity.stepMismatch = (month2 - month1)%_step != 0;
						}
						else {
							switch(type){
								case 'datetime':
								case 'datetime-local':
								case 'time':
									_step = parseInt(_step * 1000); //for millisecond comparisons
									break;
								case 'date':
									_step = parseInt(_step * 24*60*60*1000);
									break;
								case 'week':
									_step = parseInt(_step * 7*24*60*60*1000);
									break;
							}

							//For the control to be valid, the control's value must be an integral number of steps from the min value,
							//   or, if there is no min attribute, the max value, or if there is neither attribute, from the zero point.
							//allow decimal places to the 1,000th place
							node.validity.stepMismatch = (Math.round((node.wf2Value - node.wf2StepDatum)*1000) % Math.round(_step*1000)) != 0;
						}
					}
				}
			}
			
			//[TEXTAREA] tooLong -- The value of a control with a maxlength attribute is longer than the attribute allows, 
			//   and the value of the control doesn't exactly match the control's default value. 
			//[The maxlength] attribute must not affect the initial value (the DOM defaultValue attribute). It must only
			//   affect what the user may enter and whether a validity error is flagged during validation.
			if(doMaxLengthCheck && node.maxLength >= 0 && node.value != node.defaultValue){
				//A newline in a textarea's value must count as two code points for maxlength processing (because
				//   newlines in textareas are submitted as U+000D U+000A). [[NOT IMPLEMENTED: This includes the
				//   implied newlines that are added for submission when the wrap attribute has the value hard.]]
				//var matches = node.value.match(/((?<!\x0D|^)\x0A|\x0D(?!^\x0A|$))/g); //no negative lookbehind
				var shortNewlines = 0;
				var v = node.value;
				node.wf2ValueLength = v.length;
				for(var i = 1; i < v.length; i++){
					if(v[i] === "\x0A" && v[i-1] !== "\x0D" || v[i] == "\x0D" && (v[i+1] && v[i+1] !== "\x0A"))
						node.wf2ValueLength++;
				}
				
				//The tooLong flag is used when this attribute is specified on a ... textarea control and the control
				//   has more than the specified number of code points and the value doesn't match the control's default value.
				node.validity.tooLong = node.wf2ValueLength > node.maxLength;
			}
		}

		//customError -- The control was marked invalid from script. See the definition of the setCustomValiditiy() method.
		
		node.validity.valid = !$wf2.hasInvalidState(node.validity);
		
		//This is now done onmousedown or onkeydown, just as Opera does
		//if(node.validity.valid){
		//	node.className = node.className.replace(/\s*\binvalid\b\s*/g, " "); //substitute for :invalid pseudo class
		//	//if(node.wf2_errorMsg){
		//	//	node.wf2_errorMsg.parentNode.removeChild(node.wf2_errorMsg);
		//	//	node.wf2_errorMsg = null;
		//	//}
		//	var errMsg = document.getElementById((node.id || node.name) + '_wf2_errorMsg');
		//	if(errMsg)
		//		errMsg.parentNode.removeChild(errMsg);
		//}
	},

	applyValidityInterface : function(node){
		if(node.validity && node.validity.typeMismatch !== undefined) //MSIE needs the second test for some reason
			return node;
		
		node.validationMessage = "";
		
		//ValidityState interface
		node.validity = $wf2.createValidityState();
		node.willValidate = true;
		
		var nodeName = node.nodeName.toLowerCase();
		if(nodeName == 'button' || nodeName == 'fieldset'){
			node.setCustomValidity = function(error){
				throw $wf2.DOMException(9); //NOT_SUPPORTED_ERR
			};
			node.checkValidity = function(){
				return true;
			};
			return node;
		}
		//node._updateValidityState = $wf2._updateValidityState;
		node.setCustomValidity = $wf2.controlSetCustomValidity;
		node.checkValidity = $wf2.controlCheckValidity;
		
		//var type = (node.type ? node.type.toLowerCase() : (nodeName == 'input' ? 'text' : ''));
		var type = (node.getAttribute('type') ? node.getAttribute('type').toLowerCase() : node.type);
		
		if(/(hidden|button|reset|add|remove|move-up|move-down)/.test(type) || !node.name || node.disabled)
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
		
		//var handler = function(event){
		//	return (event.currentTarget || event.srcElement)._updateValidityState();
		//};
		
		////attempt to check validity live
		//if(document.addEventListener){
		//	node.addEventListener('change', handler, false);
		//	node.addEventListener('blur', handler, false);
		//	node.addEventListener('keyup', handler, false);
		//}
		//else if(window.attachEvent){
		//	node.attachEvent('onchange', handler);
		//	node.attachEvent('onblur', handler);
		//	node.attachEvent('onkeyup', handler);
		//}
		//else {
		//
		//}
		
		return node;
	},

	onsubmitValidityHandler : function(event){
		var frm = event.currentTarget || event.srcElement;
		if(!frm.checkValidity()){
			if(event.preventDefault)
				event.preventDefault();
			event.returnValue = false;
			return false;
		}
		event.returnValue = true;
		return true;
	},

	controlSetCustomValidity : function(error){
		if(error){
			this.validationMessage = String(error);
			this.validity.customError = true;
		}
		else {
			this.validationMessage = "";
			this.validity.customError = false;
		}
		this.validity.valid = !$wf2.hasInvalidState(this.validity);
	},
	hasInvalidState : function(validity){
		return validity.typeMismatch 
			|| validity.rangeUnderflow 
			|| validity.rangeOverflow
			|| validity.stepMismatch
			|| validity.tooLong 
			|| validity.patternMismatch 
			|| validity.valueMissing 
			|| validity.customError;
	},
	createValidityState : function(){
		return {
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
	},

	//## Default action functions for invalid events ##################################################

	invalidIndicators : [],
	indicatorTimeoutId : null,
	indicatorIntervalId : null,
	
	stepUnits : {
		'datetime' : 'second',
		'datetime-local': 'second',
		'time': 'second',
		'date': 'day',
		'week': 'week',
		'month': 'month'
	},

	invalidMessages : {
		valueMissing   : 'A value must be supplied or selected.',
		typeMismatch   : 'The value is invalid for %s type.',
		rangeUnderflow : 'The value must be equal to or greater than %s.',
		rangeOverflow  : 'The value must be equal to or less than %s.',
		stepMismatch   : 'The value has a step mismatch; it must be a certain number multiples of %s from %s.',
		tooLong        : 'The value is too long. The field may have a maximum of %s characters but you supplied %s. Note that each line-break counts as two characters.',
		patternMismatch: 'The value does not match the required pattern: %s'
	},
	
	valueToWF2Type : function(value, type){
		switch(String(type).toLowerCase()){
			case 'datetime':
			case 'datetime-local':
			case 'date':
			case 'month':
			case 'week':
			case 'time':
				return $wf2.dateToISO8601(value, type);
			default:
				return value;
		}
	},

	addInvalidIndicator : function(target){
		//show contextual help message
		var msg = document.createElement('div');
		msg.className = 'wf2_errorMsg';
		//msg.title = "Close";
		msg.id = (target.id || target.name) + '_wf2_errorMsg'; //QUESTION: does this work for MSIE?
		msg.onmousedown = function(){
			this.parentNode.removeChild(this);
		};
		//var type = String(target.getAttribute('type')).toLowerCase();
		//var type = (target.type ? target.type.toLowerCase() : (target.nodeName.toLowerCase() == 'input' ? 'text' : ''));
		var type = (target.getAttribute('type') ? target.getAttribute('type').toLowerCase() : target.type);
		var isDateTimeRelated = (type == 'datetime' || type == 'datetime-local' || type == 'time' || type == 'date' || type == 'month' || type == 'week');

		var ol = document.createElement('ol');
		if(target.validity.valueMissing)
			ol.appendChild($wf2.createLI($wf2.invalidMessages.valueMissing));
		if(target.validity.typeMismatch)
			ol.appendChild($wf2.createLI($wf2.invalidMessages.typeMismatch.replace(/%s/, type)));
		if(target.validity.rangeUnderflow)
			ol.appendChild($wf2.createLI($wf2.invalidMessages.rangeUnderflow.replace(/%s/, $wf2.valueToWF2Type(target.min, type))));
		if(target.validity.rangeOverflow)
			ol.appendChild($wf2.createLI($wf2.invalidMessages.rangeOverflow.replace(/%s/, $wf2.valueToWF2Type(target.max, type))));
		if(target.validity.stepMismatch)
			ol.appendChild($wf2.createLI($wf2.invalidMessages.stepMismatch.replace(/%s/, target.step + ($wf2.stepUnits[type] ? ' ' + $wf2.stepUnits[type] + '(s)' : '')).replace(/%s/, $wf2.valueToWF2Type(target.wf2StepDatum, type))));
		if(target.validity.tooLong)
			ol.appendChild($wf2.createLI($wf2.invalidMessages.tooLong.replace(/%s/, target.maxLength).replace(/%s/, target.wf2ValueLength ? target.wf2ValueLength : target.value.length)));
		if(target.validity.patternMismatch)
			ol.appendChild($wf2.createLI($wf2.invalidMessages.patternMismatch.replace(/%s/, target.title ? target.title : ' "' + target.getAttribute('pattern') + '"')));
		if(target.validity.customError)
			ol.appendChild($wf2.createLI(target.validationMessage));
		
		if(ol.childNodes.length == 1)
			ol.className = 'single';
		
		msg.appendChild(ol);
		////remove existing error message
		//if(document.getElementById(msg.id))
		//	document.documentElement.removeChild(document.getElementById(msg.id));
		//target.parentNode.insertBefore(msg, target); //Inserting error message next to element in question causes problems when the element has a positioned containing block
		var parent = document.body ? document.body : document.documentElement;
		if($wf2.invalidIndicators.length) //insert before other error messages so that it appears on top
			parent.insertBefore(msg, $wf2.invalidIndicators[$wf2.invalidIndicators.length-1].errorMsg);
		else //insert at the end of the document
			parent.insertBefore(msg, null); 
		//target.wf2_errorMsg = msg;
		//if(target.style.display == 'none' || !target.offsetParent){
		//	var prevEl = target.previousSibling;
		//	var nextEl = target.nextSibling;
		//	var prevCount = 0, nextCount = 0;
		//	while(prevEl && (prevEl.nodeType != 1 || (prevEl.style.display == 'none' || !prevEl.offsetParent)) && ++prevCount)
		//		prevEl = prevEl.previousSibling;
		//	while(nextEl && (nextEl.nodeType != 1 || (nextEl.style.display == 'none' || !nextEl.offsetParent)) && ++nextCount)
		//		nextEl = nextEl.nextSibling;
		//	
		//	if(prevEl && prevCount > nextCount)
		//	
		//}
		var el = target;
		while(el && (el.nodeType != 1 || (el.style.display == 'none' || el.style.visibility == 'hidden' || !el.offsetParent)))
			el = el.parentNode;
		
		var top = left = 0;
		var cur = el;
		if(cur && cur.offsetParent){
			left = cur.offsetLeft;
			top = cur.offsetTop;
			while(cur = cur.offsetParent){
				left += cur.offsetLeft;
				top += cur.offsetTop;
			}
			top += el.offsetHeight;
		}
		msg.style.top = top + 'px';
		msg.style.left = left + 'px';
		
		$wf2.invalidIndicators.push({
			target : target,
			errorMsg : msg
		});
		//if(target.form && target.form[target.name]){
		//	target.form[target.name].wf2HasInvalidIndicator = true;
		//	console.info('set')
		//}
		if(!target.className.match(/\bwf2_invalid\b/))
			target.className += " wf2_invalid";
			
		if($wf2.indicatorIntervalId == null){
			//var i = $wf2.invalidIndicators.length - 1;
			$wf2.indicatorIntervalId = setInterval(function(){
				var invalidIndicator;
				for(var i = 0; invalidIndicator = $wf2.invalidIndicators[i]; i++){
					if(!invalidIndicator.target.className.match(/\bwf2_invalid\b/)){
						invalidIndicator.target.className += " wf2_invalid";
					}
					else {
						invalidIndicator.target.className = invalidIndicator.target.className.replace(/\s?wf2_invalid/, "");
					}
				}
			}, 500);
			$wf2.indicatorTimeoutId = setTimeout($wf2.clearInvalidIndicators, 4000);
		}
	},

	clearInvalidIndicators : function(){
		clearTimeout($wf2.indicatorTimeoutId);
		$wf2.indicatorTimeoutId = null;
		clearInterval($wf2.indicatorIntervalId);
		$wf2.indicatorIntervalId = null;

		var invalidIndicator;
		while(invalidIndicator = $wf2.invalidIndicators[0]){
			if(invalidIndicator.errorMsg && invalidIndicator.errorMsg.parentNode)
				invalidIndicator.errorMsg.parentNode.removeChild(invalidIndicator.errorMsg);
			//clearInterval(insts[0].intervalId);
			var target = invalidIndicator.target;
			//if(target.form && target.form[target.name])
			//	target.form[target.name].wf2HasInvalidIndicator = false;
			target.className = target.className.replace(/\s?wf2_invalid/, ""); //([^\b]\s)?
			$wf2.invalidIndicators.shift();
		}
	},

	/*##############################################################################################
	 # Other helper functions (not made into methods)
	 ##############################################################################################*/

	cloneNode_customAttrs : { //FOR MSIE BUG: it cannot perceive the attributes that were actually specified
		'type':1,'template':1,'repeat':1,'repeat-template':1,'repeat-min':1,
		'repeat-max':1,'repeat-start':1,'value':1,'class':1,'required':1,
		'pattern':1,'form':1,'autocomplete':1,'autofocus':1,'inputmode':1,
		'max':1,'min':1,'step':1,
		onmoved:1,onadded:1,onremoved:1, 
		onadd:1,onremove:1,onmove:1 //deprecated
	},
	cloneNode_skippedAttrs : {
		'name':1,  //due to MSIE bug, set via $wf2.createElement
		'class':1, //due to MSIE bug, set below (see http://www.alistapart.com/articles/jslogging)
		'for':1,   //due to preceived MSIE bug, set below
		'style':1, //inline styles require special handling
		'checked':1, //set by $wf2.createElement due to MSIE bug creating INPUT@type=radio
		
		//for MSIE, properties (or methods) == attributes
		addRepetitionBlock:1,addRepetitionBlockByIndex:1,moveRepetitionBlock:1,
		removeRepetitionBlock:1, repetitionBlocks:1,
		setCustomValidity:1,checkValidity:1,validity:1,validationMessage:1,willValidate:1,
		wf2StepDatum:1,wf2Value:1,wf2Initialized:1,wf2ValueLength:1
	},
	cloneNode_rtEventHandlerAttrs : {
		onmoved:1,onadded:1,onremoved:1, //don't copy Repetition old model event attributes not methods
		onadd:1,onremove:1,onmove:1 //deprecated
		//QUESTION: is this right???
	},

	//The following cloneNode algorithm was designed to handle the attribute processing that the repetition
	//  model specifies. Gecko starts to have irratic behavior with a cloned input's value attribute and value
	//  property when using DOM cloneNode; furthermore, various MSIE bugs prevent its use of DOM cloneNode
	cloneNode : function (node, processAttr, rtNestedDepth){
		if(!rtNestedDepth)
			rtNestedDepth = 0;
		var clone, i, attr;
		switch(node.nodeType){
			case 1: /*Node.ELEMENT_NODE*/
				//if(node.nodeType == 1 /*Node.ELEMENT_NODE*/){
				var isTemplate = node.getAttribute('repeat') == 'template';
				if(isTemplate)
					rtNestedDepth++;
				//BROWSER BUGS: MSIE does not allow the setting of the node.name, except when creating the new node
				//              MSIE neither permits the standard DOM creation of radio buttons
				var attrs = [];
				if(node.name)
					attrs.name = processAttr ? processAttr(node.name) : node.name;
				if(node.type == 'radio')
					attrs.type = node.type;
				if(node.checked)
					attrs.checked = 'checked';
				clone = $wf2.createElement(node.nodeName, attrs);
				//clone = node.name  ? 
				//		$wf2.createElement(node.nodeName, attrs) 
				//	  : document.createElement(node.nodeName);
						
				for(i = 0; attr = node.attributes[i]; i++){
					//MSIE ISSUE: Custom attributes specified do not have .specified property set to true?
					//ISSUE: VALUE IS REPEATED IN MSIE WHEN VALUE ATTRIBUTE SET?
					//if(attr.specified || node.getAttribute(attr.nodeName)) //$wf2.cloneNode_customAttrs[attr.nodeName] || 
					//	if(window.console && console.info) console.info(node.nodeName + "@" + attr.nodeName + " -- " + attr.specified + " <font color=red>" + node.getAttribute(attr.nodeName) + "</font>(" + typeof node.getAttribute(attr.nodeName) + ")<br>");
	
					//MSIE needs $wf2.cloneNode_customAttrs[attr.name] test since attr.specified does not work with custom attributes
					//If the node is a template, the repetition event handlers should only be copied
					//   if the template is nested and is being cloned by a parent repetition template.
					if((attr.specified || $wf2.cloneNode_customAttrs[attr.name])
						  && !$wf2.cloneNode_skippedAttrs[attr.name] && (
								(!isTemplate || (rtNestedDepth > 1 || !$wf2.cloneNode_rtEventHandlerAttrs[attr.name])) // && 
							))
					{
						//MSIE BUG: when button[type=add|remove|move-up|move-down], then (attr.nodeValue and attr.value == 'button') but node.getAttribute(attr.nodeName) == 'add|remove|move-up|move-down' (as desired)
						
						//clone and process an event handler property (attribute);
						//   keep event handler attributes as plain text if nested repetition template
						if(rtNestedDepth < 2 && (attr.name.indexOf('on') === 0) && (typeof node[attr.name] == 'function')){
							var funcBody = processAttr(node[attr.name].toString().match(/{((?:.|\n)+)}/)[1]);
							funcBody = processAttr(funcBody);
							clone[attr.name] = new Function('event', funcBody);
						}
						//clone and process other attributes
						else {
							var attrValue = node.getAttribute(attr.name);
							attrValue = (processAttr ? processAttr(attrValue) : attrValue);
							clone.setAttribute(attr.name, attrValue);
						}
					}
				}
				//MSIE BUG: setAttribute('class') creates duplicate value attribute in MSIE; 
				//QUESTION: will setting className on this clonedNode still cause this error later on for users? will addClassName croak? Should it be improved?
				//see: http://www.alistapart.com/articles/jslogging
				if(node.className){
					var _className = (processAttr ? processAttr(node.className) : node.className);
					if(clone.getAttributeNode('class')){
						for(i = 0; i < clone.attributes.length; i++) {
							if(clone.attributes[i].name == 'class')
								clone.attributes[i].value = _className;
						}
					}
					else clone.setAttribute('class', _className);
				}
	
				//Restore the template's elements to the originally coded disabled state (indicated by 'disabled' class name)
				// All elements within the repetition template are disabled to prevent them from being successful.
				if(!/\bdisabled\b/.test(node.className))
					clone.disabled = false;
				
				//Process the inline style
				if(node.style && node.style.cssText){
					//clone.setAttribute('style', processAttr(node.style.cssText));
					clone.style.cssText = (processAttr ? processAttr(node.style.cssText) : node.style.cssText);
				}
				
				//label's 'for' attribute, set here due to MSIE bug
				if(node.nodeName && node.nodeName.toLowerCase() == 'label' && node.htmlFor)
					clone.htmlFor = (processAttr ? processAttr(node.htmlFor) : node.htmlFor);
				

				if(clone.nodeName.toLowerCase() == 'option'){ //MSIE clone element bug requires this
					clone.selected = node.selected;
					clone.defaultSelected = node.defaultSelected;
				}
				
				for(i = 0; i < node.childNodes.length; i++){
					clone.appendChild($wf2.cloneNode(node.childNodes[i], processAttr, rtNestedDepth));
				}
				break;
			//MSIE BUG: The following three cases are for MSIE because when cloning nodes from XML
			//          files loaded via SELECT@data attribute, MSIE fails when performing appendChild.
			case 3: /*Node.TEXT_NODE*/
			case 4: /*Node.CDATA_SECTION_NODE*/
				clone = document.createTextNode(node.data);
				break;
			case 8: /*Node.COMMENT_NODE*/
				clone = document.createComment(node.data);
				break;
			default:
				clone = node.cloneNode(true)
		}
		//else clone = node.cloneNode(true);
		return clone;
	},
	
	getFormElements : function(){
		var elements = [];
		var allElements = $wf2.getElementsByTagNames.apply(this, ['input','output','select','textarea','button']); //fieldset
		for(var i = 0; i < allElements.length; i++){
			var node = allElements[i].parentNode;
			while(node && node.nodeType == 1 && node.getAttribute('repeat') != 'template')
				node = node.parentNode;
			if(!node || node.nodeType != 1)
				elements.push(allElements[i]);
		}
		return elements;
	},
	
	loadDataURI : function(el){
		var uri = el.data || el.getAttribute('data');
		if(!uri)
			return null;
		var doc = null, matches;
		try {
			if(matches = uri.match(/^data:[^,]*xml[^,]*,((?:.|\n)+)/)){
				var xml = decodeURI(matches[1].replace(/%3D/ig, '=').replace(/%3A/ig, ':').replace(/%2F/ig, '/'));
				if(window.DOMParser){
					var parser = new DOMParser();
					doc = parser.parseFromString(xml, 'text/xml');
				}
				else if(window.ActiveXObject){
					doc = new ActiveXObject("Microsoft.XMLDOM");
					doc.async = 'false';
					doc.loadXML(xml);
				}
			}
			else {
				$wf2.xhr.open('GET', uri, false);
				$wf2.xhr.send(null); //Note: if in Firefox and null not provided, and if Firebug is disabled, an error occurs
				doc = $wf2.xhr.responseXML;
			}
		}
		catch(e){
			return null;
		}
		return doc;
	},

	getElementsByTagNames : function(/* ... */){
		var els,i,results = [];
		if(document.evaluate){
			var _tagNames = [];
			for(i = 0; i < arguments.length; i++)
				_tagNames.push(".//" + arguments[i]);
			els = document.evaluate(_tagNames.join('|'), this, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); 
			for(i = 0; i < els.snapshotLength; i++)
				results.push(els.snapshotItem(i));
		}
		else {
			for(i = 0; i < arguments.length; i++){
				els = this.getElementsByTagName(arguments[i]);
				for(var j = 0; j < els.length; j++){
					results.push(els[j]);
				}
			}
			if($wf2.sortNodes)
				results.sort($wf2.sortNodes);
		}
		return results;
	},
	
	getElementsByTagNamesAndAttribute : function(elNames, attrName, attrValue, isNotEqual){
		var els,el,i,j,results = [];
		
		//QUESTION!!! Can we exclude all nodes that are not decendents of the repetition template?
		if(document.evaluate){
			var attrExpr = '';
			if(attrName)
				attrExpr = '[@' + attrName + (attrValue ? (isNotEqual ? '!=' : '=') + '"' + attrValue + '"' : "") + "]";
			var xPaths = [];
			for(i = 0; i < elNames.length; i++)
				xPaths.push('.//' + elNames[i] + attrExpr);
			els = document.evaluate(xPaths.join('|'), this, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); 
			for(i = 0; i < els.snapshotLength; i++)
				results.push(els.snapshotItem(i));
		}
		else {
			for(i = 0; i < elNames.length; i++){
				els = this.getElementsByTagName(elNames[i]);
				for(j = 0; el = els[j]; j++){
					var thisAttrNode = el.getAttributeNode(attrName);
					var thisAttrValue = el.getAttribute(attrName); //MSIE needs getAttribute here for custom button types to be read
					if(!attrName || (thisAttrNode && (attrValue === undefined || (isNotEqual ? thisAttrValue != attrValue : thisAttrValue == attrValue) ))){
						results.push(el);
					}
				}
			}
			if($wf2.sortNodes)
				results.sort($wf2.sortNodes);
		}
		return results;
	},
	
	arrayHasItem : function(arr, item){
		for(var i = 0; i < arr.length; i++){
			if(arr[i] == item)
				return true;
		}
		return false;
	},
	
	//Note: this function has been deemed harmful
	getElementStyle : function(el, property) { //adapted from Danny Goodman <http://www.oreillynet.com/pub/a/javascript/excerpt/JSDHTMLCkbk_chap5/index5.html>
		if(el.currentStyle)
			return el.currentStyle[property];
		else if(window.getComputedStyle)
			return getComputedStyle(el, '').getPropertyValue(property);
		else if(el.style)
			return el.style[property];
		else return '';
	},

	//createElement code based on Anthony Lieuallen's work <http://www.easy-reader.net/archives/2005/09/02/death-to-bad-dom-implementations/#comment-444>
	//   The following function enables MSIE to create elements with the name attribute set, per MSDN:
	//   The NAME attribute cannot be set at run time on elements dynamically created with the 
	//   createElement method. To create an element with a name attribute, include the attribute 
	//   and value when using the createElement method.
	//   The same goes for creating radio buttons and creating defaultly checked checkboxes,
	//   per <http://channel9.msdn.com/wiki/default.aspx/Channel9.InternetExplorerProgrammingBugs>
	createElement : (function(){
		try {
			var el = document.createElement('<div name="foo">'); //MSIE memory leak according to Drip
			if(el.tagName.toLowerCase() != 'div' || el.name != 'foo')
				throw 'create element error';
			
			return function(tag, attrs){
				var html = '<' + tag;
				for(var name in attrs)
					html += ' ' + name + '="' + attrs[name] + '"';
				html += '>';
				if(tag.toLowerCase() != 'input')
					html += '</'+tag+'>';
				return document.createElement(html); //'<'+tag+' name="'+name+'"></'+tag+'>'
			};
		}
		catch(err){
			return function(tag, attrs){
				var el = document.createElement(tag);
				for(var name in attrs)
					el.setAttribute(name, attrs[name]);
				return el;
			};
		}
	})(),

	//Sort elements in document order (from ppk)
	sortNodes : (function(){
		var n = document.documentElement.firstChild;
		if(n.sourceIndex){
			return function (a,b){
				return a.sourceIndex - b.sourceIndex;
			};
		}
		else if(n.compareDocumentPosition){
			return function (a,b){
				return 3 - (a.compareDocumentPosition(b) & 6);
			};
		}
	})(),

	//Shortcut to create new list items; used by default invalid event handler in listing the errors
	createLI : function(text){
		var li = document.createElement('li');
		li.appendChild(document.createTextNode(text));
		return li;
	},
	
	//Initially inspired by Paul Sowden <http://delete.me.uk/2005/03/iso8601.html>
	ISO8601RegExp : /^(?:(\d\d\d\d)-(W(0[1-9]|[1-4]\d|5[0-2])|(0\d|1[0-2])(-(0\d|[1-2]\d|3[0-1])(T(0\d|1\d|2[0-4]):([0-5]\d)(:([0-5]\d)(\.(\d+))?)?(Z)?)?)?)|(0\d|1\d|2[0-4]):([0-5]\d)(:([0-5]\d)(\.(\d+))?)?)$/,
	parseISO8601 : function (str, type) {
		var d = $wf2.validateDateTimeType(str, type);
		if(!d)
			return null;
		
		var date = new Date(0);
		var _timePos = 8;
		
		if(d[15]){ //Time
			if(type && type != 'time') // a time date
				return null;
			_timePos = 15;
		}
		else {
			date.setUTCFullYear(d[1]);
			
			//ISO8601 Week
			if(d[3]){
				if(type && type != 'week')
					return null;
				date.setUTCDate(date.getUTCDate() + ((8 - date.getUTCDay()) % 7) + (d[3]-1)*7); //set week day and week
				return date;
			}
			//Other date-related types
			else {
				date.setUTCMonth(d[4] - 1); //Month must be supplied for WF2
				if(d[6])
					date.setUTCDate(d[6]);
			}
		}

		//Set time-related fields
		if(d[_timePos+0]) date.setUTCHours(d[_timePos+0]);
		if(d[_timePos+1]) date.setUTCMinutes(d[_timePos+1]);
		if(d[_timePos+2]) date.setUTCSeconds(d[_timePos+3]);
		if(d[_timePos+4]) date.setUTCMilliseconds(Math.round(Number(d[_timePos+4]) * 1000));
		
		//Set to local time if date given, hours present and no 'Z' provided
		if(d[4] && d[_timePos+0] && !d[_timePos+6])
			date.setUTCMinutes(date.getUTCMinutes()+date.getTimezoneOffset());

		return date;
	},

	validateDateTimeType : function(value, type){ //returns RegExp matches
		var isValid = false;
		var d = $wf2.ISO8601RegExp.exec(value); //var d = string.match(new RegExp(regexp));
		if(!d || !type)
			return d;
		type = type.toLowerCase();
		
		if(type == 'week') // a week date
			isValid = (d[2].toString().indexOf('W') === 0); //valid if W present
		else if(type == 'time') // a time date
			isValid = !!d[15];
		else if(type == 'month')
			isValid = !d[5];
		else { //a date related value
			//Verify that the number of days in the month are valid
			if(d[6]){
				var date = new Date(d[1], d[4]-1, d[6]);
				if(date.getMonth() != d[4]-1)
					isValid = false;
				else switch(type){
					case 'date':
						isValid = (d[4] && !d[7]); //valid if day of month supplied and time field not present
						break;
					case 'datetime':
						isValid = !!d[14]; //valid if Z present
						break;
					case 'datetime-local':
						isValid = (d[7] && !d[14]); //valid if time present and Z not provided
						break;
				}
			}
		}
		return isValid ? d : null;
	},
	
	zeroPad : function(num, pad){
		if(!pad)
			pad = 2;
		var str = num.toString();
		while(str.length < pad)
			str = '0' + str;
		return str;
	},
	
	dateToISO8601 : function(date, type){
		type = String(type).toLowerCase();
		var ms = '';
		if(date.getUTCMilliseconds())
			ms = '.' + $wf2.zeroPad(date.getUTCMilliseconds(), 3).replace(/0+$/,'');
		switch(type){
			case 'date':
				return date.getUTCFullYear() + '-' + $wf2.zeroPad(date.getUTCMonth()+1) + '-' + $wf2.zeroPad(date.getUTCDate());
			case 'datetime-local':
				return date.getFullYear() + '-' + $wf2.zeroPad(date.getMonth()+1) + '-' + $wf2.zeroPad(date.getDate()) + 
				       'T' + $wf2.zeroPad(date.getHours()) + ':' + $wf2.zeroPad(date.getMinutes()) + ':' + $wf2.zeroPad(date.getMinutes()) + ms + 'Z';
			case 'month':
				return date.getUTCFullYear() + '-' + $wf2.zeroPad(date.getUTCMonth()+1);
			case 'week':
				var week1 = $wf2.parseISO8601(date.getUTCFullYear() + '-W01');
				return date.getUTCFullYear() + '-W' + $wf2.zeroPad(((date.valueOf() - week1.valueOf()) / (7*24*60*60*1000)) + 1);
			case 'time':
				return $wf2.zeroPad(date.getUTCHours()) + ':' + $wf2.zeroPad(date.getUTCMinutes()) + ':' + $wf2.zeroPad(date.getUTCMinutes()) + ms;
			case 'datetime':
			default:
				return date.getUTCFullYear() + '-' + $wf2.zeroPad(date.getUTCMonth()+1) + '-' + $wf2.zeroPad(date.getUTCDate()) + 
				       'T' + $wf2.zeroPad(date.getUTCHours()) + ':' + $wf2.zeroPad(date.getUTCMinutes()) + ':' + $wf2.zeroPad(date.getUTCMinutes()) + ms + 'Z';
		}
	},
	
	//Emulation of DOMException
	DOMException : function(code){
		var message = 'DOMException: ';
		switch(code){
			case  1: message += 'INDEX_SIZE_ERR'; break;
			case  9: message += 'NOT_SUPPORTED_ERR'; break;
			case 11: message += 'INVALID_STATE_ERR'; break;
			case 12: message += 'SYNTAX_ERR'; break;
			case 13: message += 'INVALID_MODIFICATION_ERR'; break;
		}
	
		var err = new Error(message);
		err.code = code;
		err.name = 'DOMException';
	
		//Provide error codes and messages for the exception types that are raised by WF2
		err.INDEX_SIZE_ERR = 1;
		err.NOT_SUPPORTED_ERR = 9;
		err.INVALID_STATE_ERR = 11;
		err.SYNTAX_ERR = 12;
		err.INVALID_MODIFICATION_ERR = 13;
	
		//with($wf2.DOMException.prototype){
		//	INDEX_SIZE_ERR = 1;
		//	DOMSTRING_SIZE_ERR = 2;
		//	HIERARCHY_REQUEST_ERR = 3;
		//	WRONG_DOCUMENT_ERR = 4;
		//	INVALID_CHARACTER_ERR = 5;
		//	NO_DATA_ALLOWED_ERR = 6;
		//	NO_MODIFICATION_ALLOWED_ERR = 7;
		//	NOT_FOUND_ERR = 8;
		//	NOT_SUPPORTED_ERR = 9;
		//	INUSE_ATTRIBUTE_ERR = 10;
		//	INVALID_STATE_ERR = 11;
		//	SYNTAX_ERR = 12;
		//	INVALID_MODIFICATION_ERR = 13;
		//	NAMESPACE_ERR = 14;
		//	INVALID_ACCESS_ERR = 15;
		//};
	
		return err;
	}
}; //End $wf2 = {


/*##############################################################################################
 # Section: Repetition Model Definitions
 ##############################################################################################*/

var RepetitionElement = {
	REPETITION_NONE:0,
	REPETITION_TEMPLATE:1,
	REPETITION_BLOCK:2
};

var RepetitionEvent = {
	//the following takes a UIEvent and adds the required properties for a RepetitionEvent
	_upgradeEvent : function(){
		this.initRepetitionEvent = RepetitionEvent.initRepetitionEvent;
		this.initRepetitionEventNS = RepetitionEvent.initRepetitionEventNS;
	},
	initRepetitionEvent : function(typeArg, canBubbleArg, cancelableArg, elementArg){
		if(this.initEvent)
			this.initEvent(typeArg, canBubbleArg, cancelableArg);
		else { //manually initialize event (i.e., for MSIE)
			this.type = typeArg;
	//		switch(typeArg.toLowerCase()){
	//			case 'added':
	//				this.type = 'add';
	//				break;
	//			case 'removed':
	//				this.type = 'remove';
	//				break;
	//			case 'moved':
	//				this.type = 'move';
	//				break;
	//		}
			//this.srcElement = elementArg.repetitionTemplate;
			//this.cancelBubble = false;
			//this.cancelable = cancelableArg;
			//this.returnValue = false;
			
			if(!this.preventDefault)
			this.preventDefault = function(){
				this.returnValue = false;
			};
			if(!this.stopPropagation)
			this.stopPropagation = function(){
				this.cancelBubble = true;
			};
		}
		this.element = elementArg;
		this.relatedNode = elementArg; //for Opera (deprecated?)
	},
	initRepetitionEventNS : function(namespaceURIArg, typeArg, canBubbleArg, cancelableArg, elementArg){
		throw Error("NOT IMPLEMENTED: RepetitionEvent.initRepetitionEventNS");
		//this.initEvent(namespaceURIArg, typeArg, canBubbleArg, cancelableArg);
		//this.element = elementArg;
		//this.relatedNode = elementArg; //for Opera (deprecated?)
	}
};

/*##############################################################################################
 # Change the prototypes of HTML elements
 ##############################################################################################*/

//RepetitionElement interface must be implemented by all elements.
if(window.Element && Element.prototype){
	Element.prototype.REPETITION_NONE     = RepetitionElement.REPETITION_NONE;
	Element.prototype.REPETITION_TEMPLATE = RepetitionElement.REPETITION_TEMPLATE;
	Element.prototype.REPETITION_BLOCK    = RepetitionElement.REPETITION_BLOCK;
	
	Element.prototype.repetitionType      = RepetitionElement.REPETITION_NONE;
	Element.prototype.repetitionIndex     = 0;
	Element.prototype.repetitionTemplate  = null; /*readonly*/
	Element.prototype.repetitionBlocks    = null; /*readonly*/

	Element.prototype.repeatStart = 1;
	Element.prototype.repeatMin   = 0;
	Element.prototype.repeatMax   = Number.MAX_VALUE; //Infinity;
	
	Element.prototype.addRepetitionBlock        = $wf2.addRepetitionBlock;
	Element.prototype.addRepetitionBlockByIndex = $wf2.addRepetitionBlockByIndex;
	Element.prototype.moveRepetitionBlock       = $wf2.moveRepetitionBlock;
	Element.prototype.removeRepetitionBlock     = $wf2.removeRepetitionBlock;
}

/*##############################################################################################
 # Set mutation event handlers to automatically add WF2 behaviors
 ##############################################################################################*/

//When a form control is inserted into a document, the UA must check to see if it has [the autofocus]
//  attribute set. If it does, and the control is not disabled, and it is of a type normally
//  focusable in the user's operating environment, then the UA should focus the control, as if
//  the control's focus() method was invoked. UAs with a viewport should also scroll the document
//  enough to make the control visible, even if it is not of a type normally focusable.
//REVISE: there should be one handler for all attr events on the page.
if(document.addEventListener){
	document.addEventListener('DOMNodeInsertedIntoDocument', function(evt){ //DOMNodeInserted? DOMNodeInsertedIntoDocument
		if(evt.target.nodeType == 1 && evt.target.hasAttribute('autofocus')){
			$wf2.initAutofocusElement(evt.target);
		}
		//[[UAs may ignore this attribute if the user has indicated (for example, by starting to type in a
		//    form control) that he does not wish focus to be changed.]]
	}, false);

	//NOT CURRENTLY IMPLEMENTABLE:
	//  Setting the DOM attribute to true must set the content attribute to the value autofocus.
	//  Setting the DOM attribute to false must remove the content attribute.

	document.addEventListener('DOMAttrModified', function(evt){
		//The autofocus DOM attribute must return true when the content attribute is present (regardless
		//   of its value, even if it is the empty string), and false when it is absent.
		if(evt.attrName == 'autofocus'){
			if(evt.attrChange == evt.ADDITION)
				//evt.relatedNode.autofocus = true;
				$wf2.initAutofocusElement(evt.target);
			else if(evt.attrChange == evt.REMOVAL)
				evt.target.autofocus = false;
		}
	}, false);
}

/*##################################################################################
 # Execute WF2 code onDOMContentLoaded
 # Some of the following code was borrowed from Dean Edwards, John Resig, et al <http://dean.edwards.name/weblog/2006/06/again/>
 ##################################################################################*/

(function(){
//Get the path to the library base directory
var match;
//For some reason, if not using documentElement, scriptaculous fails to load if reference to
//   webforms2 script placed beforehand in Firefox
var scripts = document.documentElement.getElementsByTagName('script'); 
for(var i = 0; i < scripts.length; i++){
	if(match = scripts[i].src.match(/^(.*)webforms2[^\/]+$/))
		$wf2.libpath = match[1];
}

//The script has been included after the DOM has loaded (perhaps via Greasemonkey), so fire immediately
//NOTE: This does not work with XHTML documents in Gecko
if(document.body){
	$wf2.onDOMContentLoaded();
	return;
}

var eventSet = 0;
if(document.addEventListener){
	//for Gecko and Opera
	document.addEventListener('DOMContentLoaded', function(){
		$wf2.onDOMContentLoaded();
	}, false);

	//for other browsers which do not support DOMContentLoaded use the following as a fallback to be called hopefully before all other onload handlers
	window.addEventListener('load', function(){
		$wf2.onDOMContentLoaded();
	}, false);
	
	eventSet = 1;
}

//for Safari
if (/WebKit/i.test(navigator.userAgent)) { //sniff
	var _timer = setInterval(function() {
		if (/loaded|complete/.test(document.readyState)) {
			clearInterval(_timer);
			delete _timer;
			$wf2.onDOMContentLoaded();
		}
	}, 10);
	eventSet = 1;
}
//for Internet Explorer (formerly using conditional comments) //sniff
else if(/MSIE/i.test(navigator.userAgent) && !document.addEventListener && window.attachEvent){
	//This following attached onload handler will attempt to be the first onload handler to be called and thus
	//  initiate the repetition model as early as possible if the DOMContentLoaded substitute fails.
	window.attachEvent('onload', function(){
		$wf2.onDOMContentLoaded();
	});
	
	//Dean Edward's first solution: http://dean.edwards.name/weblog/2005/09/busted/
	//document.getElementsByTagName('*')[0].addBehavior(dirname + 'repetition-model.htc'); //use this if Behaviors are employed in 0.9
	document.write("<script defer src='" + $wf2.libpath + "webforms2-msie.js'><"+"/script>");

	//Dean Edward's revisited solution <http://dean.edwards.name/weblog/2005/09/busted/> (via Matthias Miller with insights from jQuery)
	//  Note that this solution will not result in its code firing before onload if there are no external images in the page; in this case, first solution above is used.
	document.write("<scr" + "ipt id='__wf2_ie_onload' defer src='//:'><\/script>"); //MSIE memory leak according to Drip
	var script = document.getElementById('__wf2_ie_onload');
	script.onreadystatechange = function(){
		if(this.readyState == 'complete'){
			this.parentNode.removeChild(this);
			$wf2.onDOMContentLoaded();
			
			//See issue #3 <http://code.google.com/p/repetitionmodel/issues/detail?id=3>
			//Sometimes cssQuery doesn't find all repetition templates from here within this DOMContentLoaded substitute
			if($wf2.repetitionTemplates.length == 0)
				$wf2.isInitialized = false;
		}
	};
	script = null;
	eventSet = 1;
}

//old event model used as a last-resort fallback
if(!eventSet){
	if(window.onload){ //if(window.onload != RepetitionElement._init_document)
		var oldonload = window.onload;
		window.onload = function(){
			$wf2.onDOMContentLoaded();
			oldonload();
		};
	}
	else window.onload = function(){
		$wf2.onDOMContentLoaded();
	};
}
})();
} //End If(!document.implementation...

/*##############################################################################################
 # Extensions for existing Web Forms 2.0 Implementations
 ##############################################################################################*/
else if(document.addEventListener && ($wf2.oldRepetitionEventModelEnabled === undefined || $wf2.oldRepetitionEventModelEnabled)){
	$wf2.oldRepetitionEventModelEnabled = true;
	(function(){
		
	var deprecatedAttrs = {
		added   : 'onadd',
		removed : 'onremove',
		moved   : 'onmove'
	};
	
	function handleRepetitionEvent(evt){
		if(!$wf2.oldRepetitionEventModelEnabled)
			return;
		if(!evt.element && evt.relatedNode) //Opera uses evt.relatedNode instead of evt.element as the specification dictates
			evt.element = evt.relatedNode;
		if(!evt.element || !evt.element.repetitionTemplate)
			return;
		
		var rt = evt.element.repetitionTemplate;
		var attrName = 'on' + evt.type;
		
		//Add support for event handler set with HTML attribute
		var handlerAttr = rt.getAttribute(attrName) || /* deprecated */ rt.getAttribute(deprecatedAttrs[evt.type]);
		if(handlerAttr && (!rt[attrName] || typeof rt[attrName] != 'function')) //in MSIE, attribute == property
			rt[attrName] = new Function('event', handlerAttr);
		
		if(evt.element.repetitionTemplate[attrName])
			evt.element.repetitionTemplate[attrName](evt);
		else if(evt.element.repetitionTemplate[deprecatedAttrs[evt.type]]) //deprecated
			evt.element.repetitionTemplate[deprecatedAttrs[evt.type]](evt);
	}
	
	document.addEventListener('added', handleRepetitionEvent, false);
	document.addEventListener('removed', handleRepetitionEvent, false);
	document.addEventListener('moved', handleRepetitionEvent, false);
	
	})();
}

} //end if(!window.$wf2)


//if(!window.ValidityState){
	//var ValidityState = {
	//	
	//};
	
	
	//if(HTMLElement.prototype)
	
	//ValidityState interface
	
	//node.validity = {
	//	typeMismatch    : false,
	//	rangeUnderflow  : false,
	//	rangeOverflow   : false,
	//	stepMismatch    : false,
	//	tooLong         : false,
	//	patternMismatch : false,
	//	valueMissing    : false,
	//	customError     : false,
	//	valid           : true
	//};
	
//}

//if(!window.HTMLOutputElement){
	
//}
