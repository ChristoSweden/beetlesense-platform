import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/dashboard.ts'],
  format: ['cjs'],
  target: 'node22',
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  outDir: 'dist',
})
