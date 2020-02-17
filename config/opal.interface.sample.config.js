
module.exports = {
    mongoURL: 'mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]',
    port: 8080,
	enableCors: true,
    cacheURL: 'http://cache:8080',
    algoServiceURL: 'http://algoService:80',
    algorithmsDirectory: '/usr/app/algorithms',
    auditDirectory: '/usr/app/audit',
    quotasRefreshPeriod: 7,
    debug: false
};
