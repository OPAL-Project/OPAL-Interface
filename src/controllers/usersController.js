const { interface_models, interface_constants } = require('../core/models.js');
const { ErrorHelper, Constants } = require('eae-utils');
const timer = require('timers');
const InterfaceUtils = require('../core/interfaceUtils.js');
const UsersManagement = require('../core/usersManagement.js');
const QuotasManagement = require('../core/quotasManagement.js');

/**
 * @fn UsersController
 * @desc Controller to manage the users service
 * @param usersCollection
 * @param accessLogger
 * @param algorithmHelper
 * @param quotasCollection
 * @constructor
 */
function UsersController(usersCollection, accessLogger, algorithmHelper, quotasCollection) {
    let _this = this;
    _this._usersCollection = usersCollection;
    _this._accessLogger = accessLogger;
    _this.utils = new InterfaceUtils();
    _this.usersManagement = new UsersManagement(usersCollection, algorithmHelper, _this.utils);
    _this._quotasManagement = new QuotasManagement(_this._usersCollection, quotasCollection);

    // Bind member functions
    _this.startPeriodicUpdate = UsersController.prototype.startPeriodicUpdate.bind(this);
    _this.stopPeriodicUpdate = UsersController.prototype.stopPeriodicUpdate.bind(this);
    _this.getUser = UsersController.prototype.getUser.bind(this);
    _this.getAllUsers = UsersController.prototype.getAllUsers.bind(this);
    _this.createUser = UsersController.prototype.createUser.bind(this);
    _this.updateUser = UsersController.prototype.updateUser.bind(this);
    _this.deleteUser = UsersController.prototype.deleteUser.bind(this);
    _this.getAllUsers = UsersController.prototype.getAllUsers.bind(this);
    _this.resetUserPassword = UsersController.prototype.resetUserPassword.bind(this);
    _this.resetQuota = UsersController.prototype.resetQuota.bind(this);
    _this.updateQuotas = UsersController.prototype.updateQuotas.bind(this);
}

/**
 * @fn startPeriodicUpdate
 * @desc Start an automatic update and synchronisation of the status
 * @param delay The intervals (in milliseconds) on how often to update the quotas
 */
UsersController.prototype.startPeriodicUpdate = function(delay = Constants.STATUS_DEFAULT_UPDATE_INTERVAL) {
    let _this = this;

    //Stop previous interval if any
    _this.stopPeriodicUpdate();
    //Start a new interval update
    _this._intervalTimeout = timer.setInterval(function(){
        _this._quotasManagement.refreshQuotas(); //Update the status of the quotas
    }, delay);
};

/**
 * @fn stopPeriodicUpdate
 * @desc Stops the automatic update.
 * Does nothing if the periodic update was not running
 */
UsersController.prototype.stopPeriodicUpdate = function() {
    let _this = this;

    if (_this._intervalTimeout !== null && _this._intervalTimeout !== undefined) {
        timer.clearInterval(_this._intervalTimeout);
        _this._intervalTimeout = null;
    }
    if(_this._client !== null && _this._client !== undefined){
        _this._client.close(true);
    }
};

/**
 * @fn getUser
 * @desc Sends back the profile of the requested user
 * @param req Incoming message
 * @param res Server Response
 */
