var Hapi = require('hapi');
var FacebookStrategy = require('passport-facebook').Strategy;

var config = {
    hostname: 'localhost',
    port: 8000,
    urls: {
        failureRedirect: '/login',
        successRedirect: '/'
    },
    facebook: {
        clientID: "...",
        clientSecret: "...",
        callbackURL: "http://localhost:8000/auth/facebook/callback"
    }
};
    
var plugins = {
    yar: {
        cookieOptions: {
            password: 'worldofwalmart',
            isSecure: false
        }
    },
    travelogue: config // use '../../' instead of travelogue if testing locally
};

var server = new Hapi.Server(config.hostname, config.port);
server.plugin.allow({ ext: true }).require(plugins, function (err) { 

    if (err) {
        throw err;
    }
});

var Passport = server.plugins.travelogue.passport;
Passport.use(new FacebookStrategy(config.facebook, function (accessToken, refreshToken, profile, done) {

    // Find or create user here...
    return done(null, profile);
}));
Passport.serializeUser(function(user, done) {

    done(null, user);
});
Passport.deserializeUser(function(obj, done) {

    done(null, obj);
});

if (process.env.DEBUG) {
    server.on('internalError', function (event) {

        // Send to console
        console.log(event)
    });
}

// addRoutes
server.addRoute({
    method: 'GET',
    path: '/',
    config: { auth: 'passport' }, // replaces ensureAuthenticated
    handler: function (request) {

        // If logged in already, redirect to /home
        // else to /login
        return request.reply.redirect('/home').send();
    }
});

server.addRoute({
    method: 'GET',
    path: '/login',
    config: {
        handler: function (request) {

            var html = '<a href="/auth/facebook">Login with Facebook</a>';
            if (request.session) {
                html += "<br/><br/><pre><span style='background-color: #eee'>session: " + JSON.stringify(request.session) + "</span></pre>";
            }
            return request.reply(html);
        }
    }
});

server.addRoute({
    method: 'GET',
    path: '/home',
    config: { auth: 'passport' },
    handler: function (request) {

        // If logged in already, redirect to /home
        // else to /login
        return request.reply("ACCESS GRANTED");
    }
});

server.addRoute({
    method: 'GET',
    path: '/auth/facebook',
    config: {
        handler: function (request) {
            Passport.authenticate('facebook')(request);
        }
    }
});

server.addRoute({
    method: 'GET',
    path: '/auth/facebook/callback',
    config: {
        handler: function (request) {
            
            Passport.authenticate('facebook', {
                failureRedirect: '/login',
                failureFlash: true
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

            request.session.reset();
            return request.reply.redirect('/session').send();
        }
    }
});

server.addRoute({
    method: 'GET',
    path: '/session',
    config: {
        handler: function (request) {

            return request.reply("<pre>" + JSON.stringify(request.session, null, 2) + "</pre><br/><br/><a href='/login'>Login</a>");
        }
    }
});

server.start(function () {

    console.log('server started on port: ', server.settings.port);
});