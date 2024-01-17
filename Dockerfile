FROM --platform=linux/amd64 node:20.5.0

ARG SECRETS

WORKDIR /usr/src/app
RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y apt-transport-https
RUN DEBIAN_FRONTEND=noninteractive apt install chromium -y
COPY package.json /usr/src/app/
COPY package-lock.json /usr/src/app/
RUN echo $SECRETS > /usr/src/app/Secrets.json
RUN npm ci
COPY . /usr/src/app

EXPOSE 80
ENTRYPOINT NODE_ENV=production npm run start