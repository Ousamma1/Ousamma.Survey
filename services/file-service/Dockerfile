FROM node:18-alpine

# Install dependencies for sharp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3004

CMD ["npm", "start"]
