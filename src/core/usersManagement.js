// const { interface_models, interface_constants } = require('../core/models.js');
const { ErrorHelper } = require('eae-utils');
const { interface_constants } = require('../core/models.js');


/**
 * @fn UsersManagement
 * @desc service to manage the creation, validity and update of the OPAL users.
 * @params usersCollection Collection containing all the platform users
 * @params algorithmHelper Helper to interact with the algo service
 * @params interfaceUtils Interface utils
 * @constructor
 */
function UsersManagement(usersCollection, algorithmHelper, interfaceUtils) {
    let _this = this;
    _this._usersCollection = usersCollection;
    _this._algoHelper = algorithmHelper;
    _this.utils = interfaceUtils;

    // Bind member functions
    this.validateUserAndInsert = UsersManagement.prototype.validateUserAndInsert.bind(this);
    this.updateUser = UsersManagement.prototype.updateUser.bind(this);
    this.resetPassword =  UsersManagement.prototype.resetPassword.bind(this);
}

/**
 * @fn validateUserAndInsert
 * @desc Validates that the fields are well formed and then inserts it. If the user is not well formed, the insertion
 * is rejected and an error is raised.
 * @param newUser
 * @returns {Promise}
 */
UsersManagement.prototype.validateUserAndInsert = function (newUser){
    let _this = this;
    return new Promise(function (resolve, reject) {
        // We check that the access type exists
        if(!interface_constants.ACCESS_LEVELS.hasOwnProperty(newUser.defaultAccessLevel)){
            reject(ErrorHelper('The new user coudln\'t be inserted. The request access level is not supported : ',
                newUser.defaultAccessLevel));
            return;
        }
        // we check that the user type exists
        if(!interface_constants.USER_TYPE.hasOwnProperty(newUser.type.toLowerCase())){
            reject(ErrorHelper('The new user coudln\'t be inserted. The request type is not supported : ', newUser.type));
            return;
        }

        _this._algoHelper.checkAlgorithmListValidity(newUser.authorizedAlgorithms).then(function(error){
            if(!error){
                // All checks have passed we insert the user
                _this._usersCollection.insertOne(newUser).then(function(_unused__inserted){
                        resolve(true);
                    },
                    function(error){
                        reject(ErrorHelper('The new user coudln\'t be inserted.', error));
                    });
            }else{
                reject(ErrorHelper('Error while checking the validity of the users authorized algorithms'));
            }},function(error){
            reject(ErrorHelper('Error while checking the validity of the users authorized algorithms', error));
        });
    });
};

/**
 * @fn updateUser
 * @desc Update the record for an existing user.
 * @param user Current user record
 * @param update Update to be applied.
 * @returns {Promise}
 */
UsersManagement.prototype.updateUser = function (user, update){
    let _this = this;
    return new Promise(function (resolve, reject) {

        let filter = { username : user.username};
        let updatedUser =  Object.assign({}, user, update);

        _this._algoHelper.checkAlgorithmListValidity(updatedUser.authorizedAlgorithms).then(function(error){
            if(!error) {
                _this._usersCollection.findOneAndUpdate(filter,
                    {$set: updatedUser},
                    {returnOriginal: true, w: 'majority', j: false})
                    .then(function (inserted) {
                            resolve({old:inserted, new:updatedUser});
                        },
                        function (error) {
                            reject(ErrorHelper('The new user coudln\'t be inserted.', error));
                        });
            }
            else{
                reject(ErrorHelper('Error while checking the validity of the users authorized algorithms'));
            }},function(error){
            reject(ErrorHelper('Error while checking the validity of the users authorized algorithms', error));
        });
    });
};


/**
 * @fn resetPassword
 * @desc Resets the password for an existing user.
 * @param user Current user record
 * @returns {Promise}
 */
UsersManagement.prototype.resetPassword = function (user){
    let _this = this;
    return new Promise(function (resolve, reject) {
        let filter = { username : user.username};
        let newPassword = _this.utils.generateToken(user);
        let updatedUser =  Object.assign({}, user, {token: newPassword});

        _this._usersCollection.findOneAndUpdate(filter,
            {$set: updatedUser},
            {returnOriginal: false, w: 'majority', j: false})
            .then(function (_unused__inserted) {
                    resolve({newPassword: newPassword});
                },
                function (error) {
                    reject(ErrorHelper('The new password coudln\'t be inserted.', error));
                });
    });
};


module.exports = UsersManagement;
