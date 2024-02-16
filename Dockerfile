FROM node:20.11.1

WORKDIR /usr/src/app
COPY package.json /usr/src/app/
COPY package-lock.json /usr/src/app/
RUN npm ci
COPY . /usr/src/app

ARG BUILD_TS_ARG
ENV BUILD_TS=$BUILD_TS_ARG

ENTRYPOINT IS_HOSTED=true NODE_ENV=production npm run start:test