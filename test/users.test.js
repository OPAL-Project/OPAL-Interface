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



test('Get user Missing Credentials Token', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/user',
            json: true,
            body: {
                opalUsername: 'test',
                opalUserToken: null
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(401);
            expect(body).toBeDefined();
            expect(body).toEqual({error:'Missing token'});
            done();
        }
    );
});

test('Get user Invalid Credentials', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/user',
            json: true,
            body: {
                opalUsername: 'test',
                opalUserToken: 'wrongpassword'
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(401);
            expect(body).toBeDefined();
            expect(body).toEqual({error:'Unauthorized access. The unauthorized access has been logged.'});
            done();
        }
    );
});

test('Get user Admin previously created', function(done) {
    expect.assertions(5);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/user',
            json: true,
            body: {
                opalUsername: adminUsername,
                opalUserToken: adminPassword,
                requestedUsername: adminUsername
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body.username).toEqual(adminUsername);
            expect(body.token).toEqual(adminPassword);
            done();
        }
    );
});

test('Get user that doesn\'t exist', function(done) {
    expect.assertions(4);
    let requestedUsername = 'DodgyDude';
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/user',
            json: true,
            body: {
                opalUsername: adminUsername,
                opalUserToken: adminPassword,
                requestedUsername: requestedUsername
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(401);
            expect(body).toBeDefined();
            expect(body).toEqual('User ' + requestedUsername + ' doesn\'t exist.');
            done();
        }
    );
});

test('Get All standard Users (when there is none)', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/user/getAll',
            json: true,
            body: {
                opalUsername: adminUsername,
                opalUserToken: adminPassword,
                userType: 'STANDARD'
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body).toEqual([]);
            done();
        });
});

test('Create a new user', function(done) {
    expect.assertions(6);
    let newUser = JSON.stringify({"username": "NotLegit", "authorizedAlgorithms": {"density":"cache_only"} , "defaultAccessLevel":"location_level_2"});
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/user/create',
            json: true,
            body: {
                opalUserToken: adminPassword,
                newUser: newUser
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body.token).toBeDefined();
            expect(body.authorizedAlgorithms["density"]).toEqual("cache_only");
            expect(body.defaultAccessLevel).toEqual("location_level_2");
            done();
        });
});

test('Update newly created user\'s default access level', function(done) {
    expect.assertions(6);
    let userToBeUpdated = "NotLegit";
    let userUpdate = JSON.stringify({ "authorizedAlgorithms": {"density":"location_level_1"} , "defaultAccessLevel":"location_level_1"});
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/user/update',
            json: true,
            body: {
                opalUserToken: adminPassword,
                userUpdate: userUpdate,
                userToBeUpdated: userToBeUpdated
        }},
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body.new.token).toBeDefined();
            expect(body.new.authorizedAlgorithms["density"]).toEqual("location_level_1");
            expect(body.new.defaultAccessLevel).toEqual("location_level_1");
            done();
        });
});

test('Reset user password', function(done) {
    expect.assertions(4);
    let userToBeUpdated = "NotLegit";
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/user/resetPassword',
            json: true,
            body: {
                opalUserToken: adminPassword,
                userToBeUpdated: userToBeUpdated
            }},
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body.newPassword).toBeDefined();
            done();
        });
});


test('Get All Users', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/user/getAll',
            json: true,
            body: {
                opalUsername: adminUsername,
                opalUserToken: adminPassword,
                userType: 'all'    //should be 'ALL' but API converts input userType to uppercase automatically
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body).toEqual([{username: 'adminUsers'},{username: 'NotLegit'}]);
            done();
        });
});

test('Get All Admin Users', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/user/getAll',
            json: true,
            body: {
                opalUserToken: adminPassword,
                userType: 'admin'     //the defined usertype is 'ADMIN' but API converts input userType to uppercase automatically

            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body).toEqual([{username: 'adminUsers'}]);
            done();
        });
});

test('Get All standard Users', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/user/getAll',
            json: true,
            body: {
                opalUsername: adminUsername,
                opalUserToken: adminPassword,
                userType: 'STANDARD'
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body).toEqual([{username: 'NotLegit'}]);
            done();
        });
});

test('Delete a user', function(done) {
    expect.assertions(8);
    let userToBeDeleted = 'NotLegit';
    request(
        {
            method: 'DELETE',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/user/delete',
            json: true,
            body: {
                opalUsername: adminUsername,
                opalUserToken: adminPassword,
                userToBeDeleted: userToBeDeleted
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body).toEqual('The user ' + userToBeDeleted + ' has been successfully deleted');
            request(
                {
                    method: 'POST',
                    baseUrl: 'http://127.0.0.1:' + config.port,
                    uri: '/user',
                    json: true,
                    body: {
                        opalUsername: adminUsername,
                        opalUserToken: adminPassword,
                        requestedUsername: userToBeDeleted
                    }
                },
                function(error, response, body) {
                    if (error) {
                        done.fail(error.toString());
                    }
                    expect(response).toBeDefined();
                    expect(response.statusCode).toEqual(401);
                    expect(body).toBeDefined();
                    expect(body).toEqual('User ' + userToBeDeleted + ' doesn\'t exist.');
                    done();
                });
        });
});

test('Create a new admin user but not superAdmin and the new admin subsequently fails to create another admin user.', function(done) {
    expect.assertions(11);
    let newAdmin = JSON.stringify({'username': 'MySuperDupperAdmin', 'type': 'ADMIN'});
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/user/create',
            json: true,
            body: {
                opalUserToken: adminPassword,
                newUser: newAdmin
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body.token).toBeDefined();
            expect(body.type).toEqual('ADMIN');
            expect(body.isSuperAdmin).toBeFalsy();
            expect(body.defaultAccessLevel).toEqual('none');

            let superDupperToken = body.token;
            let newFailedUser = JSON.stringify({'username': 'FailedAdmin', 'type': 'ADMIN'});
            request(
                {
                    method: 'POST',
                    baseUrl: 'http://127.0.0.1:' + config.port,
                    uri: '/user/create',
                    json: true,
                    body: {
                        opalUserToken: superDupperToken,
                        newUser: newFailedUser
                    }
                },
                function(error, response2, body2) {
                    if (error) {
                        done.fail(error.toString());
                    }
                    expect(response2).toBeDefined();
                    expect(response2.statusCode).toEqual(403);
                    expect(body2).toBeDefined();
                    expect(body2.error).toEqual('The requesting user is admin but not superAdmin so the request to create a ' +
                        'new admin is forbidden. Please contact a superAdmin to add the user. The unauthorized request has been logged.');
                    done();
                });
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
