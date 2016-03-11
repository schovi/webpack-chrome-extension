/**
 * (c) 2014 Rob Wu <rob@robwu.nl> (https://robwu.nl)
 * License: MIT/X11
 * https://github.com/Rob--W/chrome-api/tree/master/worker_proxy/
 *
 * In a content script within a Chrome extension, Web Workers run in the page's
 * origin. This means that Web Worker packaged with your extension cannot be
 * used in a content script.
 * This limitation has been resolved before by patch-worker.js (available at
 * https://github.com/Rob--W/chrome-api/blob/master/patch-worker/). That patch
 * has some limitations though, mainly due to the fact that the Worker runs at
 * the page's origin.
 * - importScripts does not work.
 * - Origin-specific features such as IndexedDB or the FileSystem API use the
 *   web page's origin instead of the extension's.
 * - Cross-origin XMLHttpRequest is not possible because the extension's
 *   permissions are not available.
 * 
 * All of the previous issues are solved with this patch, because it runs
 * the Worker on the extension's origin. The patch has two constraints:
 * - It relies on the creation and availability of an <iframe>. If the page
 *   removes the <iframe>, then all existing Workers are terminated.
 * - Transferable messages must NOT be used until http://crbug.com/334408 is
 *   fixed.
 *
 * This patch requires a background page or event page (used to negotiate an
 * authentication token to make sure that the frame only accept messages from
 * the content script). Further, the worker_proxy.html file must be declared in
 * "web_accessible_resources".
 *
 * Here is an example of a manifest file:
 * 
 * "content_scripts": [{
 *    "js": [ "worker_proxy.js", ... ],
 *    "matches": [ ... ]
 * }],
 * "background": {
 *    "scripts": ["worker_proxy.js", ...]
 *  },
 * "web_accessible_resources": ["worker_proxy.html"]
 *
 * worker_proxy.html contains:
 * <script src="worker_proxy.js"></script>
 */

