FROM node:20.11.1

WORKDIR /usr/src/app
COPY package.json /usr/src/app/
COPY package-lock.json /usr/src/app/
RUN npm ci
COPY . /usr/src/app

ARG BUILD_TS_ARG
ENV BUILD_TS=$BUILD_TS_ARG

ENV NODE_ENV=production
ENV IS_HOSTED=true

ENTRYPOINT npm run start:test