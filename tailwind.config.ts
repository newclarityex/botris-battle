import type { Config } from 'tailwindcss'

export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  theme: {
    extend: {
      colors: {
        'background': '#181F16',
        'primary': '#6EFAFB',
        'secondary': '#3E92CC',
        'subheader': '#E88D67',
        'content': '#4F9D69',
      }
    },
  },
  plugins: [],
} satisfies Config;

