# ==============================================================================
# LuwiFinance — Backend Auth (PHP 8.2 + Laravel + PostgreSQL)
# ==============================================================================
FROM php:8.2-cli-alpine

# Instala dependências de sistema e extensões para PostgreSQL
RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    zip \
    unzip \
    git \
  && docker-php-ext-install pdo pdo_pgsql zip

# Instala Composer oficial
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copia arquivos de dependência
COPY composer.json ./

# Instala dependências sem scripts e sem dev para build leve
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader || true

# Copia todo o código-fonte do backend
COPY . .

# Garante permissões das pastas de storage e bootstrap/cache
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
  && chmod -R 777 storage bootstrap/cache

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
