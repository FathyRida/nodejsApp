# Use an official Node runtime as the base image
FROM node:latest

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install the application's dependencies inside the Docker image
RUN npm install

# Copy the application code to the container
COPY . .

# Define the command to run the application
CMD ["npm", "start"]
