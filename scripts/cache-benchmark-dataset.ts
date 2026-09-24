import type { DecisionSource, PostInput } from "../src/shared";

export type BenchmarkLayer =
  | Extract<DecisionSource, "exact-cache" | "normalized-cache" | "template-cache" | "semantic-cache">
  | "miss";

export interface BenchmarkQuery {
  text: string;
  expected: BenchmarkLayer;
  contentType: string;
}

export interface BenchmarkDataset {
  queries: BenchmarkQuery[];
  seeds: string[];
}

export type LiveScenario = Extract<
  DecisionSource,
  "exact-cache" | "normalized-cache" | "template-cache" | "semantic-cache"
>;

export interface LiveDataset {
  seeds: PostInput[];
  probes: (run: number) => Array<PostInput & { scenario: LiveScenario; contentType: string }>;
  scenarioCounts: Record<LiveScenario, number>;
}

interface ContentProfile {
  type: string;
  exact: (index: number) => string;
  normalizedSeed: (index: number) => string;
  normalizedProbe: (index: number) => string;
  miss: (index: number) => string;
}

const CONTENT_PROFILES: ContentProfile[] = [
  {
    type: "community notice",
    exact: (index) => `Community bulletin ${index}: the public library extended weekend hours for local residents.`,
    normalizedSeed: (index) => `LOCAL COMMUNITY UPDATE ${index}!!!   Free museum admission this Sunday.`,
    normalizedProbe: (index) => `local   community update ${index}! Free museum admission this Sunday.`,
    miss: (index) => `Neighborhood journal ${index}: volunteers planted shade trees beside the school playground.`,
  },
  {
    type: "travel update",
    exact: (index) => `Travel note ${index}: the coastal train adds two evening departures during summer weekends.`,
    normalizedSeed: (index) => `TRAVEL SERVICE ${index}!!!   The coastal train adds two evening departures.`,
    normalizedProbe: (index) => `travel   service ${index}! The coastal train adds two evening departures.`,
    miss: (index) => `Trip journal ${index}: a quiet morning walk followed the old harbor road.`,
  },
  {
    type: "food and cooking",
    exact: (index) => `Kitchen log ${index}: roasted squash, lentils, and lemon made an easy weekday lunch.`,
    normalizedSeed: (index) => `KITCHEN NOTE ${index}!!!   Toast the cumin before adding the lentils.`,
    normalizedProbe: (index) => `kitchen   note ${index}! Toast the cumin before adding the lentils.`,
    miss: (index) => `Recipe journal ${index}: fresh basil brightened the tomato soup at dinner.`,
  },
  {
    type: "outdoor recreation",
    exact: (index) => `Trail report ${index}: the north loop is open, dry, and marked at every junction.`,
    normalizedSeed: (index) => `TRAIL REPORT ${index}!!!   The north loop is open and marked at each junction.`,
    normalizedProbe: (index) => `trail   report ${index}! The north loop is open and marked at each junction.`,
    miss: (index) => `Weekend notes ${index}: hikers watched the clouds clear above the pine ridge.`,
  },
  {
    type: "gardening",
    exact: (index) => `Garden diary ${index}: basil seedlings grew new leaves after three sunny days.`,
    normalizedSeed: (index) => `GARDENING TIP ${index}!!!   Water young basil at the soil line each morning.`,
    normalizedProbe: (index) => `gardening   tip ${index}! Water young basil at the soil line each morning.`,
    miss: (index) => `Plant journal ${index}: the community garden saved seeds from its late tomatoes.`,
  },
  {
    type: "science explainer",
    exact: (index) => `Science desk ${index}: researchers mapped seasonal changes in a nearby wetland.`,
    normalizedSeed: (index) => `SCIENCE BRIEF ${index}!!!   The field team measured water levels at dawn.`,
    normalizedProbe: (index) => `science   brief ${index}! The field team measured water levels at dawn.`,
    miss: (index) => `Field report ${index}: a small observatory recorded a meteor shower after midnight.`,
  },
  {
    type: "Spanish community notice",
    exact: (index) => `Aviso vecinal ${index}: la biblioteca abrirá más horas durante el fin de semana.`,
    normalizedSeed: (index) => `AVISO LOCAL ${index}!!!   El mercado abre temprano el sábado.`,
    normalizedProbe: (index) => `aviso   local ${index}! El mercado abre temprano el sábado.`,
    miss: (index) => `Cuaderno de viaje ${index}: caminamos junto al río al caer la tarde.`,
  },
  {
    type: "Chinese city information",
    exact: (index) => `城市信息 ${index}：周末图书馆延长开放时间，方便附近居民借阅。`,
    normalizedSeed: (index) => `社区通知 ${index}！！！   周六上午公园步道开放。`,
    normalizedProbe: (index) => `社区通知   ${index}！ 周六上午公园步道开放。`,
    miss: (index) => `周末记录 ${index}：雨后河边的步道很安静，适合散步。`,
  },
];

