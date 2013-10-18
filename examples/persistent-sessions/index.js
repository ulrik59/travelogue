var Hapi = require('hapi');
var Catbox = require('catbox');
var LocalStrategy = require('passport-local').Strategy;

var cacheOptions = {
    engine: 'redis',
    partition: 'sessions',
    host: '127.0.0.1',
    port: '6379'
};

var sessionStore = new Catbox.Client(cacheOptions);

// Declare internals
var internals = {};


internals.startCache = function (callback) {
    sessionStore.start(function (err) {
        callback()
    });
};


internals.startServer = function () {

    var config = {
        hostname: 'localhost',
        port: 8000,
        urls: {
            failureRedirect: '/login'
        },
        excludePaths: ['/public/']
    };

    var policyOptions = {
        expiresIn: 5000
    };
    var sessionStorePolicy = new Catbox.Policy(policyOptions, sessionStore, 'session');

    var plugins = {
        yar: {
            cookieOptions: {
                password: "worldofwalmart",
                isSecure: false
            },
            store: sessionStorePolicy,
            maxCookieSize: 0
        },
        travelogue: config // use '../../' instead of travelogue if testing this repo locally
    };

    var server = new Hapi.Server(config.hostname, config.port);
    server.pack.allow({ ext: true }).require(plugins, function (err) {

        if (err) {
            throw err;
        }
    });


    var USERS = {
        "van": "walmart"
    };

    var Passport = server.plugins.travelogue.passport;
    Passport.use(new LocalStrategy(function (username, password, done) {

        // Find or create user here...
        // In production, use password hashing like bcrypt
        if (USERS.hasOwnProperty(username) && USERS[username] == password) {
            return done(null, { username: username });
        }

        return done(null, false, { 'message': 'invalid credentials' });
    }));
    Passport.serializeUser(function (user, done) {

        done(null, user);
    });
    Passport.deserializeUser(function (obj, done) {

        done(null, obj);
    });


    if (process.env.DEBUG) {
        server.on('internalError', function (event) {

            // Send to console
            console.log(event)
        });
    }

    internals.addRoutes(server);

    server.start(function () {

        console.log('server started on port: ', server.info.port);
    });
};

internals.addRoutes = function (server) {
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

                if (request.session._isAuthenticated()) {
                    request.reply.redirect('/home');
                } else {
                    var form = '<form action="/login" method="post"> <div> <label>Username:</label> <input type="text" name="username"/> </div> <div> <label>Password:</label> <input type="password" name="password"/> </div> <div> <input type="submit" value="Log In"/> </div> </form>';
                    request.reply(form);
                }
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
            request.reply("ACCESS GRANTED<br/><br/><a href='/logout'>Logout</a>");
        }
    });


    server.addRoute({
        method: 'POST',
        path: '/login',
        config: {
            validate: {
                payload: {
                    username: Hapi.types.String(),
                    password: Hapi.types.String()
                }
            },
            auth: false,
            handler: function (request) {

                Passport.authenticate('local', {
                    successRedirect: config.urls.successRedirect,
                    failureRedirect: config.urls.failureRedirect,
                    failureFlash: true
                })(request)
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


    server.addRoute({
        method: 'GET',
        path: '/public/{path}',
        handler: {
            directory: {
                path: './public'
            }
        }
    });
};


internals.startCache(internals.startServer);

