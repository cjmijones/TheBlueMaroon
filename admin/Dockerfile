FROM node:20-alpine

WORKDIR /admin

COPY admin/package*.json ./
RUN npm ci

COPY admin/ ./

EXPOSE 5174

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
