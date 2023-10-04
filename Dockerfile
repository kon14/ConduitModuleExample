FROM node:hydrogen-alpine3.18 as builder
RUN apk update
RUN apk add protoc
RUN mkdir -p /build
WORKDIR /build
COPY . .
RUN npm run setup
RUN npm run build


FROM node:hydrogen-alpine3.18
WORKDIR /app
COPY --from=builder /build/dist .
COPY --from=builder /build/package.json .
COPY --from=builder /build/package-lock.json .
RUN npm ci
ENV NODE_ENV="production"

ENV CONDUIT_SERVER=
ENV SERVICE_URL=
ENV GRPC_PORT=
ENV GRPC_KEY=

EXPOSE $GRPC_PORT

CMD [ "node", "./index.js" ]
