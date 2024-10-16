# Use an official Node.js image as the base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available) to the container
COPY package*.json ./

# Install the dependencies
RUN npm install

# Install TypeScript globally
RUN npm install -g typescript

# Copy the rest of the application source code to the container
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the desired port (default Express port is 3000)
EXPOSE 3000

# Start the application (using the built app.js file in dist)
CMD ["npm", "start"]