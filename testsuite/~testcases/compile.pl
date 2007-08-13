

use Win32::File qw/GetAttributes SetAttributes ARCHIVE NORMAL/;


while(1){
	@files = grep /^\d/, sort <*.html>;
	$doupdate = 0;
	foreach(@files){
		GetAttributes($_, $attrib);
		if($attrib & ARCHIVE){
			$doupdate++;
		}
	}
	GetAttributes("index.template.html", $attrib);
	$doupdate++ if($attrib & ARCHIVE);
	GetAttributes("testcase.template.html", $attrib);
	$doupdate++ if($attrib & ARCHIVE);
		
	
	if(!$doupdate){
		sleep 1;
		next;
	}
	
	
	open S, "testcase.template.html";
	$testcaseTemplate = join "", <S>;
	close S;
	$counter = 1;
	
	open S, "../../webforms2.js";
	$s = join '', <S>;
	$s =~ /Version:\s+(.+?)\s+\((.+?)\)/;
	$implementationVersion = $1;
	$implementationDate = $2;
	close S;

	%testcases = ();

	for($i = 0; $i < @files; $i++){
		#next if not $files[$i] =~ /011/; #REMOVE
		
		print "$files[$i]\n";
		$testcaseNumber = sprintf("%03d", $counter);
		
		$testcasePage = $testcaseTemplate;
		
		open FILE, $files[$i];
		$_ = join '', <FILE>;
		close FILE;
		
		m{<title.*?>(.+?)</title>}s;
		$testcaseTitle = $1;
		$testcasePage =~ s{__testcaseTitle__}{$testcaseTitle}g;
		
		
		m{<div id="testcaseDesc">(.+?)</div>}s;
		$testcaseDesc = $1;
		$testcaseDesc =~ s{\s+}{ }g;
		$testcasePage =~ s{__testcaseDesc__}{$testcaseDesc};
		
		#__testcaseShortDesc__
		m{<meta name="description" content="(.*?)" />}s;
		$testcaseShortDesc = $1;
		$testcasePage =~ s{__testcaseShortDesc__}{$testcaseShortDesc}g;
		
		$testcases{$testcaseNumber} = {
			title => $testcaseTitle,
			shortDesc => $testcaseShortDesc
		};
		
		m{<!-- BEGIN TEST CASE -->(.+?)<!-- END TEST CASE -->}s;
		$testcaseCode = $1;
		$testcasePage =~ s{__testcaseCode__}{$testcaseCode};
		
		m{<!-- BEGIN HEAD -->(.+?)<!-- END HEAD -->}s;
		$testcaseHeadCode = $1;
		$testcasePage =~ s{__testcaseHeadCode__}{$testcaseHeadCode};
		
		$testcasePage =~ s{__testcaseNumber__}{$counter}eg;
		
		$testcasePage =~ s{__implementationVersion__}{$implementationVersion}g;
		$testcasePage =~ s{__implementationDate__}{$implementationDate}g;
		
		if($i == 0){
			$testcasePage =~ s{<!-- prev -->(.+?)<!-- /prev -->}{}g;
		}
		$testcasePage =~ s{__previousNumber__}{sprintf("%03d", $counter-1)}ge;
		$testcasePage =~ s{__previousTitle__}{getPageTitle(sprintf("%03d.html", $counter-1))}ge;
		if($i == @files-1){
			$testcasePage =~ s{<!-- next -->(.+?)<!-- /next -->}{}g;
		}
		$testcasePage =~ s{__nextNumber__}{sprintf("%03d", $counter+1)}ge;
		$testcasePage =~ s{__nextTitle__}{getPageTitle(sprintf("%03d.html", $counter+1))}ge;
		
		open OUT, ">../$testcaseNumber.html";
		print OUT $testcasePage;
		close OUT;
		SetAttributes($files[$i], NORMAL);
		
		$counter++;
	}

	SetAttributes("index.template.html", NORMAL);
	SetAttributes("testcase.template.html", NORMAL);


	#TEST SUITE INDEX

	open S, "index.template.html";
	$indexTemplate = join "", <S>;
	close S;

	$list = "";
	foreach(sort keys %testcases){
		$list .= "<li><a href='$_.html'>" . $testcases{$_}{title} . "</a>";
		
		$list .= ": " . $testcases{$_}{shortDesc} if $testcases{$_}{shortDesc};
		
		$list .= "</li>\n";
	}

	$indexTemplate =~ s{__testcaseList__}{$list};
	$indexTemplate =~ s{__implementationVersion__}{$implementationVersion}g;
	$indexTemplate =~ s{__implementationDate__}{$implementationDate}g;

	open OUT, ">../index.html";
	print OUT $indexTemplate;
	close OUT;
	
	#exit; #REMOVE
}


sub getPageTitle {
	open FILE, shift;
	$_ = join('', <FILE>);
	m{<title.*?>(.+?)</title>}s;
	return $1;
}
