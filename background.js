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
var capturingPhase = -1;
var bufferedRequests = {};					//used to store freshly captured requests
var bufferedRequestBodies = {};
var bufferedResponses = {};
var storageRecord = {};						//used by processing functions to dump buffered requests to 'more persistent and managed records'.
var loginButtonClicked = false;				//used to indicate whether login button has been clicked.
var SSOAutomationStarted = false;			//used to indicate whether SSOAutomation has started.
var testTab;								//reference to the tab that's being used to test.
var FBAccount = 1;
var loginButtonXPath = "";
var loginButtonOuterHTML = "";
var networkFailure = false;

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
			log(response);
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

function doneTesting(){
	capturingPhase = -1;
}

function testSuitePhase1(url){
	//Getting initial anonymous session headers data.
	//capturingPhase == 1 will trigger this.
	log('Phase 1 - recorded anonymous header data');
	var tempRecord = new trafficRecord();
	tempRecord.url = siteToTest;
	tempRecord.anonymousSessionRequestHeader = bufferedRequests[url];
	tempRecord.anonymousSessionRequestBody = bufferedRequestBodies[url];
	tempRecord.anonymousSessionResponseHeader = bufferedResponses[url];
	storageRecord[siteToTest] = tempRecord;
	capturingPhase++;
}

function testSuitePhase2(url){
	//Clicked on the facebook login button and https://www.facebook.com/dialog/oauth/ is visited.
	//capturingPhase == 2 will trigger this.
	log('Phase 2 - captured fb oauth request header and url');
	storageRecord[siteToTest].facebookDialogOAuthRequestHeader = bufferedRequests[url];
	capturingPhase++;
}

function processUnLoad(url)
{
	if (url.startsWith("https://www.facebook.com/dialog/permissions.request") && (capturingPhase == 3 || capturingPhase == 8))
	//This condition is not always correct. If the app does ask for extra permissions, this URL is visted twice before SSO is complete.
	{
		//user has went through SSO, should reload test page and record headers.
		//However, lots of sites automatically reload the homepage after SSO is done, so we add a delay and test only when the site does not reload itself.
		//capturingPhase == 3 will trigger this.
		log('Phase ' + capturingPhase.toString() + ' - FB OAuth SSO process detected for account A');
		capturingPhase++;			//tell processBuffer that it's time to record authenticated session credentials.
		setTimeout(delayRefreshTestTab,10000);			//after 10 seconds, refresh the homepage.
	}
	//This is just for testing purposes.
	//In the real testing scenario, it should end at permissions.request, becomes presumably the test account has not granted access to the app.
	if (url.startsWith("https://www.facebook.com/login.php") && (capturingPhase == 3 || capturingPhase == 8))
	{
		log('Phase ' + capturingPhase.toString() + ' - FB OAuth SSO process detected for account A');
		capturingPhase++;			//tell processBuffer that it's time to record authenticated session credentials.
		setTimeout(delayRefreshTestTab,10000);			//after 10 seconds, refresh the homepage.
	}
}

function testSuitePhase4(url){
	//Getting authenticated session headers data.
	//capturingPhase == 4 will trigger this.
	log('Phase 4 - recorded account A header data');
	storageRecord[siteToTest].authenticatedSessionRequestHeader = bufferedRequests[url];
	storageRecord[siteToTest].authenticatedSessionRequestBody = bufferedRequestBodies[url];
	storageRecord[siteToTest].authenticatedSessionResponseHeader = bufferedResponses[url];
	capturingPhase++;
	setTimeout(checkLoginButtonRemoved, 10000);
}

function delayRefreshTestTab()
{
	//This function is only invoked when the site uses javascript (as opposed to reloading) to manipulate after user logs in.
	//capturingPhase == 4 || 9 will trigger this.
	if (capturingPhase == 4 || capturingPhase == 9) {
		chrome.tabs.sendMessage(testTab.id, {"action": "navigateTo", "site":siteToTest});
	}
}

function checkLoginButtonRemoved(){
	chrome.tabs.sendMessage(testTab.id, {"action":"sendLoginButtonInformation"}, function(response){
		if (response.loginButtonXPath == loginButtonXPath && response.loginButtonOuterHTML == loginButtonOuterHTML) {
			log("login failed! After logging in the login button is still present!")
			return;
		}
		log("login successful!, log in button different from anonymous session.");
		revisitSiteAnonymously();
	});
}

