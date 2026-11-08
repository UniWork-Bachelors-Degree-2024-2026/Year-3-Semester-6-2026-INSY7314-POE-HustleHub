FROM node:24-alpine

ENV NODE_ENV=production

WORKDIR /app

# Install all packages
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Grab the source code
COPY . .

# Create a logs folder so we can pass the logs OUT of the container
RUN mkdir -p logs && chown node:node logs

# Move out of admin mode, back into a standard user (Principle of Least Privilege)
USER node

# Prep the backend to be interacted with
EXPOSE 3000

# Run the app using "node" instead of "npm" so process signals and exit codes pass through
CMD ["node", "app.js"]

# Reference List:
# rudderz243, 2026. insy7314-library. [online] Available at: <https://github.com/rudderz243/insy7314-library> [Accessed 15 August 2026].
