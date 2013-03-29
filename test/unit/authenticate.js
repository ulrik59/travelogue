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
var LocalStrategy = require('passport-local');


describe('#authenticate', function () {

    it('should accept function in place of options', function (done) {

        var authenticate = Travelogue.internals.authenticate('local', function (err) {});
        expect(authenticate).to.exist;
        done();
    });
    
});