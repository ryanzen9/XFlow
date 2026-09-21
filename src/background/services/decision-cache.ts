import {
  USER_KNOWLEDGE_KEY,
  exactContent,
  jaccardSimilarity,
  mergeUserKnowledge,
  normalizeContent,
  normalizeUserKnowledge,
  semanticTokens,
  sha256,
  templateContent,
  writeUserKnowledge,
  type ContentDecision,
  type DecisionSource,
  type FilterSurface,
  type PostInput,
  type UserDecisionAction,
  type UserDecisionRecord,
} from "../../shared";

type CacheKind = "exactCache" | "normalizedCache" | "templateCache" | "semanticCache";

interface CacheEntry {
  key: string;
  policyVersion: string;
  contentHash: string;
  decision: ContentDecision;
  probability: number;
  strategyId?: string;
  sampleCount: number;
  semanticTokens: string[];
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
}

export interface LocalDecisionHit {
  decision: ContentDecision;
  probability: number;
  strategyId?: string;
  source: DecisionSource;
}

export interface DecisionLookupContext {
  userDecisions: UserDecisionRecord[];
  semanticEntries: CacheEntry[];
  now: number;
}

const DB_NAME = "xflow-decisions";
const DB_VERSION = 1;
const USER_STORE = "userDecisions";
const CACHE_STORES: CacheKind[] = ["exactCache", "normalizedCache", "templateCache", "semanticCache"];
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 5_000;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEVICE_ID_KEY = "decisionDeviceId";

class DecisionDatabase {
  private databasePromise: Promise<IDBDatabase> | null = null;
  private readonly memory = new Map<string, Map<string, CacheEntry | UserDecisionRecord>>();
  private readonly hot = new Map<string, CacheEntry | UserDecisionRecord>();

  private rememberHot(store: string, key: string, value: CacheEntry | UserDecisionRecord): void {
    const hotKey = `${store}:${key}`;
    this.hot.delete(hotKey);
    this.hot.set(hotKey, value);
    if (this.hot.size > 300) this.hot.delete(this.hot.keys().next().value as string);
  }

  private memoryStore(name: string): Map<string, CacheEntry | UserDecisionRecord> {
    let store = this.memory.get(name);
    if (!store) {
      store = new Map();
      this.memory.set(name, store);
    }
    return store;
  }

  private open(): Promise<IDBDatabase> | null {
    if (typeof indexedDB === "undefined") return null;
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.addEventListener("upgradeneeded", () => {
        const database = request.result;
        for (const store of [USER_STORE, ...CACHE_STORES]) {
          if (!database.objectStoreNames.contains(store))
            database.createObjectStore(store, { keyPath: store === USER_STORE ? "id" : "key" });
        }
      });
      request.addEventListener("success", () => resolve(request.result), { once: true });
      request.addEventListener("error", () => reject(request.error ?? new Error("无法打开本地判定数据库。")), {
        once: true,
      });
    });
    return this.databasePromise;
  }

  async get<T extends CacheEntry | UserDecisionRecord>(store: string, key: string): Promise<T | undefined> {
    const hotKey = `${store}:${key}`;
    const cached = this.hot.get(hotKey);
    if (cached) {
      this.hot.delete(hotKey);
      this.hot.set(hotKey, cached);
      return cached as T;
    }
    const database = this.open();
    if (!database) return this.memoryStore(store).get(key) as T | undefined;
    const db = await database;
    return new Promise((resolve, reject) => {
      const request = db.transaction(store, "readonly").objectStore(store).get(key);
      request.addEventListener(
        "success",
        () => {
          if (request.result) this.rememberHot(store, key, request.result as T);
          resolve(request.result as T | undefined);
        },
        { once: true },
      );
      request.addEventListener("error", () => reject(request.error), { once: true });
    });
  }

  async getAll<T extends CacheEntry | UserDecisionRecord>(store: string): Promise<T[]> {
    const database = this.open();
    if (!database) return [...this.memoryStore(store).values()] as T[];
    const db = await database;
    return new Promise((resolve, reject) => {
      const request = db.transaction(store, "readonly").objectStore(store).getAll();
      request.addEventListener("success", () => resolve(request.result as T[]), { once: true });
      request.addEventListener("error", () => reject(request.error), { once: true });
    });
  }

  async put(store: string, value: CacheEntry | UserDecisionRecord): Promise<void> {
    const database = this.open();
    if (!database) {
      const key = "id" in value ? value.id : value.key;
      this.memoryStore(store).set(key, value);
      this.rememberHot(store, key, value);
      return;
    }
    const db = await database;
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(store, "readwrite").objectStore(store).put(value);
      request.addEventListener(
        "success",
        () => {
          const key = "id" in value ? value.id : value.key;
          this.rememberHot(store, key, value);
          resolve();
        },
        { once: true },
      );
      request.addEventListener("error", () => reject(request.error), { once: true });
    });
  }

  async delete(store: string, key: string): Promise<void> {
    this.hot.delete(`${store}:${key}`);
    const database = this.open();
    if (!database) {
      this.memoryStore(store).delete(key);
      return;
    }
    const db = await database;
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(store, "readwrite").objectStore(store).delete(key);
      request.addEventListener("success", () => resolve(), { once: true });
      request.addEventListener("error", () => reject(request.error), { once: true });
    });
  }

  resetMemory(): void {
    this.memory.clear();
    this.hot.clear();
  }
}

