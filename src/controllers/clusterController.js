const { interface_constants } = require('../core/models.js');
const { ErrorHelper } = require('eae-utils');
const Cluster = require('../core/cluster.js');

/**
 * @fn ClusterController
 * @desc Controller to manage the cluster service
 * @param statusCollection
 * @param usersCollection
 * @param accessLogger
 * @constructor
 */
function ClusterController(statusCollection, usersCollection, accessLogger) {
    let _this = this;
    _this._statusCollection = statusCollection;
    _this._usersCollection = usersCollection;
    _this._accessLogger = accessLogger;

    // Bind member functions
    _this.getServicesStatus = ClusterController.prototype.getServicesStatus.bind(this);
}

/**
 * @fn getServicesStatus
 * @desc Checks that the request is coming from an Admin and sends back the statuses of all the services in the cluster.
 * @param req Incoming message
 * @param res Server Response
 */
ClusterController.prototype.getServicesStatus = function(req, res){
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
                if(user === null){
                    res.status(401);
                    res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
                    // Log unauthorized access
                    _this._accessLogger.logIllegalAccess(req);
                    return;
                }
                if(user.type === interface_constants.USER_TYPE.admin){
                    let cluster = new Cluster(_this._statusCollection);
                    cluster.getStatuses().then(function(clusterStatuses) {
                        res.status(200);
                        res.json(clusterStatuses);
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
            }, function (__unused_error) { // eslint-disable-line no-unused-vars
                res.status(401);
                res.json(ErrorHelper('Unauthorized access. The unauthorized access has been logged.'));
            }
        );
    }
    catch (error) { // ObjectID creation might throw
        res.status(500);
        res.json(ErrorHelper('Error occurred', error));
    }
};

module.exports = ClusterController;
