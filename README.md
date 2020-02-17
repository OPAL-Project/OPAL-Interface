# OPAL-interface
[![Lomo Saltado](https://img.shields.io/badge/made-with_Lomo_Saltado-e00f34.svg?style=flat-square)](https://www.opalproject.org)
[![Travis branch](https://img.shields.io/travis/OPAL-Project/OPAL-Interface/master.svg?style=flat-square)](https://travis-ci.org/OPAL-Project/OPAL-Interface)
[![David](https://img.shields.io/david/opal-project/opal-Interface.svg?style=flat-square)](https://david-dm.org/opal-project/opal-Interface) 
[![David](https://img.shields.io/david/dev/opal-project/opal-Interface.svg?style=flat-square)](https://david-dm.org/opal-project/opal-Interface?type=dev) 


OPAL - Interface micro-service 

The OPAL-interface provides the API to interact with the opal eco-system. The core function of the API is first and
foremost to enable authorized users to submit jobs to OPAL. The two other features that the Interface manages are the
management of users(creation, deletion and providing information about them) and providing the current statuses of all the 
services in the environment. The currently managed services are Interface, Cache, Privacy, Scheduler and Compute.

We provide the [API documentation](doc-api-swagger.yml) in swagger 2.0 format. You can paste the content in the 
[swagger editor](http://editor.swagger.io/) to render the API documentation. 

## Configuration
At its construction, the `opal-interface` server receives a configuration object that MUST respect the following schema:
 * [Example configuration](config/opal.interface.sample.config.js)
 * [Tests configuration](config/opal.interface.test.config.js)

