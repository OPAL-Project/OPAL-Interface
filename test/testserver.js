let express = require('express');
let OpalInterface = require('../src/opalInterface.js');
let config = require('../config/opal.interface.test.config.js');
const uuidv4 = require('uuid/v4');
const request = require('request');
const { interface_constants, interface_models } = require('../src/core/models.js');

function TestServer() {
    // Bind member vars
    this._app = express();

    // Bind member functions
    this.run = TestServer.prototype.run.bind(this);
    this.stop = TestServer.prototype.stop.bind(this);
    this.addAdminUser = TestServer.prototype.addAdminUser.bind(this);
    this.addCluster = TestServer.prototype.addCluster.bind(this);
    this.addAlgorithm = TestServer.prototype.addAlgorithm.bind(this);
    this.clean = TestServer.prototype.clean.bind(this);
}

TestServer.prototype.run = function() {
    let _this = this;
    return new Promise(function(resolve, reject) {
        // Setup node env to test during test
        process.env.TEST = 1;
        // let oldMongoConfig = config.mongoURL;
        //TODO: I had to comment the line below because otherwise cache couldn't access same database
        // config.mongoURL = oldMongoConfig + uuidv4().toString().replace(/-/g, '');

        // Create opal interface server
        _this.opal_interface = new OpalInterface(config);

        // Start server
        _this.opal_interface.start().then(function (interface_router) {
            _this._app.use(interface_router);
            _this._server = _this._app.listen(config.port, function (error) {
                if (error)
                    reject(error);
                else {
                    _this.clean().then(function () {
                        resolve(true);
                    }).catch(function (error) {
                        reject(error);
                    });
                }
            });
        }, function (error) {
            reject(error);
        });
    });
};

TestServer.prototype.stop = function() {
    let _this = this;
    return new Promise(function(resolve, reject) {
        // Remove test flag from env
        delete process.env.TEST;
        _this.clean().then(function () {
            _this.opal_interface.stop().then(function() {
                _this._server.close(function(error) {
                    if (error) {
                        reject(error);
                    }else{
                        resolve(true);
                    }
                });
            });
        }).catch(function (error) {
            reject(error);
        });
    });
};

TestServer.prototype.clean = function(){
    let _this = this;
    return new Promise(function (resolve, reject){
        _this.opal_interface.db.listCollections().toArray(function (err, collectionNames) {
            if (err) {
                reject(err);
            } else{
                collectionNames.forEach(function (colName) {
                    _this.opal_interface.db.collection(colName.name).deleteMany({}).then(function () {
                        resolve(true);
                    }, function (error) {
                        reject(error);
                    });
                });
            }
        });
    });
};

TestServer.prototype.addAdminUser = function(username, password){
    let _this = this;
    return new Promise(function(resolve, reject) {
        let admin = {
            type: interface_constants.USER_TYPE.admin,
            isSuperAdmin: true,
            username : username,
            token: password,
            defaultAccessLevel : "location_level_1",
            authorizedAlgorithms : {
                "density" : "location_level_1"
            }
        };
        let adminUser = Object.assign({}, interface_models.USER_MODEL , admin);
        _this.opal_interface.usersController._usersCollection.insertOne(adminUser).then(function () {
            resolve(true);
        }, function (error) {
            reject(error);
        });
    });
};

