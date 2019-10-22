FROM node:10-alpine
RUN mkdir -p /app/node_modules

#USER node
WORKDIR /app
COPY package*.json ./
RUN npm config set registry http://registry.npmjs.org/
RUN npm install
COPY . .
#COPY --chown=node:node . .
#USER node
EXPOSE 4040
CMD [ "node", "index.js" ]