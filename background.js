//http://community.pivotaltracker.com/pivotal			has fb g and live signin.

var token_url = "https://www.facebook.com/dialog/oauth/?client_id=265286580246983&redirect_uri=http://chromium.cs.virginia.edu/test.php&scope=email&response_type=token";
var code_url = "https://www.facebook.com/dialog/oauth/?client_id=265286580246983&redirect_uri=http://chromium.cs.virginia.edu/test.php&scope=email&response_type=code";
var code_for_token_url = "https://graph.facebook.com/oauth/access_token?client_id=265286580246983&redirect_uri=http://chromium.cs.virginia.edu/test.php&client_secret=30d36a8bea17b5307cf8dd167e32c0a2&code="
var signed_request_url = "";
var old_token = "";
var old_code = "";
var old_signed_request = "";
var siteToTest = "";
var domainToTest = "";
var capturingURLs = [];						//urls to look for in the sea of requests.
var capturingPhase = 0;
var bufferedRequests = {};					//used to store freshly captured requests
var bufferedRequestBodies = {};
var bufferedResponses = {};
var storageRecord = {};						//used by processing functions to dump buffered requests to 'more persistent and managed records'.
var loginButtonClicked = false;				//used to indicate whether login button has been clicked.
var SSOAutomationStarted = false;			//used to indicate whether SSOAutomation has started.

var check_and_redo_credentials = function () {
	var subtabID = "";
	chrome.tabs.create(
		{url: token_url}, function(tab){subtabID = tab.id;}
	);
	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
		if (tabId == subtabID)
		{
			if (typeof changeInfo.url == "string" && changeInfo.url.startsWith("http://chromium.cs.virginia.edu/test.php"))
			{
				var temp = changeInfo.url;
				old_token = temp.substr(temp.indexOf("=")+1, temp.indexOf("&") - temp.indexOf("=") - 1);
				log(temp);
				log(old_token);
				chrome.tabs.remove(subtabID);
			}
		}
	});
}

function clickLoginButton(){
	chrome.tabs.getSelected(null, function(tab) {
		chrome.tabs.sendMessage(tab.id, {action: "clickLoginButton"}, function(response) {
			//log(response);
			loginButtonClicked = true;				//only clicking the button once doesn't mean the popup has been created. 
		});
	});
}

function automateSSO(){
	chrome.tabs.getSelected(null, function(tab) {
		chrome.tabs.sendMessage(tab.id, {action: "automateSSO"}, function(response) {
			log(response);
		});
	});
}

function testSuiteStart(){
	//user clicked on start test suite button, we get his/her input and navigate to that site.
	chrome.tabs.getSelected(null, function(tab) {
		chrome.tabs.sendMessage(tab.id, {action: "testSuiteStart"}, function(response) {
			siteToTest = response.siteToTest;
			capturingURLs.push(siteToTest);
			
			var temp = siteToTest.substr(siteToTest.indexOf(':')+3,siteToTest.length) + '/';
			temp = temp.substr(0,temp.indexOf('/'));
			while ((temp.match(/\./g)||[]).length>1)
			{
				temp = temp.substr(temp.indexOf('.')+1, temp.length);
			}
			domainToTest = temp;
			chrome.tabs.getSelected(null, function(tab) {
				chrome.tabs.sendMessage(tab.id, {"site": siteToTest, "action": "siteToTestReceived"});
			});
		});
	});
}

function testSuitePhase0(url){
	//Getting initial anonymous session headers data.
	//capturingPhase == 0 will trigger this.
	log('entering phase 0');
	var tempRecord = new trafficRecord();
	tempRecord.url = siteToTest;
	tempRecord.anonymousSessionRequestHeader = bufferedRequests[url];
	tempRecord.anonymousSessionRequestBody = bufferedRequestBodies[url];
	tempRecord.anonymousSessionResponseHeader = bufferedResponses[url];
	storageRecord[siteToTest] = tempRecord;
	//storage.set({storageRecord: storageRecord});
	capturingPhase+=1;
}

function testSuitePhase1(url){
	//Clicked on the facebook login button and https://www.facebook.com/dialog/oauth/ is visited.
	//capturingPhase == 1 will trigger this.
	log('entering phase 1');
	storageRecord[siteToTest].facebookDialogOAuthRequestHeader = bufferedRequests[url];
	//storage.set({storageRecord: storageRecord});
	capturingPhase+=1;
}

function deleteCookies(){
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

function processBuffer(url)
{
	if (capturingPhase == 0 && checkAgainstFilter(url, capturingPhase))
	{
		testSuitePhase0(url);
		return;
	}
	if (capturingPhase == 1 && checkAgainstFilter(url, capturingPhase) && loginButtonClicked)
	{
		testSuitePhase1(url);
		return;
	}
}

chrome.webRequest.onBeforeSendHeaders.addListener(
	function(info) {
		// filters should be applied here because addlistener is inflexible.
		if (!checkAgainstFilter(info.url, capturingPhase)) return;
		log(info);
		bufferedRequests[info.url] = info;
	},
	{
		urls: ["<all_urls>"]
	},
	["blocking","requestHeaders"]
);

chrome.webRequest.onBeforeRequest.addListener(
	function(info) {
		if (!checkAgainstFilter(info.url, capturingPhase) || info.requestBody == undefined) return;
		log(info.requestBody);
		bufferedRequestBodies[info.url] = info;
	},
	{
		urls: ["<all_urls>"]
	},
	["blocking","requestBody"]
);

chrome.webRequest.onHeadersReceived.addListener(
	function(info) {
		if (!checkAgainstFilter(info.url, capturingPhase)) return;
		log(info);
		bufferedResponses[info.url] = info;
		processBuffer(info.url);
	},
	{
		urls: ["<all_urls>"]
	},
	["blocking","responseHeaders"]
);

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		processBuffer(request.loadedURL);
	}
);

function initExtension(){
	loginButtonClicked = false;
	deleteCookies();
	storage.clear();
	log("AVC v0.2 background.js loaded.");
}

initExtension();