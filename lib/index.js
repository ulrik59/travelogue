var Hoek = require('hoek');
var Middleware = require('./middleware');

// Declare internals

var internals = {};


internals.config = {
    "session": {
        cookieOptions: {},
        session: true
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

    var self = this;
    Hoek.merge(internals.config, options);
    this.middleware = new Middleware(internals.config);
    
    this.passport = passport;
    this.passport.framework({
        authenticate: this.middleware.authenticate,
        initialize: this.middleware.initialize
    });
    
    this.server = server;
    this.server.plugin().allow({ ext: true }).require('yar', options.yar, function (err) {

        if (err) {
            throw err;
        }
        
        self.server.ext('onPreHandler', [
            self.passport.initialize(),
            self.passport.session()
        ]);
    });
};


Travelogue.prototype.onPluginErr = function (err) {

    if (err) {
        throw err;
    }
};


Travelogue.prototype.ensureAuthenticated = function (next) {

    return function (request, internal) {

        if (request.isAuthenticated()) {
            return next(request);
        }
        
        if (internal) {
            return internal();
        }
        
        return request.reply.redirect(internals.config.passport.urls.failureRedirect || '/').send();
    };
};

module.exports = new Travelogue();
module.exports.Travelogue = Travelogue;