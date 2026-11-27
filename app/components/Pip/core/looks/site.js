// The website characters (sw-landing public/avatars/<name>.svg) built from kit parts: one manifest per site name. Data only.
// Use: makeLook(Kit, cat, SITE_LOOKS[i].manifest, { outline: true }) with look.stage = SITE_STAGE and look.outline = SITE_OUTLINE.
// mood = the kit face (calm smile laugh proud curious listening thinking warm) that is nearest to the site file's default expression.
                                                                                                                                                           

/** The site picture is 320 x 310. The kit frame (1000 x 1000, zoomed 0.86) is scaled by `scale` and moved by tx, ty into it. crop = the bust shape that cuts collar and neck (site units): the left edge goes from (xt, yt) out to (xb, yb), the right edge mirrors it, rounded bottom corners r. */
export const SITE_STAGE = { w: 320, h: 310, scale: 0.43, tx: -55, ty: -107, crop: { xt: 52, yt: 236, xb: 26, yb: 304, r: 18 } };
/** Collar-only stage (float collars, kit parts collar.float*): no torso and no bust crop. The head and the collar end inside the picture by their own shape. The kit frame is scaled a little smaller than SITE_STAGE so that the collar hem (kit y up to ~1060) and the highest hat both fit in 320 x 310. The centre stays at x 160 (tx = 160 - 500 * scale). */
export const SITE_STAGE_FLOAT = { w: 320, h: 310, scale: 0.35, tx: -15, ty: -79 };
/** The site outline: stroke #242329, width 4 in the 320 x 310 units, round joins and caps. */
export const SITE_OUTLINE = { colour: '#242329', width: 4 };

const SKIN = { tan: '#F2BE80', deep: '#A36A42', brown: '#C48650', light: '#F7C197', fair: '#F3D9C4', dark: '#5A3C30', olive: '#D6AD81' };
const L = (name        , label        , mood        , parts                               , colors                        )           =>
  ({ name, label, mood, manifest: { parts: { hair: null, headgear: null, beard: null, eyewear: null, ...parts, face: 'face.' + mood }, colors: { bg: '#FFFFFF', ...colors } } });

