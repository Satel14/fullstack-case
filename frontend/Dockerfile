FROM node:14 as build

WORKDIR /app

COPY ./package.json ./

RUN npm install
# RUN npm install node-sass --force

COPY . .
RUN npm run build

FROM nginx

COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html