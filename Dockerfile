FROM --platform=linux/amd64 node:20.10.0-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 4000
CMD ["npm", "start", "--listen", "0.0.0.0"]
