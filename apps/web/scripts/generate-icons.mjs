#!/usr/bin/env node
/**
 * Generate PWA icon PNGs from favicon.svg
 *
 * Usage:
 *   node scripts/generate-icons.mjs
 *
 * Requires: sharp (npm install -D sharp)
 * Or run manually with any SVG-to-PNG tool.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, '..', 'public')
const ICONS_DIR = join(PUBLIC, 'icons')
const SVG_PATH = join(PUBLIC, 'favicon.svg')

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

async function main() {
  if (!existsSync(ICONS_DIR)) {
    mkdirSync(ICONS_DIR, { recursive: true })
  }

  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.log('sharp not installed. Generating placeholder PNGs instead.')
    console.log('To generate real icons: npm install -D sharp && node scripts/generate-icons.mjs')
    generatePlaceholders()
    return
  }

  const svgBuffer = readFileSync(SVG_PATH)

  for (const size of SIZES) {
    const outPath = join(ICONS_DIR, `icon-${size}.png`)
    await sharp(svgBuffer).resize(size, size).png().toFile(outPath)
    console.log(`Generated: icons/icon-${size}.png`)
  }

  // Maskable icon (with extra padding for safe zone)
  const maskableSize = 512
  const padding = Math.round(maskableSize * 0.1) // 10% safe zone
  const innerSize = maskableSize - padding * 2

  await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 3, g: 13, b: 5, alpha: 1 }, // #030d05
    })
    .png()
    .toFile(join(ICONS_DIR, 'icon-512-maskable.png'))
  console.log('Generated: icons/icon-512-maskable.png')

  // Apple touch icon (180x180)
  await sharp(svgBuffer).resize(180, 180).png().toFile(join(PUBLIC, 'apple-touch-icon.png'))
  console.log('Generated: apple-touch-icon.png')

  console.log('Done! All PWA icons generated.')
}

function generatePlaceholders() {
  // Generate minimal 1x1 PNG placeholders so the app doesn't 404
  // These should be replaced with real icons before production
  const MINIMAL_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  )

  for (const size of SIZES) {
    writeFileSync(join(ICONS_DIR, `icon-${size}.png`), MINIMAL_PNG)
    console.log(`Placeholder: icons/icon-${size}.png`)
  }
  writeFileSync(join(ICONS_DIR, 'icon-512-maskable.png'), MINIMAL_PNG)
  console.log('Placeholder: icons/icon-512-maskable.png')
  writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), MINIMAL_PNG)
  console.log('Placeholder: apple-touch-icon.png')
  console.log('\nPlaceholder icons created. Install sharp and re-run for production icons.')
}

main().catch(console.error)
