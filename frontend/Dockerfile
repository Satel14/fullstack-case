FROM node:22 AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --legacy-peer-deps
# RUN npm install node-sass --force

COPY . .
RUN npm run build

FROM nginx

COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html