const TEMPLATE_PROFILES = [
  {
    type: "retail promotion",
    seed: (family: number, ticker: string, bonus: number, partner: string) =>
      `Flash sale cohort-${family}: buy $${ticker} now for ${bonus}% bonus via @${partner} https://offers.example/deal/${family}?utm_source=seed`,
    probe: (family: number, ticker: string, bonus: number, partner: string) =>
      `Flash sale cohort-${family}: buy $${ticker} now for ${bonus}% bonus via @${partner} https://promo.example/${family}?campaign=probe`,
  },
  {
    type: "travel voucher",
    seed: (family: number, ticker: string, bonus: number, partner: string) =>
      `Travel voucher ${family}: reserve $${ticker} today for ${bonus}% savings from @${partner} https://travel.example/stay/${family}?ref=seed`,
    probe: (family: number, ticker: string, bonus: number, partner: string) =>
      `Travel voucher ${family}: reserve $${ticker} today for ${bonus}% savings from @${partner} https://journey.example/${family}?source=probe`,
  },
];

const SEMANTIC_SEED_TEXTS = [
  (marker: string) =>
    `Urgent crypto promotion claim your guaranteed bonus reward from verified sponsor today marker${marker}.`,
  (marker: string) =>
    `Urgent crypto campaign claim your guaranteed bonus reward from verified partner today marker${marker}.`,
  (marker: string) =>
    `Urgent crypto promotion collect your guaranteed bonus reward from verified partner today marker${marker}.`,
  (marker: string) =>
    `Urgent crypto promotion claim your guaranteed bonus reward from verified partner today marker${marker}.`,
];

const LIVE_EXACT_TEXTS = [
  "Community notice: the public library will host a free repair workshop next Saturday.",
  "Transit update: the green line is running every twelve minutes this afternoon.",
  "Kitchen note: simmer chickpeas with tomatoes and cumin for a quick dinner.",
  "Trail report: the lakeside path reopened after routine maintenance.",
  "Travel bulletin: the museum offers late entry on the first Friday of each month.",
  "Science brief: local volunteers counted butterflies in the restored meadow.",
  "Aviso vecinal: el mercado de agricultores abre a las nueve el domingo.",
  "城市通知：社区阅览室本周六上午开放，欢迎附近居民参加读书会。",
  "Garden diary: the first basil leaves appeared after a week of warm weather.",
  "Weather note: clear skies are expected over the valley before sunset.",
];

const LIVE_NORMALIZED_PAIRS = [
  {
    type: "community announcement",
    seed: "LOCAL UPDATE A!!!   Free museum admission this Sunday.",
    probe: "local   update a! Free museum admission this Sunday.",
  },
  {
    type: "service information",
    seed: "TRANSIT NOTICE B!!!   The north entrance closes after 9 pm.",
    probe: "transit   notice b! The north entrance closes after 9 pm.",
  },
  {
    type: "Spanish event listing",
    seed: "AGENDA LOCAL C!!!   El taller de cerámica empieza el sábado.",
    probe: "agenda   local c! El taller de cerámica empieza el sábado.",
  },
  {
    type: "Chinese park notice",
    seed: "公园通知 D！！！   东侧入口周日开放。",
    probe: "公园通知   d！ 东侧入口周日开放。",
  },
  {
    type: "recipe tip",
    seed: "KITCHEN NOTE E!!!   Toast the cumin before adding lentils.",
    probe: "kitchen   note e! Toast the cumin before adding lentils.",
  },
  {
    type: "outdoor update",
    seed: "TRAIL REPORT F!!!   The west loop is open after the rain.",
    probe: "trail   report f! The west loop is open after the rain.",
  },
  {
    type: "travel service",
    seed: "TRAVEL ALERT G!!!   Platform changes begin after noon.",
    probe: "travel   alert g! Platform changes begin after noon.",
  },
  {
    type: "gardening advice",
    seed: "GARDEN TIP H!!!   Water seedlings at the soil line each morning.",
    probe: "garden   tip h! Water seedlings at the soil line each morning.",
  },
];

