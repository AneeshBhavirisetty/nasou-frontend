# The storefront, built once and served by nginx. Which API it talks to is
# decided when the container starts (deploy/web/entrypoint.sh writes
# /config.js), so the same image runs locally, in staging and in Azure.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY deploy/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/web/entrypoint.sh /docker-entrypoint.d/40-nivora-config.sh
USER root
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-nivora-config.sh \
 && chmod 755 /docker-entrypoint.d/40-nivora-config.sh \
 && chown -R nginx:nginx /usr/share/nginx/html
USER nginx
EXPOSE 8080
