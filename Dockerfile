# Use the official Node.js image as the base image for frontend
FROM node:20-alpine

WORKDIR /app

# Copy the frontend package.json and package-lock.json into the container
COPY ./package*.json ./

RUN apk add --no-cache python3 make g++ libc6-compat bash autoconf automake libtool

RUN npm cache clean --force
RUN npm install
# Install frontend Node.js dependencies
# RUN npm install

# Copy the rest of the frontend code into the container
COPY . .



# Build the Next.js applications
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]


