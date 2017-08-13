import {denodeify, denodeify_} from './denodeify'
import {reject} from 'lodash'
export const storage = {
	local: {
		get: denodeify(chrome.storage.local.get),
		set: denodeify(chrome.storage.local.set),
		remove: denodeify(chrome.storage.local.remove)
	},
	sync: {
		get: denodeify(chrome.storage.sync.get),
		set: denodeify(chrome.storage.sync.set),
		remove: denodeify(chrome.storage.sync.remove),
	}
}

storage.collection = {
	upsert: denodeify((area, collectionName, data, cb) => {
		storage[area].get([collectionName]).then((rs) => {
			let _collections = rs && rs[collectionName] ? rs[collectionName] : []
			_collections = reject(_collections, {id: data.id})
			_collections.unshift(data)
			storage[area].set({[collectionName]: _collections}).then(() => cb(true))
		})
	}),
	remove: denodeify((area, collectionName, id, cb) => {
		storage[area].get([collectionName]).then(rs => {
			let _collections = rs && rs[collectionName] ? rs[collectionName] : []
			_collections = reject(_collections, {id: id})
			storage[area].set({[collectionName]: _collections}).then(() => cb(true))
		})
	})
}

export const runtime = {
	sendMessage: denodeify(chrome.runtime.sendMessage),
	getBackgroundPage: denodeify_(chrome.runtime.getBackgroundPage)
}

export const load = {
	script: (function (oHead) {
		//window.analytics = analytics;
		function loadError(oError) {
			throw new URIError("The script " + oError.target.src + " is not accessible.");
		}

		return denodeify(function (sSrc, fOnload) {
			var oScript = document.createElement("script");
			oScript.type = "text\/javascript";
			oScript.onerror = loadError;
			if (fOnload) {
				oScript.onload = fOnload;
			}
			oHead.appendChild(oScript);
			oScript.src = sSrc;
		})

	})(document.body || document.getElementsByTagName("body")[0]),
	style: (function (oHead) {
		//window.analytics = analytics;
		function loadError(oError) {
			throw new URIError("The script " + oError.target.src + " is not accessible.");
		}

		return denodeify(function (sSrc, fOnload) {
			var oScript = document.createElement("link");
			oScript.setAttribute('rel', 'stylesheet');
			oScript.setAttribute('type', 'text/css');
			oScript.onerror = loadError;
			if (fOnload) {
				oScript.onload = fOnload;
			}
			oHead.appendChild(oScript);
			oScript.href = sSrc;
		})

	})(document.head || document.getElementsByTagName("head")[0])
}