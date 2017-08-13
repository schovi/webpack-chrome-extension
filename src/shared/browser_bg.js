import {denodeify} from './denodeify'
import {storage, runtime} from './browser'
import pThrottle from 'p-throttle'
import {SHOW_MESSAGES, MESSAGE_INFO, MESSAGE_SUCCESS, MESSAGE_WARNING, MESSAGE_ERROR} from './constants'
const RSVP = require('rsvp')
const cookies = {
    remove: denodeify(chrome.cookies.remove)
}

const downloads = {
    download: denodeify(chrome.downloads.download)
}

const showMessages = {
    info: function (tabId, message, cb) {
        __messageToShow(tabId, MESSAGE_INFO, message, cb)
    },
    success: function (tabId, message, cb) {
        __messageToShow(tabId, MESSAGE_SUCCESS, message, cb)
    },
    warning: function (tabId, message, cb) {
        __messageToShow(tabId, MESSAGE_WARNING, message, cb)
    },
    error: function (tabId, message, cb) {
        __messageToShow(tabId, MESSAGE_ERROR, message, cb)
    }
}

function __messageToShow(tabId, type, message) {
    return tabs.sendMessage(tabId, {
        action: SHOW_MESSAGES,
        data: {
            type: type,
            message: message
        }
    })
}

const tabs = {
    create: denodeify(chrome.tabs.create),
    update: denodeify(chrome.tabs.update),
    sendMessage: denodeify(chrome.tabs.sendMessage),
    messages: {
        info: showMessages.info,
        success: showMessages.success,
        warning: showMessages.warning,
        error: showMessages.error,
    }
}

const rate = {
    send: pThrottle(function (options) {
       return myWebWorker(options)
    }, 30, 1000),
    shopify: pThrottle(function (options) {
        return myWebWorker(options)
    }, 5, 1000),
    bigcommerce: pThrottle(function (options) {
       return myWebWorker(options)
    }, 1, 1000)
}

const myWebWorker = (options) => {
	const promise = new RSVP.Promise((resolve, reject) => {
		try{
			let myWorker = new Worker(chrome.runtime.getURL('shared/worker.js'))
			myWorker.onmessage = (e) => {
				myWorker.terminate()
				myWorker = undefined
				resolve(e.data)
			}
			myWorker.postMessage(options)
		}catch(ex){
			reject(ex)
		}
	})
    return promise
}

const webWorker = {
    send: rate.send,
    Shopify: rate.shopify
}

export {storage, runtime, cookies, downloads, tabs, webWorker}