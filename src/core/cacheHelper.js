const request = require('request');

/**
 * @fn CacheHelper
 * @desc Cache manager. Use it to send requests to the cache
 * @param cacheURL URL of the algorithm service
 * @constructor
 */
function CacheHelper(cacheURL) {
    //Init member vars
    this.cacheURL = cacheURL;

    //Bind member functions
    this.sendRequestToCache = CacheHelper.prototype.sendRequestToCache.bind(this);
}

CacheHelper.prototype.sendRequestToCache = function(job) {
    let _this = this;

    return new Promise(function(resolve, reject) {
        request(
            {
                method: 'POST',
                baseUrl: _this.cacheURL,
                uri: '/query',
                json: true,
                body: {
                    job: job
                }
            }, function(error, _unused__, body) {
                if (!error) {
                    resolve(body);
                }
                else {
                    reject(error);
                }
            });
    });
};

module.exports = CacheHelper;
