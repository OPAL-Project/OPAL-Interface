const { ErrorHelper } = require('eae-utils');

/**
 * @fn QuotasManagement
 * @desc Service to manage the quotas of the OPAL users.
 * @params usersCollection Collection containing all the platform users
 * @params quotasCollection Collection containing the tokens for the quotas
 * @constructor
 */
function QuotasManagement(usersCollection, quotasCollection) {
    let _this = this;
    _this._usersCollection = usersCollection;
    _this._quotasCollection = quotasCollection;

    // Bind member functions
    this.decreaseQuotaForUser = QuotasManagement.prototype.decreaseQuotaForUser.bind(this);
    this.resetQuota = QuotasManagement.prototype.resetQuota.bind(this);
    this.updateQuotas =  QuotasManagement.prototype.updateQuotas.bind(this);
    this.refreshQuotas =  QuotasManagement.prototype.refreshQuotas.bind(this);
}


/**
 * @fn decreaseQuotaForUser
 * @desc Decreases the quota for the specified user using his username and logs the requests (timestamp and username)
 * @param username Username of the user submitting the request
 */
QuotasManagement.prototype.decreaseQuotaForUser = function(username) {
    let _this = this;
    return new Promise(function (resolve, reject) {
        let filter = {username: username};
        _this._usersCollection.findOneAndUpdate(filter,{$inc: {currentQuota:-1}},
        {returnOriginal: false, w: 'majority', j: false}).then(function (_unused__inserted) {
            _this._quotasCollection.insertOne({user: username, timestamp: new Date()}).then(function (_unused__inserted) {
                resolve(true);
            },function(error){
                reject(ErrorHelper(error));
            });
        },function(error){
            reject(ErrorHelper(error));
        });
    });
};

/**
 * @fn resetQuota
 * @desc Reset the quota for the specified user
 * @param username Username of the user to reset the quota for
 */
QuotasManagement.prototype.resetQuota = function(username){
    let _this = this;

    return new Promise(function (resolve, reject) {
        let filter = {username: username};
        _this._usersCollection.findOne(filter).then(function(user){
            user.currentQuota = user.quota;
            _this._usersCollection.findOneAndUpdate(filter,{$set: user},
                {returnOriginal: false, w: 'majority', j: false}).then(function (_unused__inserted) {
                    _this._quotasCollection.deleteMany({user: username}).then(function(){
                        resolve(true);
                    },function (error) {
                        reject(ErrorHelper(error));
                    });
                },function(error){
                    reject(ErrorHelper(error));
                }
            );
        },function(error){
            reject(ErrorHelper(error));
        });
    });
};

/**
 * @fn updateQuotas
 * @desc Sets the default quota for all the users
 * @param newQuota New quota value for all the users
 */
QuotasManagement.prototype.updateQuotas = function(newQuota){
    let _this = this;

    return new Promise(function (resolve, reject) {
        _this._usersCollection.updateMany({},{ $set: {quota: newQuota}}).then(function(){
                resolve(true);
            },function(error){
                reject(ErrorHelper(error));
            }
        );
    });
};

/**
 * @fn refreshQuotas
 * @desc Periodically checks the quotas: removes outdated records and increase the current quotas for the associated users
 * @private
 */
QuotasManagement.prototype.refreshQuotas = function(){
    let _this = this;

    return new Promise(function (resolve, reject) {
        let currentTime = new Date().getTime();
        // NB: 86400000ms = 1 day
        let tokensTimeout = new Date(currentTime -  global.opal_interface_config.quotasRefreshPeriod * 86400000);
        let filter = {
            timestamp:{
                '$lt': tokensTimeout }
        };
        _this._quotasCollection.find(filter).forEach(function (document) {
            _this._usersCollection.findOneAndUpdate({username: document.user},{$inc: {currentQuota:+1}},
                {returnOriginal: false, w: 'majority', j: false}).then(function (_unused__inserted) {
                _this._quotasCollection.findOneAndDelete(document).then(function(){
                    resolve(true);
                }, function(error){
                    reject(ErrorHelper(error));
                });
            }, function(error){
                reject(ErrorHelper(error));
            });
        });
    });
};

module.exports = QuotasManagement;
