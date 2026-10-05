// Bot display names. Bots look like other people online, not "Bot 1": names
// come from randomuser.me (realistic generated usernames such as
// "smallgoose951", not real accounts), cached in a pool that refills in the
// background. Offline, or with BOT_NAMES_ONLINE=0, a built-in list of
// gamer-style handles is used instead.

const MAX_LEN = 15; // seats cut display names at 15 characters
const API_URL = 'https://randomuser.me/api/?results=60&inc=login&noinfo';
const REFILL_BELOW = 12;

const FALLBACK_NAMES = [
  'pixelpanda', 'NoScopeNoob', 'kopi_lover', 'midnightrider', 'tofu_master', 'bluefalcon88', 'sushi_sam',
  'LuckyDice7', 'crimsonfox', 'Jayden_K', 'mochi_bear', 'ghost_pepper', 'RiverStone', 'neon_tiger',
  'marcopolo21', 'lazykoala', 'SilentOwl', 'nasi_lemak', 'quietstorm', 'boba_queen', 'iron_lotus',
  'TurboTurtle', 'chillpenguin', 'redbaron_x', 'saltydog42', 'Kenji_99', 'snowleopard', 'pancakehero',
  'frostbyte', 'ricecooker', 'mangotango', 'Wanderlust', 'captainkev', 'dumpling_dan', 'StarGazer9',
  'velvetcrow', 'mr_monopoly', 'sk8rboi', 'jadedragon', 'happyhippo', 'PaperPlane', 'teh_tarik',
  'urbanfox', 'bigcheese77', 'nightowl_22', 'coconutz', 'MapleSyrup', 'rocketrae', 'dimsum_king',
  'oldmcdonald', 'sunnyside', 'zen_master', 'BlueMoon', 'cookiemonst', 'sambal_hot', 'wildcard_99',
  'emberly', 'lil_landlord', 'thunderbolt', 'kimchi_fan', 'goldrush', 'AceOfSpades', 'tinkerbell',
  'yolo_swag', 'maxpower', 'rainmaker', 'kawaii_neko', 'stonks_up', 'drifter', 'Durian_Dan'
];

let pool: string[] = [];
let refilling: Promise<void> | null = null;

const online = () => process.env.BOT_NAMES_ONLINE !== '0';

function shuffle<T>(list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** Makes an API username fit a seat ("beautifulzebra196" -> "beautifulzebra"). */
export function tidyUsername(raw: string): string | null {
  let name = String(raw ?? '').replace(/[^A-Za-z0-9_]/g, '');
  if (name.length > MAX_LEN) name = name.replace(/\d+$/, '');
  if (name.length > MAX_LEN || name.length < 3) return null;
  // Some variety, like real handles: a few Capitalized, a few with digits.
  if (Math.random() < 0.25) name = name[0].toUpperCase() + name.slice(1);
  return name;
}

/** Tops up the pool from the internet (best effort, never throws). */
export function refillBotNames(): Promise<void> {
  if (!online() || refilling) return refilling ?? Promise.resolve();
  refilling = (async () => {
    try {
      const res = await fetch(API_URL, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return;
      const data = (await res.json()) as { results?: { login?: { username?: string } }[] };
      const names = (data.results ?? [])
        .map((r) => tidyUsername(r.login?.username ?? ''))
        .filter((n): n is string => !!n);
      pool = shuffle([...new Set([...pool, ...names])]);
    } catch {
      // Offline or the API is down: the built-in names cover it.
    } finally {
      refilling = null;
    }
  })();
  return refilling;
}

/** A name not already used in the room (case-insensitive). */
export function pickBotName(taken: Iterable<string>): string {
  const used = new Set([...taken].map((n) => n.trim().toLowerCase()));
  const free = (n: string) => !used.has(n.toLowerCase());
  let name: string | undefined;
  const i = pool.findIndex(free);
  if (i >= 0) name = pool.splice(i, 1)[0];
  if (pool.length < REFILL_BELOW) void refillBotNames();
  if (!name) name = shuffle([...FALLBACK_NAMES]).find(free);
  // Every built-in name taken (very unlikely with 6 seats): add digits.
  if (!name) name = `${FALLBACK_NAMES[Math.floor(Math.random() * FALLBACK_NAMES.length)].slice(0, 11)}${Math.floor(1000 + Math.random() * 9000)}`;
  return name;
}
