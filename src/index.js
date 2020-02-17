let express = require('express');
let os = require('os');
let app = express();

let config = require('../config/opal.interface.config.js');
let OpalInterface = require('./opalInterface.js');

//Remove unwanted express headers
app.set('x-powered-by', false);

let options = Object.assign({}, config);
let opalInterface = new OpalInterface(options);

opalInterface.start().then(function(interface_router) {
    app.use(interface_router);
    app.listen(config.port, function (error) {
        if (error) {
            console.error(error); // eslint-disable-line no-console
            return;
        }
        console.log(`Listening at http://${os.hostname()}:${config.port}/`); // eslint-disable-line no-console
    });
}, function(error) {
    console.error(error); // eslint-disable-line no-console
});