export const SITE_LOOKS             = [
  L('beanie', 'Blue beanie, moss roll neck', 'warm', { hair: 'hair.crop', headgear: 'headgear.ribbed', collar: 'collar.rollneck' }, { skin: SKIN.light, hair: '#A9542E', headgear: '#377CB5', collar: '#718247' }),
  L('curly', 'Orange beret, curly hair, Peter Pan collar', 'smile', { hair: 'hair.tightcurls', headgear: 'headgear.beret', collar: 'collar.peterpan' }, { skin: SKIN.deep, hair: '#242123', headgear: '#C7532B', collar: '#FBF5E6' }),
  L('headphones', 'Mint headphones, open polo collar', 'listening', { hair: 'hair.fullswoop', headgear: 'headgear.studiophones', collar: 'collar.polo' }, { skin: SKIN.tan, hair: '#533B2B', headgear: '#AEF0D2', headgearAccent: '#3FA27C', headgearAccent2: '#1F5C46', collar: '#1D3959' }),
  L('banker', 'Banker: side part, square glasses, navy lapels', 'calm', { hair: 'hair.sidepart', eyewear: 'eyewear.square', collar: 'collar.jackettie' }, { skin: SKIN.brown, hair: '#34363C', collar: '#293A50', collarAccent: '#944F59', eyewear: '#34363C' }),
  L('bob', 'Bob, ribboned sunhat, mandarin collar', 'curious', { hair: 'hair.bob', headgear: 'headgear.sunhat', collar: 'collar.mandarin' }, { skin: SKIN.brown, hair: '#302525', headgear: '#F2CC74', headgearAccent: '#719A8A', collar: '#FAF5E9' }),
  L('cap', 'Lilac sun visor, curls, coral sailor collar', 'proud', { hair: 'hair.tallcurls', headgear: 'headgear.sunvisor', collar: 'collar.sailor' }, { skin: SKIN.tan, hair: '#242123', headgear: '#BDAADE', collar: '#FBF5E6', collarAccent: '#E77963' }),
  L('scholar', 'Cream newsboy cap, blue jacket', 'thinking', { hair: 'hair.curlytemples', headgear: 'headgear.newsboy', collar: 'collar.jacketround' }, { skin: SKIN.deep, hair: '#242123', headgear: '#F2EBD8', collar: '#326B87', collarAccent: '#B76039' }),
  L('communicator', 'Green headset, shawl jacket', 'smile', { hair: 'hair.roundcurls', headgear: 'headgear.callheadset', collar: 'collar.wrapjacket' }, { skin: SKIN.dark, hair: '#242123', headgear: '#2D6049', collar: '#E2D1A8' }),
  L('silver', 'Silver bob, round glasses, shawl cardigan', 'warm', { hair: 'hair.bobside', eyewear: 'eyewear.round', collar: 'collar.shawl' }, { skin: SKIN.fair, hair: '#D6D5CF', collar: '#E2D1A8', eyewear: '#262229' }),
  L('saltpepper', 'Silver curls, short silver beard, polo', 'smile', { hair: 'hair.coilybig', beard: 'beard.full', collar: 'collar.polo' }, { skin: SKIN.dark, hair: '#C9CBC5', beard: '#BFC4BA', collar: '#1D3959' }),
  L('turban', 'Teal turban, dark beard, mandarin collar', 'proud', { headgear: 'headgear.turban', beard: 'beard.full', collar: 'collar.mandarin' }, { skin: SKIN.tan, hair: '#302526', headgear: '#427E86', collar: '#FAF5E9' }),
  L('bald', 'Bald, silver temples, notched jacket', 'curious', { hair: 'hair.temples', collar: 'collar.notched' }, { skin: SKIN.fair, hair: '#A3A9A4', collar: '#326B87', collarAccent: '#B76039' }),
  L('coils', 'Natural coils, star glasses, coral sailor collar', 'laugh', { hair: 'hair.coilybig', eyewear: 'eyewear.star', collar: 'collar.sailor' }, { skin: SKIN.dark, hair: '#252027', collar: '#FBF5E6', collarAccent: '#E77963', eyewear: '#AEF0D2' }),
  L('braids', 'Braids, cat-eye glasses, Peter Pan collar', 'warm', { hair: 'hair.braidsshort', eyewear: 'eyewear.cateye', collar: 'collar.peterpan' }, { skin: SKIN.deep, hair: '#282024', collar: '#FBF5E6', eyewear: '#E985A3' }),
  L('workcap', 'Sage work cap, stubble, polo', 'calm', { hair: 'hair.croptemples', headgear: 'headgear.flatcap', beard: 'beard.stubble', collar: 'collar.polo' }, { skin: SKIN.olive, hair: '#745D4D', headgear: '#586E70', beard: '#745D4D', collar: '#1D3959' }),
  L('cowboy', 'Cowboy hat, silver moustache, slate shirt, red neckerchief', 'thinking', { hair: 'hair.temples', headgear: 'headgear.cowboy', beard: 'beard.moustache', collar: 'collar.neckerchief' }, { skin: SKIN.olive, hair: '#A3A9A4', beard: '#D7D8CA', headgear: '#B8864F', collar: '#5E7A8C', collarAccent: '#AC5C4D' }),
  L('pigtails', 'Blonde pigtails, rose bows, round collar', 'laugh', { hair: 'hair.pigtailbows', collar: 'collar.rounddress' }, { skin: SKIN.fair, hair: '#F4D375', collar: '#FFF4E4', collarAccent: '#E985A3' }),
  L('coach', 'Green coach cap, stubble, zip jacket', 'proud', { hair: 'hair.crop', headgear: 'headgear.capheadset', beard: 'beard.stubble', collar: 'collar.zipjacket' }, { skin: SKIN.deep, hair: '#393F42', headgear: '#31554E', headgearAccent: '#393F42', beard: '#393F42', collar: '#31554E' }),
  L('mailman', 'Postal worker: blue cap, gold band, stubble, moustache', 'calm', { hair: 'hair.temples', headgear: 'headgear.postal', beard: 'beard.stubblestache', collar: 'collar.postaljacket' }, { skin: SKIN.olive, hair: '#242123', headgear: '#3447B0', headgearAccent: '#F2B93A', beard: '#242123', collar: '#34568C', collarAccent: '#1F2F5C', collarAccent2: '#F2B93A' }),
  L('mailman-happy', 'Postal worker, happy', 'laugh', { hair: 'hair.temples', headgear: 'headgear.postal', beard: 'beard.stubblestache', collar: 'collar.postaljacket' }, { skin: SKIN.olive, hair: '#242123', headgear: '#3447B0', headgearAccent: '#F2B93A', beard: '#242123', collar: '#34568C', collarAccent: '#1F2F5C', collarAccent2: '#F2B93A' }),
  L('hijab', 'Slate headscarf, wrapped neckline', 'thinking', { headgear: 'headgear.headscarf', collar: 'collar.mandarin' }, { skin: SKIN.brown, headgear: '#6E708F', collar: '#FAF5E9' }),
  L('flower', 'Coral bandana, wavy hair, navy bow', 'laugh', { hair: 'hair.bobside', headgear: 'headgear.bandana', collar: 'collar.bowcardigan' }, { skin: SKIN.tan, hair: '#573C2E', headgear: '#EF8066', collar: '#FFF9EF', collarAccent: '#234660' }),
];

