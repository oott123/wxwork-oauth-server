FROM quay.io/oott123/node:12
ADD . /app
WORKDIR /app
RUN yarn && \
  yarn build && \
  yarn --production

FROM quay.io/oott123/node:12-slim
COPY --from=0 /app /app
WORKDIR /app/packages/wxwork-oauth-server
CMD ["node", "dist/index.js"]
