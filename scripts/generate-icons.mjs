import sharp from 'sharp'
import { mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const iconsDir = join(publicDir, 'icons')

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true })
}

// Use favicon.png — it's the square-ish app icon (273x280)
const sourceFile = join(publicDir, 'favicon.png')
console.log(`Using source: ${sourceFile}`)

const sizes = [
  { size: 16,  name: 'favicon-16x16.png',  dir: publicDir },
  { size: 32,  name: 'favicon-32x32.png',  dir: publicDir },
  { size: 48,  name: 'favicon-48x48.png',  dir: publicDir },
  { size: 72,  name: 'icon-72x72.png',     dir: iconsDir  },
  { size: 96,  name: 'icon-96x96.png',     dir: iconsDir  },
  { size: 128, name: 'icon-128x128.png',   dir: iconsDir  },
  { size: 144, name: 'icon-144x144.png',   dir: iconsDir  },
  { size: 152, name: 'icon-152x152.png',   dir: iconsDir  },
  { size: 180, name: 'apple-touch-icon.png', dir: publicDir },
  { size: 192, name: 'icon-192x192.png',   dir: iconsDir  },
  { size: 256, name: 'icon-256x256.png',   dir: iconsDir  },
  { size: 384, name: 'icon-384x384.png',   dir: iconsDir  },
  { size: 512, name: 'icon-512x512.png',   dir: iconsDir  },
  { size: 144, name: 'mstile-144x144.png', dir: iconsDir  },
  { size: 150, name: 'mstile-150x150.png', dir: iconsDir  },
  { size: 310, name: 'mstile-310x310.png', dir: iconsDir  },
]

const maskableSizes = [
  { size: 192, name: 'icon-192x192-maskable.png', dir: iconsDir },
  { size: 512, name: 'icon-512x512-maskable.png', dir: iconsDir },
]

async function generateIcon(outputPath, size, maskable = false) {
  if (maskable) {
    // Maskable: icon fills 70% of canvas, brand-green background
    const innerSize = Math.round(size * 0.7)
    const padding = Math.round((size - innerSize) / 2)
    await sharp(sourceFile)
      .resize(innerSize, innerSize, {
        fit: 'contain',
        background: { r: 10, g: 85, b: 64, alpha: 0 },
      })
      .extend({
        top: padding,
        bottom: size - innerSize - padding,
        left: padding,
        right: size - innerSize - padding,
        background: { r: 10, g: 85, b: 64, alpha: 1 },
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outputPath)
  } else {
    await sharp(sourceFile)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 10, g: 85, b: 64, alpha: 1 },
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outputPath)
  }
  console.log(`✅ ${outputPath.replace(publicDir, '')} (${size}x${size}${maskable ? ' maskable' : ''})`)
}

for (const { size, name, dir } of sizes) {
  await generateIcon(join(dir, name), size)
}

for (const { size, name, dir } of maskableSizes) {
  await generateIcon(join(dir, name), size, true)
}

console.log('\n🎉 All icons generated successfully!')
