FROM --platform=linux/amd64 node:20.11.0

WORKDIR /usr/src/app
RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y apt-transport-https
RUN DEBIAN_FRONTEND=noninteractive apt install chromium -y
COPY package.json /usr/src/app/
COPY package-lock.json /usr/src/app/
RUN npm ci
COPY . /usr/src/app

ARG BUILD_SHA
ARG BUILD_TS

EXPOSE 80
ENTRYPOINT IS_HOSTED=true NODE_ENV=production BUILD_SHA=$BUILD_SHA BUILD_TS=$BUILD_TS npm run start:test