/* jshint maxlen:80, browser:true */
/* globals chrome, console, crypto, ErrorEvent */
(function() {
    'use strict';
    var EXTENSION_ORIGIN = 'chrome-extension://' + chrome.runtime.id;
    var MSG_GET_TOKEN = 'worker_proxy wants to get communication token';

    if (location.origin == EXTENSION_ORIGIN) {
        if (chrome.extension.getBackgroundPage &&
            chrome.extension.getBackgroundPage() === window) {
            chrome.runtime.onMessage.addListener(backgroundPageMessageHandler);
        } else {
            window.addEventListener('message', extensionProxyMessageHandler);
        }
    } else {
        // Inside a content script
        window.Worker = ContentScriptWorker;
    }

    // Background page-specific
    function backgroundPageMessageHandler(message, sender, sendResponse) {
        if (message === MSG_GET_TOKEN) {
            sendResponse(getProxyWorkerChannelToken());
        }
    }

    var worker_proxy_token;
    /**
     * Get the session token used to authenticate messages between the
     * content script and worker proxy page. This value will change whenever the
     * background/event page unloads.
     */
    function getProxyWorkerChannelToken() {
        if (!worker_proxy_token) {
            var buffer = new Uint8Array(100);
            crypto.getRandomValues(buffer);
            var random_token = '';
            for (var i = 0; i < buffer.length; ++i) {
                random_token += buffer[i].toString(36);
            }
            worker_proxy_token = random_token;
        }
        return worker_proxy_token;
    }

    // Worker-proxy specific

    /**
     * Spawn a worker.
     *
     * @param {MessagePort} messagePort  Messages received on this port will be
     *                                   sent to the Worker and vice versa.
     * @param {MessagePort} metadataPort  Port used for sending internal data
     *                                    such as error events.
     * @param {string} url  URL of Web worker (relative to the location of
     *                      the HTML file that embeds this script).
     */
    function createWorker(messagePort, metadataPort, url) {
        var worker = new Worker(url);
        worker.onmessage = function(event) {
            messagePort.postMessage(event.data);
        };
        worker.onerror = function(event) {
            metadataPort.postMessage({
                type: 'error',
                errorDetails: {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                }
            });
        };
        metadataPort.onmessage = function(event) {
            if (event.data.type == 'terminate') {
                worker.terminate();
                messagePort.close();
                metadataPort.close();
            }
        };
        messagePort.onmessage = function(event) {
            worker.postMessage(event.data);
        };
        metadataPort.start();
        messagePort.start();
    }

    function extensionProxyMessageHandler(event) {
        if (!event.data || !event.data.channel_token) {
            return;
        }
        chrome.runtime.sendMessage(MSG_GET_TOKEN, function(token) {
            if (!token || event.data.channel_token !== token) {
                console.error('Auth failed, refused to create Worker channel.');
                return;
            }
            createWorker(event.ports[0], event.ports[1], event.data.worker_url);
        });
    }

    // Content-script specific
    var proxyFrame;
    var proxyFrameMessageQueue = [];
    var proxyFrameReady = false;
    /**
     * Post a message to the worker proxy frame.
     *
     * @param {object} message  Message to post.
     * @param {array|undefined} transferable  List of transferable objects.
     */
    function postMessageToWorkerProxy(message, transferables) {
        proxyFrameMessageQueue.push([message, transferables]);

        if (!proxyFrame) {
            loadFrameAndFlush();
        } else if (proxyFrameReady) {
            chrome.runtime.sendMessage(MSG_GET_TOKEN, function(token) {
                if (typeof token != 'string') {
                    // This message is different from the message below, because
                    // failure to get a message for the first time is probably
                    // caused by a developer error. If the first load succeeded
                    // and the later token requests fail again, then either of
                    // the following happened:
                    // 1. The extension runtime was reloaded (e.g. by an update,
                    //    or by pressing Ctrl + R at chrome://extensions, or
                    //    by calling chrome.runtime.reload()) (most likely).
                    // 2. The extension developer messed with the message
                    //    handling and the first message only succeeded by
                    //    coincidence.
                    // 3. A bug in Chrome was introduced (least likely).
                    console.warn('Failed to initialize Worker because of a ' +
                            'missing session token. Is the extension runtime ' +
                            'still valid?');
                    return;
                }
                flushMessages(token);
            });
        } // else wait until proxyFrame.onload fires.

        function loadFrameAndFlush() {
            proxyFrameReady = false;
            proxyFrame = document.createElement('iframe');
            proxyFrame.src = chrome.runtime.getURL('shared/worker_proxy.html');
            proxyFrame.style.cssText = 'position:fixed!important;' +
                                       'top:-99px!important;' +
                                       'left:-99px!important;' +
                                       'width:2px!important;' +
                                       'height:2px!important;' +
                                       'border:0!important';
            proxyFrame.onload = function() {
                chrome.runtime.sendMessage(MSG_GET_TOKEN, function(token) {
                    if (typeof token != 'string') {
                        console.warn(
                            'Refused to initialize Web Worker because a ' +
                            'session token could not be negotiated. Make sure' +
                            'that worker_proxy.js is loaded first in the ' +
                            'background or event page.');
                        return;
                    }
                    proxyFrameReady = true;
                    flushMessages(token);
                });
            };
            (document.body || document.documentElement).appendChild(proxyFrame);
        }

        function flushMessages(token) {
            var contentWindow = proxyFrame.contentWindow;
            if (!contentWindow) {
                // This should NEVER happen. When it happens, try to recover by
                // creating the frame again, so that new Workers can be created.
                console.warn('WARNING: The worker proxy frame was removed; ' +
                             'all previous workers have been terminated. ');
                loadFrameAndFlush();
                return;
            }
            while (proxyFrameMessageQueue.length) {
                // data = [message, transferables]
                var data = proxyFrameMessageQueue.shift();
                data[0].channel_token = token;
                contentWindow.postMessage(data[0], EXTENSION_ORIGIN, data[1]);
            }
        }
    }
    
    function ContentScriptWorker(url) {
        if (!url) {
            throw new TypeError('Not enough arguments');
        }
        var messageChannel = new MessageChannel();
        var metadataChannel = new MessageChannel();
        // MessagePort implements EventTarget, onmessage and postMessage, these
        // events will be received by the other end and passed to the Worker.
        var fakeWorker = messageChannel.port1;
        fakeWorker.terminate = function() {
            metadataChannel.port1.postMessage({
                type: 'terminate'
            });
        };

        metadataChannel.port1.onmessage = function(event) {
            if (event.data.type == 'error') {
                var error = new ErrorEvent('error', event.data.errorDetails);
                fakeWorker.dispatchEvent(error);
                if (typeof fakeWorker.onerror == 'function') {
                    fakeWorker.onerror(error);
                }
            }
        };

        messageChannel.port1.start();
        metadataChannel.port1.start();

        postMessageToWorkerProxy({
            worker_url: url
        }, [
            messageChannel.port2,
            metadataChannel.port2
        ]);

        // Hide the MessagePort methods from the exposed API.
        fakeWorker.close = fakeWorker.start = undefined;
        return fakeWorker;
    }
})();
