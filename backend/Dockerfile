# PHP Backend Dockerfile - Railway Optimized (PHP-FPM + Nginx)
FROM php:8.2-fpm

# Install required PHP extensions
RUN docker-php-ext-install pdo pdo_mysql

# Install nginx and supervisor
RUN apt-get update && apt-get install -y nginx supervisor

# Configure PHP-FPM to listen on Unix socket
RUN echo '[www]\nuser = www-data\ngroup = www-data\nlisten = /var/run/php/php8.2-fpm.sock\nlisten.owner = www-data\nlisten.group = www-data\nlisten.mode = 0660\npm = dynamic\npm.max_children = 5\npm.start_servers = 2\npm.min_spare_servers = 1\npm.max_spare_servers = 3' > /usr/local/etc/php-fpm.d/zz-docker.conf

# Create nginx configuration
RUN echo 'server { \
    listen 80 default_server; \
    server_name _; \
    root /var/www/html; \
    \
    index index.php index.html; \
    \
    location / { \
        try_files $uri $uri/ =404; \
    } \
    \
    location ~ \.php$ { \
        include fastcgi_params; \
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock; \
        fastcgi_index index.php; \
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; \
    } \
}' > /etc/nginx/sites-available/default

# Copy application files
COPY . /var/www/html/

# Create uploads directory with proper permissions
RUN mkdir -p /var/www/html/uploads && \
    chmod -R 755 /var/www/html/uploads

# Create PHP-FPM socket directory
RUN mkdir -p /var/run/php && \
    chown -R www-data:www-data /var/run/php

# Set environment variables
ENV APP_ENV=production

# Start PHP-FPM and Nginx using supervisor
RUN apt-get install -y supervisor

RUN mkdir -p /var/log/supervisor

RUN echo '[supervisord]\nnodaemon=true\n\n[program:php-fpm]\ncommand=/usr/local/sbin/php-fpm\nautorestart=true\n\n[program:nginx]\ncommand=/usr/sbin/nginx -g "daemon off;"\nautorestart=true' > /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80

CMD ["/usr/bin/supervisord"]
