const request = require('request');
const eaeutils = require('eae-utils');
let config = require('../config/opal.interface.test.config.js');
let TestServer = require('./testserver.js');

let ts = new TestServer();
let adminUsername = 'adminUsername';
let adminPassword = 'qwertyUsername';
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

test('Get Job Missing Credentials token', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/job',
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
            expect(response.statusCode).toEqual(401);
            expect(body).toBeDefined();
            expect(body).toEqual({error:'Missing token'});
            done();
        }
    );
});

test('Get Job No jobID', function(done) {
    expect.assertions(4);
    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/job',
            json: true,
            body: {
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
            expect(body).toEqual({error:'The job request do not exit. The query has been logged.'});
            done();
        }
    );
});

test('Create a Job and check it passes successfully', function(done) {
    expect.assertions(5);
    let clusterStatuses = [
        {"_id":"59ef4175f37a81016e88516a","ip":"127.0.0.5","port":3000,"type":"eae_compute","status":"eae_service_busy","statusLock":false,"version":"0.0.1","lastUpdate": new Date(),"hostname":"Arkoi","system":{"arch":"x64","type":"Windows_NT","platform":"win32","version":"10.0.15063"},"cpu":{"cores":[{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408}],"loadavg":[0,0,0]},"memory":{"total":"15.88GB","free":"6.75GB"},"computeType":["python2"],"clusters":{"python2":["146.169.33.32","146.169.33.33"]}},
        {"_id":"59ef4175f37a81016e88516b","ip":"127.0.0.5","port":3002,"type":"eae_scheduler","status":"eae_service_busy","statusLock":false,"version":"0.0.1","lastUpdate": new Date(),"hostname":"Arkoi","system":{"arch":"x64","type":"Windows_NT","platform":"win32","version":"10.0.15063"},"cpu":{"cores":[{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408}],"loadavg":[0,0,0]},"memory":{"total":"15.88GB","free":"6.75GB"}},
        {"_id":"59ef4175f37a81016e88516c","ip":"127.0.0.5","port":3001,"type":"opal_privacy","status":"eae_service_idle","statusLock":false,"version":"0.0.1","lastUpdate": new Date(),"hostname":"Arkoi","system":{"arch":"x64","type":"Windows_NT","platform":"win32","version":"10.0.15063"},"cpu":{"cores":[{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408},{"model":"Intel(R) Core(TM) i7-6700 CPU @ 3.40GHz","mhz":3408}],"loadavg":[0,0,0]},"memory":{"total":"15.88GB","free":"6.75GB"}}];
    let job = JSON.stringify({
        'startDate': '2014-01-01T00:00:00Z',
        'endDate': '2015-12-31T23:00:00Z',
        'algorithmName': 'mobility-long',
        'resolution': 'location_level_1',
        'keySelector': [],
        'sample': 0.1,
        'params': {
            start_window: '2014-01-01T10:00:00Z',
            end_window: '2015-12-31T22:00:00Z'
        }
    });
    ts.addCluster(clusterStatuses).then(function() {
        request(
            {
                method: 'POST',
                baseUrl: 'http://127.0.0.1:' + config.port,
                uri: '/job/create',
                json: true,
                body: {
                    opalUsername: adminUsername,
                    opalUserToken: adminPassword,
                    job: job
                }
            },
            function (error, response, body) {
                if (error) {
                    done.fail(error.toString());
                }
                if (response.statusCode !== 200) {
                    done.fail(body);
                }
                expect(response).toBeDefined();
                expect(response.statusCode).toEqual(200);
                expect(body).toBeDefined();
                expect(body.status).toEqual('OK');
                expect(body.jobID).toBeDefined();
                done();
            });
    }, function (error) {
        done.fail(error.toString());
    });
});


test('Create a Job and subsequently try to create it again', function(done) {
    expect.assertions(9);

    let job = JSON.stringify({
        'startDate': '2014-01-01T00:00:00Z',
        'endDate': '2015-12-31T23:00:00Z',
        'algorithmName': 'density',
        'resolution': 'location_level_1',
        'keySelector': [],
        'sample': 0.1,
        'params': {}
    });

    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/job/create',
            json: true,
            body: {
                opalUserToken: adminPassword,
                job: job
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body.status).toEqual('OK');
            expect(body.jobID).toBeDefined();
            request(
                {
                    method: 'POST',
                    baseUrl: 'http://127.0.0.1:' + config.port,
                    uri: '/job/create',
                    json: true,
                    body: {
                        opalUsername: adminUsername,
                        opalUserToken: adminPassword,
                        job: job
                    }
                }, function(error, response, body) {
                    if (error) {
                        done.fail(error.toString());
                    }
                    expect(response).toBeDefined();
                    expect(response.statusCode).toEqual(200);
                    expect(body).toBeDefined();
                    expect(body.status).toEqual('The Job is being computed. The current status is: ' + eaeutils.Constants.EAE_JOB_STATUS_QUEUED);
                    done();
                });
        }
    );
});

