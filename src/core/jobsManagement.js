// const { interface_models, interface_constants } = require('../core/models.js');
const { ErrorHelper, Constants } = require('eae-utils');
const { interface_constants } = require('../core/models.js');
const ObjectID = require('mongodb').ObjectID;

/**
 * @fn Utils
 * @desc Manages the job from the Created status to the Queued status (from which the scheduler takes over)
 * @param jobsCollection
 * @param algorithmHelper
 * @constructor
 */
function JobsManagement(jobsCollection, algorithmHelper) {
    let _this = this;
    _this._jobsCollection = jobsCollection;
    _this._algoHelper = algorithmHelper;

    // Bind member functions
    _this.cancelJob = JobsManagement.prototype.cancelJob.bind(this);
    _this.checkFields = JobsManagement.prototype.checkFields.bind(this);
    _this.authorizeRequest = JobsManagement.prototype.authorizeRequest.bind(this);
}


/**
 * @fn cancelJob
 * @desc Sets the status of a job to cancelled. It then gets picked up by the scheduler for processing.
 * @param job
 * @returns {Promise}
 */
JobsManagement.prototype.cancelJob = function(job){
    let _this = this;

    return new Promise(function(resolve, reject) {
        job.status.unshift(Constants.EAE_JOB_STATUS_CANCELLED);
        _this._jobsCollection.findOneAndUpdate({_id: ObjectID(job._id)},
            {$set: job},
            {returnOriginal: false, w: 'majority', j: false})
            .then(function (res) {
                resolve({res: res, cancelledJob: job});
            }, function (error) {
                reject(ErrorHelper('Could not cancel the job.', error));
            });
    });
};

/**
 * @fn checkFields
 * @desc Checks that all mandatory fields and params are valid for the specified algorithm.
 * @param jobRequest
 * @returns {Promise}
 */
JobsManagement.prototype.checkFields = function(jobRequest){
    let _this = this;

    return new Promise(function(resolve, reject) {
        // We check the core parameters
        let params = jobRequest.params;
        let coreFields = Object.assign({}, jobRequest);
        delete coreFields.params;
        let enabledAlgorithms = _this._algoHelper.getAPIEnabledAlgorithms();

        _this._algoHelper.validate(coreFields, 'core').then(function() {
            if (!enabledAlgorithms.hasOwnProperty(coreFields.algorithmName)) {
                reject(ErrorHelper('The selected algorithm ' + coreFields.algorithmName + ' is not enabled'));
                return;
            }
            _this._algoHelper.validate(params, coreFields.algorithmName).then(function(){
                _this._algoHelper.getListOfAlgos().then(function(authorized_algorithms) {
                    if (!authorized_algorithms.hasOwnProperty(coreFields.algorithmName)) {
                        reject(ErrorHelper('The algorithm service does not contain the requested algorithm: ' +
                            coreFields.algorithmName + ' . Please contact the admin to add it.'));
                    }
                    resolve(true);
                });
            }).catch(function (error) {
                reject(ErrorHelper('Invalid params for selected algorithm.', error));
            });
        }).catch(function (error) {
            reject(ErrorHelper('Invalid core parameters.', error));
        });
    });
};

/**
 * @fn checkFields
 * @desc Checks that all mandatory fields and params are valid for the specified algorithm.
 * @param user User profile with the asosciated access rights
 * @param jobRequest job request containing the access level requested by user and the specified algorithm
 * @returns {Promise}
 */
JobsManagement.prototype.authorizeRequest = function(user, jobRequest) {
    let requestedAccessLevel = jobRequest.resolution;
    let requestedAlgorithm = jobRequest.algorithmName;

    return new Promise(function (resolve, reject) {
        // We first check the more granular rights and exceptions
        if(user.authorizedAlgorithms.hasOwnProperty(requestedAlgorithm)){
            if(interface_constants.ACCESS_LEVELS[user.authorizedAlgorithms[requestedAlgorithm]].value < interface_constants.ACCESS_LEVELS[requestedAccessLevel].value){
                reject(ErrorHelper('The request is rejected because the user has insufficient rights. User\'s Access level: '
                    + user.authorizedAlgorithms[requestedAlgorithm]));
            }else{
             resolve(true);
            }
        }else{
            if(interface_constants.ACCESS_LEVELS[user.defaultAccessLevel].value < interface_constants.ACCESS_LEVELS[requestedAccessLevel].value){
                reject(ErrorHelper('The request is rejected because the user has insufficient rights. Default access is: '
                    + interface_constants.ACCESS_LEVELS[requestedAccessLevel]));
            }else{
                resolve(true);
            }
        }
    });
};

module.exports = JobsManagement;
