import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    globals: true
  },
  resolve: {
    alias: {
      'server-only': path.resolve(
        import.meta.dirname,
        './tests/mocks/server-only.ts'
      ),
      '@': path.resolve(import.meta.dirname, './src')
    }
  }
})
