// Load modules

var Passport = require('passport');
var Hapi = null;                        // Initialized during plugin registration


// Declare internals

var internals = {};


// Defaults

internals.defaults = {
    urls: {
        failureRedirect: '/login',
        successRedirect: '/'
    },
    excludePaths: []
};


exports.register = function (plugin, options, next) {

    internals.setHapi(plugin.hapi);

    var settings = plugin.hapi.utils.applyToDefaults(internals.defaults, options);

    plugin.dependency('yar');
    plugin.api('settings', settings);
    plugin.api('passport', Passport);

    Passport.framework({
        initialize: internals.initialize,
        authenticate: internals.authenticate(settings)
    });

    plugin.ext('onPreAuth', [
        Passport.initialize(),
        internals.exclude(settings.excludePaths, Passport.session())
    ], { after: 'yar' });

    plugin.auth('passport', {
        implementation: new internals.Scheme(settings, plugin.hapi),
        defaultMode: settings.defaultMode
    });

    next();
};


internals.exclude = function (paths, callback) {

    return function (request, next) {

        var isExcludable = false;
        var complete = function () {

            if (isExcludable) {
                return next();
            }
            else {
                return callback(request, next);
            }
        };
        
        paths.forEach(function (path) {

            if (request.url.path.indexOf(path) >= 0){
                isExcludable = true;
            }
        });
        
        complete();
    };
};


internals.initialize = function () {

    return function (request, next) {

        var passport = this;
        request._passport = {};
        request._passport.instance = passport;

        var passportSession = request.session;
        if (passportSession) {
            // Load data from existing session
            request._passport.session = request.session;
        }
        else {
            // Initialize new session
            request.session = request.session || {};
            passportSession = {};
            request.session['_passport'] = passportSession;
            request._passport.session = passportSession;
        }

        if (request.session.hasOwnProperty('lazy')) {
            request.session.lazy(true);                     // Use Yar lazy mode for direct session access
        }

        request.session._isAuthenticated = function () {

            var property = 'user';
            if (request._passport &&
                request._passport.instance._userProperty) {

                property = request._passport.instance._userProperty;
            }

            return (request[property]) ? true : false;
        };

        request.session._login = request.session._logIn = function (user, options, done) {

            if (!request._passport) {
                throw new Error('passport.initialize() middleware not in use');
            }

            if (!done &&
                typeof options === 'function') {

                done = options;
                options = {};
            }

            options = options || {};

            var property = request._passport.instance._userProperty || 'user';
            var session = request.session || null;

            request[property] = user;

            if (session && request._passport.instance.serializeUser) {
                request._passport.instance.serializeUser(user, function (err, obj) {

                    if (err) {
                        request[property] = null;
                        return done(err);
                    }

                    request._passport.session.user = obj;
                    request.session.user = obj;
                    done();
                });
            }
            else {
                done && done();
            }
        };

        request.session._logout = request.session._logOut = function () {

            if (!request._passport) {
                throw new Error('passport.initialize() middleware not in use');
            }

            var property = request._passport.instance._userProperty || 'user';
            request[property] = null;
            delete request._passport.session.user;
        };

        next();
    };
};


internals.authenticate = function (settings) {

    return function (name, options, callback) {

        var self = this;

        if (!callback &&
            typeof options === 'function') {

            callback = options;
            options = {};
        }

        options = options || {};

        if (!Array.isArray(name)) {
            name = [name];
        }

        return function authenticate(request, next) {

            var passport = this;
            var failures = [];

            if (!next) {
                next = function (err) {

                    return request.reply.redirect(err ? (options.failureRedirect || settings.failureRedirect || '/')
                                                      : (options.successRedirect || settings.successRedirect || '/'));
                };
            }

            var allFailed = internals.allFailedFactory(request, failures, options, callback);
            var attempt = internals.attemptFactory(passport, request, name, failures, allFailed, options, next, callback);
            attempt(0, next);
        };
    };
};


internals.allFailedFactory = function (request, failures, options, callback) {

    return function allFailed() {

        if (callback) {
            if (failures.length === 1) {
                return callback(null, false, failures[0].challenge, failures[0].status);
            }
            else {
                var challenges = failures.map(function (f) { return f.challenge; });
                var statuses = failures.map(function (f) { return f.status; });
                return callback(null, false, challenges, statuses);
            }
        }

        var failure = failures[0] || {};
        var challenge = failure.challenge || {};

        if (options.failureFlash) {
            var flash = options.failureFlash;

            if (typeof flash === 'string') {
                flash = { type: 'error', message: flash };
            }
            flash.type = flash.type || 'error';

            var type = flash.type || challenge.type || 'error';
            var msg = flash.message || challenge.message || challenge;
            if (typeof msg === 'string') {
                request.session.flash(type, msg);
            }
        }

        if (options.failureMessage) {
            var msg = options.failureMessage;

            if (typeof msg === 'boolean') {
                msg = challenge.message || challenge;
            }

            if (typeof msg === 'string') {
                request.session.messages = request.session.messages || [];
                request.session.messages.push(msg);
            }
        }

        if (options.failureRedirect) {
            return request.reply.redirect(options.failureRedirect);
        }

        var rchallenge = [];
        var rstatus = null;

        for (var i = 0, l = failures.length; i < l; ++i) {
            var failure = failures[i];
            var challenge = failure.challenge || {};
            var status = failure.status;

            if (typeof challenge === 'number') {
                status = challenge;
                challenge = null;
            }

            rstatus = rstatus || status;
            if (typeof challenge === 'string') {
                rchallenge.push(challenge);
            }
        }

        return request.reply(Hapi.error.unauthorized('Unauthorized', rchallenge || null));
    };
};


