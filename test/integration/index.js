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
        },
        excludePaths: ['/public/']
    };

    var plugins = {
        yar: {
            cookieOptions: {
                password: 'secret'
            }
        },
        '../../': config
    };

    var server = new Hapi.Server(0);

    before(function (done) {

        server.pack.allow({ ext: true }).require(plugins, function (err) {

            expect(err).to.not.exist;

            var USERS = {
                'john': 'doe',
                'doe': 'john'
            };

            var passport = server.plugins.travelogue.passport;
            passport.use(new LocalStrategy.Strategy(function (username, password, done) {

                // Find or create user here...
                // In production, use password hashing like bcrypt
                if (USERS.hasOwnProperty(username) && USERS[username] == password) {
                    return done(null, { username: username });
                }

                return done(null, false, { 'message': 'invalid credentials' });
            }));

            passport.serializeUser(function (user, done) {

                var err = null;
                if (user.username == 'doe') {
                    err = 'test serializeUser err';
                }
                done(err, user);
            });

            passport.deserializeUser(function (obj, done) {

                done(null, obj);
            });

            // addRoutes
            server.addRoute({
                method: 'GET',
                path: '/',
                config: { auth: 'passport' },
                handler: function () {

                    this.reply.redirect('/home');        // If logged in already, redirect to /home, otherwise to /login
                }
            });

            server.addRoute({
                method: 'GET',
                path: '/login',
                handler: function (request) {

                    var form = '<form action="/login" method="post"> <div> <label>Username:</label> <input type="text" name="username"/> </div> <div> <label>Password:</label> <input type="password" name="password"/> </div> <div> <input type="submit" value="Log In"/> </div> </form>';
                    if (request.session) {
                        form += '<br/><br/><pre><span style="background-color: #eee">session: ' + JSON.stringify(request.session) + '</span></pre>';
                    }
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
                        payload: {
                            username: Hapi.types.String(),
                            password: Hapi.types.String()
                        }
                    },
                    handler: function (request) {

                        passport.authenticate('local', {
                            successRedirect: config.urls.successRedirect,
                            failureRedirect: config.urls.failureRedirect,
                            failureFlash: true,
                            successFlash: true,
                            successMessage: true,
                            assignProperty: true,
                            failureMessage: true
                        })(request);
                    }
                }
            });

            server.addRoute({
                method: 'POST',
                path: '/login2',
                config: {
                    validate: {
                        payload: {
                            username: Hapi.types.String(),
                            password: Hapi.types.String()
                        }
                    },
                    handler: function (request) {

                        // request.body = request.payload; // Not needed in 0.0.2 but kept for reference
                        request.session.returnTo = '/session'
                        passport.authenticate('local', {
                            successRedirect: config.urls.successRedirect,
                            failureRedirect: config.urls.failureRedirect,
                            successFlash: true,
                            failureMessage: 'not logged in',
                            failureFlash: 'not logged in',
                            successReturnToOrRedirect: request.session.returnTo
                        })(request);
                    }
                }
            });

            server.addRoute({
                method: 'POST',
                path: '/login3',
                config: {
                    validate: {
                        payload: {
                            username: Hapi.types.String(),
                            password: Hapi.types.String()
                        }
                    },
                    handler: function (request) {

                        // request.body = request.payload; // Not needed in 0.0.2 but kept for reference
                        passport.authenticate('local', {
                            failureRedirect: config.urls.failureRedirect,
                            authInfo: true
                        })(request, function () {

                            request.reply('ohai');
                        });
                    }
                }
            });

            server.addRoute({
                method: 'POST',
                path: '/loginAuthCallback',
                config: {
                    validate: {
                        payload: {
                            username: Hapi.types.String(),
                            password: Hapi.types.String()
                        }
                    },
                    handler: function (request) {

                        // request.body = request.payload; // Not needed in 0.0.2 but kept for reference
                        passport.authenticate('local', {
                            failureRedirect: config.urls.failureRedirect,
                            authInfo: true
                        }, function () {

                            request.reply('ohai');
                        })(request);
                    }
                }
            });

            server.addRoute({
                method: 'POST',
                path: '/loginSuccessMessage',
                config: {
                    validate: {
                        payload: {
                            username: Hapi.types.String(),
                            password: Hapi.types.String()
                        }
                    },
                    handler: function (request) {

                        // request.body = request.payload; // Not needed in 0.0.2 but kept for reference
                        passport.authenticate('local', {
                            successRedirect: config.urls.successRedirect,
                            failureRedirect: config.urls.failureRedirect,
                            successMessage: 'logged in',
                            successFlash: 'logged in'
                        })(request);
                    }
                }
            });

            server.addRoute({
                method: 'POST',
                path: '/loginFailure',
                config: {
                    validate: {
                        payload: {
                            username: Hapi.types.String(),
                            password: Hapi.types.String()
                        }
                    },
                    handler: function (request) {

                        // request.body = request.payload; // Not needed in 0.0.2 but kept for reference
                        passport.authenticate('local', {

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
            username: 'john',
            password: 'doe'
        };
        var request = {
            method: 'POST',
            url: '/login',
            payload: JSON.stringify(body)
        };

        server.inject(request, function (res) {

            var header = res.headers['set-cookie'];
            expect(header).to.exist;
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

    it('should redirect on fail serializeUser', function (done) {

        var body = {
            username: 'doe',
            password: 'john'
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

                expect(res.result).to.contain('form');
                done();
            });
        });
    });

    it('should allow for login via POST with successReturnToOrRedirect', function (done) {

        var body = {
            username: 'john',
            password: 'doe'
        };
        var request = {
            method: 'POST',
            url: '/login2',
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
                    done();
                });
            });
        });
    });

    it('should authenticate and passthrough to handler', function (done) {

        var body = {
            username: 'john',
            password: 'doe'
        };
        var request = {
            method: 'POST',
            url: '/login3',
            payload: JSON.stringify(body)
        };
        server.inject(request, function (res) {

            expect(res.result).to.exist;
            expect(res.result).to.equal('ohai');
            done();
        });
    });

    it('should authenticate and passthrough to callback', function (done) {

        var body = {
            username: 'john',
            password: 'doe'
        };
        var request = {
            method: 'POST',
            url: '/loginAuthCallback',
            payload: JSON.stringify(body)
        };
        server.inject(request, function (res) {

            expect(res.result).to.exist;
            expect(res.result).to.equal('ohai');
            done();
        });
    });

    it('should show string versions of flash messages', function (done) {

        var body = {
            username: 'john',
            password: 'doe'
        };
        var request = {
            method: 'POST',
            url: '/loginSuccessMessage',
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
                    done();
                });
            });
        });
    });

    it('should flash error if invalid credentials used (failureMessage)', function (done) {

        var body = {
            username: 'john',
            password: 'xwalmartx'
        };
        var request = {
            method: 'POST',
            url: '/loginFailure',
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
                done();
            });
        });
    });

    it('should flash error if invalid credentials used', function (done) {

        var body = {
            username: 'john',
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

    it('should flash string error if invalid credentials used', function (done) {

        var body = {
            username: 'john',
            password: 'xwalmartx'
        };
        var request = {
            method: 'POST',
            url: '/login2',
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

    it('should redirect if invalid credentials used and attempt to access restricted page', function (done) {

        var body = {
            username: 'john',
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
                url: '/home',
                headers: {
                    cookie: cookie[1]
                }
            };
            server.inject(readSession, function (res) {

                expect(res.result).to.exist;
                done();
            });
        });
    });
});