function revisitSiteAnonymously(){	
	if (capturingPhase != 5) return;
	//capturingPhase == 5 will trigger this.
	log('Phase 5 - deleting cookies and revisit the test site for a second time');
	deleteCookies();
	capturingPhase++;
	chrome.tabs.sendMessage(testTab.id, {"action":"navigateTo", "site":siteToTest});
}

function testSuitePhase7(url){
	//capturingPhase == 7 will trigger this.
	log('Phase 7 - recorded anonymous header data for a second time');
	storageRecord[siteToTest].anonymousSessionRequestHeader2 = bufferedRequests[url];
	storageRecord[siteToTest].anonymousSessionRequestBody2 = bufferedRequestBodies[url];
	storageRecord[siteToTest].anonymousSessionResponseHeader2 = bufferedResponses[url];
	capturingPhase++;
}

function testSuitePhase9(url){
	//capturingPhase == 9 will trigger this.
	log('Phase 9 - recorded account B header data');
	storageRecord[siteToTest].authenticatedSessionRequestHeader2 = bufferedRequests[url];
	storageRecord[siteToTest].authenticatedSessionRequestBody2 = bufferedRequestBodies[url];
	storageRecord[siteToTest].authenticatedSessionResponseHeader2 = bufferedResponses[url];
	capturingPhase++;
	testSuitePhase10();
}

function testSuitePhase10(url){
	//capturingPhase == 10 will trigger this.
	//This phase tries to learn what is the key cookie to authenticate the user.
	log('Phase 10 - learning suspected cookies');
	var record = storageRecord[siteToTest];
	
	var authenticatedSessionRequestHeader = record.authenticatedSessionRequestHeader.requestHeaders;
	var authenticatedSessionCookies = [];
	
	var i = 0;
	for (i = 0; i < authenticatedSessionRequestHeader.length; i++)
	{
		if (authenticatedSessionRequestHeader[i].name == "Cookie") {
			authenticatedSessionCookies = authenticatedSessionRequestHeader[i].value;
			break;
		}
	}
	suspects = authenticatedSessionCookies.split('; ');			//suspected cookies - initial guess.
	
	//check if any of the two anonymous request has the same cookie.
	
	//anonymous session 1
	var anonymousSessionRequestHeader = record.anonymousSessionRequestHeader.requestHeaders;
	var anonymousSessionCookies = [];
	for (i = 0; i < anonymousSessionRequestHeader.length; i++)
	{
		if (anonymousSessionRequestHeader[i].name == "Cookie") {
			anonymousSessionCookies = anonymousSessionRequestHeader[i].value;
			break;
		}
	}
	anonymousSessionCookies = anonymousSessionCookies.split('; ');					//anonymous Session 1 cookies.
	
	for (i = suspects.length - 1; i >= 0 ; i--)
	{
		if (anonymousSessionCookies.indexOf(suspects[i]) != -1) {
			suspects.splice(i, 1);					//get it out of here.												
		}
	}
	
	//anonymouse session 2
	var anonymousSessionRequestHeader2 = record.anonymousSessionRequestHeader2.requestHeaders;
	var anonymousSessionCookies2 = [];
	for (i = 0; i < anonymousSessionRequestHeader2.length; i++)
	{
		if (anonymousSessionRequestHeader2[i].name == "Cookie") {
			anonymousSessionCookies2 = anonymousSessionRequestHeader2[i].value;
			break;
		}
	}
	anonymousSessionCookies2 = anonymousSessionCookies2.split('; ');					//anonymous Session 2 cookies.
	
	for (i = suspects.length - 1; i >= 0 ; i--)
	{
		if (anonymousSessionCookies2.indexOf(suspects[i]) != -1) {
			suspects.splice(i, 1);					//get it out of here.												
		}
	}
	
	//check if authenticated session B has the same cookie:
	
	var authenticatedSessionRequestHeader2 = record.authenticatedSessionRequestHeader2.requestHeaders;
	var authenticatedSessionCookies2 = [];
	for (i = 0; i < authenticatedSessionRequestHeader2.length; i++)
	{
		if (authenticatedSessionRequestHeader2[i].name == "Cookie") {
			authenticatedSessionCookies2 = authenticatedSessionRequestHeader2[i].value;
			break;
		}
	}
	authenticatedSessionCookies2 = authenticatedSessionCookies2.split('; ');			//authenticated Session B cookies.
	
	for (i = suspects.length - 1; i >= 0 ; i--)
	{
		if (authenticatedSessionCookies2.indexOf(suspects[i]) != -1) {
			suspects.splice(i, 1);					//get it out of here.												
		}
	}
	
	suspects = removeByHeuristics(suspects);			//remove popular first party cookie like GA and GAds.
	
	//storage.set({storageRecord: storageRecord});
	capturingPhase++;
}


