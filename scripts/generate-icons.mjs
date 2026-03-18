#!/usr/bin/env node
/**
 * PWA Icon Generator for BeetleSense.ai
 *
 * Generates PNG icons from the favicon SVG using svg2img or puppeteer.
 * Run: node scripts/generate-icons.mjs
 *
 * If no SVG renderer is available, generates placeholder HTML that
 * can be opened in a browser to download the icons.
 *
 * For CI/CD: npm install --no-save @resvg/resvg-js && node scripts/generate-icons.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'apps', 'web', 'public');
const ICONS_DIR = join(PUBLIC, 'icons');
const SVG_PATH = join(PUBLIC, 'favicon.svg');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const svgContent = readFileSync(SVG_PATH, 'utf8');

mkdirSync(ICONS_DIR, { recursive: true });

// Try resvg-js first
let Resvg;
try {
  const mod = await import('@resvg/resvg-js');
  Resvg = mod.Resvg;
} catch {
  // not available
}

if (Resvg) {
  console.log('Using @resvg/resvg-js for SVG rendering');

  for (const size of SIZES) {
    const resvg = new Resvg(svgContent, {
      fitTo: { mode: 'width', value: size },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    writeFileSync(join(ICONS_DIR, `icon-${size}.png`), pngBuffer);
    console.log(`  ✓ icon-${size}.png (${pngBuffer.length} bytes)`);
  }

  // Maskable icon (512px with 10% padding)
  const maskableSvg = svgContent.replace(
    'viewBox="0 0 512 512"',
    'viewBox="-51 -51 614 614"'
  );
  const resvg = new Resvg(maskableSvg, {
    fitTo: { mode: 'width', value: 512 },
    background: '#030d05',
  });
  const maskPng = resvg.render().asPng();
  writeFileSync(join(ICONS_DIR, 'icon-512-maskable.png'), maskPng);
  console.log(`  ✓ icon-512-maskable.png (${maskPng.length} bytes)`);

  // Apple touch icon (180px)
  const resvg180 = new Resvg(svgContent, {
    fitTo: { mode: 'width', value: 180 },
  });
  const applePng = resvg180.render().asPng();
  writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), applePng);
  console.log(`  ✓ apple-touch-icon.png (${applePng.length} bytes)`);

  // OG Image (1200x630) — beetle centered on dark background
  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#030d05"/>
    <g transform="translate(600,260) scale(0.5)">
      ${svgContent.replace(/<svg[^>]*>/, '').replace('</svg>', '').replace('rx="96"', 'rx="0"').replace('<rect width="512" height="512"', '<rect width="0" height="0"')}
    </g>
    <text x="600" y="480" text-anchor="middle" fill="#4ade80" font-family="system-ui,-apple-system,sans-serif" font-size="48" font-weight="700">BeetleSense.ai</text>
    <text x="600" y="530" text-anchor="middle" fill="#86efac" font-family="system-ui,-apple-system,sans-serif" font-size="22" opacity="0.7">AI-Powered Forest Intelligence</text>
  </svg>`;
  const ogResvg = new Resvg(ogSvg, { fitTo: { mode: 'width', value: 1200 } });
  const ogPng = ogResvg.render().asPng();
  writeFileSync(join(PUBLIC, 'og-image.png'), ogPng);
  console.log(`  ✓ og-image.png (${ogPng.length} bytes)`);

  console.log('\n✅ All icons generated successfully!');
} else {
  console.log('No SVG renderer available. Generating browser-based icon generator...');

  // Generate an HTML page that renders icons in the browser
  const html = `<!DOCTYPE html>
<html>
<head><title>BeetleSense Icon Generator</title></head>
<body style="background:#1a1a1a;color:white;font-family:system-ui;padding:40px">
<h1>BeetleSense.ai Icon Generator</h1>
<p>Click each button to download the icon. Or use the "Download All" button.</p>
<div id="icons" style="display:flex;flex-wrap:wrap;gap:16px;margin:24px 0"></div>
<button id="downloadAll" style="padding:12px 24px;background:#4ade80;color:black;border:none;border-radius:8px;font-size:16px;cursor:pointer;font-weight:600">Download All Icons</button>
<script>
const svgStr = ${JSON.stringify(svgContent)};
const sizes = ${JSON.stringify([...SIZES, 180])};

function renderIcon(size) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob(blob => resolve(blob), 'image/png');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  });
}

async function init() {
  const container = document.getElementById('icons');
  for (const size of sizes) {
    const blob = await renderIcon(size);
    const url = URL.createObjectURL(blob);
    const name = size === 180 ? 'apple-touch-icon.png' : 'icon-' + size + '.png';
    const div = document.createElement('div');
    div.style.cssText = 'text-align:center';
    div.innerHTML = '<img src="' + url + '" width="' + Math.min(size, 128) + '" style="border:1px solid #333;border-radius:8px"><br><a href="' + url + '" download="' + name + '" style="color:#4ade80;font-size:12px">' + name + '</a>';
    container.appendChild(div);
  }
}

document.getElementById('downloadAll').onclick = async () => {
  for (const size of sizes) {
    const blob = await renderIcon(size);
    const url = URL.createObjectURL(blob);
    const name = size === 180 ? 'apple-touch-icon.png' : 'icon-' + size + '.png';
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    await new Promise(r => setTimeout(r, 200));
  }
};

init();
</script>
</body>
</html>`;

  writeFileSync(join(PUBLIC, 'icon-generator.html'), html);
  console.log('  → Generated: apps/web/public/icon-generator.html');
  console.log('  → Open this file in a browser and click "Download All"');
  console.log('  → Then move the downloaded files to apps/web/public/icons/');
  console.log('\n  To generate automatically, install a renderer:');
  console.log('    npm install --no-save @resvg/resvg-js');
  console.log('    node scripts/generate-icons.mjs');
}
