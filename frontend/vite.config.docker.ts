import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Docker-specific Vite configuration with relaxed TypeScript checking
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: true,
    rollupOptions: {
      // Exclude test files from the build
      external: [
        /^\/.*\.test\.(ts|tsx|js|jsx)$/,
        /^\/.*\.spec\.(ts|tsx|js|jsx)$/,
        /^\/.*__tests__.*$/,
        /^.*vitest.*$/,
        /^.*@testing-library.*$/,
        /^.*@vitest.*$/,
      ],
    },
  },
  esbuild: {
    // Skip type checking for faster builds
    target: 'es2020',
    legalComments: 'none',
    // Ignore TypeScript errors during build
    logOverride: {
      'this-is-undefined-in-esm': 'silent',
      'empty-import-meta': 'silent',
    },
  },
  define: {
    // Define environment variables
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
})