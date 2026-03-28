# Etapa 1: Build (Construcción)
FROM node:22.13-alpine as builder

WORKDIR /app

# Recibir argumentos de build desde Dokploy (Environment variables mapping)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_TMDB_API_KEY
ARG VITE_OPENROUTER_API_KEY

# Convertirlos en variables de entorno fijas para que Vite las lea en el build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_TMDB_API_KEY=$VITE_TMDB_API_KEY
ENV VITE_OPENROUTER_API_KEY=$VITE_OPENROUTER_API_KEY

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
