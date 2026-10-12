import { defineConfig } from 'vitest/config'
export default defineConfig({
  base: './',
  server: { host: '127.0.0.1' },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    clearMocks: true,
  },
})
