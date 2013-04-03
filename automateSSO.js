function AutomateSSO(){

	this.account = 1;				//indicate which account should be used when logging in.
	this.checked = false;
	var that = this;
	
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
		document.getElementById('email').value = (that.account == 1) ? "t-yuzhou@hotmail.com" : "yachen.zho@facebook.com";	//another one is zhouyuchenking@hotmail.com
		
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
		if (that.checked) return;
		that.checked = true;
		if (checkEnterPassword()) return;
		if (checkDialogOAuth()) return;
		if (checkPermissionRequest()) return;
	};
	
	//init test account name
	chrome.extension.sendMessage({"requestFBAccount":0}, function (response){
		that.account = response.account;
	});
	
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
	//wait until test account name is inited.
	window.addEventListener('load',function(){setTimeout(automateSSO.checkEverything,500)});
	setTimeout(automateSSO.checkEverything,1000);				//fallback if onload is not fired.	*Note*: This problem can probably be solved by writing 'run_at' : 'document.start' in manifest.json for all content scripts.
}

else {
	//code copied to a console
	automateSSO.checkEverything();
}
console.log("automateSSO.js loaded.");