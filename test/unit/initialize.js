// Load modules

var Travelogue = require('../../');
var Lab = require('lab');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;


describe('#initialize', function () {

    var initialize = Travelogue.internals.initialize();
    
    it('should generate new session if request.session undefined', function (done) {

        var request = {};
        initialize(request, function (err) {

            expect(err).to.not.exist;
            done();
        });
    });
    
    describe("request functions", function () {

        describe("#login", function () {

            it('should throw if request has no _passport element', function (done) {

                var request = {};
                initialize(request, function (err) {

                    expect(err).to.not.exist;
                    expect(request.login).to.exist;
                    
                    delete request._passport;
                    var test = (function(){ 

                        request.login({}, {}, function() {})
                    });
                    expect(test).to.throw();
                    done();
                });
            });
                
            it('should accept function in place of options', function (done) {

                var request = {};
                initialize(request, function (err) {

                    expect(err).to.not.exist;
                    expect(request.login).to.exist;
                    delete request.session; // ignore session related code
                    request.login({}, function (err) {

                        expect(err).to.not.exist;
                        done();
                    });
                });
            });
        });

        describe("#logout", function () {

            it('should throw if request has no _passport element', function (done) {

                var request = {};
                initialize(request, function (err) {

                    expect(err).to.not.exist;
                    expect(request.logout).to.exist;
                    
                    delete request._passport;
                    var test = (function(){ 

                        request.logout({}, {}, function() {})
                    });
                    expect(test).to.throw();
                    done();
                });
            });
                
            it('should accept function in place of options', function (done) {

                var request = {};
                initialize(request, function (err) {

                    expect(err).to.not.exist;
                    expect(request.logout).to.exist;
                    request.logout();
                    done();
                });
            });
        });
    });
});