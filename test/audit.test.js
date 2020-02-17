const request = require('request');
let config = require('../config/opal.interface.test.config.js');
let TestServer = require('./testserver.js');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;// 20 seconds

let ts = new TestServer();
let adminUsername = 'adminUsers';
let adminPassword = 'qwertyUsers';
beforeAll(function() {
    return new Promise(function (resolve, reject) {
        ts.run().then(function() {
            ts.addAdminUser(adminUsername, adminPassword).then(function(){
                ts.addAlgorithm().then(function() {
                    resolve(true);
                },function(algoError){
                    reject(algoError);
                });
            },function(insertError){
                reject(insertError);
            });
        }, function (error) {
            reject(error.toString());
        });
    });
});


test('Get public audit with no password', function(done) {
    expect.assertions(3);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/audit',
            json: true,
            body: {
                opalUserToken: null
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(400);
            expect(body).toBeDefined();
            done();
        }
    );
});

test('Get public audit with incorrect password', function(done) {
    expect.assertions(3);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/audit',
            json: true,
            body: {
                opalUserToken: 'alphabeta'
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(401);
            expect(body).toBeDefined();
            done();
        }
    );
});

test('Get public audit with correct password but missing name', function(done) {
    expect.assertions(3);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/audit',
            json: true,
            body: {
                opalUserToken: adminPassword
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(400);
            expect(body).toBeDefined();
            done();
        }
    );
});

test('Get public audit with correct password and correct name', function(done) {
    expect.assertions(3);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/audit',
            json: true,
            body: {
                opalUserToken: adminPassword,
                name: 'ALL_opal_audit.log'
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            done();
        }
    );
});

test('Get private audit with correct password and incorrect details', function(done) {
    expect.assertions(3);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/log/getAccesses',
            json: true,
            body: {
                opalUserToken: adminPassword,
                name: 'ALL_opal_audit.log'
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(400);
            expect(body).toBeDefined();
            done();
        }
    );
});

test('Get private audit with correct password and correct details', function(done) {
    expect.assertions(3);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/log/getAccesses',
            json: true,
            body: {
                opalUserToken: adminPassword,
                numberOfRecords: 10,
                logType: 'audit'
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            done();
        }
    );
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
