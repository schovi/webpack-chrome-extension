
/*
 const _AnalyticsCode = 'UA-74453743-1';
 let service, tracker;

 var importScript = (function (oHead) {
 //window.analytics = analytics;
 function loadError(oError) {
 throw new URIError("The script " + oError.target.src + " is not accessible.");
 }

 return function (sSrc, fOnload) {
 var oScript = document.createElement("script");
 oScript.type = "text\/javascript";
 oScript.onerror = loadError;
 if (fOnload) {
 oScript.onload = fOnload;
 }
 oHead.appendChild(oScript);
 oScript.src = sSrc;
 }

 })(document.head || document.getElementsByTagName("head")[0]);

 importScript(chrome.runtime.getURL('shared/google-analytics-bundle.js'), function () {
 console.info('google analytics platform loaded...');
 service = analytics.getService('instagram_easy_downloader');
 tracker = service.getTracker(_AnalyticsCode);
 tracker.sendAppView('App view');
 });
 */
