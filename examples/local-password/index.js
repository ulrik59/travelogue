var Hapi = require('hapi');
var LocalStrategy = require('passport-local').Strategy;


var config = {
    hostname: 'localhost',
    port: 8000,
    urls: {
        failureRedirect: '/login'
    }
};
var plugins = {
    yar: {
        cookieOptions: {
            password: "worldofwalmart",
            isSecure: false
        }
    }
    travelogue: config // use '../../' instead of travelogue if testing locally
}

var server = new Hapi.Server(config.hostname, config.port);
server.plugin.allow({ ext: true }).require(plugins, function (err) {

    if (err) {
        throw err;
    }
});


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
        request.reply.redirect('/home').send();
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
    config: { auth: 'passport' },
    handler: function (request) {

        // If logged in already, redirect to /home
        // else to /login
        request.reply("ACCESS GRANTED");
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

            Passport.authenticate('local', { 
                successRedirect: config.passport.urls.successRedirect,
                failureRedirect: config.passport.urls.failureRedirect,
                failureFlash: true
            })(request)
        }
    }
});

server.addRoute({
    method: 'GET',
    path: '/clear',
    config: {
        handler: function (request) {

            request.session.reset();
            request.reply.redirect('/session').send();
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