/** Collar-only version of each site look (stage SITE_STAGE_FLOAT): the kit float collar that suits it and its colours. `missing` = the collar idea of the flat look that has no float part yet (the float collar is the nearest stand-in). Data only; not used by the flat stills. */
export const SITE_FLOAT                                                                                       = {
  beanie: { collar: 'collar.floatknit', colors: { collar: '#718247' } },
  curly: { collar: 'collar.floatpeter', colors: { collar: '#FBF5E6', collarAccent: '#C7532B' } },
  headphones: { collar: 'collar.floatwing', colors: { collar: '#1D3959', collarAccent: '#3FA27C' }, missing: 'open polo collar' },
  banker: { collar: 'collar.floatwing', colors: { collar: '#293A50', collarAccent: '#944F59' }, missing: 'jacket lapels over a white shirt (lapels + tie)' },
  bob: { collar: 'collar.floatmandarinbow', colors: { collar: '#FAF5E9', collarAccent: '#719A8A' } },
  cap: { collar: 'collar.floatsailor', colors: { collar: '#FBF5E6', collarAccent: '#E77963' } },
  scholar: { collar: 'collar.floatcossack', colors: { collar: '#326B87', collarAccent: '#B76039', collarAccent2: '#F2EBD8' }, missing: 'round-lapel jacket collar' },
  communicator: { collar: 'collar.floatknit', colors: { collar: '#E2D1A8' }, missing: 'shawl collar (soft rolled lapels)' },
  silver: { collar: 'collar.floatknit', colors: { collar: '#E2D1A8' }, missing: 'shawl cardigan collar' },
  saltpepper: { collar: 'collar.floatwing', colors: { collar: '#1D3959', collarAccent: '#C9CBC5' }, missing: 'open polo collar' },
  turban: { collar: 'collar.floatmandarinbow', colors: { collar: '#FAF5E9', collarAccent: '#427E86' } },
  bald: { collar: 'collar.floatcossack', colors: { collar: '#326B87', collarAccent: '#B76039', collarAccent2: '#F2EBD8' }, missing: 'notched-lapel jacket collar' },
  coils: { collar: 'collar.floatsailor', colors: { collar: '#FBF5E6', collarAccent: '#E77963' } },
  braids: { collar: 'collar.floatpeter', colors: { collar: '#FBF5E6', collarAccent: '#E985A3' } },
  workcap: { collar: 'collar.floatwing', colors: { collar: '#1D3959', collarAccent: '#586E70' }, missing: 'open polo collar' },
  cowboy: { collar: 'collar.floatscarf', colors: { collar: '#5E7A8C', collarAccent: '#AC5C4D' } },
  pigtails: { collar: 'collar.floatpeter', colors: { collar: '#FFF4E4', collarAccent: '#E985A3' } },
  coach: { collar: 'collar.floatcossack', colors: { collar: '#31554E', collarAccent: '#393F42', collarAccent2: '#C9CBC5' }, missing: 'zip jacket stand collar' },
  mailman: { collar: 'collar.floatcossack', colors: { collar: '#34568C', collarAccent: '#1F2F5C', collarAccent2: '#F2B93A' } },
  'mailman-happy': { collar: 'collar.floatcossack', colors: { collar: '#34568C', collarAccent: '#1F2F5C', collarAccent2: '#F2B93A' } },
  hijab: { collar: 'collar.floatmandarinbow', colors: { collar: '#FAF5E9', collarAccent: '#234660' }, missing: 'wrapped neckline (the scarf should end the figure itself)' },
  flower: { collar: 'collar.floatmandarinbow', colors: { collar: '#FFF9EF', collarAccent: '#234660' } },
};
/** The float version of a site look: the same manifest with the float collar. */
export function floatSiteLook(s          )           { const f = SITE_FLOAT[s.name], colors = { ...s.manifest.colors }; delete colors.collarAccent; delete colors.collarAccent2; return { ...s, manifest: { parts: { ...s.manifest.parts, collar: f.collar }, colors: { ...colors, ...f.colors } } }; }
