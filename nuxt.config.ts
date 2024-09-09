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
    github: {
      clientId: process.env.NUXT_GITHUB_CLIENT_ID,
      clientSecret: process.env.NUXT_GITHUB_CLIENT_SECRET
    },
    public: {
      environment: process.env.NUXT_PUBLIC_ENVIRONMENT,
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
  ],

  compatibilityDate: '2024-08-08'
})