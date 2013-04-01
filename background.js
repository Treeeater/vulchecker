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
var testTab;								//reference to the tab that's being used to test.

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
	capturingPhase = 0;
	deleteCookies();
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
				chrome.tabs.sendMessage(tab.id, {"site": siteToTest, "action": "navigateTo"});
			});
		});
	});
}

function testSuitePhase0(url){
	//Getting initial anonymous session headers data.
	//capturingPhase == 0 will trigger this.
	log('Phase 0 - recorded anonymous header data');
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
	log('Phase 1 - captured fb oauth request header and url');
	storageRecord[siteToTest].facebookDialogOAuthRequestHeader = bufferedRequests[url];
	//storage.set({storageRecord: storageRecord});
	capturingPhase+=1;
}

function testSuitePhase3(url){
	//Getting authenticated session headers data.
	//capturingPhase == 3 will trigger this.
	log('Phase 3 - recorded authenticated header data');
	storageRecord[siteToTest].authenticatedSessionRequestHeader = bufferedRequests[url];
	storageRecord[siteToTest].authenticatedSessionRequestBody = bufferedRequestBodies[url];
	storageRecord[siteToTest].authenticatedSessionResponseHeader = bufferedResponses[url];
	//storage.set({storageRecord: storageRecord});
	capturingPhase+=1;
	setTimeout(revisitSiteAnonymously, 3000);
}

function testSuitePhase5(url){
	//Getting authenticated session headers data.
	//capturingPhase == 5 will trigger this.
	log('Phase 5 - recorded anonymous header data for a second time');
	storageRecord[siteToTest].anonymousSessionRequestHeader2 = bufferedRequests[url];
	storageRecord[siteToTest].anonymousSessionRequestBody2 = bufferedRequestBodies[url];
	storageRecord[siteToTest].anonymousSessionResponseHeader2 = bufferedResponses[url];
	//storage.set({storageRecord: storageRecord});
	capturingPhase+=1;
}

function revisitSiteAnonymously(){	
	//capturingPhase == 4 will trigger this.
	log('Phase 4 - deleting cookies and revisit the test site for a second time');
	deleteCookies();
	capturingPhase+=1;
	chrome.tabs.sendMessage(testTab.id, {"action":"navigateTo", "site":siteToTest});
}

function delayRefreshTestTab()
{
	//This function is only invoked when the site uses javascript (as opposed to reloading) to manipulate after user logs in.
	if (capturingPhase == 3) {
		chrome.tabs.sendMessage(testTab.id, {"action": "navigateTo", "site":siteToTest});
	}
}

function processBuffer(url)
{
	if (capturingPhase == 0 && checkAgainstFilter(url, capturingPhase))
	{
		//visit the page initially
		testSuitePhase0(url);
		deleteCookies();
		return;
	}
	if (capturingPhase == 1 && checkAgainstFilter(url, capturingPhase) && loginButtonClicked)
	{
		testSuitePhase1(url);
		return;
	}
	if (capturingPhase == 3 && checkAgainstFilter(url, capturingPhase))
	{
		//visit the page with authenticated cookies
		testSuitePhase3(url);
		return;
	}
	if (capturingPhase == 5 && checkAgainstFilter(url, capturingPhase))
	{
		//revisit the page without cookies
		testSuitePhase5(url);
		return;
	}
}

function processUnLoad(url)
{
	if ((url.startsWith("https://www.facebook.com/dialog/permissions.request") || url.startsWith("https://www.facebook.com/login.php")) && capturingPhase == 2)
	//this condition is not always correct. If the user has granted the app permission, the SSO process ends at login.php unload, but if it's the first time the user uses this app, SSO process ends at permissions.request unload.
	//In the real testing scenario, it should end at permissions.request, becomes presumably the test account has not granted access to the app.
	{
		//user has went through SSO, should reload test page and record headers.
		//Lots of sites automatically reload the homepage after SSO is done.
		//Only when capturingPhase == 2 can trigger this.
		log('Phase 2 - FB OAuth SSO process ended');
		capturingPhase++;			//tell processBuffer that it's time to record authenticated session credentials.
		setTimeout(delayRefreshTestTab,5000);			//after 5 seconds, refresh the homepage.
	}
}

chrome.webRequest.onBeforeSendHeaders.addListener(
	function(info) {
		// filters should be applied here because addlistener is inflexible.
		if (!checkAgainstFilter(info.url, capturingPhase)) return;
		//log(info);
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
		//if (info.requestBody == undefined) return;
		//log(info.requestBody);
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
		//log(info);
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
		if (testTab == undefined) {
			testTab = sender.tab;
		}
		if (request.loadedURL != undefined) {
			processBuffer(request.loadedURL);
		}
		if (request.unloadedURL != undefined) {
			//log("Unloaded "+request.unloadedURL);
			processUnLoad(request.unloadedURL);
		}
	}
);

function initExtension(){
	loginButtonClicked = false;
	deleteCookies();
	storage.clear();
	log("AVC v0.2 background.js loaded.");
}

initExtension();