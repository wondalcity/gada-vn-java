/**
 * generate-assets.mjs
 * Generates app icons, splash screen, and other image assets for the GADA VN mobile app.
 * Source: apps/web-next/public/logo.png (600x240 horizontal logo)
 *
 * Usage: node scripts/generate-assets.mjs
 * Requires: jimp (pnpm add -D jimp)
 */

import { Jimp } from 'jimp'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ASSETS_DIR = path.join(ROOT, 'assets')
const LOGO_SRC = path.resolve(ROOT, '../../apps/web-next/public/logo.png')

// Brand colors
const ORANGE = 0xFF6B2CFF  // #FF6B2C opaque
const WHITE  = 0xFFFFFFFF

async function main() {
  // Verify source logo exists
  if (!fs.existsSync(LOGO_SRC)) {
    console.error(`Logo not found at: ${LOGO_SRC}`)
    process.exit(1)
  }

  console.log('Loading logo from:', LOGO_SRC)
  const logo = await Jimp.read(LOGO_SRC)
  console.log(`Logo size: ${logo.width}x${logo.height}`)

  // ── icon.png (1024×1024) ──────────────────────────────────────────────────
  // Orange background + logo scaled to 680px wide, centered
  {
    const size = 1024
    const icon = new Jimp({ width: size, height: size, color: ORANGE })
    const logoW = 680
    const logoH = Math.round((logo.height / logo.width) * logoW)
    const scaled = logo.clone().resize({ w: logoW, h: logoH })
    const x = Math.round((size - logoW) / 2)
    const y = Math.round((size - logoH) / 2)
    icon.composite(scaled, x, y)
    const out = path.join(ASSETS_DIR, 'icon.png')
    await icon.write(out)
    console.log('✓ icon.png')
  }

  // ── adaptive-icon.png (1024×1024) ─────────────────────────────────────────
  // Android adaptive icon foreground — white background with logo
  // (the orange background is configured in app.json as backgroundColor)
  {
    const size = 1024
    const adaptive = new Jimp({ width: size, height: size, color: ORANGE })
    const logoW = 600
    const logoH = Math.round((logo.height / logo.width) * logoW)
    const scaled = logo.clone().resize({ w: logoW, h: logoH })
    const x = Math.round((size - logoW) / 2)
    const y = Math.round((size - logoH) / 2)
    adaptive.composite(scaled, x, y)
    const out = path.join(ASSETS_DIR, 'adaptive-icon.png')
    await adaptive.write(out)
    console.log('✓ adaptive-icon.png')
  }

  // ── splash.png (1284×2778) ────────────────────────────────────────────────
  // Portrait splash: orange background + logo centered at 40% from top
  {
    const w = 1284
    const h = 2778
    const splash = new Jimp({ width: w, height: h, color: ORANGE })
    const logoW = 800
    const logoH = Math.round((logo.height / logo.width) * logoW)
    const scaled = logo.clone().resize({ w: logoW, h: logoH })
    const x = Math.round((w - logoW) / 2)
    const y = Math.round(h * 0.38)  // ~38% from top
    splash.composite(scaled, x, y)
    const out = path.join(ASSETS_DIR, 'splash.png')
    await splash.write(out)
    console.log('✓ splash.png')
  }

  // ── notification-icon.png (96×96) ─────────────────────────────────────────
  // Monochrome white icon on transparent for Android notifications
  // Use a simple phone icon shape (white circle with phone symbol)
  {
    const size = 96
    const notif = new Jimp({ width: size, height: size, color: 0x00000000 }) // transparent
    // Draw a simple white filled circle background
    for (let px = 0; px < size; px++) {
      for (let py = 0; py < size; py++) {
        const cx = size / 2, cy = size / 2, r = size / 2 - 2
        if (Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) <= r) {
          notif.setPixelColor(WHITE, px, py)
        }
      }
    }
    const out = path.join(ASSETS_DIR, 'notification-icon.png')
    await notif.write(out)
    console.log('✓ notification-icon.png')
  }

  // ── favicon.png (64×64) ───────────────────────────────────────────────────
  {
    const size = 64
    const favicon = new Jimp({ width: size, height: size, color: ORANGE })
    const logoW = 46
    const logoH = Math.round((logo.height / logo.width) * logoW)
    const scaled = logo.clone().resize({ w: logoW, h: logoH })
    const x = Math.round((size - logoW) / 2)
    const y = Math.round((size - logoH) / 2)
    favicon.composite(scaled, x, y)
    const out = path.join(ASSETS_DIR, 'favicon.png')
    await favicon.write(out)
    console.log('✓ favicon.png')
  }

  console.log('\nAll assets generated in:', ASSETS_DIR)
}

main().catch(err => {
  console.error('Error generating assets:', err)
  process.exit(1)
})
