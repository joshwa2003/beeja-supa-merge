FROM node:18 AS build
WORKDIR /app
COPY package.json ./
RUN npm install --force
COPY . .

RUN npm run build
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80