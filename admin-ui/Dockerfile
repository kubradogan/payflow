# Build stage: compiles the React app into static files
FROM node:18-alpine AS build
WORKDIR /app

# Build-time variable used by Create React App
# It lets docker-compose pass the backend base URL without changing source code
ARG REACT_APP_API_BASE_URL
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

# Install dependencies first to benefit from Docker layer caching
COPY package*.json ./
RUN npm install

# Copy the rest of the frontend source and build the production bundle
COPY . .
RUN npm run build

# Run stage: serves the built static files via Nginx
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

# Expose the HTTP port used by Nginx inside the container
EXPOSE 80

# Keep Nginx running in the foreground
CMD ["nginx", "-g", "daemon off;"]