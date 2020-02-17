# Select source image
FROM node:jessie

# Install all dependencies
RUN apt-get update -q                                   \
    && apt-get upgrade -y --no-install-recommends

# Create app directories
RUN mkdir -p /usr/app && mkdir -p /usr/test
WORKDIR /usr/app

# Install app dependencies
COPY ./package.json /usr/app/
# Install opal-interface npm dependencies
RUN npm install --silent; exit 0;
RUN cat /root/.npm/_logs/*; exit 0;

# Bundle app
COPY ./src /usr/app/src
COPY ./.eslintrc /usr/app/.eslintrc
COPY ./test/*.js /usr/app/test/
COPY ./config/opal.interface.test.config.js /usr/app/config/opal.interface.test.config.js
COPY ./algorithms /usr/app/algorithms

EXPOSE 80
CMD [ "npm", "test"]
