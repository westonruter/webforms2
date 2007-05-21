

open IN, "webforms2.js";
$source = join "", <IN>;
close IN;

$source =~ s{\bwebforms2\.js\b}
            {webforms2-p.js}g;
#$source =~ s{(/\*\@cc_on \@\*/\n/\*\@if \(\@_win32\).+?/\*\@end \@\*/)}
#            {MSIE_ONDOMCONTENTLOADED();}s;
#(?=/\*\s+cssQuery)
$source =~ s{(if\(document\.implementation.+)} 
            {jsPack($1) . "\n\n"}es;


#$source =~ s{var RepetitionElement.+?(?=/\*\@cc_on \@\*/)}
#            {SOURCE1}es;
#$source =~ s{var RepetitionElement.+?(?=/\*\@cc_on \@\*/)}
#            {SOURCE1}es;
#$source =~ s{(?<=/\*\@cc_on \@\*/\n/\*\@if \(\@_win32\))(.+?)(?=/\*\@end \@\*/)}
#            {SOURCE2}es;

open OUT, ">webforms2-p.js";
print OUT $source;
close OUT;


sub jsPack {
	open TEMP, ">~topack.js";
	print TEMP shift;
	close TEMP;
	
	chdir('./packer.perl/');
	my $packed = `perl jsPacker.pl -q -f -i ../~topack.js`; #-e62
	chdir('..');
	
	unlink "~topack.js";
	return $packed;
}