var Hoek = require('hoek');
var Middleware = require('./middleware');

// Declare internals

var internals = {};


internals.config = {
    "session": {
        "permissions": {
            "ext": true
        },
        "plugin": {
            "name": "session",
            "isSingleUse": false,
            "options": {
                
            }
        }
    },
    "passport": {
        "urls": {
            "onAccessDenied": "/login"
        }
    }
};


var Travelogue = function () {

    this.server = null;
    this.passport = null;
};


Travelogue.prototype.configure = function (server, passport, options) {

    Hoek.merge(internals.config, options || server.settings);
    this.middleware = new Middleware(internals.config);
    
    this.passport = passport;
    this.passport._plugin = {
        authenticate: this.middleware.authenticate,
        initialize: this.middleware.initialize
    };
    
    this.server = server;
    this.server.plugin().register(Yar, options, this.onPluginErr);
    
    this.server.ext('onPreHandler', [
        this.passport.initialize(),
        this.passport.session()
    ]);
};


Travelogue.prototype.onPluginErr = function (err) {

    if (err) {
        throw err;
    }
};


Travelogue.prototype.ensureAuthenticated = function (next) {

    return function (request, internal) {

        if (request.isAuthenticated()) {
            return next();
        }
        
        if (internal) {
            return internal();
        }
        
        return request.reply.redirect(internals.config.passport.urls.failureRedirect || '/').send();
    };
};

module.exports = new Travelogue();
module.exports.Travelogue = Travelogue;