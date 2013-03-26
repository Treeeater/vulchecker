if (chrome.extension){
	chrome.extension.onMessage.addListener(
		function(request, sender, sendResponse) {
			if (request.action == "testSuiteStart"){
				var url = prompt("Enter the URL you want to test","http://www.instructables.com/");
				if (url) sendResponse({"siteToTest":url});
			}
			if (request.action == "siteToTestReceived"){
				document.location = request.site;
			}
		}
	);
}

function notifyOnload() {
	chrome.extension.sendMessage({"loadedURL":document.URL});
}

window.onload = notifyOnload;


console.log("testSuite.js loaded");