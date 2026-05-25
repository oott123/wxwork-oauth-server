FROM node:24
ADD . /app
WORKDIR /app
RUN npm install -g yarn && \
  yarn && \
  yarn build && \
  yarn workspaces focus --production --all

FROM node:24-slim
COPY --from=0 /app /app
WORKDIR /app/packages/wxwork-oauth-server
CMD ["node", "dist/index.js"]