const LIVE_TEMPLATE_PROFILES = [
  {
    type: "retail promotion",
    seed: (index: number) =>
      `Sponsored sale: buy $${index % 2 === 0 ? "SOL" : "DOGE"} now for ${50 + index}% bonus via @shop${index} https://store.example/item/${index}?utm_source=seed`,
    probe: (index: number) =>
      `Sponsored sale: buy $LIVE${index} now for ${500 + index}% bonus via @affiliate${index} https://deal.example/${index}?campaign=bench`,
  },
  {
    type: "travel referral",
    seed: (index: number) =>
      `Travel reward: reserve $${index % 2 === 0 ? "TRIP" : "STAY"} today for ${10 + index}% savings from @host${index} https://stay.example/room/${index}?ref=seed`,
    probe: (index: number) =>
      `Travel reward: reserve $JOURNEY${index} today for ${200 + index}% savings from @partner${index} https://trip.example/${index}?source=bench`,
  },
];

const LIVE_SEMANTIC_PROBE = (marker: string) =>
  `Urgent crypto promotion claim your guaranteed bonus reward from verified sponsor today probe${marker}.`;

function emptyLayerCounts(): Record<BenchmarkLayer, number> {
  return { "exact-cache": 0, "normalized-cache": 0, "template-cache": 0, "semantic-cache": 0, miss: 0 };
}

function queryCounts(requests: number): Record<BenchmarkLayer, number> {
  const counts = emptyLayerCounts();
  counts["exact-cache"] = Math.floor(requests * 0.35);
  counts["normalized-cache"] = Math.floor(requests * 0.2);
  counts["template-cache"] = Math.floor(requests * 0.15);
  counts["semantic-cache"] = Math.floor(requests * 0.1);
  counts.miss = requests - Object.values(counts).reduce((sum, count) => sum + count, 0);
  return counts;
}

function shuffle<T>(values: T[]): T[] {
  let state = 0x78666c6f;
  for (let index = values.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    const target = state % (index + 1);
    [values[index], values[target]] = [values[target]!, values[index]!];
  }
  return values;
}

function letters(value: number): string {
  let remaining = value + 1;
  let result = "";
  while (remaining > 0) {
    remaining -= 1;
    result = String.fromCharCode(97 + (remaining % 26)) + result;
    remaining = Math.floor(remaining / 26);
  }
  return result;
}

export function buildBenchmarkDataset(requests: number): BenchmarkDataset {
  const safeRequests = Math.max(20, Math.floor(requests));
  const families = Math.min(24, Math.max(4, Math.ceil(safeRequests / 50)));
  const counts = queryCounts(safeRequests);
  const queries: BenchmarkQuery[] = [];
  const seeds = new Set<string>();

  for (let index = 0; index < counts["exact-cache"]; index += 1) {
    const profile = CONTENT_PROFILES[index % CONTENT_PROFILES.length]!;
    const text = `${profile.exact(index)} Sample ${index}.`;
    queries.push({ text, expected: "exact-cache", contentType: profile.type });
    seeds.add(text);
  }
  for (let index = 0; index < counts["normalized-cache"]; index += 1) {
    const profile = CONTENT_PROFILES[index % CONTENT_PROFILES.length]!;
    queries.push({ text: profile.normalizedProbe(index), expected: "normalized-cache", contentType: profile.type });
    seeds.add(profile.normalizedSeed(index));
  }
  for (let index = 0; index < counts["template-cache"]; index += 1) {
    const family = index % families;
    const profileIndex = family % TEMPLATE_PROFILES.length;
    const profile = TEMPLATE_PROFILES[profileIndex]!;
    for (const [sampleIndex, ticker] of ["DOGE", "PEPE"].entries()) {
      seeds.add(profile.seed(family, ticker, sampleIndex === 0 ? 100 : 50, `partner${sampleIndex}`));
    }
    queries.push({
      text: profile.probe(family, `LIVE${index}`, 200 + index, `affiliate${index}`),
      expected: "template-cache",
      contentType: profile.type,
    });
  }
  for (let index = 0; index < counts["semantic-cache"]; index += 1) {
    const family = index % families;
    const marker = letters(family);
    for (const makeText of SEMANTIC_SEED_TEXTS.slice(0, 3)) seeds.add(makeText(marker));
    queries.push({
      text: SEMANTIC_SEED_TEXTS[3]!(marker),
      expected: "semantic-cache",
      contentType: "crypto promotion",
    });
  }
  for (let index = 0; index < counts.miss; index += 1) {
    const profile = CONTENT_PROFILES[index % CONTENT_PROFILES.length]!;
    queries.push({ text: profile.miss(index), expected: "miss", contentType: profile.type });
  }

  return { queries: shuffle(queries), seeds: [...seeds] };
}

