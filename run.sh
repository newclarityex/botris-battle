#!/bin/sh
cd /src
npx prisma generate
npx prisma db push
# node .output/server/index.mjs
yarn dev