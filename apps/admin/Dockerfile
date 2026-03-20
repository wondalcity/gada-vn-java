FROM php:8.2-fpm-alpine

RUN apk add --no-cache nginx curl

RUN docker-php-ext-install opcache

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock* ./
RUN composer install --no-dev --optimize-autoloader --no-interaction

COPY . .

# Nginx config
RUN echo 'server { \
    listen 80; \
    root /app/public; \
    index index.php; \
    location / { try_files $uri $uri/ /index.php?$query_string; } \
    location ~ \.php$ { fastcgi_pass 127.0.0.1:9000; fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name; include fastcgi_params; } \
}' > /etc/nginx/http.d/default.conf

EXPOSE 80

CMD php-fpm -D && nginx -g 'daemon off;'
