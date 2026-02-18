import path from 'path'
import { defineConfig, Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// Plugin to serve landing.html as the default page in dev mode
function landingHtmlPlugin(): Plugin {
  return {
    name: 'landing-html-plugin',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        // Rewrite root path to landing.html
        if (req.url === '/' || req.url === '/index.html') {
          req.url = '/landing.html'
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    landingHtmlPlugin(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  publicDir: 'public-landing',
  build: {
    outDir: 'dist-landing',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'landing.html'),
      },
    },
  },
})
