# PHP Backend Dockerfile - Railway Optimized (PHP-FPM + Nginx)
FROM php:8.2-fpm

# Install required PHP extensions
RUN docker-php-ext-install pdo pdo_mysql

# Install nginx
RUN apt-get update && apt-get install -y nginx

# Create nginx configuration
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /var/www/html; \
    index index.php index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.php?$query_string; \
    } \
    \
    location ~ \.php$ { \
        try_files $uri =404; \
        fastcgi_split_path_info ^(.+\.php)(/.+)$; \
        fastcgi_pass 127.0.0.1:9000; \
        fastcgi_index index.php; \
        include fastcgi_params; \
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; \
        fastcgi_param PATH_INFO $fastcgi_path_info; \
    } \
    \
    location ~ /\.ht { \
        deny all; \
    } \
}' > /etc/nginx/sites-available/default

# Copy application files
COPY . /var/www/html/

# Create uploads directory with proper permissions
RUN mkdir -p /var/www/html/uploads && \
    chmod -R 755 /var/www/html/uploads

# Set environment variables
ENV APP_ENV=production

# Expose port 80
EXPOSE 80

# Start PHP-FPM and Nginx
CMD service php8.2-fpm start && nginx -g 'daemon off;'
