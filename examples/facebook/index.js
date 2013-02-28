var Hapi = require('hapi');
var Travelogue = require('../../');
var Passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;


var config = require('./config.json');
var server = new Hapi.Server('localhost', config.port);
Travelogue.configure(server, Passport, config);


Passport.use(new FacebookStrategy(config.passport.facebook, function (accessToken, refreshToken, profile, done) {

    // Find or create user here...
    return done(null, profile);
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

            request.reply('<a href="/auth/facebook">Login with Facebook</a>');
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
            request.reply("ACCESS GRANTED");
        })
    }
});

server.addRoute({
    method: 'GET',
    path: '/auth/facebook',
    config: {
        // can use either passport.X or Travelogue.passport.X
        handler: Passport.authenticate('facebook')
    }
});
server.addRoute({
    method: 'GET',
    path: '/auth/facebook/callback',
    config: {
        handler: function (request) {
            
            Travelogue.passport.authenticate('facebook', { failureRedirect: '/'})(request, function () {

                request.reply.redirect('/').send();
            });
        }
    }
});

server.addRoute({
    method: 'GET',
    path: '/clear',
    config: {
        handler: function (request) {

            request.session = {};
            request.clearState('yar');
            request.reply('ohai');
        }
    }
});

server.addRoute({
    method: 'GET',
    path: '/session',
    config: {
        handler: function (request) {

            request.reply(request.session);
        }
    }
});

server.start(function () {

    console.log('server started on port ' + config.port);
})