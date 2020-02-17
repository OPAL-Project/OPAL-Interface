const { interface_constants } = require('../core/models.js');
const { ErrorHelper } = require('eae-utils');
const fs = require('fs');

/**
 * @fn AuditController
 * @desc Controller to manage the audit and logging of the platform
 * @param accessLogger Helper class to log the requests
 * @param auditDirectory Directory containing the log files
 * @param usersCollection
 * @constructor
 */
function AuditController(accessLogger, auditDirectory, usersCollection) {
    this._accessLogger = accessLogger;
    this._auditDirectory = auditDirectory;
    this._usersCollection = usersCollection;

    // Bind member functions
    this.getPublicAudit = AuditController.prototype.getPublicAudit.bind(this);
    this.getPrivateAudit = AuditController.prototype.getPrivateAudit.bind(this);
    this._validateAdminUser = AuditController.prototype._validateAdminUser.bind(this);
    this._authErrorResponse = AuditController.prototype._authErrorResponse.bind(this);
}

/**
 * @fn getPublicAudit
 * @desc HTTP method GET handler to serve the public audit
 * @param req Express.js request object
 * @param res Express.js response object
 */
AuditController.prototype.getPublicAudit = function(req, res) {
    let _this = this;
    let userToken = req.body.opalUserToken;
    let fileName = req.body.name;
    let options = {
        root:  _this._auditDirectory,
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };

    _this._validateAdminUser(userToken).then(function (_unused__user){
        if (fileName === null || fileName === undefined){
            res.status(400);
            res.json({'error': 'Missing name.'});
        } else {
            if (fs.existsSync(_this._auditDirectory + '/' + fileName)) {
                res.sendFile(fileName, options, function (err) {
                    if (err) {
                        _this._accessLogger.logIllegalAccess(req);
                    } else {
                        _this._accessLogger.logAuditAccess(req);
                    }
                });
            }else{
                res.status(404);
                res.json(ErrorHelper('File Not found'));
            }
        }
    }).catch(function (error) {
        _this._authErrorResponse(res, error, req);
    });
};

/**
 * @fn getPrivateAudit
 * @desc HTTP method POST handler to serve the private audit. ADMIN only.
 * Serves all illegal access logged in Mongo.
 * @param req Express.js request object
 * @param res Express.js response object
 */
AuditController.prototype.getPrivateAudit = function(req, res) {
    let _this = this;
    let userToken = req.body.opalUserToken;
    let numberOfRecords = parseInt(req.body.numberOfRecords);
    let logType = req.body.logType;

    if (numberOfRecords === null || numberOfRecords === undefined || logType === null || logType === undefined){
        res.status(400);
        res.json(ErrorHelper('Missing variables in the request.'));
        return;
    }

    try {
        _this._validateAdminUser(userToken).then(function (_unused__user) {
            _this._accessLogger.dumpPrivateLog(logType, numberOfRecords).then(function (fileName) {
                let options = {
                    dotfiles: 'deny',
                    headers: {
                        'x-timestamp': Date.now(),
                        'x-sent': true
                    }
                };

                if (fs.existsSync(fileName)) {
                    res.sendFile(fileName, options, function (err) {
                        if (err) {
                            _this._accessLogger.logIllegalAccess(req);
                        }
                    });
                } else {
                    res.status(404);
                    res.json(ErrorHelper('File Not found'));
                }
            }).catch(function (error) {
                res.status(500);
                res.json(ErrorHelper('Error occurred', error));
            });
        }).catch(function (error) {
            _this._authErrorResponse(res, error, req);
        });
    } catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn _validateAdminUser
 * @desc Validate token is of the admin user.
 * @param token
 * @returns {Promise<any>}
 * @private
 */
AuditController.prototype._validateAdminUser = function (token) {
    let _this = this;
    return new Promise(function (resolve, reject) {
        if (token === null || token === undefined){
            reject({code: 400, error: 'Missing token.'});
        } else {
            let filter = {
                token: token,
                type: interface_constants.USER_TYPE.admin
            };
            _this._usersCollection.findOne(filter).then(function (user) {
                if (user === null){
                    reject({code: 401, error: 'Unauthorized access. The unauthorized access has been logged.'});
                } else {
                    resolve(user);
                }
            }, function (error) {
                reject({code: 500, error: ErrorHelper('Error occurred', error)});
            });
        }
    });
};


/**
 * @fn _authErrorResponse
 * @desc Response to be sent on error on authentication
 * @param res Response object
 * @param error Error occurred (should contain code and error statement)
 * @param req Request object
 * @private
 */
AuditController.prototype._authErrorResponse = function (res, error, req) {
    let _this = this;

    res.status(error.code);
    res.json(error.error);
    // Log unauthorized access
    if (error.code === 401) {
        _this._accessLogger.logIllegalAccess(req);
    }
};

module.exports = AuditController;