UsersController.prototype.getUser = function(req, res){
    let _this = this;
    let requestedUsername = req.body.requestedUsername;
    let userToken = req.body.opalUserToken;

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        let filter = {
            token: userToken
        };
        _this._usersCollection.findOne(filter).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (user.type === interface_constants.USER_TYPE.admin) {
                _this._usersCollection.findOne({username: requestedUsername}).then(function(user){
                        if (user === null) {
                            res.status(401);
                            res.json('User ' + requestedUsername + ' doesn\'t exist.');
                        }else {
                            delete user._id;
                            res.status(200);
                            res.json(user);
                        }
                    },
                    function(error){
                        res.status(500);
                        res.json(ErrorHelper('Internal Mongo Error', error));
                    });
            }else{
                res.status(401);
                res.json(ErrorHelper('The user is not authorized to access this command'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
            }
        });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn getAllUsers
 * @desc Sends back the profile of all the users
 * @param req Incoming message
 * @param res Server Response
 */
UsersController.prototype.getAllUsers = function(req, res){
    let _this = this;
    let userToken = req.body.opalUserToken;
    let userType = req.body.userType.toUpperCase();

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        let filter = {
            token: userToken
        };
        _this._usersCollection.findOne(filter).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (!(userType === interface_constants.USER_TYPE.admin || userType === interface_constants.USER_TYPE.standard || userType === 'ALL')){
                res.status(401);
                res.json(ErrorHelper('userType not supported. Please use "ADMIN", "STANDARD" OR "ALL"'));
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (user.type === interface_constants.USER_TYPE.admin) {
                let querycond = userType === 'ALL' ? {} : {type: userType};
                _this._usersCollection.find(querycond,{username: 1, _id:0}).toArray(function(err,user){
                        if (err){
                            res.status(500);
                            res.json(ErrorHelper('Internal Mongo Error', err));
                            return;
                        }else {
                            res.status(200);
                            res.json(user);
                        }
                    }
                );
            }else{
                res.status(401);
                res.json(ErrorHelper('The user is not authorized to access this command'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
            }
        });
    }
    catch (error) {
        res.status(510);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn createUser
 * @desc Create a new user to get access to the platform. ADMIN only
 * @param req Incoming message
 * @param res Server Response
 */
UsersController.prototype.createUser = function(req, res){
    let _this = this;
    let userToken = req.body.opalUserToken;
    let newUser = Object.assign({},interface_models.USER_MODEL, JSON.parse(req.body.newUser));
    newUser.token = _this.utils.generateToken(newUser);

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        let filter = {
            token: userToken
        };
        _this._usersCollection.findOne(filter).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (user.type === interface_constants.USER_TYPE.admin) {
                if(newUser.username === null || newUser.username === undefined){
                    res.status(400);
                    res.json(ErrorHelper('Request not well formed. The new user username cannot be null or undefined'));
                    return;
                }
                if(newUser.type === interface_constants.USER_TYPE.admin && user.isSuperAdmin === false){
                    res.status(403);
                    res.json(ErrorHelper('The requesting user is admin but not superAdmin so the request to create a ' +
                        'new admin is forbidden. Please contact a superAdmin to add the user. The unauthorized request has been logged.'));
                    // Log unauthorized access
                    _this._accessLogger.logIllegalAccess(req);
                    return;
                }
                //check that user doesn't already exists
                _this._usersCollection.findOne({username: newUser.username}).then(function (user) {
                    if(user === null){
                        // Delegate the creation of the user record to user management service
                        _this.usersManagement.validateUserAndInsert(newUser).then(function(){
                            res.status(200);
                            res.json(newUser);
                        }, function (error) {
                            res.status(500);
                            res.json(error);
                        });
                    }else{
                        res.status(409);
                        res.json('The user ' + newUser.username + ' already exists.');
                    }
                },function(error){
                    res.status(500);
                    res.json(ErrorHelper('Internal Mongo Error', error));
                });
            }else{
                res.status(401);
                res.json(ErrorHelper('The user is not authorized to access this command'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
            }
        });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn updateUser
 * @desc Update an existing user. ADMIN only
 * @param req Incoming message
 * @param res Server Response
 */
UsersController.prototype.updateUser = function(req, res) {
    let _this = this;
    let userToBeUpdated = req.body.userToBeUpdated;
    let update = JSON.parse(req.body.userUpdate);
    delete update.token; // we prevent any attempt at updating the user's token.
    delete update.isSuperAdmin; // we prevent any attempt at updating the user's superAdmin status.
    let userToken = req.body.opalUserToken;

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        let filter = {
            token: userToken
        };
        _this._usersCollection.findOne(filter).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (user.type === interface_constants.USER_TYPE.admin) {
                //check that user already exists
                _this._usersCollection.findOne({username: userToBeUpdated}).then(function (user) {
                    if(user !== null){
                        // Delegate the update of the user record to user management service
                        _this.usersManagement.updateUser(user, update).then(function(updatedUser){
                            res.status(200);
                            res.json(updatedUser);
                        }, function (error) {
                            res.status(500);
                            res.json(error);
                        });
                    }else{
                        res.status(409);
                        res.json('The user ' + userToBeUpdated.username + ' doesn\'t exists. Record not updated.');
                    }
                },function(error){
                    res.status(500);
                    res.json(ErrorHelper('Internal Mongo Error', error));
                });
            }else{
                res.status(401);
                res.json(ErrorHelper('The user is not authorized to access this command'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
            }
        });
    }catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};


/**
 * @fn resetUserPassword
 * @desc Resets the password for the specified user. ADMIN only
 * @param req Incoming message
 * @param res Server Response
 */
UsersController.prototype.resetUserPassword = function(req, res) {
    let _this = this;
    let userToBeUpdated = req.body.userToBeUpdated;
    let userToken = req.body.opalUserToken;

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        let filter = {
            token: userToken
        };
        _this._usersCollection.findOne(filter).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (user.type === interface_constants.USER_TYPE.admin) {
                //check that user already exists
                _this._usersCollection.findOne({username: userToBeUpdated}).then(function (user) {
                    if(user !== null){
                        // Delegate the update of the user record to user management service
                        _this.usersManagement.resetPassword(user).then(function(newPassword){
                            res.status(200);
                            res.json(newPassword);
                        }, function (error) {
                            res.status(500);
                            res.json(error);
                        });
                    }else{
                        res.status(409);
                        res.json('The user ' + userToBeUpdated.username + ' doesn\'t exists. Record not updated.');
                    }
                },function(error){
                    res.status(500);
                    res.json(ErrorHelper('Internal Mongo Error', error));
                });
            }else{
                res.status(401);
                res.json(ErrorHelper('The user is not authorized to access this command'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
            }
        });
    }catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn deleteUser
 * @desc Delete an existing user to remove access to the platform
 * @param req Incoming message
 * @param res Server Response
 */
UsersController.prototype.deleteUser = function(req, res){
    let _this = this;
    let userToBeDeleted = req.body.userToBeDeleted;
    let userToken = req.body.opalUserToken;

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        let filter = {
            token: userToken
        };
        _this._usersCollection.findOne(filter).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (user.type === interface_constants.USER_TYPE.admin) {
                //check that user doesn't already exists
                _this._usersCollection.findOne({username: userToBeDeleted}).then(function (user) {
                    if(user !== null){
                        _this._usersCollection.deleteOne({username: userToBeDeleted}).then(function(_unused__deleted){
                                res.status(200);
                                res.json('The user ' + userToBeDeleted + ' has been successfully deleted');
                            },
                            function(error){
                                res.status(500);
                                res.json(ErrorHelper('Internal Mongo Error', error));
                            });
                    }else{
                        res.status(409);
                        res.json('The user ' + userToBeDeleted + ' doesn\'t exists.');
                    }
                },function(error){
                    res.status(500);
                    res.json(ErrorHelper('Internal Mongo Error', error));
                });
            }else{
                res.status(401);
                res.json(ErrorHelper('The user is not authorized to access this command'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
            }
        });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn resetQuota
 * @desc Resets the quota for the specified user - ADMIN
 * @param req Incoming message
 * @param res Server Response
 */
UsersController.prototype.resetQuota = function(req, res) {
    let _this = this;
    let username = req.body.usernameForQuotaReset;
    let userToken = req.body.opalUserToken;

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        let filter = {
            token: userToken
        };
        _this._usersCollection.findOne(filter).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (user.type === interface_constants.USER_TYPE.admin) {
                _this._quotasManagement.resetQuota(username).then(function() {
                    res.status(200);
                    res.json('The quota for user ' + username + ' has been successfully reset.');
                },function(error){
                    res.status(500);
                    res.json(ErrorHelper('Internal Mongo Error', error));
                });
            }
        });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn updateQuotas
 * @desc Set a new quota for all the users of the platform - ADMIN
 * @param req Incoming message
 * @param res Server Response
 */
UsersController.prototype.updateQuotas = function(req, res){
    let _this = this;
    let newQuotaString = req.body.newQuota;
    let userToken = req.body.opalUserToken;

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        let filter = {
            token: userToken
        };
        _this._usersCollection.findOne(filter).then(function (user) {
            if (user === null) {
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }
            if (user.type === interface_constants.USER_TYPE.admin) {
                let newQuota = parseInt(newQuotaString);
                _this._quotasManagement.updateQuotas(newQuota).then(function() {
                    res.status(200);
                    res.json('The new quota ' + newQuota + ' has been successfully applied to all users');
                },function(error){
                    res.status(500);
                    res.json(ErrorHelper('Internal Mongo Error', error));
                });
            }
        });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

module.exports = UsersController;
