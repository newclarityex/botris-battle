import { resolve } from "node:path";
import { isCustomElement, transformAssetUrls } from 'vue3-pixi'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      title: "Botris Battle",
      link: [{ rel: 'icon', type: 'image/png', href: '/favicon.png' }],
    },
  },
  experimental: {
    asyncContext: true
  },
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: [
    '@pinia/nuxt',
    '@nuxt/content',
    '@nuxt/ui'
  ],
  content: {
    highlight: {
      theme: "dark-plus",
      preload: ['typescript']
    }
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    build: false,
    secret: process.env.NUXT_SECRET,
    authJs: {
      // baseUrl: "localhost:3000/api/auth",
      verifyClientOnEveryRequest: true,
    },
    github: {
      clientId: process.env.NUXT_GITHUB_CLIENT_ID,
      clientSecret: process.env.NUXT_GITHUB_CLIENT_SECRET
    },
    public: {
      environment: process.env.NUXT_ENVIRONMENT,
      authJs: {
        baseUrl: process.env.NUXT_NEXTAUTH_URL, // The URL of your deployed app (used for origin Check in production)
        verifyClientOnEveryRequest: true // whether to hit the /auth/session endpoint on every client request
      }
    }
  },
  alias: {
    cookie: resolve(__dirname, "node_modules/cookie"),
    jwt: resolve(__dirname, "node_modules/jwt"),
    crypto: resolve(__dirname, "node_modules/crypto"),
  },
  routeRules: {
    '/**': { ssr: false },
    '/room/**': { ssr: false },
  },
  vue: {
    compilerOptions: {
      isCustomElement,
    }
  },
  ignore: [
    // 'pages/docs.vue',
    // 'pages/dashboard.vue',
    // 'pages/rooms',
    // 'pages/room/**',
    // 'pages/rooms/testing.vue',

    // 'api/room/**',
    // 'api/rooms/**',
  ]
})