test('Create a Job and subsequently get it', function(done) {
    expect.assertions(11);

    let job = JSON.stringify({
        'startDate': '2014-01-01T00:00:00Z',
        'endDate': '2015-12-31T17:00:00Z',
        'algorithmName': 'density',
        'resolution': 'location_level_1',
        'keySelector': ['Dakar'],
        'sample': 0.1
    });

    request(
        {
            method: 'POST',
            baseUrl: 'http://127.0.0.1:' + config.port,
            uri: '/job/create',
            json: true,
            body: {
                opalUsername: adminUsername,
                opalUserToken: adminPassword,
                job: job
            }
        },
        function(error, response, body) {
            if (error) {
                done.fail(error.toString());
            }
            expect(response).toBeDefined();
            expect(response.statusCode).toEqual(200);
            expect(body).toBeDefined();
            expect(body.status).toEqual('OK');
            expect(body.jobID).toBeDefined();
            request(
                {
                    method: 'POST',
                    baseUrl: 'http://127.0.0.1:' + config.port,
                    uri: '/job',
                    json: true,
                    body: {
                        opalUsername: adminUsername,
                        opalUserToken: adminPassword,
                        jobID: body.jobID
                    }
                }, function(error, response, body) {
                    if (error) {
                        done.fail(error.toString());
                    }
                    expect(response).toBeDefined();
                    expect(response.statusCode).toEqual(200);
                    expect(body).toBeDefined();
                    expect(body.requester).toEqual(adminUsername);
                    expect(body.statusLock).toEqual(false);
                    expect(body.exitCode).toEqual(-1);
                    done();
                });
        }
    );
});

//
// test('Create a Job and subsequently cancel it', function(done) {
//     expect.assertions(10);
//     let job = JSON.stringify({
//         'startDate': new Date(0),
//         'endDate': new Date(15),
//         'algorithmName': 'density',
//         'params': {},
//         'resolution': 'region',
//         'keySelector': 'Dakar',
//         'sample': 0.1
//     });
//     request(
//         {
//             method: 'POST',
//             baseUrl: 'http://127.0.0.1:' + config.port,
//             uri: '/job/create',
//             json: true,
//             body: {
//                 opalUsername: adminUsername,
//                 opalUserToken: adminPassword,
//                 job: job
//             }
//         },
//         function(error, response, body) {
//             if (error) {
//                 done.fail(error.toString());
//             }
//             expect(response).toBeDefined();
//             expect(response.statusCode).toEqual(200);
//             expect(body).toBeDefined();
//             expect(body.status).toEqual('OK');
//             expect(body.jobID).toBeDefined();
//             let jobID = body.jobID;
//             request(
//                 {
//                     method: 'POST',
//                     baseUrl: 'http://127.0.0.1:' + config.port,
//                     uri: '/job/cancel',
//                     json: true,
//                     body: {
//                         opalUsername: adminUsername,
//                         opalUserToken: adminPassword,
//                         jobID: jobID
//                     }
//                 }, function(error, response, body) {
//                     if (error) {
//                         done.fail(error.toString());
//                     }
//                     expect(response).toBeDefined();
//                     expect(response.statusCode).toEqual(200);
//                     expect(body).toBeDefined();
//                     expect(body.status).toEqual('Job ' + jobID + ' has been successfully cancelled.');
//                     expect(body.cancelledJob.status).toEqual([eaeutils.Constants.EAE_JOB_STATUS_CANCELLED, eaeutils.Constants.EAE_JOB_STATUS_QUEUED, eaeutils.Constants.EAE_JOB_STATUS_CREATED]);
//                     done();
//                 });
//         }
//     );
// });

// test('Create a Job with a nonsupported compute type', function(done) {
//     expect.assertions(4);
//     let job = JSON.stringify({"type": "python", "main": "hello.py", "params": [], "input": ["input1.txt", "input2.txt"]});
//     request(
//         {
//             method: 'POST',
//             baseUrl: 'http://127.0.0.1:' + config.port,
//             uri: '/job/create',
//             json: true,
//             body: {
//                 opalUserToken: adminPassword,
//                 job: job
//             }
//         },
//         function(error, response, body) {
//             if (error) {
//                 done.fail(error.toString());
//             }
//             expect(response).toBeDefined();
//             expect(response.statusCode).toEqual(405);
//             expect(body).toBeDefined();
//             expect(body).toEqual({error:'The requested compute type is currently not supported. The list of supported computations: ' +
//                             eaeutils.Constants.EAE_COMPUTE_TYPE_PYTHON2 + ', ' + eaeutils.Constants.EAE_COMPUTE_TYPE_SPARK + ', ' +
//                             eaeutils.Constants.EAE_COMPUTE_TYPE_R + ', ' + eaeutils.Constants.EAE_COMPUTE_TYPE_TENSORFLOW});
//             done();
//         }
//     );
// });


