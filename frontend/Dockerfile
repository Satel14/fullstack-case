FROM node:22 AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --legacy-peer-deps
# RUN npm install node-sass --force

COPY . .
ARG REACT_APP_API_URL=/api
ARG REACT_APP_WS_URL=/
RUN npm run build

FROM nginx

COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html