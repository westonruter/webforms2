

@commonVarNames = qw(
xhr
processAttr
parent
attrName
attr
distance
evt
btnType
attrValue
addEvt
moveEvt
isValid
refNode
removeEvt
attrs
sibling
minAttrNode
maxAttrNode
rtNestedDepth
repetitionTemplates
eventSet
isTimeRelated
IDAttrValue
formElements
handleRepetitionEvent
funcBody
deprecatedAttrs
indexAttr
attrVal
reTemplateName
results
invalidIndicator
doCheckPrecision
typeArg
IDAttrName
xmlDoc
elementArg

code
funcMatches
hasChecked
canBubbleArg
valueAttrNode
repeatTemplateAttr
doMaxLengthCheck
isRequired

handlerAttr
isDateRelated
matches
onremovedAttr
isNumberRelated
currentBlockCount
count
isRadioOrCheckbox
isNotEqual
isFileInput
isTemplate
elNames
allElements
oninvalidAttr
attrExpr
hasIndex
addBtns
thisAttrValue
cancelableArg
btns
doCheckRange
doRequiredCheck
zeroPoint
invalidIndicators
indicatorTimeoutId
indicatorIntervalId
addInvalidIndicator
createLI
clearInvalidIndicators
cloneNode_customAttrs
cloneNode_skippedAttrs
cloneNode_rtEventHandlerAttrs
getRepetitionBlock
getHtmlTemplate
getFormElements
getElementsByTagNames
getElementsByTagNamesAndAttribute
arrayHasItem
getElementStyle
createMiscFunctions
ISO8601RegExp
parseISO8601
validateDateTimeType
zeroPad
dateToISO8601
namespaceURIArg
initAutofocusElement
isInitialized
applyValidityInterface
controlCheckValidity
controlSetCustomValidity
formCheckValidity
createValidityState
loadDataURI
numberRegExp
onsubmitValidityHandler
repetitionBlock_constructor
repetitionButton_click
repetitionButton_constructor
repetitionTemplate_constructor
sortNodes
updateValidityState
urlRegExp
valueToWF2Type
emailRegExp
hasInvalidState
libpath
DOMException
isInitialized
updateAddButtons
updateMoveButtons
property
visitedParents
rePattern
patternAttr
hasInvalidIndicator
);

push @commonVarNames, '(?<=2\.|\s\s)cloneNode'; #\$wf2\.|\s
push @commonVarNames, '(?<=2\.|\s\s)createElement';
push @commonVarNames, '(?<=2\.|\s\s)addRepetitionBlock(?!:1)';
push @commonVarNames, '(?<=2\.|\s\s)addRepetitionBlockByIndex(?!:1)';
push @commonVarNames, '(?<=2\.|\s\s)removeRepetitionBlock(?!:1)';
push @commonVarNames, '(?<=2\.|\s\s)moveRepetitionBlock(?!:1)';

%replacements = (
	'RepetitionElement.REPETITION_NONE' => 0,
	'RepetitionElement.REPETITION_TEMPLATE' => 1,
	'RepetitionElement.REPETITION_BLOCK' => 2,
	'XPathResult.ORDERED_NODE_SNAPSHOT_TYPE' => 7
);

open IN, "webforms2_src.js";
$source = join "", <IN>;
close IN;

$source =~ m{^(.+?)(\s+if\(!window\.\$wf2\).+$)}s;
$header = $1;
$code = $2;


#strip all comments
open NOCOM, ">webforms2-nocomments.js";
$nocoms = $code;
$nocoms =~ s{\s*(?<![\.:])//(?!:).*(?=\n)}{}g; #remove all single-line comments
$nocoms =~ s{/\*.+?\*/}{}gs; #remove all multi-line comments
$nocoms =~ s{[ \t]+(?=\n)}{}g; #remove line terminating whitespace
$nocoms =~ s{\n(?=\n)}{}g; #remove all empty lines
$thisHeader = $header;
$thisHeader =~ s{\bwebforms.+?js\b}{webforms2-nocomments.js};
print NOCOM $thisHeader . "\n" . $nocoms;
close NOCOM;


#shorten long variable names
open SHORT, ">webforms2-shortnames-nocomments.js";
$short = $nocoms;
$count = 0;
foreach(@commonVarNames){
	$re = /\W/ ? $_ : '(?<!\')\b' . $_;
	print "$re\n";
	$short =~ s{$re\b}{sprintf('$%x', $count)}eg; #(?<!')\b$_\b
	$count++;
}
foreach(keys %replacements){
	$short =~ s{\b$_\b}{$replacements{$_}}eg;
}
$thisHeader = $header;
$thisHeader =~ s{\bwebforms.+?js\b}{webforms2-shortnames-nocomments.js};
print SHORT $thisHeader . "\n" . $short;
close SHORT;

#exit;

#use Dean Edward's packer to condense the code
open PACKED, ">webforms2-p.js";
$packed = jsPack($short);
$thisHeader = $header;
$thisHeader =~ s{\bwebforms.+?js\b}{webforms2-p.js};
print PACKED $thisHeader . "\n\n" . $packed;
close PACKED;
sub jsPack {
	open TEMP, ">~topack.js";
	print TEMP shift;
	close TEMP;
	
	chdir('./packer.perl/');
	my $packed = `perl jsPacker.pl -q -f -e62 -i ../~topack.js`; #-e62 -f 
	chdir('..');
	
	unlink "~topack.js";
	return $packed;
}



exit;

#$source =~ s{(/\*\@cc_on \@\*/\n/\*\@if \(\@_win32\).+?/\*\@end \@\*/)}
#            {MSIE_ONDOMCONTENTLOADED();}s;
#(?=/\*\s+cssQuery)


#$source =~ s{var RepetitionElement.+?(?=/\*\@cc_on \@\*/)}
#            {SOURCE1}es;
#$source =~ s{var RepetitionElement.+?(?=/\*\@cc_on \@\*/)}
#            {SOURCE1}es;
#$source =~ s{(?<=/\*\@cc_on \@\*/\n/\*\@if \(\@_win32\))(.+?)(?=/\*\@end \@\*/)}
#            {SOURCE2}es;