TestServer.prototype.addAlgorithm = function(){
    return new Promise(function(resolve, reject) {
        let algo = {"algoName":"density",
            "description":"Population density",
            "algorithm":{"code": "IyAtKi0gY29kaW5nOiB1dGYtOCAtKi0NCiIiIkNhbGN1bGF0ZSBwb3B1bGF0aW9uIGRlbnNpdHkuIiIiDQpmcm9tIG9wYWxhbGdvcml0aG1zLmNvcmUgaW1wb3J0IE9QQUxBbGdvcml0aG0NCmltcG9ydCBjc3YNCmltcG9ydCBvcGVyYXRvcg0KDQoNCmNsYXNzIFBvcHVsYXRpb25EZW5zaXR5KE9QQUxBbGdvcml0aG0pOg0KICAgICIiIkNhbGN1bGF0ZSBwb3B1bGF0aW9uIGRlbnNpdHkuIiIiDQoNCiAgICBkZWYgX19pbml0X18oc2VsZik6DQogICAgICAgICIiIkluaXRpYWxpemUgcG9wdWxhdGlvbiBkZW5zaXR5LiIiIg0KICAgICAgICBzdXBlcihQb3B1bGF0aW9uRGVuc2l0eSwgc2VsZikuX19pbml0X18oKQ0KDQogICAgZGVmIG1hcChzZWxmLCB1c2VyX2Nzdl9maWxlKToNCiAgICAgICAgIiIiTWFwcGluZyB1c2VyX2Nzdl9maWxlIHRvIHVzZXIgYW5kIG1vc3QgdXNlZCBhbnRlbm5hLiIiIg0KICAgICAgICBhbnRlbm5hcyA9IGRpY3QoKQ0KICAgICAgICB3aXRoIG9wZW4odXNlcl9jc3ZfZmlsZSwgJ3InKSBhcyBjc3ZfZmlsZToNCiAgICAgICAgICAgIGNzdl9yZWFkZXIgPSBjc3YucmVhZGVyKGNzdl9maWxlLCBkZWxpbWl0ZXI9JywnKQ0KICAgICAgICAgICAgZm9yIHJvdyBpbiBjc3ZfcmVhZGVyOg0KICAgICAgICAgICAgICAgIGEgPSBzdHIocm93WzVdKQ0KICAgICAgICAgICAgICAgIGlmIGEgaW4gYW50ZW5uYXM6DQogICAgICAgICAgICAgICAgICAgIGFudGVubmFzW2FdICs9IDENCiAgICAgICAgICAgICAgICBlbHNlOg0KICAgICAgICAgICAgICAgICAgICBhbnRlbm5hc1thXSA9IDENCiAgICAgICAgYW50ZW5uYSA9IG1heChhbnRlbm5hcy5pdGVtcygpLCBrZXk9b3BlcmF0b3IuaXRlbWdldHRlcigxKSlbMF0NCiAgICAgICAgcmV0dXJuIGFudGVubmENCg0KICAgIGRlZiByZWR1Y2Uoc2VsZiwgcmVzdWx0c19jc3ZfZmlsZSk6DQogICAgICAgICIiIkNvbnZlcnQgcmVzdWx0cyB0byBjb3VudCBvZiBwb3B1bGF0aW9uIHBlciBhbnRlbm5hLiIiIg0KICAgICAgICBkZW5zaXR5ID0gZGljdCgpDQogICAgICAgIHdpdGggb3BlbihyZXN1bHRzX2Nzdl9maWxlLCAncicpIGFzIGNzdl9maWxlOg0KICAgICAgICAgICAgY3N2X3JlYWRlciA9IGNzdi5yZWFkZXIoY3N2X2ZpbGUsIGRlbGltaXRlcj0nICcpDQogICAgICAgICAgICBmb3Igcm93IGluIGNzdl9yZWFkZXI6DQogICAgICAgICAgICAgICAgYSA9IHN0cihyb3dbMV0pDQogICAgICAgICAgICAgICAgaWYgYSBpbiBkZW5zaXR5Og0KICAgICAgICAgICAgICAgICAgICBkZW5zaXR5W2FdICs9IDENCiAgICAgICAgICAgICAgICBlbHNlOg0KICAgICAgICAgICAgICAgICAgICBkZW5zaXR5W2FdID0gMQ0KICAgICAgICByZXR1cm4gZGVuc2l0eQ0K" , "className":"PopulationDensity", "reducer":"aggregation_count"},
            "filename":"popDensity.py"};
        request({
            method: 'POST',
            baseUrl: config.algoServiceURL,
            uri: '/add',
            body: algo,
            json: true
        }, function(error, response, _unused__body) {
            if (error) {
                reject(error.toString());
            }
            if(response.statusCode === 200) {
                let algo = {"algoName":"mobility-long",
                    "description":"Population mobility",
                    "algorithm":{"code": "IyAtKi0gY29kaW5nOiB1dGYtOCAtKi0NCiIiIkNhbGN1bGF0ZSBwb3B1bGF0aW9uIGRlbnNpdHkuIiIiDQpmcm9tIG9wYWxhbGdvcml0aG1zLmNvcmUgaW1wb3J0IE9QQUxBbGdvcml0aG0NCmltcG9ydCBjc3YNCmltcG9ydCBvcGVyYXRvcg0KDQoNCmNsYXNzIFBvcHVsYXRpb25EZW5zaXR5KE9QQUxBbGdvcml0aG0pOg0KICAgICIiIkNhbGN1bGF0ZSBwb3B1bGF0aW9uIGRlbnNpdHkuIiIiDQoNCiAgICBkZWYgX19pbml0X18oc2VsZik6DQogICAgICAgICIiIkluaXRpYWxpemUgcG9wdWxhdGlvbiBkZW5zaXR5LiIiIg0KICAgICAgICBzdXBlcihQb3B1bGF0aW9uRGVuc2l0eSwgc2VsZikuX19pbml0X18oKQ0KDQogICAgZGVmIG1hcChzZWxmLCB1c2VyX2Nzdl9maWxlKToNCiAgICAgICAgIiIiTWFwcGluZyB1c2VyX2Nzdl9maWxlIHRvIHVzZXIgYW5kIG1vc3QgdXNlZCBhbnRlbm5hLiIiIg0KICAgICAgICBhbnRlbm5hcyA9IGRpY3QoKQ0KICAgICAgICB3aXRoIG9wZW4odXNlcl9jc3ZfZmlsZSwgJ3InKSBhcyBjc3ZfZmlsZToNCiAgICAgICAgICAgIGNzdl9yZWFkZXIgPSBjc3YucmVhZGVyKGNzdl9maWxlLCBkZWxpbWl0ZXI9JywnKQ0KICAgICAgICAgICAgZm9yIHJvdyBpbiBjc3ZfcmVhZGVyOg0KICAgICAgICAgICAgICAgIGEgPSBzdHIocm93WzVdKQ0KICAgICAgICAgICAgICAgIGlmIGEgaW4gYW50ZW5uYXM6DQogICAgICAgICAgICAgICAgICAgIGFudGVubmFzW2FdICs9IDENCiAgICAgICAgICAgICAgICBlbHNlOg0KICAgICAgICAgICAgICAgICAgICBhbnRlbm5hc1thXSA9IDENCiAgICAgICAgYW50ZW5uYSA9IG1heChhbnRlbm5hcy5pdGVtcygpLCBrZXk9b3BlcmF0b3IuaXRlbWdldHRlcigxKSlbMF0NCiAgICAgICAgcmV0dXJuIGFudGVubmENCg0KICAgIGRlZiByZWR1Y2Uoc2VsZiwgcmVzdWx0c19jc3ZfZmlsZSk6DQogICAgICAgICIiIkNvbnZlcnQgcmVzdWx0cyB0byBjb3VudCBvZiBwb3B1bGF0aW9uIHBlciBhbnRlbm5hLiIiIg0KICAgICAgICBkZW5zaXR5ID0gZGljdCgpDQogICAgICAgIHdpdGggb3BlbihyZXN1bHRzX2Nzdl9maWxlLCAncicpIGFzIGNzdl9maWxlOg0KICAgICAgICAgICAgY3N2X3JlYWRlciA9IGNzdi5yZWFkZXIoY3N2X2ZpbGUsIGRlbGltaXRlcj0nICcpDQogICAgICAgICAgICBmb3Igcm93IGluIGNzdl9yZWFkZXI6DQogICAgICAgICAgICAgICAgYSA9IHN0cihyb3dbMV0pDQogICAgICAgICAgICAgICAgaWYgYSBpbiBkZW5zaXR5Og0KICAgICAgICAgICAgICAgICAgICBkZW5zaXR5W2FdICs9IDENCiAgICAgICAgICAgICAgICBlbHNlOg0KICAgICAgICAgICAgICAgICAgICBkZW5zaXR5W2FdID0gMQ0KICAgICAgICByZXR1cm4gZGVuc2l0eQ0K" , "className":"PopulationDensity", "reducer":"aggregation_count"},
                    "filename":"popDensity.py"};
                request({
                    method: 'POST',
                    baseUrl: config.algoServiceURL,
                    uri: '/add',
                    body: algo,
                    json: true
                }, function(error, response, _unused__body) {
                    if (error) {
                        reject(error.toString());
                    }
                    if(response.statusCode === 200) {
                        resolve(true);
                    }else{
                        resolve(false);
                    }
                });
            }else{
                resolve(false);
            }
        });
    });
};

TestServer.prototype.addCluster = function(statuses) {
    let _this = this;
    return new Promise(function(resolve, reject) {
        _this.opal_interface.clusterController._statusCollection.insertMany(statuses).then(function () {
            resolve(true);
        }, function (error) {
            reject(error);
        });
    });
};

module.exports = TestServer;
