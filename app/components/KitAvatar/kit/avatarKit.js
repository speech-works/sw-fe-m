/* eslint-disable */
// GENERATED: copied from sw-characters kit/avatarKit.js by core/scripts/export-app-avatars.mjs. Do not edit.
/* Speechworks authored avatar kit: the composer (no dependencies).
 *
 *   compose(catalog, manifest, opts) -> one SVG string
 *
 * Works in the browser, in Node and in react-native-svg (<SvgXml xml={...}/>).
 * manifest = the app's AvatarManifest: { parts: {slot: "slot.name" | null}, colors: {skin, hair, bg, collar, ...} }.
 * Extra colour keys the kit understands (all optional): beard, headgear, eyewear, ink (brows),
 * headgearAccent, collarAccent, hairAccent. The app's normalizeManifest must keep them (README).
 * opts: { shape: "circle" (default) | "square" | "none", zoom: number (default catalog.zoom),
 *         bg: true (default, uses colors.bg) | false | "#RRGGBB", uid: string for the clip id }
 *
 * This file repeats kit/compose.py and kit/colour.py line for line. build.py runs both on
 * the same manifests and fails if the text differs, so change them together.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AvatarKit = factory();
})(this, function () {
  var HEX = /^#[0-9A-Fa-f]{6}$/;

  // ---------------------------------------------------------------- colour (OKLab)
  function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function gam(c) {
    c = Math.max(0, Math.min(1, c));
    c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.floor(c * 255 + 0.5);
  }
  function toLab(hx) {
    var r = lin(parseInt(hx.substr(1, 2), 16)), g = lin(parseInt(hx.substr(3, 2), 16)), b = lin(parseInt(hx.substr(5, 2), 16));
    var l = Math.pow(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b, 1 / 3);
    var m = Math.pow(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b, 1 / 3);
    var s = Math.pow(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b, 1 / 3);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }
  function h2(v) { var s = v.toString(16).toUpperCase(); return s.length < 2 ? '0' + s : s; }
  function toHex(L, a, b) {
    var l = L + 0.3963377774 * a + 0.2158037573 * b;
    var m = L - 0.1055613458 * a - 0.0638541728 * b;
    var s = L - 0.0894841775 * a - 1.2914855480 * b;
    l = l * l * l; m = m * m * m; s = s * s * s;
    var r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    var g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    var bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    return '#' + h2(gam(r)) + h2(gam(g)) + h2(gam(bb));
  }
  function shade(hx, C) {
    var k = toLab(hx), S = C.shade;
    if (k[0] < S.darkBelow) return toHex(k[0] + S.darkLift, k[1], k[2]);
    return toHex(k[0] * S.L_mul, k[1] * S.C_mul, k[2] * S.C_mul);
  }
  function light(hx, C) {
    var k = toLab(hx), G = C.light;
    return toHex(Math.min(G.max, k[0] + G.lift), k[1] * G.C_mul, k[2] * G.C_mul);
  }
  function mix(h1, h2_, t) {
    var A = toLab(h1), B = toLab(h2_);
    return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }
  function darkerThan(hx, against, gap) {
    var k = toLab(hx), La = toLab(against)[0];
    if (La - k[0] >= gap) return hx.toUpperCase();
    var L2 = Math.max(0.08, La - gap), f = k[0] > 0 ? L2 / k[0] : 1;
    return toHex(L2, k[1] * f, k[2] * f);
  }
  function pick(v, fallback) { return typeof v === 'string' && HEX.test(v) ? v : fallback; }

  /* token (without the @) -> #RRGGBB */
  function resolve(token, colors, defaults, slot, C) {
    defaults = defaults || {};
    if (Object.prototype.hasOwnProperty.call(C.fixed, token)) return C.fixed[token];
    var dot = token.indexOf('.'), role = dot < 0 ? token : token.slice(0, dot), tone = dot < 0 ? '' : token.slice(dot + 1);
    var skin = pick(colors.skin, C.defaults.skin), base;
    if (role === 'skin') base = skin;
    else if (role === 'ink') base = darkerThan(pick(colors.ink, C.ink), skin, C.inkGap);
    else if (role === 'mouth') base = darkerThan(C.mouth, skin, C.mouthGap);
    else if (role === 'blush') base = mix(skin, C.blush, C.blushMix);
    else if (role === 'beard') base = pick(colors.beard, pick(colors.hair, C.defaults.hair));
    else if (role === 'accent') base = pick(colors[slot + 'Accent'], pick(defaults.accent, '#888888'));
    else if (role === 'accent2') base = pick(colors[slot + 'Accent2'], pick(defaults.accent2, '#888888'));
    else if (role === 'headgear' || role === 'eyewear') base = pick(colors[role], pick(defaults[role], '#888888'));
    else base = pick(colors[role], C.defaults[role] || '#888888');
    if (tone === 'shade') return shade(base, C);
    if (tone === 'deep') return shade(shade(base, C), C);
    if (tone === 'soft') return mix(base, skin, C.softMix);
    if (tone === 'light') return light(base, C);
    return base.toUpperCase();
  }
  function paint(svg, colors, defaults, slot, C) {
    return svg.replace(/"@([A-Za-z0-9.]+)"/g, function (_, t) { return '"' + resolve(t, colors, defaults, slot, C) + '"'; });
  }

  // ---------------------------------------------------------------- layers
  function chosenParts(catalog, manifest) {
    var parts = (manifest && manifest.parts) || {}, out = {};
    catalog.slots.forEach(function (slot) {
      var id = parts[slot];
      if (typeof id === 'string' && catalog.aliases && Object.prototype.hasOwnProperty.call(catalog.aliases, id)) id = catalog.aliases[id];   // an old id still resolves
      var p = typeof id === 'string' ? catalog.parts[id] : null;
      if (!p || p.slot !== slot) p = catalog.parts[catalog.required[slot] || ''];   // head, face, collar never empty
      if (p) out[slot] = p;
    });
    return out;
  }
  /* How a hair part and a headgear part go together -> { ok, mode, reason }.
   * mode: "full" (hair as it is) | "under" (the hair's under-hat layers) | "hidden" |
   * "flush" (not a valid pair: only flush scalp hair shows; the editor should not offer it). */
  function fit(catalog, hair, hat) {
    if (!hair || !hat) return { ok: true, mode: 'full', reason: '' };
    var f = hat.flags, no = (f.hairNo || {})[hair.flags.family];
    if (no) return { ok: false, mode: 'flush', reason: no };
    if (f.coversHair === 'all') return { ok: true, mode: 'hidden', reason: '' };
    if (f.coversHair === 'top') return { ok: true, mode: 'under', reason: '' };
    return { ok: true, mode: 'full', reason: '' };
  }
  /* Does this layer show under the worn headgear (or with none)? */
  function visible(slot, layer, hat, mode) {
    var f = hat ? hat.flags : {};
    if (slot === 'head' && layer === 'ears') return !f.coversEars;
    if (slot === 'hair') {
      if (mode === 'hidden') return false;
      if (mode === 'flush') return layer === 'under';
      var under = layer === 'under' || layer === 'underBack';
      if ((mode === 'under') !== under) return false;
      if (f.coversNeck && (layer === 'back' || layer === 'underBack')) return false;
    }
    return true;
  }

  function compose(catalog, manifest, opts) {
    opts = opts || {};
    var colors = (manifest && manifest.colors) || {}, C = catalog.colours;
    var worn = chosenParts(catalog, manifest), hat = worn.headgear, inner = '', defs = '', uid = opts.uid || 'a';
    var mode = fit(catalog, worn.hair, hat).mode;
    catalog.zOrder.forEach(function (key) {
      var i = key.indexOf(':'), slot = key.slice(0, i), layer = key.slice(i + 1), p = worn[slot];
      if (layer === 'over') {                                         // the hair again, over a band's lower ends
        var clip = hat ? hat.flags.hairOver : null;
        if (!(clip && p && mode === 'full')) return;
        var body = '';
        ['main', 'fringe'].forEach(function (l) {
          if (Object.prototype.hasOwnProperty.call(p.layers, l) && p.layers[l].charAt(0) !== '=') body += paint(p.layers[l], colors, p.defaults, 'hair', C);
        });
        defs += '<clipPath id="over-' + uid + '"><path d="' + clip + '"/></clipPath>';
        inner += '<g data-part="' + p.id + '" data-layer="over" clip-path="url(#over-' + uid + ')">' + body + '</g>';
        return;
      }
      if (layer === 'earsTop') {                                      // the ears again, above a hat that asks for it
        if (!(hat && hat.flags.earsOnTop)) return;
        if (!(p && Object.prototype.hasOwnProperty.call(p.layers, 'earsTop'))) layer = 'ears';   // a head without its own earsTop art: the whole ears
      }
      if (!p || !Object.prototype.hasOwnProperty.call(p.layers, layer) || !visible(slot, layer, hat, mode)) return;
      var svg = p.layers[layer];
      if (slot === 'headgear' && layer === 'main' && p.layers.mainBig && mode === 'full' &&
          worn.hair && (worn.hair.flags.family === 'big' || worn.hair.flags.bigTop)) svg = p.layers.mainBig;   // the band arches over big hair
      if (svg.charAt(0) === '=') svg = p.layers[svg.slice(1)];        // alias: same art as another layer
      inner += '<g data-part="' + p.id + '" data-layer="' + layer + '">' + paint(svg, colors, p.defaults, slot, C) + '</g>';
    });
    var W = catalog.frame[0], H = catalog.frame[1];
    var z = opts.zoom == null ? catalog.zoom : opts.zoom;
    if (z !== 1) inner = '<g transform="translate(' + W / 2 + ' ' + H + ') scale(' + z + ') translate(' + -W / 2 + ' ' + -H + ')">' + inner + '</g>';
    var bg = opts.bg === undefined ? true : opts.bg;
    var fill = typeof bg === 'string' ? bg : (bg ? colors.bg : null);
    if (fill && HEX.test(fill)) inner = '<rect width="' + W + '" height="' + H + '" fill="' + fill + '"/>' + inner;
    var shape = opts.shape === undefined ? 'circle' : opts.shape;
    if (Object.prototype.hasOwnProperty.call(catalog.shapes, shape)) {
      defs += '<clipPath id="clip-' + uid + '">' + catalog.shapes[shape] + '</clipPath>';
      inner = '<g clip-path="url(#clip-' + uid + ')">' + inner + '</g>';
    }
    if (defs) defs = '<defs>' + defs + '</defs>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '">' + defs + inner + '</svg>';
  }

  return { compose: compose, fit: fit, resolve: resolve, chosenParts: chosenParts };
});
