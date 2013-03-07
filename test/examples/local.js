var Hapi = require('hapi');
var Travelogue = require('../..');
var Passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var internals = {};

var config = internals.config = {
    "port": 8000,
    "yar": {
        "cookieOptions": {
            "password": "worldofwalmart"
        },
        "session": true
    },
    "passport": {
        "urls": {
            "failureRedirect": "/login",
            "successRedirect": "/"
        }
    }
};
internals.successMessage = "ACCESS GRANTED";

var server = internals.server = new Hapi.Server('localhost', config.port);
Travelogue.configure(server, Passport, config);

var USERS = {
    "van": "walmart"
};

Passport.use(new LocalStrategy(function (username, password, done) {

    // Find or create user here...
    // In production, use password hashing like bcrypt
    if (USERS.hasOwnProperty(username) && USERS[username] == password) {
        return done(null, {username: username});
    }
    
    return done(null, false, {'message': 'invalid credentials'});
}));
Passport.serializeUser(function(user, done) {

    done(null, user);
});
Passport.deserializeUser(function(obj, done) {

    done(null, obj);
});


// addRoutes
server.addRoute({
    method: 'GET',
    path: '/',
    config: {
        handler: Travelogue.ensureAuthenticated(function (request) {

            // If logged in already, redirect to /home
            // else to /login
            request.reply.redirect('/home').send();
        })
    }
});

server.addRoute({
    method: 'GET',
    path: '/login',
    config: {
        handler: function (request) {

            var form = '<form action="/login" method="post"> <div> <label>Username:</label> <input type="text" name="username"/> </div> <div> <label>Password:</label> <input type="password" name="password"/> </div> <div> <input type="submit" value="Log In"/> </div> </form>';
            request.reply(form);
        }
    }
});

server.addRoute({
    method: 'GET',
    path: '/home',
    config: {
        handler: Travelogue.ensureAuthenticated(function (request) {

            // If logged in already, redirect to /home
            // else to /login
            request.reply(internals.successMessage);
        })
    }
});

server.addRoute({
    method: 'POST',
    path: '/login',
    config: {
        validate: {
            schema: {
                username: Hapi.Types.String(),
                password: Hapi.Types.String()
            }
        },
        handler: function (request) {

            request.body = request.payload; // Not needed in 0.0.2 but kept for reference
            Passport.authenticate('local', { 
                successRedirect: config.passport.urls.successRedirect,
                failureRedirect: config.passport.urls.failureRedirect,
                failureFlash: true
            })(request);
        }
    }
});

server.addRoute({
    method: 'GET',
    path: '/session',
    config: {
        handler: function (request) {

            request.reply(JSON.stringify(request.session));
        }
    }
});

if (require.main === module) {
    server.start(function () {

        console.log('server started on port: ', server.settings.port);
    })
}
else {
    module.exports = internals;
}