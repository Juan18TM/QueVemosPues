# Etapa 1: Build (Construcción)
FROM node:22.13-alpine as builder

WORKDIR /app

# Copiar package.json y package-lock.json si existe
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código del frontend
COPY . .

# Construir la aplicación lista para producción
RUN npm run build

# Etapa 2: Producción (Nginx)
FROM nginx:alpine

# Limpiar los estáticos default de Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar los de nuestra build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar un archivo de configuración si hace falta manejar el enrutamiento de React (Single Page App)
RUN echo "server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

# Exponer el puerto donde sirve Nginx por defecto
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