// test('Create a Job and subsequently get it', function(done) {
//     expect.assertions(14);
//     let job = JSON.stringify({"type": eaeutils.Constants.EAE_COMPUTE_TYPE_PYTHON2, "main": "hello.py", "params": [], "input": ["input1.txt", "input2.txt"]});
//     request(
//         {
//             method: 'POST',
//             baseUrl: 'http://127.0.0.1:' + config.port,
//             uri: '/job/create',
//             json: true,
//             body: {
//                 opalUsername: adminUsername,
//                 opalUserToken: adminPassword,
//                 job: job
//             }
//         },
//         function(error, response, body) {
//             if (error) {
//                 done.fail(error.toString());
//             }
//             expect(response).toBeDefined();
//             expect(response.statusCode).toEqual(200);
//             expect(body).toBeDefined();
//             expect(body.status).toEqual('OK');
//             expect(body.jobID).toBeDefined();
//             request(
//                 {
//                     method: 'POST',
//                     baseUrl: 'http://127.0.0.1:' + config.port,
//                     uri: '/job',
//                     json: true,
//                     body: {
//                         opalUsername: adminUsername,
//                         opalUserToken: adminPassword,
//                         jobID: body.jobID
//                     }
//                 }, function(error, response, body) {
//                     if (error) {
//                         done.fail(error.toString());
//                     }
//                     expect(response).toBeDefined();
//                     expect(response.statusCode).toEqual(200);
//                     expect(body).toBeDefined();
//                     expect(body.type).toEqual(eaeutils.Constants.EAE_COMPUTE_TYPE_PYTHON2);
//                     expect(body.requester).toEqual(adminUsername);
//                     expect(body.main).toEqual('hello.py');
//                     expect(body.statusLock).toEqual(false);
//                     expect(body.exitCode).toEqual(-1);
//                     expect(body.input).toEqual([ 'input1.txt', 'input2.txt' ]);
//                     done();
//                 });
//         }
//     );
// });
//
// test('Create a Job and subsequently cancel it', function(done) {
//     expect.assertions(10);
//     let job = JSON.stringify({"type": eaeutils.Constants.EAE_COMPUTE_TYPE_PYTHON2, "main": "hello.py", "params": [], "input": ["input1.txt", "input2.txt"]});
//     request(
//         {
//             method: 'POST',
//             baseUrl: 'http://127.0.0.1:' + config.port,
//             uri: '/job/create',
//             json: true,
//             body: {
//                 opalUsername: adminUsername,
//                 opalUserToken: adminPassword,
//                 job: job
//             }
//         },
//         function(error, response, body) {
//             if (error) {
//                 done.fail(error.toString());
//             }
//             expect(response).toBeDefined();
//             expect(response.statusCode).toEqual(200);
//             expect(body).toBeDefined();
//             expect(body.status).toEqual('OK');
//             expect(body.jobID).toBeDefined();
//             let jobID = body.jobID;
//             request(
//                 {
//                     method: 'POST',
//                     baseUrl: 'http://127.0.0.1:' + config.port,
//                     uri: '/job/cancel',
//                     json: true,
//                     body: {
//                         opalUsername: adminUsername,
//                         opalUserToken: adminPassword,
//                         jobID: jobID
//                     }
//                 }, function(error, response, body) {
//                     if (error) {
//                         done.fail(error.toString());
//                     }
//                     expect(response).toBeDefined();
//                     expect(response.statusCode).toEqual(200);
//                     expect(body).toBeDefined();
//                     expect(body.status).toEqual('Job ' + jobID + ' has been successfully cancelled.');
//                     expect(body.cancelledJob.status).toEqual([eaeutils.Constants.EAE_JOB_STATUS_CANCELLED, eaeutils.Constants.EAE_JOB_STATUS_QUEUED, eaeutils.Constants.EAE_JOB_STATUS_TRANSFERRING_DATA, eaeutils.Constants.EAE_JOB_STATUS_CREATED]);
//                     done();
//                 });
//         }
//     );
// });

afterAll(function() {
    return new Promise(function (resolve, reject) {
        ts.stop().then(function() {
            resolve(true);
        }, function (error) {
            reject(error.toString());
        });
    });
});
