import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
const dv = JSON.parse(readFileSync('./node_modules/defuddle/package.json', 'utf8')).version
export default defineConfig({ plugins: [react()], define: { __DEFUDDLE_VERSION__: JSON.stringify(dv) } })
