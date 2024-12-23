# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=20.10.0

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine as base

# Set working directory for all build stages.
WORKDIR /src
ENV NODE_ENV production
ENV NUXT_BUILD true

FROM base as build

COPY --link . .

RUN yarn
RUN npx prisma generate
# RUN yarn add tailwindcss
RUN yarn build

FROM base
# COPY --from=build /src/.output /src/.output
COPY --from=build /src /src

# Run the application.
CMD [ "/bin/sh", "/src/run.sh" ]
