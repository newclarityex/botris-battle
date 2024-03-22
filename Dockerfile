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
WORKDIR /usr/src/app


################################################################################
# Create a stage for installing production dependecies.
FROM base as deps

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.yarn to speed up subsequent builds.
# Leverage bind mounts to package.json and yarn.lock to avoid having to copy them
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=yarn.lock,target=yarn.lock \
    --mount=type=cache,target=/root/.yarn \
    yarn install --production --frozen-lockfile

################################################################################
# Create a stage for building the application.
FROM deps as build

# Download additional development dependencies before building, as some projects require
# "devDependencies" to be installed to build. If you don't need this, remove this step.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=yarn.lock,target=yarn.lock \
    --mount=type=cache,target=/root/.yarn \
    yarn install --frozen-lockfile

# Copy the rest of the source files into the image.
COPY . .

RUN npx prisma generate

# TEST
ENV DATABASE_URL="mysql://root:password@localhost:3306/botris"
ENV NUXT_NEXTAUTH_SECRET="WV1JszUTQp1PJc5NUfk1PIycYMjE+KEsev7sAHNt8IM="
ENV NUXT_GITHUB_CLIENT_ID="dacc4f4e811ccb2abc97"
ENV NUXT_GITHUB_CLIENT_SECRET="be3eb9f225cb5441402338a73e3f25d585ac18d1"
ENV NUXT_NEXTAUTH_URL="http://localhost:3000/"
ENV NUXT_RECAPTCHA_SITE_KEY="6LfS3SwpAAAAAEeMGHR7AFc_C70mSaxYUVQIgaRj"
ENV NUXT_RECAPTCHA_SECRET="6LfS3SwpAAAAADNsrO3OOJZmb7D6_DDPqDnzdJT2"

# Run the build script.
RUN yarn run build

################################################################################
# Create a new stage to run the application with minimal runtime dependencies
# where the necessary files are copied from the build stage.
FROM base as final

# Use production node environment by default.
ENV NODE_ENV production

# Run the application as a non-root user.
USER node

# Copy package.json so that package manager commands can be used.
COPY package.json .

# Copy the production dependencies from the deps stage and also
# the built application from the build stage into the image.
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/.output ./.output


# Expose the port that the application listens on.
EXPOSE 3000

# Run the application.
ENTRYPOINT [ "node server/index.js" ]
