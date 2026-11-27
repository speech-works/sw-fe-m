// SVG -> PNG with headless Google Chrome (the installed app, so the repo needs
// no browser package). Chrome draws the kit's filters and masks exactly as the
// site does; rsvg drops some of them (the hijab's face).
// Set CHROME to use another Chrome binary.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function renderSvg(svgText, outPng, width, height) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'covers-'));
  const svg = svgText.replace(/<svg /, `<svg style="display:block;width:${width}px;height:${height}px" `);
  const html = path.join(dir, 'page.html');
  fs.writeFileSync(html, `<!doctype html><html><head><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>${svg}</body></html>`);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--user-data-dir=${path.join(dir, 'profile')}`, '--default-background-color=00000000',
    `--window-size=${width},${height}`, `--screenshot=${path.resolve(outPng)}`, `file://${html}`,
  ], { stdio: 'ignore' });
  fs.rmSync(dir, { recursive: true, force: true });
}

module.exports = { renderSvg };
