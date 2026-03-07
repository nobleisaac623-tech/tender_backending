# PHP Backend Dockerfile - Railway Optimized
FROM php:8.2-apache

# Install required PHP extensions
RUN docker-php-ext-install pdo pdo_mysql

# Fix Apache MPM conflict - remove conflicting mpm_event module
RUN rm -f /etc/apache2/mods-enabled/mpm_event.load /etc/apache2/mods-enabled/mpm_event.conf \
    /etc/apache2/mods-available/mpm_event.load /etc/apache2/mods-available/mpm_event.conf 2>/dev/null || true

# Enable required Apache modules
RUN a2enmod rewrite headers

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY . /var/www/html/

# Create uploads directory with proper permissions
RUN mkdir -p /var/www/html/uploads && \
    chmod -R 755 /var/www/html/uploads

# Set environment variables
ENV APP_ENV=production

# Configure Apache for Railway
# Set the ServerName to avoid warnings
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Allow .htaccess overrides
RUN sed -i 's/<Directory \/var\/www\/html>/<Directory \/var\/www\/html>\n    AllowOverride All/' /etc/apache2/sites-available/000-default.conf

# Expose port 80
EXPOSE 80

# Start Apache
CMD ["apache2-foreground"]
