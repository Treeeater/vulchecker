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
	if (capturingPhase == 0 || capturingPhase == 1 || capturingPhase == 4 || capturingPhase == 6 || capturingPhase == 7 || capturingPhase == 9){
		for (; i < capturingURLs.length; i++)
		{
			if (url == capturingURLs[i]) {
				return true;
			}
		}
		return false;
	}
	else if (capturingPhase == 2){
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

var deleteCookies = function(){
	//delete current domain cookie:
	/*
	chrome.tabs.getSelected(null, function(tab) {
		chrome.tabs.sendMessage(tab.id, {action: "askForDomain"}, function(response) {
			var scheme = response.url.substr(0,response.url.indexOf(':'));
			var curdomain = response.domain;
			var i;
			var domainsToDelete = [];
			while ((curdomain.match(/\./g)||[]).length>=1)
			{
				domainsToDelete.push(curdomain);
				curdomain = curdomain.substr(curdomain.indexOf('.')+1, curdomain.length);
			}
			for (i = 0; i < domainsToDelete.length; i++)
			{
				//Here both getAll and remove functions are async functions, we need to use anonymous function to create closures to bind the 'i' and 'j' to function execution.
				(function(i){
					chrome.cookies.getAll({domain: domainsToDelete[i]}, function(cookies) {
						for (var j=0; j<cookies.length; j++) {
							log(scheme + "://" + domainsToDelete[i] + cookies[j].path);
							(function(j){chrome.cookies.remove({url : scheme + "://" + domainsToDelete[i] + cookies[j].path, name: cookies[j].name})})(j);
						}
					})
				})(i);
			}
		});
	});
	
	//delete fb cookie:
	chrome.cookies.getAll({domain: "www.facebook.com"}, function(cookies) {
		for (var i=0; i<cookies.length;i++) {
			chrome.cookies.remove({url: "https://www.facebook.com" + cookies[i].path, name: cookies[i].name});
		}
	});
	chrome.cookies.getAll({domain: "facebook.com"}, function(cookies) {
		for (var i=0; i<cookies.length;i++) {
			chrome.cookies.remove({url: "https://facebook.com" + cookies[i].path, name: cookies[i].name});
		}
	});*/
	chrome.browsingData.removeCookies({});			//for deleting all user cookies on all sites from all times.
}

var storage = chrome.storage.local;

var trafficRecord = function(){
	this.url = "";
	this.anonymousSessionRequestHeader = {};
	this.anonymousSessionRequestBody = {};
	this.anonymousSessionResponseHeader = {};
	this.anonymousSessionRequestHeader2 = {};
	this.anonymousSessionRequestBody2 = {};
	this.anonymousSessionResponseHeader2 = {};
	this.facebookDialogOAuthRequestHeader = {};
	this.authenticatedSessionRequestHeader = {};
	this.authenticatedSessionRequestBody = {};
	this.authenticatedSessionResponseHeader = {};
	this.authenticatedSessionRequestHeader2 = {};
	this.authenticatedSessionRequestBody2 = {};
	this.authenticatedSessionResponseHeader2 = {};
	return this;
}
/*
storage.set({'test': 'yuchen'}, function() {
    // Notify that we saved.
    log('Settings saved');
	storage.get('test', function(items){alert(items.test);});
});*/