const RSVP = require('rsvp')

// const Promise = require('bluebird')
// Convert an NPM-style function returning a callback to one that returns a Promise.
export const _denodeify = f => (...args) => new RSVP.Promise((resolve, reject) => {
    f(...args, (err, val) => {
	    if (err) {
		    reject(err);
	    } else {
		    resolve(val);
	    }
    });
});

export const denodeify = f => (...args) => new RSVP.Promise((resolve) => {
	f(...args, (val) => {
		return resolve(val);
	});
});

export const denodeify_ = f => () => new RSVP.Promise((resolve) => {
	f((val) => {
		return resolve(val);
	});
});

export const convertToAsyncWithPromise = function(fn) {
    return function() {
        var args = [].slice.call(arguments);

        return new RSVP.Promise(function(resolve) {
            setTimeout(function() {
                resolve(fn.apply(this, args));
            }, 0)
        });
    }
};