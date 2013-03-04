var Hapi = require('hapi');
var Travelogue = require('travelogue');
var Passport = require('passport');
var GithubStrategy = require('passport-github').Strategy;


var config = {
    "port": 8000,
    "yar": {
        "cookieOptions": {
            "password": "worldofwalmart"
        },
        "session": true
    },
    "passport": {
        "urls": {
            "failureRedirect": "/login"
        }
    },
    "github": {
        clientID: "...",
        clientSecret: "...",
        callbackURL: "http://localhost:8000/auth/github/callback"
    }
};

var server = new Hapi.Server('localhost', config.port);
Travelogue.configure(server, Passport, config);


Passport.use(new GithubStrategy(config.github, function (accessToken, refreshToken, profile, done) {

    console.log('accessToken & args', arguments);
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

            var html = ['<a href="/auth/github">Login with Github</a>'];
            request.reply(html.join(""));
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
            return request.reply("ACCESS GRANTED");
        })
    }
});

server.addRoute({
    method: 'GET',
    path: '/auth/github',
    config: {
        // can use either passport.X or Travelogue.passport.X
        handler: Passport.authenticate('github')
    }
});
server.addRoute({
    method: 'GET',
    path: '/auth/github/callback',
    config: {
        handler: function (request) {
            
            Travelogue.passport.authenticate('github', { 
                successRedirect: '/',
                failureRedirect: '/login',
                failureFlash: true,
            })(request, function () {

                return request.reply.redirect('/').send();
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

            return request.reply(request.session);
        }
    }
});

server.start(function () {

    console.log('server started on port ' + config.port);
})