function processBuffer(url)
{
	//Phase 0: onload event fired on first visit to test page, anonymous session 1.
	//Phase 1: headers received on second visit to test page, anonymous session 1.
	if (capturingPhase == 1 && checkAgainstFilter(url, capturingPhase))
	{
		//visit the page initially
		testSuitePhase1(url);
		FBAccount = 1;
		return;
	}
	//Phase 2: headers received on FB login SSO page.
	if (capturingPhase == 2 && checkAgainstFilter(url, capturingPhase) && loginButtonClicked)
	{
		testSuitePhase2(url);
		return;
	}
	//Phase 3: onunload event fired on FB login SSO page for account A.
	//Phase 4: headers received on first visit to test page, authenticated session A.
	if (capturingPhase == 4 && checkAgainstFilter(url, capturingPhase))
	{
		//visit the page with authenticated cookies
		testSuitePhase4(url);
		return;
	}
	//Phase 5: From 5 seconds after Phase 4. Delete all cookies and revisit the test page. Not triggered by an event.
	//Phase 6: onload event fired on first visit to test page, anonymous session 2.
	//Phase 7: headers received on second visit to test page, anonymous session 2.
	if (capturingPhase == 7 && checkAgainstFilter(url, capturingPhase))
	{
		//revisit the page without cookies
		testSuitePhase7(url);
		FBAccount = 2;
		return;
	}
	//Phase 8: onunload event fired on FB login SSO page for account B.
	//Phaes 9: headers received on first visit to test page, authenticated session B.
	if (capturingPhase == 9 && checkAgainstFilter(url, capturingPhase))
	{
		//after clicking login button, enter different credential and receive headers.
		testSuitePhase9(url);
		doneTesting();
		return;
	}
}

function processLoaded(url){
	if (capturingPhase == 0 && checkAgainstFilter(url, capturingPhase))
	{
		//first visit done
		log('Phase 0 - done loading anonymously the first time.');
		setTimeout( function(){chrome.tabs.sendMessage(testTab.id, {"site": siteToTest, "action": "navigateTo"});capturingPhase++;}, 2000);
		return;
	}
	if (capturingPhase == 6 && checkAgainstFilter(url, capturingPhase))
	{
		//second visit done
		log('Phase 6 - done loading anonymously the second time.');
		setTimeout( function(){chrome.tabs.sendMessage(testTab.id, {"site": siteToTest, "action": "navigateTo"});capturingPhase++;}, 2000);
		return;
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
		//if (info.url.indexOf("facebook")==-1) return;
		//log(info);
		bufferedResponses[info.url] = info;
		processBuffer(info.url);
		loginButtonClicked = false;						//reset this value for future uses.
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
			//Note: If the test page will notify this after onload hasn't been fired for 10 sec.
			processLoaded(request.loadedURL);
		}
		if (request.unloadedURL != undefined) {
			//log("Unloaded "+request.unloadedURL);
			processUnLoad(request.unloadedURL);
		}
		if (request.requestFBAccount != undefined) {
			sendResponse({"account":FBAccount});
		}
		if (request.pressedLoginButton != undefined) {
			loginButtonClicked = true;
			sendResponse({"capturingPhase":capturingPhase});
		}
		if (request.checkTestingStatus != undefined) {
			sendResponse({"capturingPhase":capturingPhase});
		}
		if (request.loginButtonXPath != undefined) {
			if (loginButtonXPath == "") 
			{
				loginButtonXPath = request.loginButtonXPath;					//only record the first time we press the login button.
				log(loginButtonXPath);
			}
			if (loginButtonOuterHTML == "") {
				loginButtonOuterHTML = request.loginButtonOuterHTML;		//only record the first time we press the login button.
				log(loginButtonOuterHTML);
			}
			sendResponse({});
		}
	}
);

function startOver(){
	loginButtonClicked = false;
	capturingPhase = -1;
	loginButtonOuterHTML = "";
	loginButtonXPath = "";
	deleteCookies();
	storage.clear();
}

startOver();
log("AVC v0.2 background.js loaded.");