const database = new DecisionDatabase();
let cleanupAt = 0;
let userKnowledgeSignature = "";

function cacheKey(policy: string, hash: string): string {
  return `${policy}:${hash}`;
}

async function readCache(store: CacheKind, key: string, now: number): Promise<CacheEntry | null> {
  const entry = await database.get<CacheEntry>(store, key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    await database.delete(store, key);
    return null;
  }
  entry.lastAccessedAt = now;
  void database.put(store, entry).catch(() => undefined);
  return entry;
}

function hit(entry: CacheEntry, source: DecisionSource): LocalDecisionHit {
  return {
    decision: entry.decision,
    probability: entry.probability,
    strategyId: entry.strategyId,
    source,
  };
}

async function fingerprints(text: string) {
  const exact = exactContent(text);
  const normalized = normalizeContent(text);
  const template = templateContent(text);
  const [contentHash, normalizedHash, templateHash] = await Promise.all([
    sha256(exact),
    sha256(normalized),
    sha256(template),
  ]);
  return { contentHash, normalizedHash, templateHash, normalized, template, tokens: semanticTokens(text) };
}

export async function loadUserDecisions(): Promise<UserDecisionRecord[]> {
  const stored = await chrome.storage.local.get([USER_KNOWLEDGE_KEY]);
  const knowledge = normalizeUserKnowledge(stored[USER_KNOWLEDGE_KEY]);
  const signature = JSON.stringify(knowledge);
  if (signature !== userKnowledgeSignature) {
    await Promise.all(knowledge.userDecisions.map((decision) => database.put(USER_STORE, decision)));
    userKnowledgeSignature = signature;
  }
  return database.getAll<UserDecisionRecord>(USER_STORE);
}

export async function loadDecisionLookupContext(now = Date.now()): Promise<DecisionLookupContext> {
  const [userDecisions, semanticEntries] = await Promise.all([
    loadUserDecisions(),
    database.getAll<CacheEntry>("semanticCache"),
  ]);
  return {
    userDecisions,
    semanticEntries: semanticEntries.filter((entry) => entry.expiresAt > now),
    now,
  };
}

function userHit(decision: UserDecisionRecord): LocalDecisionHit {
  return {
    decision: decision.decision,
    probability: decision.decision === "allow" ? 0 : decision.decision === "block" ? 1 : 0.9,
    source: "user",
  };
}

export async function findLocalDecision(
  text: string,
  surface: FilterSurface,
  policy: string,
  now = Date.now(),
  context?: DecisionLookupContext,
): Promise<LocalDecisionHit | null> {
  const values = await fingerprints(text);
  const userDecisions = context?.userDecisions ?? (await loadUserDecisions());
  const explicit = userDecisions.find(
    (decision) =>
      decision.scope === "content" && decision.surface === surface && decision.contentHash === values.contentHash,
  );
  if (explicit) return userHit(explicit);

  const semanticUser = userDecisions
    .filter((decision) => decision.scope === "semantic" && decision.surface === surface)
    .map((decision) => ({ decision, similarity: jaccardSimilarity(values.tokens, decision.semanticTokens) }))
    .filter(({ decision, similarity }) => similarity >= (decision.similarityThreshold ?? 0.94))
    .toSorted((left, right) => right.similarity - left.similarity)[0];
  if (semanticUser) return userHit(semanticUser.decision);

  const exact = await readCache("exactCache", cacheKey(policy, values.contentHash), now);
  if (exact) return hit(exact, "exact-cache");
  const normalized = await readCache("normalizedCache", cacheKey(policy, values.normalizedHash), now);
  if (normalized) return hit(normalized, "normalized-cache");
  const template = await readCache("templateCache", cacheKey(policy, values.templateHash), now);
  if (template && template.sampleCount >= 2) return hit(template, "template-cache");

  const semantic = (context?.semanticEntries ?? (await database.getAll<CacheEntry>("semanticCache")))
    .filter((entry) => entry.policyVersion === policy && entry.expiresAt > now)
    .map((entry) => ({ entry, similarity: jaccardSimilarity(values.tokens, entry.semanticTokens) }))
    .filter(({ similarity }) => similarity >= 0.95)
    .toSorted((left, right) => right.similarity - left.similarity)
    .slice(0, 5);
  if (semantic.length >= 2 && semantic.every(({ entry }) => entry.decision === semantic[0]?.entry.decision)) {
    const entry = semantic[0]!.entry;
    if (entry.decision === "allow" || semantic.every(({ entry: candidate }) => candidate.probability >= 0.9)) {
      return hit(entry, "semantic-cache");
    }
  }
  return null;
}

