var Hapi = require('hapi');
var GithubStrategy = require('passport-github').Strategy;


var config = {
    hostname: 'localhost',
    port: 8000,
    urls: {
        failureRedirect: '/login'
    },
    github: {
        clientID: "...",
        clientSecret: "...",
        callbackURL: "http://localhost:8000/auth/github/callback"
    }
};
var plugins = {
    yar: {
        cookieOptions: {
            password: "worldofwalmart",
            isSecure: false
        }
    }
    travelogue: config // use '../../' instead of travelogue if testing this repo locally
}

var server = new Hapi.Server(config.hostname, config.port);
server.pack.allow({ ext: true }).require(plugins, function (err) {

    if (err) {
        throw err;
    }
});

var Passport = server.plugins.travelogue.passport;
Passport.use(new GithubStrategy(config.github, function (accessToken, refreshToken, profile, done) {

    // Find or create uer here...
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
        request.reply.redirect('/home');
    }
});


server.addRoute({
    method: 'GET',
    path: '/login',
    config: {
        auth: false, // use this if your app uses other hapi auth schemes, otherwise optional
        handler: function (request) {

            var html = ['<a href="/auth/github">Login with Github</a>'];
            if (request.session) {
                html.push("<br/><br/><pre><span style='background-color: #eee'>session: " + JSON.stringify(request.session, null, 2) + "</span></pre>");
            }
            request.reply(html.join(""));
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
    path: '/auth/github',
    config: {
        auth: false,
        handler: function (request) {

            Passport.authenticate('github')(request);
        } 
    }
});


server.addRoute({
    method: 'GET',
    path: '/auth/github/callback',
    config: {
        auth: false,
        handler: function (request) {
            
            Passport.authenticate('github', { 
                successRedirect: '/',
                failureRedirect: '/login',
                failureFlash: true,
            })(request, function () {

                return request.reply.redirect('/');
            });
        }
    }
});


server.addRoute({
    method: 'GET',
    path: '/clear',
    config: {
        auth: false,
        handler: function (request) {

            request.session.reset();
            request.reply.redirect('/session');
        }
    }
});


server.addRoute({
    method: 'GET',
    path: '/session',
    config: {
        auth: false,
        handler: function (request) {

            return request.reply("<pre>" + JSON.stringify(request.session, null, 2) + "</pre><br/><br/><a href='/login'>Login</a>");
        }
    }
});


server.addRoute({
    method: 'GET',
    path: '/logout',
    config: {
        auth: false,
        handler: function (request) {

            request.session._logout();
            return request.reply.redirect('/');
        }
    }
});

server.start(function () {

    console.log('server started on port ' + server.info.port);
})
