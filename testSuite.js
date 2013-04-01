function notifyOnload() {
	chrome.extension.sendMessage({"loadedURL":document.URL});
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


console.log("testSuite.js loaded");