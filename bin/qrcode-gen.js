#!/usr/bin/env node
import { program } from 'commander'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import QRCode from 'qrcode'

function safeFilenameFromText(text) {
  try {
    const u = new url.URL(text)
    const base = u.hostname || 'qrcode'
    return `${base}.png`
  } catch {
    const safe = text.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 24) || 'qrcode'
    return `${safe}.png`
  }
}

function ensurePng(p) {
  const ext = path.extname(p).toLowerCase()
  return ext === '.png' ? p : `${p.slice(0, -ext.length)}.png`
}

program
  .name('qrcode-gen')
  .description('Generate a PNG QR code from a URL or any text.')
  .argument('<text>', 'The URL or text to encode into the QR code')
  .option('-o, --output <path>', 'Output PNG file path')
  .option('-s, --scale <n>', 'Pixel scale factor', (v) => parseInt(v, 10), 8)
  .option('-e, --ecc <level>', 'Error correction level (L, M, Q, H)', 'M')
  .option('--fg <hex>', 'Foreground color', '#000000')
  .option('--bg <hex>', 'Background color', '#FFFFFF')
  .option('--border <n>', 'Quiet zone size in modules', (v) => parseInt(v, 10), 4)
  .addHelpText('after',
    `\nExamples:\n` +
    `  npx qrcode-gen 'https://example.com'\n` +
    `  npx qrcode-gen 'https://example.com' -o ./out/example.png\n` +
    `  npx qrcode-gen 'hello world' --fg '#222' --bg '#fff' -s 10\n` +
    `  npx qrcode-gen 'https://example.com' -e H --border 2\n`
  )

program.action(async (text, options) => {
  const t = String(text).trim()
  if (!t) {
    console.error('Error: input text is empty')
    process.exit(2)
  }
  if (options.scale <= 0) {
    console.error('Error: scale must be a positive integer')
    process.exit(2)
  }
  if (options.border < 0) {
    console.error('Error: border must be zero or a positive integer')
    process.exit(2)
  }
  const out = ensurePng(options.output ?? safeFilenameFromText(t))
  const dir = path.dirname(out)
  if (dir && dir !== '.') {
    fs.mkdirSync(dir, { recursive: true })
  }
  const ecc = String(options.ecc).toUpperCase()
  if (!['L','M','Q','H'].includes(ecc)) {
    console.error('Error: ecc must be one of L, M, Q, H')
    process.exit(2)
  }

  try {
    await QRCode.toFile(out, t, {
      errorCorrectionLevel: ecc,
      scale: options.scale,
      margin: options.border,
      color: { dark: options.fg, light: options.bg },
      type: 'png',
    })
    console.log(`Wrote ${out}`)
    process.exit(0)
  } catch (err) {
    console.error('Failed to generate QR code:', err?.message ?? err)
    process.exit(1)
  }
})

program.parse()

