const { ErrorHelper, Constants, DataModels } = require('eae-utils');
const { interface_constants } = require('../core/models.js');
const ObjectID = require('mongodb').ObjectID;
const JobsManagement = require('../core/jobsManagement.js');
const InterfaceUtils = require('../core/interfaceUtils.js');
const QuotasManagement = require('../core/quotasManagement.js');

/**
 * @fn JobsController
 * @desc Controller to manage the jobs service
 * @param jobsCollection
 * @param usersCollection
 * @param statusCollection
 * @param accessLogger
 * @param algoHelper
 * @param cacheHelper
 * @constructor
 */
function JobsController(jobsCollection, usersCollection, statusCollection, accessLogger, algoHelper, cacheHelper, quotasCollection) {
    let _this = this;
    _this.cacheHelper = cacheHelper;
    _this._jobsCollection = jobsCollection;
    _this._usersCollection = usersCollection;
    _this._accessLogger = accessLogger;
    _this._jobsManagement = new JobsManagement(_this._jobsCollection, algoHelper);
    _this._interfaceUtils = new InterfaceUtils({statusCollection:statusCollection});
    _this._quotasManagement = new QuotasManagement(_this._usersCollection, quotasCollection);

    // Bind member functions
    _this.createNewJob = JobsController.prototype.createNewJob.bind(this);
    _this.getJob = JobsController.prototype.getJob.bind(this);
    _this.getAllJobs = JobsController.prototype.getAllJobs.bind(this);
    _this.cancelJob = JobsController.prototype.cancelJob.bind(this);
    // _this.getJobResults = JobsController.prototype.getJobResults.bind(this);
}

/**
 * @fn postNewJob
 * @desc Create a job request. Sends back the current number of jobs pending and/or running.
 * @param req Incoming message
 * @param res Server Response
 */
JobsController.prototype.createNewJob = function(req, res){
    let _this = this;
    let userToken = req.body.opalUserToken;

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }

    try {
        // Check the validity of the JOB
        let jobRequest = JSON.parse(req.body.job);

        _this._jobsManagement.checkFields(jobRequest).then(function(_unused__check) {
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

                if(user.currentQuota < 1){
                    res.status(429);
                    res.json(ErrorHelper('Unauthorized access. The user has sent too many requests, wait before sending new requests.'));
                    return;
                }
                // Decreases the current quota for the user and logs the attempt even if the request gets rejected
                _this._quotasManagement.decreaseQuotaForUser(user.username);

                // Build the job to be inserted for the scheduler
                let eaeJobModel = JSON.parse(JSON.stringify(DataModels.EAE_JOB_MODEL));

                // We need to reformat the OPAL job request to fit the eAE's one
                jobRequest.startDate = new Date(jobRequest.startDate);
                jobRequest.endDate = new Date(jobRequest.endDate);
                if(jobRequest.keySelector === undefined || jobRequest.keySelector === null || jobRequest.keySelector.length === 0){
                    jobRequest.keySelector = null;
                }
                let opalRequest = {params: jobRequest, requester: user.username};

                // We merge all those parameters to make the final job
                let newJob = Object.assign({}, eaeJobModel, opalRequest, {_id: new ObjectID(), type: Constants.EAE_JOB_TYPE_PYTHON2});

                // In opal there is no data transfer step so we move directly to queued
                newJob.status.unshift(Constants.EAE_JOB_STATUS_QUEUED);

                // Check users rights to execute the request
                _this._jobsManagement.authorizeRequest(user, jobRequest).then(function(_unused__accessgranted) {
                    _this.cacheHelper.sendRequestToCache(newJob).then(function(body) {
                        if (body.result) {
                                // The query has been found with a result, return the result immediately
                                res.status(200);
                                res.json({status: 'OK', result: body.result});
                            }
                            else if (body.waiting) {
                                // The query has already been submitted but the result is not ready yet, tell the user to wait
                                res.status(200);
                                res.json({status: 'The Job is being computed. The current status is: ' + body.status});
                            }
                            else {
                                // The query has not been found, insert job in mongo so scheduler can execute it
                                // Check if compute servers are alive
                                _this._interfaceUtils.isBackendAlive().then(function(isAlive){
                                    if(isAlive){
                                        _this._jobsCollection.insertOne(newJob).then(function (_unused__result) {
                                            let statuses = [Constants.EAE_JOB_STATUS_CREATED,Constants.EAE_JOB_STATUS_QUEUED,
                                                Constants.EAE_JOB_STATUS_SCHEDULED, Constants.EAE_JOB_STATUS_TRANSFERRING_DATA,
                                                Constants.EAE_JOB_STATUS_RUNNING];
                                            let filter = {'status.0': {$in: statuses}};
                                            _this._jobsCollection.count(filter).then(function (count) {
                                                _this._accessLogger.logRequest(opalRequest);
                                                res.status(200);
                                                res.json({status: 'OK', jobID: newJob._id.toString(), jobPosition: count});
                                            }, function (error) {
                                                res.status(500);
                                                res.json(ErrorHelper('Job queued but couldn\'t assert the job\'s position for computation', error));
                                            });
                                        },function(error){
                                            res.status(500);
                                            res.json(ErrorHelper('Couldn\'t insert the job for computation', error));
                                        });
                                    }
                                    else{
                                        res.status(500);
                                        res.json(ErrorHelper('The computes servers are unavailable and results are not available in cache. Please contact Admin.'));
                                    }
                                },function(error){
                                    res.status(401);
                                    res.json(ErrorHelper('The requested level exceeds the user\'s rights.', error));
                                });
                            }
                        }, function(_unused__error) {
                            res.status(500);
                            res.json(ErrorHelper('The cache could not be contacted. Please contact Admin.'));
                        });
                }, function(error){
                    res.status(401);
                    res.json(ErrorHelper('The requested level exceeds the user\'s rights.', error));
                });
            },function(error) {
                res.status(500);
                res.json(ErrorHelper('Internal Mongo Error', error));
            });
        }, function(error){
            _this._interfaceUtils.log(JSON.parse(req.body.job));
            res.status(401);
            res.json(ErrorHelper('The field check failed.', error));
        });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn getJob
 * @desc Retrieve a specific job - Check that user requesting is owner of the job or Admin
 * @param req Incoming message
 * @param res Server Response
 */
