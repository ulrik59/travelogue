// Load modules

var Hapi = require('hapi');
var Lab = require('lab');
var LocalStrategy = require('passport-local');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;


describe('Travelogue', function () {

    var config = {
        urls: {
            failureRedirect: '/login',
            successRedirect: '/'
        }
    };
        
    var plugins = {
        yar: {
            cookieOptions: {
                password: 'worldofwalmart'
            }
        },
        '../': config
    };
    
    var server = new Hapi.Server(0);

    before(function (done) {
        
        server.plugin.allow({ ext: true }).require(plugins, function (err) {
            
            expect(err).to.not.exist;
            
            var USERS = {
                'van': 'walmart'
            };

            var passport = server.plugins.travelogue.passport;
            passport.use(new LocalStrategy.Strategy(function (username, password, done) {

                // Find or create user here...
                // In production, use password hashing like bcrypt
                if (USERS.hasOwnProperty(username) && USERS[username] == password) {
                    return done(null, {username: username});
                }
    
                return done(null, false, {'message': 'invalid credentials'});
            }));
            
            passport.serializeUser(function(user, done) {

                done(null, user);
            });
            
            passport.deserializeUser(function(obj, done) {

                done(null, obj);
            });

            // addRoutes
            server.addRoute({
                method: 'GET',
                path: '/',
                config: { auth: 'passport' },
                handler: function () {

                    this.reply.redirect('/home').send();        // If logged in already, redirect to /home, otherwise to /login
                }
            });

            server.addRoute({
                method: 'GET',
                path: '/login',
                handler: function (request) {

                    var form = '<form action="/login" method="post"> <div> <label>Username:</label> <input type="text" name="username"/> </div> <div> <label>Password:</label> <input type="password" name="password"/> </div> <div> <input type="submit" value="Log In"/> </div> </form>';
                    request.reply(form);
                }
            });

            server.addRoute({
                method: 'GET',
                path: '/home',
                config: { auth: 'passport' },
                handler: function () {

                    this.reply('ACCESS GRANTED');               // If logged in already, redirect to /home, otherwise to /login
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
                        passport.authenticate('local', { 
                            successRedirect: config.urls.successRedirect,
                            failureRedirect: config.urls.failureRedirect,
                            failureFlash: true
                        })(request);
                    }
                }
            });

            server.addRoute({
                method: 'GET',
                path: '/session',
                handler: function (request) {

                    request.reply(request.session._store._flash);
                }
            });

            server.start(function (err) {
                
                done();
            })
        });
    });

    it('should allow for login via POST', function (done) {

        var body = {
            username: 'van',
            password: 'walmart'
        };
        var request = { 
            method: 'POST',
            url: '/login',
            payload: JSON.stringify(body)
        };
        server.inject(request, function (res) {

            var header = res.headers['set-cookie'];
            var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

            expect(res.statusCode).to.equal(302);
            var redirect = {
                method: 'GET',
                url: res.headers.location,
                headers: {
                    cookie: cookie[1]
                }
            };
            server.inject(redirect, function (res) {

                expect(res.result).to.equal('You are being redirected...');
                expect(res.statusCode).to.equal(302);
                var redirect = {
                    method: 'GET',
                    url: res.headers.location,
                    headers: {
                        cookie: cookie[1]
                    }
                };
                server.inject(redirect, function (res) {

                    expect(res.result).to.equal('ACCESS GRANTED');
                    done();
                });
            });
        });
    });
    
   it('should flash error if invalid credentials used', function (done) {

        var body = {
            username: 'van',
            password: 'xwalmartx'
        };
        var request = { 
            method: 'POST',
            url: '/login',
            payload: JSON.stringify(body)
        };
        server.inject(request, function (res) {
            
            var header = res.headers['set-cookie'];
            var cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

            var readSession = {
                method: 'GET',
                url: '/session',
                headers: {
                    cookie: cookie[1]
                }
            };
            server.inject(readSession, function (res) {

                expect(res.result).to.exist;
                expect(res.result.error).to.exist;
                expect(res.result.error.length).to.be.above(0);
                done();
            });
        });
    });
});