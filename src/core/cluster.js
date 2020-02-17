const { ErrorHelper } = require('eae-utils');

/**
 * @fn Cluster
 * @desc Service that enables to manipulate the OPAL cluster
 * @param statusCollection A Plain JS object describing the swift object storage endpoint
 * @constructor
 */
function Cluster(statusCollection){
    let _this = this;
    _this._statusCollection = statusCollection;

    // Bind member functions
    _this.getStatuses = Cluster.prototype.getStatuses.bind(this);
}

/**
 * @fn getStatuses
 * @desc The method sends back all the current statuses of the OPAL services
 * @returns {Promise}
 */
Cluster.prototype.getStatuses = function(){
    let _this = this;
    return new Promise(function (resolve, reject) {
        _this._statusCollection.find({}).toArray().then(function (statuses) {
                resolve(statuses);
            }, function (error) {
                reject(ErrorHelper('Couldn\'t retrieve statuses.', error));
            }
        );
    });
};

module.exports = Cluster;
