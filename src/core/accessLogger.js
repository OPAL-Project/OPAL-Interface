const { interface_models } = require('../core/models.js');
const { ErrorHelper } = require('eae-utils');
const fs = require('fs-extra');
const util = require('util');

/**
 * @fn AccessLogger
 * @desc Service to log illegal accesses
 * @param accessLogCollection
 * @param illegalAccessCollection
 * @param auditDirectory
 * @constructor
 */
function AccessLogger(accessLogCollection, illegalAccessCollection, auditDirectory) {
    let _this = this;
    _this._accessLogCollection = accessLogCollection;
    _this._illegalAccessLogCollection = illegalAccessCollection;
    _this._auditDirectory = auditDirectory;

    // Bind member functions
    this.logIllegalAccess = AccessLogger.prototype.logIllegalAccess.bind(this);
    this.logAuditAccess = AccessLogger.prototype.logAuditAccess.bind(this);
    this.logRequest = AccessLogger.prototype.logRequest.bind(this);
}

/**
 * @fn logIllegalAccess
 * @desc Methods that logs illegal accesses
 * @param request Illegal request to be logged
 */
AccessLogger.prototype.logIllegalAccess = function(request){
    let _this = this;
    let unauthorizedAccessModel = interface_models.UNAUTHORIZED_ACCESS_MODEL;
    let unauthorizedAccess = Object.assign({}, unauthorizedAccessModel,
                                            {username: request.body.opalUsername,
                                            token: request.body.opalUserToken,
                                            headers:  request.headers});
    _this._illegalAccessLogCollection.insertOne(unauthorizedAccess);
};

/**
 * @fn logIllegalAccess
 * @desc Methods that logs audit accesses
 * @param request Access request to be logged
 */
AccessLogger.prototype.logAuditAccess = function(request){
    let _this = this;
    let authorizedAccessModel = {headers:  request.headers, accessTimestamp: new Date()};
    _this._accessLogCollection.insertOne(authorizedAccessModel);
};

/**
 * @fn logRequest
 * @desc Methods that logs the valid user requests. They can either be cancels or computes.
 * @param opalRequest Access request to be logged. The opal request contains all params and the requester.
 */
AccessLogger.prototype.logRequest = function(opalRequest){
    let _this = this;
    try {
        // write the request to the global file and to the monthly one
        let date = new Date();
        let globalFileName = 'ALL_opal_audit.log';
        let monthlyFileName = date.getMonth() + 1 + '.' + date.getFullYear() + '_opal_audit.log';
        let data = util.format('Requester:%s Parameters:%s \n',opalRequest.requester, JSON.stringify(opalRequest.params));

        fs.appendFile(_this._auditDirectory + '/' + globalFileName, data, 'utf8', (err) => {
            if (err) throw err;
        });

        fs.appendFile(_this._auditDirectory + '/' + monthlyFileName, data, 'utf8', (err) => {
            if (err) throw err;
        });
    }catch(error){
        // Fail safe - TODO send a mail to admin
    }
};

/**
 * @fn dumpPrivateLog
 * @desc Methods that retrieves the logs from mongo and dumps it into a file
 * @param logType Log type requested. either illegal access or audit access.
 * @param numberOfRecords number of records to get
 * @return {string} return the filename of the log
 */
AccessLogger.prototype.dumpPrivateLog = function(logType,numberOfRecords){
    let _this = this;
    let date = new Date();

    return new Promise(function (resolve, reject) {
        // write the request to the global file and to the monthly one
        let month = date.getMonth() + 1;
        let day = date.getDate();
        let filename = _this._auditDirectory + '/' + day + '.' + month + '.'
                        + date.getFullYear() + '_opal_' + logType + '_log.log';
        let collection = null;
        if (fs.existsSync(filename)) {
            try {
                fs.unlinkSync(filename);
            }catch(err){
                reject(ErrorHelper('Log file already exists and couldn\'t be deleted: ' + err));
            }
        }
        switch (logType) {
            case 'illegal':
                collection = _this._illegalAccessLogCollection;
                break;
            case 'audit':
                collection = _this._accessLogCollection;
                break;
            default:
                reject(ErrorHelper('Unknown request log type : ' + logType));
                break;
        }
        collection.find().limit(numberOfRecords).toArray(
            function (err, result) {
                if (err) throw reject(ErrorHelper('Error when creating the file for the log', err));
                let fd;
                try{
                    fd = fs.openSync(filename,'a');
                    fs.appendFileSync(fd,'Logs:\n','utf8');
                    result.forEach(function (v) {
                        fs.appendFileSync(fd,JSON.stringify(v) + '\n', 'utf8');
                    });
                }catch(err){
                    reject(ErrorHelper('New log file could not be created: ' + err));
                }finally {
                    if (fd !== undefined)
                        fs.closeSync(fd);
                    resolve(filename);
                }
            });
    });
};

module.exports = AccessLogger;
