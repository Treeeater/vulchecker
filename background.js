//http://community.pivotaltracker.com/pivotal			has fb g and live signin.

var IdPDomains = ["*://*.facebook.com/*", "*://*.live.com/*"];
var token_url = "https://www.facebook.com/dialog/oauth/?client_id=265286580246983&redirect_uri=http://chromium.cs.virginia.edu/test.php&scope=email&response_type=token";
var code_url = "https://www.facebook.com/dialog/oauth/?client_id=265286580246983&redirect_uri=http://chromium.cs.virginia.edu/test.php&scope=email&response_type=code";
var code_for_token_url = "https://graph.facebook.com/oauth/access_token?client_id=265286580246983&redirect_uri=http://chromium.cs.virginia.edu/test.php&client_secret=30d36a8bea17b5307cf8dd167e32c0a2&code="
var signed_request_url = "";
var old_token = "";
var old_code = "";
var old_signed_request = "";

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
			log(response);
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

chrome.webRequest.onBeforeSendHeaders.addListener(
	function(info) {
		log(info);
		//if (info.requestBody != undefined) log(info.requestBody);
		//return {redirectUrl: loldogs[i]};
	},
	// filters
	{
		//urls: IdPDomains.concat(["*://*.instructables.com/*"])
		urls: IdPDomains.concat(["*://*.pivotaltracker.com/*", "*://*.getsatisfaction.com/*"])
		//urls: IdPDomains.concat(["*://*.hulu.com/*"])
	},
	// extraInfoSpec
	["blocking","requestHeaders"]
);

chrome.webRequest.onBeforeRequest.addListener(
	function(info) {
		if (info.requestBody != undefined) log(info.requestBody);
	},
	{
		//urls: IdPDomains.concat(["*://*.instructables.com/*"])
		urls: IdPDomains.concat(["*://*.pivotaltracker.com/*", "*://*.getsatisfaction.com/*"])
		//urls: IdPDomains.concat(["*://*.hulu.com/*"])
	},
	// extraInfoSpec
	["blocking","requestBody"]
);

chrome.webRequest.onHeadersReceived.addListener(
	function(info) {
		log(info);
	},
	{
		urls: IdPDomains.concat(["*://*.pivotaltracker.com/*", "*://*.getsatisfaction.com/*"])
		//urls: IdPDomains.concat(["*://*.hulu.com/*"])
	},
	["blocking","responseHeaders"]
);
