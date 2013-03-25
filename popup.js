// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var daddy = chrome.extension.getBackgroundPage();

function click(e) {
  chrome.tabs.executeScript(null,
      {code:"document.body.style.backgroundColor='red'"});
  window.close();
}

function check_and_redo_credentials_wrapper(e){
	daddy.check_and_redo_credentials();
	window.close();
}

function clickLoginButton_wrapper(e){
	daddy.clickLoginButton();
	window.close();
}

function automateSSO_wrapper(e){
	daddy.automateSSO();
	window.close();
}

document.addEventListener('DOMContentLoaded', function () {
	document.getElementById('refresh').addEventListener('click',check_and_redo_credentials_wrapper);
	document.getElementById('clickLogin').addEventListener('click',clickLoginButton_wrapper);
	document.getElementById('gothroughsso').addEventListener('click',automateSSO_wrapper);
});