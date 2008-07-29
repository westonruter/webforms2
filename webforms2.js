/*
 * Web Forms 2.0 Cross-browser Implementation <http://code.google.com/p/webforms2/>
 * Version: 0.5.4 (2008-07-29)
 * Copyright: 2007, Weston Ruter <http://weston.ruter.net/>
 * License: GNU General Public License, Free Software Foundation
 *          <http://creativecommons.org/licenses/GPL/2.0/>
 * 
 * The comments contained in this code are largely quotations from the 
 * WebForms 2.0 specification: <http://whatwg.org/specs/web-forms/current-work/>
 *
 * Usage: <script type="text/javascript" src="webforms2.js"></script>
 */

if(!window.$wf2){
var $wf2 = {};
if(document.implementation && document.implementation.hasFeature &&
!document.implementation.hasFeature('WebForms', '2.0')){
$wf2 = {
version : '0.5.4',
isInitialized : false,
libpath : '',
hasElementExtensions : (window.HTMLElement && HTMLElement.prototype),
hasGettersAndSetters : ($wf2.__defineGetter__ && $wf2.__defineSetter__),
onDOMContentLoaded : function(){
if($wf2.isInitialized)
return;
$wf2.isInitialized = true;
var i,j,k,node;
var style = document.createElement('link');
style.setAttribute('type', 'text/css');
style.setAttribute('rel', 'stylesheet');
style.setAttribute('href', $wf2.libpath + 'webforms2.css');
var parent = document.getElementsByTagName('head')[0];
if(!parent)
parent = document.getElementsByTagName('*')[0];
parent.insertBefore(style, parent.firstChild);
$wf2.zeroPoint = {};
$wf2.zeroPoint.datetime = $wf2.parseISO8601("1970-01-01T00:00:00.0Z");
$wf2.zeroPoint['datetime-local'] = $wf2.parseISO8601("1970-01-01T00:00:00.0");
$wf2.zeroPoint.date = $wf2.zeroPoint.datetime;
$wf2.zeroPoint.month = $wf2.zeroPoint.datetime;
$wf2.zeroPoint.week = $wf2.parseISO8601("1970-W01");
$wf2.zeroPoint.time = $wf2.zeroPoint.datetime;
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
$wf2.initRepetitionBlocks();
$wf2.initRepetitionTemplates();
$wf2.initRepetitionButtons('add');
$wf2.initRepetitionButtons('remove');
$wf2.initRepetitionButtons('move-up');
$wf2.initRepetitionButtons('move-down');
$wf2.updateAddButtons();
$wf2.updateMoveButtons();
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
prefillSelectElements : function(){
var select, selects = $wf2.getElementsByTagNames.apply(document.documentElement, ['select', 'datalist']);
for(var i = 0; select = selects[i]; i++){
var xmlDoc = $wf2.loadDataURI(select);
if(
xmlDoc &&
xmlDoc.documentElement &&
/:?\bselect$/i.test(xmlDoc.documentElement.nodeName) &&
xmlDoc.documentElement.namespaceURI == 'http://www.w3.org/1999/xhtml'
)
{
var root = xmlDoc.documentElement;
if(root.getAttribute('type') != 'incremental'){
while(select.lastChild)
select.removeChild(select.lastChild);
}
node = root.firstChild;
while(node){
select.appendChild($wf2.cloneNode(node));
node = node.nextSibling;
}
}
}
},
prefillFormElements : function(){
var frm, frms = document.getElementsByTagName('form');
for(var i = 0; frm = frms[i]; i++){
var xmlDoc = $wf2.loadDataURI(frm);
if(
xmlDoc &&
xmlDoc.documentElement &&
/:?\bformdata$/.test(xmlDoc.documentElement.nodeName) &&
xmlDoc.documentElement.namespaceURI == 'http://n.whatwg.org/formdata'
)
{
var rt;
var root = xmlDoc.documentElement;
if(root.getAttribute('type') != 'incremental')
frm.reset();
var clr, clrs = root.getElementsByTagName('clear');
for(j = 0; clr = clrs[j]; j++){
if(clr.namespaceURI == 'http://n.whatwg.org/formdata' &&
clr.parentNode == root &&
!clr.firstChild &&
(rt = document.getElementById(clr.getAttribute('template'))) &&
rt.getAttribute('repeat') == 'template'
)
{
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
var index, rpt, rpts = root.getElementsByTagName('repeat');
for(j = 0; rpt = rpts[j]; j++){
if(rpt.namespaceURI == 'http://n.whatwg.org/formdata' &&
rpt.parentNode == root &&
!rpt.firstChild &&
(rt = document.getElementById(rpt.getAttribute('template'))) &&
rt.getAttribute('repeat') == 'template' &&
/^-?\d+$/.test(index = rpt.getAttribute('index'))
)
{
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
$wf2.addRepetitionBlockByIndex.apply(rt, [null, index]);
}
}
}
var fld, flds = root.getElementsByTagName('field');
var formElements = $wf2.getFormElements.apply(frm);
for(j = 0; fld = flds[j]; j++){
var indexAttr = fld.getAttributeNode('index');
var name = fld.getAttribute('name');
if(!name || (indexAttr && !/^\d+$/.test(indexAttr.value)))
continue;
var value = '';
for(k = 0; node = fld.childNodes[k]; k++){
if(node.nodeType == 3 || node.nodeType == 4 )
value += node.data;
else break;
}
var ctrl, count = 0;
for(k = 0; ctrl = formElements[k]; k++){
if(ctrl.type == 'image'){
if(ctrl.name ?
(ctrl.name + '.x' == name || ctrl.name + '.y' == name)
: (name == 'x' || name == 'y') ){
if(!indexAttr || ++count-1 >= indexAttr.value)
break;
}
}
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
if(ctrl.type == 'file' || ctrl.type == 'button' || ctrl.type == 'image')
continue;
if(!ctrl.getAttributeNode('multiple') || !ctrl.wf2Prefilled){
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
else {
ctrl.value = value;
$wf2.updateValidityState(ctrl);
if(!ctrl.validity.valid){
ctrl.value = ctrl.defaultValue;
$wf2.updateValidityState(ctrl);
}
}
ctrl.wf2Prefilled = true;
}
else if(ctrl.getAttributeNode('multiple')){
for(var opt,k = 0; opt = ctrl.options[k]; k++){
if(!opt.selected && (opt.value ? opt.value == value : opt.text == value)){
opt.selected = true;
break;
}
}
}
}
var formElements = $wf2.getFormElements.apply(frm);
for(j = 0; j < formElements.length; j++){
}
}
}
},
repetitionTemplates:[],
constructRepetitionTemplate : function(){
if(this.wf2Initialized)
return;
this.wf2Initialized = true;
this.style.display = 'none';
this.repetitionType = RepetitionElement.REPETITION_TEMPLATE;
if(!this.repetitionIndex)
this.repetitionIndex = 0;
this.repetitionTemplate = null;
if(!this.repetitionBlocks)
this.repetitionBlocks = [];
var _attr;
this.repeatStart = /^\d+$/.test(_attr = this.getAttribute('repeat-start')) ? parseInt(_attr) : 1;
this.repeatMin = /^\d+$/.test(_attr = this.getAttribute('repeat-min')) ? parseInt(_attr) : 0;
this.repeatMax = /^\d+$/.test(_attr = this.getAttribute('repeat-max')) ? parseInt(_attr) : Number.MAX_VALUE;
if(!this.addRepetitionBlock) this.addRepetitionBlock = function(refNode, index){
return $wf2.addRepetitionBlock.apply(this, [refNode, index]);
};
if(!this.addRepetitionBlockByIndex)
this.addRepetitionBlockByIndex = this.addRepetitionBlock;
var frm = this;
while(frm = frm.parentNode){
if(frm.nodeName.toLowerCase() == 'form')
break;
}
var _templateElements;
if(frm && (_templateElements = $wf2.getElementsByTagNames.apply(this, ['button','input','select','textarea','isindex'])).length){
for(var el, i = 0; el = _templateElements[i]; i++)
el.disabled = true;
}
var attr,sibling = this.parentNode.firstChild;
while(sibling && sibling != this){
if(sibling.nodeType == 1 && (attr = sibling.getAttributeNode('repeat')) && /^-?\d+$/.test(attr.value) && !sibling.getAttribute('repeat-template')){
sibling.repetitionTemplate = this;
sibling.setAttribute('repeat-template', this.id);
this.repetitionBlocks.push(sibling);
}
sibling = sibling.nextSibling;
}
for(var i = 0; (i < this.repeatStart || this.repetitionBlocks.length < this.repeatMin); i++)
this.addRepetitionBlock();
$wf2.repetitionTemplates.push(this);
this.wf2Initialized = true;
},
initRepetitionTemplates : function(parentNode){
var repetitionTemplates = $wf2.getElementsByTagNamesAndAttribute.apply((parentNode || document.documentElement), [['*'], 'repeat', 'template']);
for(var i = 0, rt; i < repetitionTemplates.length; i++)
$wf2.constructRepetitionTemplate.apply(repetitionTemplates[i]);
},
constructRepetitionBlock : function(){
if(this.wf2Initialized)
return;
this.style.display = '';
this.repetitionType = RepetitionElement.REPETITION_BLOCK;
var _attr;
this.repetitionIndex = /^\d+$/.test(_attr = this.getAttribute('repeat')) ? parseInt(_attr) : 0;
this.repetitionBlocks = null;
this.repetitionTemplate = null;
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
return $wf2.removeRepetitionBlock.apply(this);
};
if(!this.moveRepetitionBlock) this.moveRepetitionBlock = function(distance){
return $wf2.moveRepetitionBlock.apply(this, [distance]);
};
this.wf2Initialized = true;
},
initRepetitionBlocks : function(parentNode){
var repetitionBlocks = $wf2.getElementsByTagNamesAndAttribute.apply((parentNode || document.documentElement), [['*'], 'repeat', 'template', true]);
for(var i = 0; i < repetitionBlocks.length; i++)
$wf2.constructRepetitionBlock.apply(repetitionBlocks[i]);
},
repetitionButtonDefaultLabels : {
'add' : 'Add',
'remove' : 'Remove',
'move-up' : 'Move-up',
'move-down' : 'Move-down'
},
constructRepetitionButton : function(btnType){
if(this.wf2Initialized)
return;
this.htmlTemplate = $wf2.getHtmlTemplate(this);
if(!this.firstChild)
this.appendChild(document.createTextNode($wf2.repetitionButtonDefaultLabels[btnType]));
if(btnType != 'add')
this.disabled = !$wf2.getRepetitionBlock(this);
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
var inpts = $wf2.getElementsByTagNamesAndAttribute.apply(parent, [['input'], 'type', btnType]);
for(i = 0; i < inpts.length; i++){
var btn = document.createElement('button');
for(var j = 0, attr; attr = inpts[i].attributes[j]; j++)
btn.setAttribute(attr.nodeName, inpts[i].getAttribute(attr.nodeName));
inpts[i].parentNode.replaceChild(btn, inpts[i]);
btn = null;
}
var btns = $wf2.getElementsByTagNamesAndAttribute.apply(parent, [['button'], 'type', btnType]);
for(var i = 0; i < btns.length; i++)
$wf2.constructRepetitionButton.apply(btns[i], [btnType]);
},
clickRepetitionButton : function(e){
if(e && e.preventDefault)
e.preventDefault();
var btn;
if(e && e.target)
btn = e.target;
else if(window.event)
btn = event.srcElement;
else if(this.nodeName.toLowerCase() == 'button')
btn = this;
var btnType = String(btn.getAttribute('type')).toLowerCase();
if(btn.onclick){
btn._onclick = btn.onclick;
btn.removeAttribute('onclick');
btn.onclick = null;
}
if(btn.returnValue !== undefined && !btn.returnValue){
btn.returnValue = undefined;
return false;
}
if(btn._onclick && btn.returnValue === undefined){
btn.returnValue = btn._onclick(e);
if(btn.returnValue !== undefined && !btn.returnValue){
btn.returnValue = undefined;
return false;
}
}
btn.returnValue = undefined;
var block;
if(btnType != 'add'){
block = $wf2.getRepetitionBlock(btn);
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
if(btn.htmlTemplate)
rt = btn.htmlTemplate;
else {
block = $wf2.getRepetitionBlock(btn);
if(block && block.repetitionTemplate)
rt = block.repetitionTemplate;
}
if(rt)
rt.addRepetitionBlock();
else
btn.disabled = true;
}
return false;
},
addRepetitionBlock : function(refNode, index){
if(this.getAttribute('repeat') != 'template')
throw $wf2.DOMException(9);
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
if(this.parentNode == null)
return null;
var node = this;
while(node = node.parentNode){
if(node.nodeType == 1 && node.getAttribute('repeat') == 'template')
return false;
}
var sibling = this.previousSibling;
var currentBlockCount = 0;
while(sibling != null){
if(sibling.nodeType == 1){
var repeatAttr,repeatTemplateAttr;
repeat = parseInt(sibling.getAttribute('repeat'));
repeatTemplateAttr = sibling.getAttributeNode('repeat-template');
if(!isNaN(repeat) && (!repeatTemplateAttr || repeatTemplateAttr.value == this.id))
{
this.repetitionIndex = Math.max(this.repetitionIndex, repeat+1);
currentBlockCount++;
}
}
sibling = sibling.previousSibling;
}
if(this.repeatMax <= currentBlockCount)
return null;
if(index !== undefined && index > this.repetitionIndex)
this.repetitionIndex = index;
var IDAttrName = this.getAttribute('id') ? 'id' : this.getAttribute('name') ? 'name' : '';
var IDAttrValue = this.getAttribute(IDAttrName);
var block;
var replaceValue = this.repetitionIndex;
var reTemplateName, processAttr;
if(IDAttrValue && !/\u005B|\u02D1|\u005D|\u00B7/.test(IDAttrValue)){
reTemplateName = new RegExp("(\\[|\u02D1)" + IDAttrValue + "(\\]|\u00B7)", 'g');
processAttr = function(attrVal){
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
block.setAttribute('repeat', this.repetitionIndex);
block.removeAttribute('repeat-min');
block.removeAttribute('repeat-max');
block.removeAttribute('repeat-start');
if(IDAttrName){
block.setAttribute('repeat-template', IDAttrValue);
block.removeAttribute(IDAttrName);
}
if(!refNode){
refNode = this;
while(refNode.previousSibling && refNode.previousSibling.repetitionType != RepetitionElement.REPETITION_BLOCK)
refNode = refNode.previousSibling;
this.parentNode.insertBefore(block, refNode);
this.repetitionBlocks.push(block);
}
else {
refNode.parentNode.insertBefore(block, refNode.nextSibling);
this.repetitionBlocks.push(block);
if($wf2.sortNodes)
this.repetitionBlocks.sort($wf2.sortNodes);
}
this.repetitionIndex++;
$wf2.constructRepetitionBlock.apply(block);
$wf2.initRepetitionTemplates(block);
$wf2.initRepetitionButtons('add', block);
$wf2.initRepetitionButtons('remove', block);
$wf2.initRepetitionButtons('move-up', block);
$wf2.initRepetitionButtons('move-down', block);
if($wf2.isInitialized){
$wf2.updateAddButtons(this);
$wf2.updateMoveButtons(this.parentNode);
}
$wf2.initNonRepetitionFunctionality(block);
var addEvt;
try {
if(document.createEvent)
addEvt = document.createEvent('UIEvents');
else if(document.createEventObject)
addEvt = document.createEventObject();
RepetitionEvent._upgradeEvent.apply(addEvt);
addEvt.initRepetitionEvent('added', true, false, block);
if(this.dispatchEvent)
this.dispatchEvent(addEvt);
else if(this.fireEvent){
}
}
catch(err){
addEvt = new Object();
RepetitionEvent._upgradeEvent.apply(addEvt);
addEvt.initRepetitionEvent('added', true, false, block);
}
var handlerAttr;
if((handlerAttr = this.getAttribute('onadded')) && (!this.onadded || typeof this.onadded != 'function')){
this.onadded = new Function('event', handlerAttr);
}
else if((handlerAttr = this.getAttribute('onadd')) && (!this.onadd || typeof this.onadd != 'function')){
this.onadd = new Function('event', handlerAttr);
}
try {
if(this.onadded){
this.onadded.apply(this, [addEvt]);
}
else if(this.onadd){
this.onadd.apply(this, [addEvt]);
}
}
catch(err){
setTimeout(function(){
throw err;
}, 0);
}
return block;
},
addRepetitionBlockByIndex : function(refNode, index){
$wf2.addRepetitionBlock.apply(this, [refNode, index])
},
removeRepetitionBlock : function(){
if(this.repetitionType != RepetitionElement.REPETITION_BLOCK)
throw $wf2.DOMException(9);
var parentNode = this.parentNode;
var block = parentNode.removeChild(this);
$wf2.updateMoveButtons(parentNode);
if(this.repetitionTemplate != null){
for(var i = 0; i < this.repetitionTemplate.repetitionBlocks.length; i++){
if(this.repetitionTemplate.repetitionBlocks[i] == this){
this.repetitionTemplate.repetitionBlocks.splice(i,1);
break;
}
}
}
if(this.repetitionTemplate != null){
var removeEvt;
try {
if(document.createEvent)
removeEvt = document.createEvent('UIEvents');
else if(document.createEventObject)
removeEvt = document.createEventObject();
RepetitionEvent._upgradeEvent.apply(removeEvt);
removeEvt.initRepetitionEvent('removed', true, false, this);
if(this.repetitionTemplate.dispatchEvent)
this.repetitionTemplate.dispatchEvent(removeEvt);
else if(this.repetitionTemplate.fireEvent){
}
}
catch(err){
removeEvt = new Object();
RepetitionEvent._upgradeEvent.apply(removeEvt);
removeEvt.initRepetitionEvent('removed', true, false, this);
}
var handlerAttr;
if((handlerAttr = this.repetitionTemplate.getAttribute('onremoved')) &&
(!this.repetitionTemplate.onremoved || typeof this.repetitionTemplate.onremoved != 'function'))
{
this.repetitionTemplate.onremoved = new Function('event', handlerAttr);
}
else if((handlerAttr = this.repetitionTemplate.getAttribute('onremove')) &&
(!this.repetitionTemplate.onremove || typeof this.repetitionTemplate.onremove != 'function'))
{
this.repetitionTemplate.onremove = new Function('event', handlerAttr);
}
try {
if(this.repetitionTemplate.onremoved){
this.repetitionTemplate.onremoved.apply(this, [removeEvt]);
}
else if(this.repetitionTemplate.onremove){
this.repetitionTemplate.onremove.apply(this, [removeEvt]);
}
}
catch(err){
setTimeout(function(){
throw err;
}, 0);
}
}
if(this.repetitionTemplate != null){
if(this.repetitionTemplate.repetitionBlocks.length < this.repetitionTemplate.repeatMin
&& this.repetitionTemplate.repetitionBlocks.length < this.repetitionTemplate.repeatMax)
{
this.repetitionTemplate.addRepetitionBlock();
}
if(this.repetitionTemplate.repetitionBlocks.length < this.repetitionTemplate.repeatMax){
var addBtns = $wf2.getElementsByTagNamesAndAttribute.apply(document.documentElement, [['button'], 'type', 'add']);
for(i = 0; i < addBtns.length; i++){
if(addBtns[i].htmlTemplate == this.repetitionTemplate)
addBtns[i].disabled = false;
}
}
}
},
moveRepetitionBlock : function(distance){
if(this.repetitionType != RepetitionElement.REPETITION_BLOCK)
throw $wf2.DOMException(9);
if(distance == 0 || this.parentNode == null)
return;
var target = this;
if(this.repetitionTemplate){
var pos = 0;
var rp = this.repetitionTemplate.repetitionBlocks;
while(pos < rp.length && rp[pos] != this)
pos++;
rp.splice(pos, 1);
rp.splice(distance < 0 ? Math.max(pos+distance, 0) : Math.min(pos+distance, rp.length), 0, this);
}
if(distance < 0){
while(distance != 0 && target.previousSibling &&
target.previousSibling.repetitionType != RepetitionElement.REPETITION_TEMPLATE)
{
target = target.previousSibling;
if(target.repetitionType == RepetitionElement.REPETITION_BLOCK)
distance++;
}
}
else {
while(distance != 0 && target.nextSibling && target.nextSibling.repetitionType != RepetitionElement.REPETITION_TEMPLATE){
target = target.nextSibling;
if(target.repetitionType == RepetitionElement.REPETITION_BLOCK)
distance--;
}
target = target.nextSibling;
}
this.parentNode.insertBefore(this, target);
if(this._clickedMoveBtn){
this._clickedMoveBtn.focus();
this._clickedMoveBtn = null;
}
$wf2.updateMoveButtons(this.parentNode);
if(this.repetitionTemplate != null){
var moveEvt;
try {
if(document.createEvent)
moveEvt = document.createEvent('UIEvents');
else if(document.createEventObject)
moveEvt = document.createEventObject();
RepetitionEvent._upgradeEvent.apply(moveEvt);
moveEvt.initRepetitionEvent('moved', true, false, this);
if(this.repetitionTemplate.dispatchEvent)
this.repetitionTemplate.dispatchEvent(moveEvt);
else if(this.repetitionTemplate.fireEvent){
}
}
catch(err){
moveEvt = new Object();
RepetitionEvent._upgradeEvent.apply(moveEvt);
moveEvt.initRepetitionEvent('moved', true, false, this);
}
var handlerAttr;
if((handlerAttr = this.repetitionTemplate.getAttribute('onmoved')) &&
(!this.repetitionTemplate.onmoved || typeof this.repetitionTemplate.onmoved != 'function'))
{
this.repetitionTemplate.onmoved = new Function('event', handlerAttr);
}
else if(handlerAttr = this.repetitionTemplate.getAttribute('onmove'))
{
if(!this.repetitionTemplate.onmove || typeof this.repetitionTemplate.onmove != 'function'){
this.repetitionTemplate.onmove = new Function('event', handlerAttr);
}
var funcMatches;
if(typeof handlerAttr == 'function' && (funcMatches = handlerAttr.toString().match(/^\s*function\s+anonymous\(\s*\)\s*\{((?:.|\n)+)\}\s*$/))){
this.repetitionTemplate.onmove = new Function('event', funcMatches[1]);
}
}
try {
if(this.repetitionTemplate.onmoved){
this.repetitionTemplate.onmoved.apply(this, [moveEvt]);
}
else if(this.repetitionTemplate.onmove){
this.repetitionTemplate.onmove.apply(this, [moveEvt]);
}
}
catch(err){
setTimeout(function(){
throw err;
}, 0);
}
}
},
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
if(attr && (node = document.getElementById(attr)) && node.getAttribute('repeat') == 'template' )
return node;
return null;
},
updateAddButtons : function(rt){
var repetitionTemplates = rt ? [rt] : $wf2.repetitionTemplates;
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
var i;
var rbs = [];
if(!parent){
var visitedParents = [];
rbs = $wf2.getElementsByTagNamesAndAttribute.apply(document.documentElement, [['*'], 'repeat', 'template', true]);
for(i = 0; block = rbs[i]; i++){
if(!$wf2.arrayHasItem(visitedParents, block.parentNode)){
$wf2.updateMoveButtons(block.parentNode);
visitedParents.push(block.parentNode);
}
}
return;
}
var j,btn,block;
var child = parent.firstChild;
while(child){
if(child.repetitionType == RepetitionElement.REPETITION_BLOCK)
rbs.push(child);
child = child.nextSibling;
}
for(i = 0; block = rbs[i]; i++){
var moveUpBtns = $wf2.getElementsByTagNamesAndAttribute.apply(block, [['button'], 'type', 'move-up']);
for(j = 0; btn = moveUpBtns[j]; j++){
btn.disabled =
!(rb = $wf2.getRepetitionBlock(btn))
||
(i == 0);
}
var moveDownBtns = $wf2.getElementsByTagNamesAndAttribute.apply(block, [['button'], 'type', 'move-down']);
for(j = 0; btn = moveDownBtns[j]; j++){
btn.disabled =
!(rb = $wf2.getRepetitionBlock(btn))
||
(i == rbs.length-1);
}
}
},
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
var ctrl, ctrls = $wf2.getElementsByTagNames.apply(parent, ['input','select','textarea']);
for(i = 0; ctrl = ctrls[i]; i++){
$wf2.applyValidityInterface(ctrl);
$wf2.updateValidityState(ctrl);
}
var els = $wf2.getElementsByTagNamesAndAttribute.apply(document.documentElement, [['*'], 'autofocus']);
if(parent.getAttribute('autofocus'))
els.unshift(parent);
for(i = 0; i < els.length; i++)
$wf2.initAutofocusElement(els[i]);
var textareas = $wf2.getElementsByTagNamesAndAttribute.apply(parent, [['textarea'], 'maxlength']);
if(parent.nodeName.toLowerCase() == 'textarea')
textareas.unshift(parent);
for(i = 0; i < textareas.length; i++)
textareas[i].maxLength = parseInt(textareas[i].getAttribute('maxlength'));
},
initAutofocusElement : function(el){
if(el.autofocus === false || el.autofocus === true)
return;
el.autofocus = true;
if(el.disabled)
return;
var node = el;
while(node && node.nodeType == 1){
if($wf2.getElementStyle(node, 'visibility') == 'hidden' || $wf2.getElementStyle(node, 'display') == 'none')
return;
node = node.parentNode;
}
el.focus();
},
formCheckValidity : function(){
var i, el, valid = true;
var formElements = $wf2.getFormElements.apply(this);
for(i = 0; el = formElements[i]; i++){
var type = (el.getAttribute('type') ? el.getAttribute('type').toLowerCase() : el.type);
el.willValidate = !(/(hidden|button|reset|add|remove|move-up|move-down)/.test(type) || !el.name || el.disabled);
if(el.checkValidity && el.willValidate){
if(!el.checkValidity())
valid = false;
}
}
if(!valid && $wf2.invalidIndicators.length){
$wf2.invalidIndicators[0].errorMsg.className += " wf2_firstErrorMsg";
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
else {
el.focus();
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
evt = document.createEvent('Events');
else if(document.createEventObject)
evt = document.createEventObject();
evt.initEvent('invalid', true, true );
evt.srcElement = this;
if(this.dispatchEvent)
canceled = !this.dispatchEvent(evt);
else if(this.fireEvent){
}
}
catch(err){
evt = new Object();
if(evt.initEvent)
evt.initEvent('invalid', true, true );
else {
evt.type = 'invalid';
evt.cancelBubble = false;
}
evt.target = evt.srcElement = this;
}
var oninvalidAttr = this.getAttribute('oninvalid');
if(oninvalidAttr && (!this.oninvalid || typeof this.oninvalid != 'function'))
this.oninvalid = new Function('event', oninvalidAttr);
try {
if(this.oninvalid){
canceled = this.oninvalid.apply(this, [evt]) === false || canceled;
}
}
catch(err){
setTimeout(function(){
throw err;
}, 0);
}
var hasInvalidIndicator = false;
if(this.type == 'radio' || this.type == 'checkbox'){
for(var i = 0; i < $wf2.invalidIndicators.length; i++){
if(this.form[this.name][0] == $wf2.invalidIndicators[i].target){
hasInvalidIndicator = true;
break;
}
}
}
if(!canceled && !hasInvalidIndicator)
$wf2.addInvalidIndicator(this);
return false;
},
numberRegExp : /^-?\d+(.\d+)?(e-?\d+)?$/,
urlRegExp : /^(\w+):(\/\/)?.+$/i,
emailRegExp : /^\S+@\S+$/i,
updateValidityState : function(node){
var minAttrNode, maxAttrNode, valueAttrNode;
minAttrNode = node.getAttributeNode('min');
maxAttrNode = node.getAttributeNode('max');
node.min = undefined;
node.max = undefined;
node.step = undefined;
valueAttrNode = node.getAttributeNode('value');
node.validity = $wf2.createValidityState();
node.validity.customError = !!node.validationMessage;
var type = (node.getAttribute('type') ? node.getAttribute('type').toLowerCase() : node.type);
var isTimeRelated = (type == 'datetime' || type == 'datetime-local' || type == 'time');
var isDateRelated = (type == 'date' || type == 'month' || type == 'week');
var isNumberRelated = (type == 'number' || type == 'range');
var isFileInput = (type == 'file');
var doCheckPrecision = (isTimeRelated || isDateRelated || isNumberRelated);
var doMaxLengthCheck = doCheckPrecision || node.nodeName.toLowerCase() == 'textarea';
var doCheckRange = (doCheckPrecision || isFileInput);
var isRadioOrCheckbox = (type == 'radio' || type == 'checkbox');
var doRequiredCheck = (doMaxLengthCheck ||
isFileInput ||
type == 'email' ||
type == 'url' ||
type == 'text' ||
type == 'password'||
isRadioOrCheckbox);
if(type == 'range'){
node.min = (minAttrNode && $wf2.numberRegExp.test(minAttrNode.value)) ? Number(minAttrNode.value) : 0;
if((!valueAttrNode || !valueAttrNode.specified) && node.value === '' && !node.wf2ValueProvided){
node.setAttribute('value', node.min);
node.value = node.min;
node.wf2ValueProvided = true;
}
}
node.wf2Value = node.value;
var type = (node.getAttribute('type') ? node.getAttribute('type').toLowerCase() : node.type);
node.willValidate = !(/(hidden|button|reset|add|remove|move-up|move-down)/.test(type) || !node.name || node.disabled);
if(doRequiredCheck && node.willValidate){
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
else if(node.getAttributeNode('required')){
node.validity.valueMissing = (node.value == '');
}
}
if(!node.validity.valueMissing && node.value){
var patternAttr = node.getAttributeNode('pattern');
if(patternAttr){
var rePattern = new RegExp("^(?:" + patternAttr.value + ")$");
rePattern.global = false;
rePattern.ignoreCase = false;
rePattern.multiline = false;
if(rePattern)
node.validity.patternMismatch = !rePattern.test(node.value);
}
if(isDateRelated || isTimeRelated)
node.validity.typeMismatch = ((node.wf2Value = $wf2.parseISO8601(node.value, type)) == null);
else {
switch(type){
case 'number':
case 'range':
node.validity.typeMismatch = !$wf2.numberRegExp.test(node.value);
break;
case 'email':
node.validity.typeMismatch = !$wf2.emailRegExp.test(node.value);
break;
case 'url':
node.validity.typeMismatch = !$wf2.urlRegExp.test(node.value);
break;
}
}
if(!node.validity.patternMismatch && !node.validity.typeMismatch){
if(doCheckRange){
if(isNumberRelated){
if(type == 'range'){
node.max = (maxAttrNode && $wf2.numberRegExp.test(maxAttrNode.value)) ? Number(maxAttrNode.value) : 100;
}
else {
if(minAttrNode && $wf2.numberRegExp.test(minAttrNode.value))
node.min = Number(minAttrNode.value);
if(maxAttrNode && $wf2.numberRegExp.test(maxAttrNode.value))
node.max = Number(maxAttrNode.value);
}
node.validity.rangeUnderflow = (node.min != undefined && Number(node.value) < node.min);
node.validity.rangeOverflow = (node.max != undefined && Number(node.value) > node.max);
}
else if(type == 'file'){
if(minAttrNode && /^\d+$/.test(minAttrNode.value))
node.min = Number(minAttrNode.value);
else node.min = 0;
if(maxAttrNode && /^\d+$/.test(maxAttrNode.value))
node.max = Number(maxAttrNode.value);
else node.max = 1;
}
else {
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
if(doCheckPrecision && !node.validity.rangeUnderflow && !node.validity.rangeOverflow){
var stepAttrNode = node.getAttributeNode('step');
if(!stepAttrNode){
node.step = isTimeRelated ? 60 : 1;
}
else if(stepAttrNode.value == 'any')
node.step = 'any';
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
_step = parseInt(_step * 1000);
break;
case 'date':
_step = parseInt(_step * 24*60*60*1000);
break;
case 'week':
_step = parseInt(_step * 7*24*60*60*1000);
break;
}
node.validity.stepMismatch = (Math.round((node.wf2Value - node.wf2StepDatum)*1000) % Math.round(_step*1000)) != 0;
}
}
}
}
if(doMaxLengthCheck && node.maxLength >= 0 && node.value != node.defaultValue){
var shortNewlines = 0;
var v = node.value;
node.wf2ValueLength = v.length;
for(var i = 1; i < v.length; i++){
if(v[i] === "\x0A" && v[i-1] !== "\x0D" || v[i] == "\x0D" && (v[i+1] && v[i+1] !== "\x0A"))
node.wf2ValueLength++;
}
node.validity.tooLong = node.wf2ValueLength > node.maxLength;
}
}
node.validity.valid = !$wf2.hasInvalidState(node.validity);
},
applyValidityInterface : function(node){
if(node.validity && node.validity.typeMismatch !== undefined)
return node;
node.validationMessage = "";
node.validity = $wf2.createValidityState();
node.willValidate = true;
var nodeName = node.nodeName.toLowerCase();
if(nodeName == 'button' || nodeName == 'fieldset'){
node.setCustomValidity = function(error){
throw $wf2.DOMException(9);
};
node.checkValidity = function(){
return true;
};
return node;
}
node.setCustomValidity = $wf2.controlSetCustomValidity;
node.checkValidity = $wf2.controlCheckValidity;
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
typeMismatch : false,
rangeUnderflow : false,
rangeOverflow : false,
stepMismatch : false,
tooLong : false,
patternMismatch : false,
valueMissing : false,
customError : false,
valid : true
};
},
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
valueMissing : 'A value must be supplied or selected.',
typeMismatch : 'The value is invalid for %s type.',
rangeUnderflow : 'The value must be equal to or greater than %s.',
rangeOverflow : 'The value must be equal to or less than %s.',
stepMismatch : 'The value has a step mismatch; it must be a certain number multiples of %s from %s.',
tooLong : 'The value is too long. The field may have a maximum of %s characters but you supplied %s. Note that each line-break counts as two characters.',
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
var msg = document.createElement('div');
msg.className = 'wf2_errorMsg';
msg.id = (target.id || target.name) + '_wf2_errorMsg';
msg.onmousedown = function(){
this.parentNode.removeChild(this);
};
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
var parent = document.body ? document.body : document.documentElement;
if($wf2.invalidIndicators.length)
parent.insertBefore(msg, $wf2.invalidIndicators[$wf2.invalidIndicators.length-1].errorMsg);
else
parent.insertBefore(msg, null);
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
if(!target.className.match(/\bwf2_invalid\b/))
target.className += " wf2_invalid";
if($wf2.indicatorIntervalId == null){
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
var target = invalidIndicator.target;
target.className = target.className.replace(/\s?wf2_invalid/, "");
$wf2.invalidIndicators.shift();
}
},
cloneNode_customAttrs : {
'type':1,'template':1,'repeat':1,'repeat-template':1,'repeat-min':1,
'repeat-max':1,'repeat-start':1,'value':1,'class':1,'required':1,
'pattern':1,'form':1,'autocomplete':1,'autofocus':1,'inputmode':1,
'max':1,'min':1,'step':1,
onmoved:1,onadded:1,onremoved:1,
onadd:1,onremove:1,onmove:1
},
cloneNode_skippedAttrs : {
'name':1,
'class':1,
'for':1,
'style':1,
'checked':1,
addRepetitionBlock:1,addRepetitionBlockByIndex:1,moveRepetitionBlock:1,
removeRepetitionBlock:1, repetitionBlocks:1,
setCustomValidity:1,checkValidity:1,validity:1,validationMessage:1,willValidate:1,
wf2StepDatum:1,wf2Value:1,wf2Initialized:1,wf2ValueLength:1
},
cloneNode_rtEventHandlerAttrs : {
onmoved:1,onadded:1,onremoved:1,
onadd:1,onremove:1,onmove:1
},
cloneNode : function (node, processAttr, rtNestedDepth){
if(!rtNestedDepth)
rtNestedDepth = 0;
var clone, i, attr;
switch(node.nodeType){
case 1:
var isTemplate = node.getAttribute('repeat') == 'template';
if(isTemplate)
rtNestedDepth++;
var attrs = [];
if(node.name)
attrs.name = processAttr ? processAttr(node.name) : node.name;
if(node.type == 'radio')
attrs.type = node.type;
if(node.checked)
attrs.checked = 'checked';
clone = $wf2.createElement(node.nodeName, attrs);
for(i = 0; attr = node.attributes[i]; i++){
if((attr.specified || $wf2.cloneNode_customAttrs[attr.name])
&& !$wf2.cloneNode_skippedAttrs[attr.name] && (
(!isTemplate || (rtNestedDepth > 1 || !$wf2.cloneNode_rtEventHandlerAttrs[attr.name]))
))
{
if(rtNestedDepth < 2 && (attr.name.indexOf('on') === 0) && (typeof node[attr.name] == 'function')){
var funcBody = processAttr(node[attr.name].toString().match(/{((?:.|\n)+)}/)[1]);
funcBody = processAttr(funcBody);
clone[attr.name] = new Function('event', funcBody);
}
else {
var attrValue = node.getAttribute(attr.name);
attrValue = (processAttr ? processAttr(attrValue) : attrValue);
clone.setAttribute(attr.name, attrValue);
}
}
}
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
if(!/\bdisabled\b/.test(node.className))
clone.disabled = false;
if(node.style && node.style.cssText){
clone.style.cssText = (processAttr ? processAttr(node.style.cssText) : node.style.cssText);
}
if(node.nodeName && node.nodeName.toLowerCase() == 'label' && node.htmlFor)
clone.htmlFor = (processAttr ? processAttr(node.htmlFor) : node.htmlFor);
if(clone.nodeName.toLowerCase() == 'option'){
clone.selected = node.selected;
clone.defaultSelected = node.defaultSelected;
}
for(i = 0; i < node.childNodes.length; i++){
clone.appendChild($wf2.cloneNode(node.childNodes[i], processAttr, rtNestedDepth));
}
break;
case 3:
case 4:
clone = document.createTextNode(node.data);
break;
case 8:
clone = document.createComment(node.data);
break;
default:
clone = node.cloneNode(true)
}
return clone;
},
getFormElements : function(){
var elements = [];
var allElements = $wf2.getElementsByTagNames.apply(this, ['input','output','select','textarea','button']);
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
$wf2.xhr.send(null);
doc = $wf2.xhr.responseXML;
}
}
catch(e){
return null;
}
return doc;
},
getElementsByTagNames : function(){
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
var thisAttrValue = el.getAttribute(attrName);
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
getElementStyle : function(el, property) {
if(el.currentStyle)
return el.currentStyle[property];
else if(window.getComputedStyle)
return getComputedStyle(el, '').getPropertyValue(property);
else if(el.style)
return el.style[property];
else return '';
},
createElement : (function(){
try {
var el = document.createElement('<div name="foo">');
if(el.tagName.toLowerCase() != 'div' || el.name != 'foo')
throw 'create element error';
return function(tag, attrs){
var html = '<' + tag;
for(var name in attrs)
html += ' ' + name + '="' + attrs[name] + '"';
html += '>';
if(tag.toLowerCase() != 'input')
html += '</'+tag+'>';
return document.createElement(html);
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
createLI : function(text){
var li = document.createElement('li');
li.appendChild(document.createTextNode(text));
return li;
},
ISO8601RegExp : /^(?:(\d\d\d\d)-(W(0[1-9]|[1-4]\d|5[0-2])|(0\d|1[0-2])(-(0\d|[1-2]\d|3[0-1])(T(0\d|1\d|2[0-4]):([0-5]\d)(:([0-5]\d)(\.(\d+))?)?(Z)?)?)?)|(0\d|1\d|2[0-4]):([0-5]\d)(:([0-5]\d)(\.(\d+))?)?)$/,
parseISO8601 : function (str, type) {
var d = $wf2.validateDateTimeType(str, type);
if(!d)
return null;
var date = new Date(0);
var _timePos = 8;
if(d[15]){
if(type && type != 'time')
return null;
_timePos = 15;
}
else {
date.setUTCFullYear(d[1]);
if(d[3]){
if(type && type != 'week')
return null;
date.setUTCDate(date.getUTCDate() + ((8 - date.getUTCDay()) % 7) + (d[3]-1)*7);
return date;
}
else {
date.setUTCMonth(d[4] - 1);
if(d[6])
date.setUTCDate(d[6]);
}
}
if(d[_timePos+0]) date.setUTCHours(d[_timePos+0]);
if(d[_timePos+1]) date.setUTCMinutes(d[_timePos+1]);
if(d[_timePos+2]) date.setUTCSeconds(d[_timePos+3]);
if(d[_timePos+4]) date.setUTCMilliseconds(Math.round(Number(d[_timePos+4]) * 1000));
if(d[4] && d[_timePos+0] && !d[_timePos+6])
date.setUTCMinutes(date.getUTCMinutes()+date.getTimezoneOffset());
return date;
},
validateDateTimeType : function(value, type){
var isValid = false;
var d = $wf2.ISO8601RegExp.exec(value);
if(!d || !type)
return d;
type = type.toLowerCase();
if(type == 'week')
isValid = (d[2].toString().indexOf('W') === 0);
else if(type == 'time')
isValid = !!d[15];
else if(type == 'month')
isValid = !d[5];
else {
if(d[6]){
var date = new Date(d[1], d[4]-1, d[6]);
if(date.getMonth() != d[4]-1)
isValid = false;
else switch(type){
case 'date':
isValid = (d[4] && !d[7]);
break;
case 'datetime':
isValid = !!d[14];
break;
case 'datetime-local':
isValid = (d[7] && !d[14]);
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
DOMException : function(code){
var message = 'DOMException: ';
switch(code){
case 1: message += 'INDEX_SIZE_ERR'; break;
case 9: message += 'NOT_SUPPORTED_ERR'; break;
case 11: message += 'INVALID_STATE_ERR'; break;
case 12: message += 'SYNTAX_ERR'; break;
case 13: message += 'INVALID_MODIFICATION_ERR'; break;
}
var err = new Error(message);
err.code = code;
err.name = 'DOMException';
err.INDEX_SIZE_ERR = 1;
err.NOT_SUPPORTED_ERR = 9;
err.INVALID_STATE_ERR = 11;
err.SYNTAX_ERR = 12;
err.INVALID_MODIFICATION_ERR = 13;
return err;
}
};
var RepetitionElement = {
REPETITION_NONE:0,
REPETITION_TEMPLATE:1,
REPETITION_BLOCK:2
};
var RepetitionEvent = {
_upgradeEvent : function(){
this.initRepetitionEvent = RepetitionEvent.initRepetitionEvent;
this.initRepetitionEventNS = RepetitionEvent.initRepetitionEventNS;
},
initRepetitionEvent : function(typeArg, canBubbleArg, cancelableArg, elementArg){
if(this.initEvent)
this.initEvent(typeArg, canBubbleArg, cancelableArg);
else {
this.type = typeArg;
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
this.relatedNode = elementArg;
},
initRepetitionEventNS : function(namespaceURIArg, typeArg, canBubbleArg, cancelableArg, elementArg){
throw Error("NOT IMPLEMENTED: RepetitionEvent.initRepetitionEventNS");
}
};
if(window.Element && Element.prototype){
Element.prototype.REPETITION_NONE = RepetitionElement.REPETITION_NONE;
Element.prototype.REPETITION_TEMPLATE = RepetitionElement.REPETITION_TEMPLATE;
Element.prototype.REPETITION_BLOCK = RepetitionElement.REPETITION_BLOCK;
Element.prototype.repetitionType = RepetitionElement.REPETITION_NONE;
Element.prototype.repetitionIndex = 0;
Element.prototype.repetitionTemplate = null;
Element.prototype.repetitionBlocks = null;
Element.prototype.repeatStart = 1;
Element.prototype.repeatMin = 0;
Element.prototype.repeatMax = Number.MAX_VALUE;
Element.prototype.addRepetitionBlock = $wf2.addRepetitionBlock;
Element.prototype.addRepetitionBlockByIndex = $wf2.addRepetitionBlockByIndex;
Element.prototype.moveRepetitionBlock = $wf2.moveRepetitionBlock;
Element.prototype.removeRepetitionBlock = $wf2.removeRepetitionBlock;
}
if(document.addEventListener){
document.addEventListener('DOMNodeInsertedIntoDocument', function(evt){
if(evt.target.nodeType == 1 && evt.target.hasAttribute('autofocus')){
$wf2.initAutofocusElement(evt.target);
}
}, false);
document.addEventListener('DOMAttrModified', function(evt){
if(evt.attrName == 'autofocus'){
if(evt.attrChange == evt.ADDITION)
$wf2.initAutofocusElement(evt.target);
else if(evt.attrChange == evt.REMOVAL)
evt.target.autofocus = false;
}
}, false);
}
(function(){
var match;
var scripts = document.documentElement.getElementsByTagName('script');
for(var i = 0; i < scripts.length; i++){
if(match = scripts[i].src.match(/^(.*)webforms2[^\/]+$/))
$wf2.libpath = match[1];
}
if(document.body){
$wf2.onDOMContentLoaded();
return;
}
var eventSet = 0;
if(document.addEventListener){
document.addEventListener('DOMContentLoaded', function(){
$wf2.onDOMContentLoaded();
}, false);
window.addEventListener('load', function(){
$wf2.onDOMContentLoaded();
}, false);
eventSet = 1;
}
if (/WebKit/i.test(navigator.userAgent)) {
var _timer = setInterval(function() {
if (/loaded|complete/.test(document.readyState)) {
clearInterval(_timer);
delete _timer;
$wf2.onDOMContentLoaded();
}
}, 10);
eventSet = 1;
}
else if(/MSIE/i.test(navigator.userAgent) && !document.addEventListener && window.attachEvent){
window.attachEvent('onload', function(){
$wf2.onDOMContentLoaded();
});
document.write("<script defer src='" + $wf2.libpath + "webforms2-msie.js'><"+"/script>");
document.write("<scr" + "ipt id='__wf2_ie_onload' defer src='//:'><\/script>");
var script = document.getElementById('__wf2_ie_onload');
script.onreadystatechange = function(){
if(this.readyState == 'complete'){
this.parentNode.removeChild(this);
$wf2.onDOMContentLoaded();
if($wf2.repetitionTemplates.length == 0)
$wf2.isInitialized = false;
}
};
script = null;
eventSet = 1;
}
if(!eventSet){
if(window.onload){
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
}
else if(document.addEventListener && ($wf2.oldRepetitionEventModelEnabled === undefined || $wf2.oldRepetitionEventModelEnabled)){
$wf2.oldRepetitionEventModelEnabled = true;
(function(){
var deprecatedAttrs = {
added : 'onadd',
removed : 'onremove',
moved : 'onmove'
};
function handleRepetitionEvent(evt){
if(!$wf2.oldRepetitionEventModelEnabled)
return;
if(!evt.element && evt.relatedNode)
evt.element = evt.relatedNode;
if(!evt.element || !evt.element.repetitionTemplate)
return;
var rt = evt.element.repetitionTemplate;
var attrName = 'on' + evt.type;
var handlerAttr = rt.getAttribute(attrName) || rt.getAttribute(deprecatedAttrs[evt.type]);
if(handlerAttr && (!rt[attrName] || typeof rt[attrName] != 'function'))
rt[attrName] = new Function('event', handlerAttr);
if(evt.element.repetitionTemplate[attrName])
evt.element.repetitionTemplate[attrName](evt);
else if(evt.element.repetitionTemplate[deprecatedAttrs[evt.type]])
evt.element.repetitionTemplate[deprecatedAttrs[evt.type]](evt);
}
document.addEventListener('added', handleRepetitionEvent, false);
document.addEventListener('removed', handleRepetitionEvent, false);
document.addEventListener('moved', handleRepetitionEvent, false);
})();
}
}
