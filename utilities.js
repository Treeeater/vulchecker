var debug = true;
var IdPDomains = ["https://www.facebook.com/dialog/oauth"];
var excludedPattern = ['display=none'];

var log = function(str)
{
	if (debug) console.log(str);
}

if (typeof String.prototype.startsWith != 'function') {
	String.prototype.startsWith = function (str){
		return this.indexOf(str) == 0;
	};
}

var checkAgainstFilter = function(url, capturingPhase)
{
	var i = 0;
	if (capturingPhase == 0){
		for (; i < capturingURLs.length; i++)
		{
			if (url == capturingURLs[i]) {
				return true;
			}
		}
		return false;
	}
	else if (capturingPhase == 1){
		//check idp domains and excluded patterns
		for (i = 0; i < excludedPattern.length; i++)
		{
			if (url.indexOf(excludedPattern[i])!=-1) {
				return false;
			}
		}
		for (i = 0; i < IdPDomains.length; i++)
		{
			if (url.startsWith(IdPDomains[i])) {
				return true;
			}
		}
		return false;
	}
	return false;
}

var storage = chrome.storage.local;

var trafficRecord = function(){
	this.url = "";
	this.anonymousSessionRequestHeader = {};
	this.anonymousSessionRequestBody = {};
	this.anonymousSessionResponseHeader = {};
	this.facebookDialogOAuthRequestHeader = {};
	return this;
}
/*
storage.set({'test': 'yuchen'}, function() {
    // Notify that we saved.
    log('Settings saved');
	storage.get('test', function(items){alert(items.test);});
});*/