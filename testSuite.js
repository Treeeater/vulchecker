notified = false;

function notifyOnload() {
	if (!notified) {
		chrome.extension.sendMessage({"loadedURL":document.URL});
		notified = true;
	}
}

function notifyOnbeforeunload() {
	chrome.extension.sendMessage({"unloadedURL":document.URL});
}

if (chrome.extension){
	chrome.extension.onMessage.addListener(
		function(request, sender, sendResponse) {
			if (request.action == "testSuiteStart"){
				var url = prompt("Enter the URL you want to test","http://www.squidoo.com/");
				if (url) sendResponse({"siteToTest":url});
			}
			if (request.action == "navigateTo"){
				document.location = request.site;
			}
		}
	);
}

window.addEventListener('load',notifyOnload);

window.addEventListener('beforeunload', notifyOnbeforeunload);

window.setTimeout(notifyOnload, 10000);				//fall back to setTimeout if page doesn't finish loading after 10 sec.

console.log("testSuite.js loaded");