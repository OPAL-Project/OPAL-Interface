const request = require('request');
const { ErrorHelper } = require('eae-utils');
let config = require('../config/opal.interface.test.config.js');
let TestServer = require('./testserver.js');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;// 20 seconds

let ts = new TestServer();
let adminUsername = 'adminCluster';
let adminPassword = 'qwertyCluster';
beforeAll(function() {
    return new Promise(function (resolve, reject) {
        ts.run().then(function() {
            ts.addAdminUser(adminUsername, adminPassword).then(function(){
                resolve(true);
            },function(insertError){
                reject(insertError);
            });
        }, function (error) {
            reject(error.toString());
        });
    });
});


test('Cluster Status Missing Credentials Token', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/servicesStatus',
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

test('Cluster Status Invalid Credentials', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/servicesStatus',
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

test('Cluster Status User Unauthorized Access Attempt', function(done) {
    expect.assertions(7);
    let newUser =  JSON.stringify({"username": "RandomCluster"});
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/user/create',
            json: true,
            body: {
                    opalUsername: adminUsername,
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
            delete body._id;
            newUser = body;

            request(
                {
                    method: 'POST',
                    baseUrl: 'http://127.0.0.1:' + config.port,
                    uri: '/servicesStatus',
                    json: true,
                    body: {
                        opalUsername: 'RandomCluster',
                        opalUserToken: newUser.token
                    }
                },
                function(error, response, body) {
                    if (error) {
                        done.fail(error.toString());
                    }
                    expect(response).toBeDefined();
                    expect(response.statusCode).toEqual(401);
                    expect(body).toBeDefined();
                    expect(body).toEqual({error:'The user is not authorized to access this command'});
                    done();
                }
            );
        });
});

test('Get Cluster Status', function(done) {
    expect.assertions(3);
    let clusterStatuses = [{"_id":"59ef4175f37a81016e88516a","ip":"127.0.0.5","port":3000,"type":"eae_compute","status":"eae_service_idle","statusLock":false,"version":"0.0.1","lastUpdate":"2017-10-20T16:22:09.365Z","hostname":"Arkoi","system":{"arch":"x64","type":"Windows_NT","platform":"win32","version":"10.0.15063"},"cpu":{"cores":[{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408}],"loadavg":[0,0,0]},"memory":{"total":"15.88GB","free":"6.75GB"},"computeType":["python2"],"clusters":{"python2":["146.169.33.32","146.169.33.33"]}},{"_id":"59fcaa7b09cddc5d8a5f74db","ip":"127.0.0.7","port":8080,"type":"eae_api","computeType":[],"status":"eae_service_idle","statusLock":false,"version":"0.0.2","lastUpdate":"2017-11-03T17:42:59.458Z","hostname":"Arkoi","system":{"arch":"x64","type":"Windows_NT","platform":"win32","version":"10.0.16299"},"cpu":{"cores":[{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408}],"loadavg":[0,0,0]},"memory":{"total":"15.88GB","free":"8.03GB"}}];
    ts.addCluster(clusterStatuses).then(function(){
        request(
            {
                method: 'POST',
                baseUrl: 'http://127.0.0.1:' + config.port,
                uri: '/servicesStatus',
                json: true,
                body: {
                    opalUsername: adminUsername,
                    opalUserToken: adminPassword
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
    },function(error){
        done.fail(error.toString());
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