function scenarioCounts(samples: number): Record<LiveScenario, number> {
  const scenarios: LiveScenario[] = ["exact-cache", "normalized-cache", "template-cache", "semantic-cache"];
  const base = Math.floor(samples / scenarios.length);
  const remainder = samples % scenarios.length;
  return Object.fromEntries(scenarios.map((scenario, index) => [scenario, base + Number(index < remainder)])) as Record<
    LiveScenario,
    number
  >;
}

export function buildLiveDataset(samples: number): LiveDataset {
  const safeSamples = Math.max(20, Math.min(50, Math.floor(samples)));
  const counts = scenarioCounts(safeSamples);
  const seeds: PostInput[] = [];
  const seedText = new Map<string, string>();

  for (let index = 0; index < counts["exact-cache"]; index += 1) {
    const id = `seed-exact-${index}`;
    const text = `${LIVE_EXACT_TEXTS[index % LIVE_EXACT_TEXTS.length]} Sample ${index}.`;
    seeds.push({ id, text });
    seedText.set(id, text);
  }
  for (let index = 0; index < counts["normalized-cache"]; index += 1) {
    const profile = LIVE_NORMALIZED_PAIRS[index % LIVE_NORMALIZED_PAIRS.length]!;
    seeds.push({ id: `seed-normalized-${index}`, text: profile.seed });
  }
  for (let index = 0; index < counts["template-cache"]; index += 1) {
    const profile = LIVE_TEMPLATE_PROFILES[index % LIVE_TEMPLATE_PROFILES.length]!;
    seeds.push({ id: `seed-template-${index}`, text: profile.seed(index) });
  }
  for (let index = 0; index < counts["semantic-cache"]; index += 1) {
    const marker = letters(index);
    const text = SEMANTIC_SEED_TEXTS[0]!(marker);
    seeds.push({ id: `seed-semantic-${index}`, text });
  }

  return {
    seeds,
    scenarioCounts: counts,
    probes(run) {
      const probes: Array<PostInput & { scenario: LiveScenario; contentType: string }> = [];
      for (let index = 0; index < counts["exact-cache"]; index += 1) {
        const seedId = `seed-exact-${index}`;
        probes.push({
          id: `probe-exact-${run}-${index}`,
          text: seedText.get(seedId)!,
          scenario: "exact-cache",
          contentType: "exact replay",
        });
      }
      for (let index = 0; index < counts["normalized-cache"]; index += 1) {
        const profile = LIVE_NORMALIZED_PAIRS[index % LIVE_NORMALIZED_PAIRS.length]!;
        probes.push({
          id: `probe-normalized-${run}-${index}`,
          text: profile.probe,
          scenario: "normalized-cache",
          contentType: profile.type,
        });
      }
      for (let index = 0; index < counts["template-cache"]; index += 1) {
        const profile = LIVE_TEMPLATE_PROFILES[index % LIVE_TEMPLATE_PROFILES.length]!;
        probes.push({
          id: `probe-template-${run}-${index}`,
          text: profile.probe(run * 50 + index),
          scenario: "template-cache",
          contentType: profile.type,
        });
      }
      for (let index = 0; index < counts["semantic-cache"]; index += 1) {
        const marker = letters((run + 1) * 50 + index);
        probes.push({
          id: `probe-semantic-${run}-${index}`,
          text: LIVE_SEMANTIC_PROBE(marker),
          scenario: "semantic-cache",
          contentType: "crypto promotion",
        });
      }
      return probes;
    },
  };
}
