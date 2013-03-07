// Load modules

var Chai = require('chai');
var Travelogue = require('../..');
var Hapi = require('hapi');
var Passport = require('passport');
var LocalStrategy = require('passport-local');

var Example = require('../examples/local');
var CreateFollowRedirect = require('../helpers/redirect').FollowRedirect;
var FollowRedirect = CreateFollowRedirect(Example.server);

// Declare internals

var internals = {};


// Test shortcuts

var expect = Chai.expect;


describe('passport-local', function () {

    describe('login', function () {
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
            Example.server.inject(request, FollowRedirect(function (res) {

                expect(res.result).to.equal(Example.successMessage);
                done();
            }));
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
            Example.server.inject(request, FollowRedirect(function (res, cookie) {

                var readSession = {
                    method: 'GET',
                    url: '/session',
                    headers: {
                        cookie: cookie
                    }
                };
                Example.server.inject(readSession, FollowRedirect(function (res) {

                    var body = JSON.parse(res.result);
                    expect(body.flash).to.exist;
                    expect(body.flash.error).to.exist;
                    expect(body.flash.error.length).to.be.above(0);
                    done();
                }));
            }));
        })
    })
});