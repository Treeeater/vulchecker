function AutomateSSO(){
	
	var checkDialogOAuth = function(){
		if (document.URL.indexOf("https://www.facebook.com/dialog/oauth")==-1) return false;
		if (document.getElementById('u_0_0') == null) return false;
		//try to click it
		document.getElementById('u_0_0').click();
		return true;
	};
	
	var checkEnterPassword = function(){
		if (document.URL.indexOf("https://www.facebook.com/login.php")==-1) return false;
		
		if (document.getElementById('email') == null) return false;
		document.getElementById('email').value = "t-yuzhou@hotmail.com";		
		
		if (document.getElementById('pass') == null) return false;
		document.getElementById('pass').value = "msr123456";
		
		if (document.getElementById('u_0_1') == null) return false;
		//try to click it
		document.getElementById('u_0_1').click();
		return true;
	};
	
	var checkPermissionRequest = function(){
		if (document.URL.indexOf("https://www.facebook.com/dialog/permissions.request")==-1) return false;
		if (document.getElementById('u_0_0') == null) return false;
		//try to click it
		document.getElementById('u_0_0').click();
		return true;
	};
	
	this.checkEverything = function(){
		if (checkEnterPassword()) return;
		if (checkDialogOAuth()) return;
		if (checkPermissionRequest()) return;
	};
	return this;
}

var automateSSO = new AutomateSSO();

if (chrome.extension){
	//trigger by the popup menu
	chrome.extension.onMessage.addListener(
		function(request, sender, sendResponse) {
			if (request.action == "automateSSO"){
				automateSSO.checkEverything();
				sendResponse({"checked":"checked"});
			}
		}
	);
	//auto-check every time.
	//automateSSO.checkEverything();
}

else {
	//code copied to a console
	automateSSO.checkEverything();
}
console.log("automateSSO.js loaded.");