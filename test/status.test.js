const request = require('request');
const eaeutils = require('eae-utils');
let config = require('../config/opal.interface.test.config.js');
let TestServer = require('./testserver.js');

let ts = new TestServer();
beforeAll(function() {
    return new Promise(function (resolve, reject) {
        ts.run().then(function() {
            jest.setTimeout(20000);
            resolve(true);
        }, function (error) {
            reject(error.toString());
        });
    });
});

test('Service status IDLE', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'GET',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/status',
            json: true
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body.status).toEqual(eaeutils.Constants.EAE_SERVICE_STATUS_IDLE);
            done();
        }
    );
});

test('Service specs', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'GET',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/specs',
            json: true
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body.type).toEqual(eaeutils.Constants.EAE_SERVICE_TYPE_API);
            done();
    });
});

afterAll(function() {
    return new Promise(function (resolve, reject) {
        ts.stop().then(function() {
            resolve(true);
        }, function (error) {
            reject(error.toString());
        });
    });
});
