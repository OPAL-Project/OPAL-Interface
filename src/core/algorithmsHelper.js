const request = require('request');
const { ErrorHelper } = require('eae-utils');
const { interface_constants } = require('../core/models.js');
const fs = require('fs');
const Ajv = require('ajv');
const path = require('path');

/**
 * @fn AlgorithmHelper
 * @desc Algorithms manager. Use it to update the available algorithms in OPAL
 * @param algoServiceURL URL of the algorithm service
 * @param algorithmsSpecsFolder schemas of the algorithms
 * @constructor
*/
function AlgorithmHelper(algoServiceURL, algorithmsSpecsFolder) {
    //Init member vars
    this._algoServiceURL = algoServiceURL;
    this._algorithmsSpecsFolder = algorithmsSpecsFolder;
    this._ajv = new Ajv({allErrors: true});

    //Bind member functions
    this.getListOfAlgos = AlgorithmHelper.prototype.getListOfAlgos.bind(this);
    this.checkAlgorithmListValidity = AlgorithmHelper.prototype.checkAlgorithmListValidity.bind(this);
    this.getAPIEnabledAlgorithms = AlgorithmHelper.prototype.getAPIEnabledAlgorithms.bind(this);
    this.validate = AlgorithmHelper.prototype.validate.bind(this);
    this.validateTime = AlgorithmHelper.prototype.validateTime.bind(this);
}

/**
 * @fn getListOfAlgos
 * @desc Get the list of algorithms for the AlgoService
 * @return {Promise} Resolve to the list of algorithms with their current version
 */
AlgorithmHelper.prototype.getListOfAlgos = function() {
    let _this = this;
    return new Promise(function(resolve, reject) {
        request({
            method: 'GET',
            baseUrl: _this._algoServiceURL,
            uri: '/list',
            json: true
        }, function (error, response, body) {
            if (error) {
                reject(ErrorHelper(error));
            }
            if(response.statusCode !== 200){
                reject(ErrorHelper('The status code is not 200. Status code:' + response.statusCode));
            }
            let listOfAlgos = {};
            body.item.forEach(function(algo){
                listOfAlgos[algo._id] = {version: algo.version};
                }
            );
            resolve(listOfAlgos);
        });
    });
};

/**
 * @fn checkAlgorithmListValidity
 * @params algorithmsList
 * @desc Checks that the algorithms list is well formed and the associated access levels are valid.
 * @return {Promise} Resolve to true if the algorithm list is well formed
 */
AlgorithmHelper.prototype.checkAlgorithmListValidity = function(algorithmsList){
    let _this = this;

    return new Promise(function(resolve, reject) {
        let error = false;
        if(algorithmsList === null || algorithmsList === undefined){
            resolve(true);
        }
        // we check that all algorithms of the user exist
        _this.getListOfAlgos().then(function(authorized_algorithms){
            let keys = Object.keys(algorithmsList);
            keys.forEach(function (key) {
                if (!authorized_algorithms.hasOwnProperty(key)) {
                    error = true;
                    reject(ErrorHelper('The update for user contains an unknown algorithm: ' + key));
                }
                if(!interface_constants.ACCESS_LEVELS.hasOwnProperty(algorithmsList[key])){
                    error = true;
                    reject(ErrorHelper('The update for user contains an unknown algorithm access level: ' + algorithmsList[key]));
                }
            });
            resolve(error);
        }, function(error){
            reject(ErrorHelper(error));
        });
    });
};

/**
 * @fn getAPIEnabledAlgorithms
 * @desc Reads all the config files for every algorithms and list of all enabled algorithms and their params fields with
 * the expected types
 * @return {list} List of all enabled algorithms
 */
AlgorithmHelper.prototype.getAPIEnabledAlgorithms = function() {
    let _this = this;
    let algoList = {};
    let filename = null;

    fs.readdirSync(_this._algorithmsSpecsFolder).forEach(file => {
        filename = path.basename(file, path.extname(file));
        if(filename !== 'core'){
            algoList[filename] = 'OK';
        }
    });
    return algoList;
};

/**
 * @fn validate
 * @desc Sends back the validation for either the core parameters or the params for the specified algorithm
 * @return {Promise} Resolve to true if the fields are valid
 */
AlgorithmHelper.prototype.validate = function(fields, algo) {
    let _this = this;
    return new Promise(function (resolve, reject) {
        let schema = require(_this._algorithmsSpecsFolder + '/' + algo + '.json');
        let valid = _this._ajv.validate(schema, fields);
        if (valid) {
            _this.validateTime(fields, algo).then(function(allGood){
                resolve(allGood);
            },function(error){
                reject(ErrorHelper('Time must have minutes as 00min and seconds as 00s.',error));
            });
        }else{
            reject(ErrorHelper('The validation of the fields for ' + algo + ' has failed.', _this._ajv.errorsText()));
        }
    });
};

/**
 * @fn validateTime
 * @desc Checks that the minutes for time are only as 0, 10, 20, 30, 40 and 50 with 00s.
 * @return {Promise} Resolve to true if the fields are valid
 */
AlgorithmHelper.prototype.validateTime = function(fields, algo) {
    let regex = new RegExp('([0-9]|0[0-9]|1[0-9]|2[0-3]):00:00Z','i');
    let testDict = {};
    return new Promise(function (resolve, reject) {
        switch (algo) {
            case 'core':
                testDict['startDate'] = fields.startDate;
                testDict['endDate'] = fields.endDate;
                break;
            case 'mobility-long':
                testDict['startWindow'] = fields.start_window;
                testDict['endWindow'] = fields.end_window;
                break;
            case 'density':
                break;
            default:
                reject(ErrorHelper('Unknown algorithm, dates cannot be checked for algorithm : ' + algo));
                break;
        }
        let keys = Object.keys(testDict);
        let valid = true;
        let invalidKey = null;
        keys.forEach(function (key) {
            if(!regex.test(testDict[key])){
                valid = false;
                invalidKey = key;
            }
        });
        if(valid) {
            resolve(valid);
        }else{
            reject(ErrorHelper('The date for field ' + invalidKey + ' is invalid.'));
        }
    });
};

module.exports = AlgorithmHelper;