internals.attemptFactory = function (passport, request, name, failures, allFailed, options, next, callback) {

    return function attempt(i, cb) {

        var delegate = {};
        options.session = options.session || request.session;

        delegate.success = function (user, info) {

            // Preserve Session from Synthetic Request
            if (request._synth.session) {
                Hapi.utils.applyToDefaults(request.session, request._synth.session)
            }

            if (callback) {
                return callback(null, user, info);
            }

            info = info || {};

            if (options.successFlash) {
                var flash = options.successFlash;

                if (typeof flash === 'string') {
                    flash = {
                        type: 'success',
                        message: flash
                    };
                }
                flash.type = flash.type || 'success';

                var type = flash.type || info.type || 'success';
                var msg = flash.message || info.message || info;
                if (typeof msg === 'string') {
                    request.session.flash(type, msg);
                }
            }

            if (options.successMessage) {
                var msg = options.successMessage;

                if (typeof msg === 'boolean') {
                    msg = info.message || info;
                }

                if (typeof msg === 'string') {
                    request.session.messages = request.session.messages || [];
                    request.session.messages.push(msg);
                }
            }

            if (options.assignProperty) {
                request[options.assignProperty] = user;
                // return next();
            }

            var complete = function () {

                if (options.successReturnToOrRedirect) {
                    var url = options.successReturnToOrRedirect;

                    if (request.session && request.session.returnTo) {
                        url = request.session.returnTo;
                        delete request.session.returnTo;
                    }
                    return request.reply.redirect(url);
                }

                if (options.successRedirect) {
                    return request.reply.redirect(options.successRedirect);
                }

                cb();
            };

            request.session._logIn(user, options, function (err) {

                if (err) {
                    return cb(err);
                }

                if (options.authInfo) {
                    passport.transformAuthInfo(info, internals.transformAuthInfoCallback(request, cb, complete));
                }
                else {
                    complete();
                }
            });
        }; // end of delegate.success

        delegate.fail = function (challenge, status) {

            failures.push({
                challenge: challenge,
                status: status
            });

            return attempt(i + 1, cb);
        };

        delegate.pass = function () {

            if (request._synth.user) {
                request.user = request._synth.user;
            }

            return cb();
        };

        delegate.error = internals.delegateErrorFactory(cb);

        delegate.redirect = internals.delegateRedirectFactory(request);

        var layer = name[i];
        if (!layer) {
            return allFailed();
        }

        var prototype = passport._strategy(layer);
        if (!prototype) {
            return next(Hapi.error.internal('No strategy registered under the name:' + layer));
        }

        var actions = internals.actionsFactory();

        var strategy = Object.create(prototype);
        for (var method in actions) {
            strategy[method] = actions[method].bind(delegate);
        }

        // Synthetic Request passed to Strategy (avoid polluting request)

        var req = {};
        req.headers = request.headers;
        req.query = request.url.query;
        req.body = request.payload;
        req._passport = request._passport;
        req.session = request.session;
        request._synth = req;

        // Accommodate passport-google in Sythentic Request

        req.url = request.url;
        req.url.method = request.method.toUpperCase();
        req.url.url = request.url.href;

        // Perform Authentication with Synthetic Request

        strategy.authenticate(req, options);
    }
};


internals.actionsFactory = function () {

    return {
        success: function (user, info) { this.success.apply(this, arguments); },
        fail: function (challenge, status) { this.fail.apply(this, arguments); },
        redirect: function (url, status) { this.redirect.apply(this, arguments); },
        pass: function () { this.pass.apply(this, arguments); },
        error: function (err) { this.error.apply(this, arguments); }
    };
};


internals.transformAuthInfoCallback = function (request, cb, complete) {

    return function (err, tinfo) {

        if (err) {
            return cb(err);
        }

        request.authInfo = tinfo;
        complete();
    };
};


internals.delegateErrorFactory = function (cb) {

    return function (err) {

        if (err) {
            err = Hapi.error.internal('Passport Error: ' + err);
        }

        return cb(err);
    };
};


internals.delegateRedirectFactory = function (request) {

    return function (url, status) {

        return request.reply.redirect(url);
    };
};


internals.Scheme = function (options, hapi) {

    this.settings = options;
    this.hapi = hapi;
    return this;
};


internals.Scheme.prototype.authenticate = function (request, callback) {

    if (request.session._isAuthenticated()) {
        return callback(null, {});
    }

    return callback(new this.hapi.response.Redirection(this.settings.urls.failureRedirect || '/'));
};


internals.setHapi = function (module) {

    Hapi = Hapi || module;
};


if (process.env.NODE_ENV === 'test') {
    exports.internals = internals;
}

