// Load modules

var Hoek = require('hoek');
var Passport = require('passport');
var Boom = require('boom');


// Declare internals

var internals = {};


// Defaults

internals.defaults = {
    urls: {
        failureRedirect: '/login'
    }
};


exports.register = function (pack, options, next) {

    // Validate options and apply defaults
    
    var settings = Hoek.applyToDefaults(internals.defaults, options);

    pack.dependency('yar');
    pack.api('settings', settings);
    pack.api('passport', Passport);

    Passport.framework({
        initialize: internals.initialize,
        authenticate: internals.authenticate
    });

    pack.ext('onPreAuth', [
        Passport.initialize(),
        Passport.session()
    ], { after: 'yar' });
    
    pack.auth('passport', { implementation: new internals.Scheme(settings, pack.hapi) });
        
    next();
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

        // request.body = request.payload;                     // passport-local Compatibility 

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
                request._passport.instance.serializeUser(user, function(err, obj) {

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


internals.authenticate = function (name, options, callback) {

    if (!callback && typeof options === 'function') {
        callback = options;
        options = {};
    }
    
    options = options || {};
    
    if (!Array.isArray(name)) {
        name = [name];
    }
    
    return function authenticate (request, next) {

        var passport = this;
        var failures = [];
        
        function allFailed() {

            if (callback) {
                if (failures.length == 1) {
                    return callback(null, false, failures[0].challenge, failures[0].status);
                }
                else {
                    var challenges = failures.map(function (f) {

                        return f.challenge;
                    });
                    var statuses = failures.map(function(f) {

                        return f.status;
                    });
                    
                    return callback(null, false, challenges, statuses);
                }
            }
            
            var failure = failures[0] || {};
            var challenge = failure.challenge || {};
            
            if (options.failureFlash) {
                var flash = options.failureFlash;
                
                if (typeof flash == 'string') {
                    flash = { type: 'error', message: flash };
                }
                flash.type = flash.type || 'error';
              
                var type = flash.type || challenge.type || 'error';
                var msg = flash.message || challenge.message || challenge;
                if (typeof msg == 'string') {
                    request.session.flash(type, msg);
                }
            }
              
            if (options.failureMessage) {
                var msg = options.failureMessage;
                
                if (typeof msg == 'boolean') {
                    msg = challenge.message || challenge;
                }
                
                if (typeof msg == 'string') {
                    request.session.messages = request.session.messages || [];
                    request.session.messages.push(msg);
                }
            }
            
            if (options.failureRedirect) {
                return request.reply.redirect(options.failureRedirect).send();
            }
            
            var rchallenge = [];
            var rstatus = null;
            
            for (var i = 0, l = failures.length; i < l; ++i) {
                var failure = failures[i];
                var challenge = failure.challenge || {};
                var status = failure.status;
                
                if (typeof challenge == 'number') {
                    status = challenge;
                    challenge = null;
                }
                
                rstatus = rstatus || status;
                if (typeof challenge == 'string') {
                    rchallenge.push(challenge);
                }
            }
            
            return request.reply(Boom.unauthorized('Unauthorized', rchallenge || null));
        };
        
        (function attempt(i) {

            var delegate = {};
            options.session = options.session || request.session;
            
            delegate.success = function (user, info) {

                if (callback) {
                    return callback(null, user, info);
                }
                
                info = info || {};
                
                // Preserve Session from Synthetic Request
                
                if (request._synth.session) {
                    Hoek.applyToDefaults(request.session, request._synth.session)
                }
                
                if (options.successFlash) {
                    var flash = options.successFlash;
                    
                    if (typeof flash == 'string') {
                        flash = {
                            type: 'success',
                            message: flash
                        };
                    }
                    flash.type = flash.type || 'success';
                    
                    var type = flash.type || info.type || 'success';
                    var msg = flash.message || info.message || info;
                    if (typeof msg == 'string') {
                        request.session.flash(type, msg);
                    }
                }
                
                if (options.successMessage) {
                    var msg = options.successMessage;
                    
                    if (typeof msg == 'boolean') {
                        msg = info.message || info;
                    }
                    
                    if (typeof msg == 'string') {
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
                        return request.reply.redirect(url).send();
                    }
                    
                    if (options.successRedirect) {
                        return request.reply.redirect(options.successRedirect).send();
                    }
                    
                    next();
                };
                
                request.session._logIn(user, options, function (err) {

                    if (err) {
                        return next(err);
                    }
                    
                    if (options.authInfo) {
                        passport.transformAuthInfo(info, function (err, tinfo) {

                            if (err) {
                                return next(err);
                            }
                          
                            request.authInfo = tinfo;
                            complete();
                        });
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
                return attempt(i + 1);
            };
            
            delegate.pass = function () {

                if (request._synth.user) {
                    request.user = request._synth.user;
                    request.session.user = request.user;
                }
                
                return next();
            };
            
            delegate.error = function (err) {

                if (err) {
                    err = Boom.internal('Passport Error: ' + err);
                    console.trace(err);
                }
                
                return next(err);
            }
            
            delegate.redirect = function (url, status) {

                return request.reply.redirect(url).send();
            };
            
            var layer = name[i];
            if (!layer) {
                return allFailed();
            }
            
            var prototype = passport._strategy(layer);
            if (!prototype) {
                return next(Boom.internal('No strategy registered under the name:' + layer));
            }
            
            var actions = {
                success: function (user, info) { this.success.apply(this, arguments); },
                fail: function (challenge, status) { this.fail.apply(this, arguments); },
                redirect: function (url, status) { this.redirect.apply(this, arguments); },
                pass: function () { this.pass.apply(this, arguments); },
                error: function (err) { this.error.apply(this, arguments); }    
            };
            
            var strategy = Object.create(prototype);
            for (var method in actions) {
                strategy[method] = actions[method].bind(delegate);
            }
            
            // Synthetic Request passed to Strategy (avoid polluting request)
            
            var req = {};
            req.query = request.url.query;
            req.body = request.payload;
            req._passport = request._passport;
            req.session = request.session;
            request._synth = req;
            
            strategy.authenticate(req, options);
        })(0);
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


if (process.env.TEST) {
    exports.internals = internals;
}