export async function rememberJevDecision(
  text: string,
  policy: string,
  decision: ContentDecision,
  probability: number,
  strategyId?: string,
  now = Date.now(),
): Promise<void> {
  const values = await fingerprints(text);
  const base: Omit<CacheEntry, "key" | "sampleCount"> = {
    policyVersion: policy,
    contentHash: values.contentHash,
    decision,
    probability,
    strategyId,
    semanticTokens: values.tokens,
    createdAt: now,
    expiresAt: now + CACHE_TTL_MS,
    lastAccessedAt: now,
  };
  const exact: CacheEntry = { ...base, key: cacheKey(policy, values.contentHash), sampleCount: 1 };
  const normalized: CacheEntry = { ...base, key: cacheKey(policy, values.normalizedHash), sampleCount: 1 };
  const templateKey = cacheKey(policy, values.templateHash);
  const previousTemplate = await readCache("templateCache", templateKey, now);
  const template: CacheEntry = {
    ...base,
    key: templateKey,
    sampleCount: previousTemplate?.decision === decision ? previousTemplate.sampleCount + 1 : 1,
  };
  const semantic: CacheEntry = { ...base, key: cacheKey(policy, values.contentHash), sampleCount: 1 };
  await Promise.all([
    database.put("exactCache", exact),
    database.put("normalizedCache", normalized),
    database.put("templateCache", template),
    database.put("semanticCache", semantic),
  ]);
  void cleanupDecisionCache(now).catch(() => undefined);
}

async function deviceId(): Promise<string> {
  const stored = await chrome.storage.local.get([DEVICE_ID_KEY]);
  if (typeof stored[DEVICE_ID_KEY] === "string" && stored[DEVICE_ID_KEY]) return stored[DEVICE_ID_KEY] as string;
  const id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  await chrome.storage.local.set({ [DEVICE_ID_KEY]: id });
  return id;
}

export async function saveUserDecision(
  post: PostInput,
  surface: FilterSurface,
  action: UserDecisionAction,
  now = Date.now(),
): Promise<LocalDecisionHit> {
  const values = await fingerprints(post.text);
  const scope = action === "hide" || action === "allow" ? "content" : "semantic";
  const id = `${surface}:${scope}:${values.contentHash}`;
  const previous = await database.get<UserDecisionRecord>(USER_STORE, id);
  const record: UserDecisionRecord = {
    id,
    scope,
    surface,
    policyId: surface,
    contentHash: values.contentHash,
    normalizedContent: values.normalized,
    semanticTokens: values.tokens,
    decision: action === "allow" ? "allow" : action === "block-similar" ? "block" : "blur",
    similarityThreshold: action === "reduce-similar" ? 0.94 : action === "block-similar" ? 0.82 : undefined,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    deviceId: await deviceId(),
  };
  await database.put(USER_STORE, record);
  const stored = await chrome.storage.local.get([USER_KNOWLEDGE_KEY]);
  const knowledge = mergeUserKnowledge(normalizeUserKnowledge(stored[USER_KNOWLEDGE_KEY]), {
    userDecisions: [record],
  });
  await writeUserKnowledge(knowledge);
  userKnowledgeSignature = JSON.stringify(knowledge);
  return userHit(record);
}

export async function cleanupDecisionCache(now = Date.now()): Promise<void> {
  if (now < cleanupAt) return;
  cleanupAt = now + CLEANUP_INTERVAL_MS;
  const entries = (
    await Promise.all(
      CACHE_STORES.map(async (store) => (await database.getAll<CacheEntry>(store)).map((entry) => ({ store, entry }))),
    )
  ).flat();
  const expired = entries.filter(({ entry }) => entry.expiresAt <= now);
  const live = entries
    .filter(({ entry }) => entry.expiresAt > now)
    .toSorted((left, right) => right.entry.lastAccessedAt - left.entry.lastAccessedAt);
  const overflow = live.slice(MAX_CACHE_ENTRIES);
  await Promise.all([...expired, ...overflow].map(({ store, entry }) => database.delete(store, entry.key)));
}

export function resetDecisionCacheForTests(): void {
  database.resetMemory();
  cleanupAt = 0;
  userKnowledgeSignature = "";
}
