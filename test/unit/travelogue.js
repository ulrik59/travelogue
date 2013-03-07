// Load modules

var Chai = require('chai');
var Travelogue = require('../..');
var Hapi = require('hapi');
var Passport = require('passport');

// Declare internals

var internals = {};


// Test shortcuts

var expect = Chai.expect;


describe('Travelogue', function () {

    describe('#configure', function () {

        it('should accept config arguments in the v0.2.0 format', function (done) {

            var config = {
                "port": 8000,
                "travelogue": {
                    "secret": "worldofwalmart"
                }
            };
            
            var server = new Hapi.Server('localhost', config.port);
            Travelogue.configure(server, Passport, config);
            
            // console.log(Travelogue.settings);
            
            done();
        });

        it('should accept config arguments in the v0.1.1 format', function (done) {

            var config = {
                "port": 8000,
                "yar": {
                    "cookieOptions": {
                        "password": "worldofwalmart"
                    },
                    "session": true
                }
            };
            
            var server = new Hapi.Server('localhost', config.port);
            Travelogue.configure(server, Passport, config);
            
            // console.log(Travelogue.settings);
            
            done();
        });
    });
    
});