JobsController.prototype.getJob = function(req, res){
    let _this = this;
    let userToken = req.body.opalUserToken;
    let jobID = req.body.jobID;

    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try {
        _this._jobsCollection.findOne({_id: ObjectID(jobID)}).then(function(job){
            if(job === null){
                res.status(401);
                res.json(ErrorHelper('The job request do not exit. The query has been logged.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
                return;
            }else{
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
                    if(user.type === interface_constants.USER_TYPE.admin || job.requester === user.username){
                        res.status(200);
                        res.json(job);
                    }else{
                        res.status(401);
                        res.json(ErrorHelper('The user is not authorized to access this job.'));
                        // Log unauthorized access
                        _this._accessLogger.logIllegalAccess(req);
                    }
                }, function (_unused__error) {
                    res.status(401);
                    res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                    // Log unauthorized access
                    _this._accessLogger.logIllegalAccess(req);
                });
            }}, function(error){
            res.status(500);
            res.json(ErrorHelper('Internal Mongo Error', error));
        });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn getAllJobs
 * @desc Retrieve all current jobs (e.g. all jobs which have not been archived) - Admin only
 * @param req Incoming message
 * @param res Server Response
 */
JobsController.prototype.getAllJobs = function(req, res){
    let _this = this;
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
            if(user.type === interface_constants.USER_TYPE.admin){
                _this._jobsCollection.find({}).toArray().then(function(allJobs) {
                    res.status(200);
                    res.json(allJobs);
                },function(error){
                    res.status(500);
                    res.json(ErrorHelper('Internal Mongo Error', error));
                });
            }else{
                res.status(401);
                res.json(ErrorHelper('The user is not authorized to access this job.'));
                // Log unauthorized access
                _this._accessLogger.logIllegalAccess(req);
            }
        }, function (_unused__error) {
            res.status(401);
            res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
            // Log unauthorized access
            _this._accessLogger.logIllegalAccess(req);
        });

    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

/**
 * @fn cancelJob
 * @desc Cancels a job. Check that user requesting is owner of the job or Admin
 * @param req Incoming message
 * @param res Server Response
 */
JobsController.prototype.cancelJob = function(req, res) {
    let _this = this;
    let userToken = req.body.opalUserToken;
    let jobID = req.body.jobID;


    if (userToken === null || userToken === undefined) {
        res.status(401);
        res.json(ErrorHelper('Missing token'));
        return;
    }
    try{
        _this._jobsCollection.findOne({_id: ObjectID(jobID)}).then(function(job) {
                if (job === null) {
                    res.status(401);
                    res.json(ErrorHelper('The job request do not exists. The query has been logged.'));
                    // Log unauthorized access
                    _this._accessLogger.logIllegalAccess(req);
                    return;
                } else {
                    if(job.status[0] === Constants.EAE_JOB_STATUS_TRANSFERRING_DATA ||
                        job.status[0] === Constants.EAE_JOB_STATUS_QUEUED ||
                        job.status[0] === Constants.EAE_JOB_STATUS_SCHEDULED ||
                        job.status[0] === Constants.EAE_JOB_STATUS_RUNNING ||
                        job.status[0] === Constants.EAE_JOB_STATUS_ERROR
                    ){
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
                            if (user.type === interface_constants.USER_TYPE.admin || job.requester === user.username) {
                                _this._jobsManagement.cancelJob(job).then(function(resCancelledJob){
                                    _this._accessLogger.logRequest();
                                    res.status(200);
                                    res.json(Object.assign({}, {status: 'Job ' + jobID + ' has been successfully cancelled.'}, resCancelledJob));
                                },function(error){
                                    res.status(500);
                                    res.json(ErrorHelper('Internal server error', error));
                                });
                            }else{
                                res.status(401);
                                res.json(ErrorHelper('The user is not authorized to access this job.'));
                                // Log unauthorized access
                                _this._accessLogger.logIllegalAccess(req);
                            }
                        }, function (_unused__error) {
                            res.status(401);
                            res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                            // Log unauthorized access
                            _this._accessLogger.logIllegalAccess(req);
                        });
                    }else{
                        res.status(412);
                        res.json(ErrorHelper('The job requested cannot be cancelled because he is not pending, queued, ' +
                            'running or in error. Current status: ' + job.status[0]));
                    }
                }}
            , function(error){
                res.status(500);
                res.json(ErrorHelper('Internal Mongo Error', error));
            });
    }
    catch (error) {
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

module.exports = JobsController;
