FROM nginx
RUN rm /usr/share/nginx/html/*
COPY default.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]