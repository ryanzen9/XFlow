import {
  USER_KNOWLEDGE_KEY,
  contentLanguage,
  cosineSimilarity,
  exactContent,
  mergeUserKnowledge,
  normalizeContent,
  normalizeUserKnowledge,
  semanticEmbeddingFromTokens,
  semanticTokens,
  sha256,
  templateContent,
  updateUserKnowledge,
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
  confidence: number;
  strategyId?: string;
  sampleCount: number;
  semanticTokens: string[];
  semanticEmbedding: number[];
  language: ReturnType<typeof contentLanguage>;
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
const DB_VERSION = 2;
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
        const semanticStore = request.transaction?.objectStore("semanticCache");
        if (semanticStore && !semanticStore.indexNames.contains("policyLanguage")) {
          semanticStore.createIndex("policyLanguage", ["policyVersion", "language"]);
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

  async getAllByIndex<T extends CacheEntry>(
    store: CacheKind,
    index: "policyLanguage",
    key: [string, string],
  ): Promise<T[]> {
    const database = this.open();
    if (!database) {
      return [...this.memoryStore(store).values()].filter((value) => {
        const entry = value as CacheEntry;
        return entry.policyVersion === key[0] && entry.language === key[1];
      }) as T[];
    }
    const db = await database;
    return new Promise((resolve, reject) => {
      const request = db.transaction(store, "readonly").objectStore(store).index(index).getAll(IDBKeyRange.only(key));
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
    void this.databasePromise?.then((database) => database.close()).catch(() => undefined);
    this.databasePromise = null;
    this.memory.clear();
    this.hot.clear();
  }
}

const database = new DecisionDatabase();
let cleanupAt = 0;
let userKnowledgeSignature = "";
const templateWriteQueues = new Map<string, Promise<void>>();

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
  const tokens = semanticTokens(text);
  return {
    contentHash,
    normalizedHash,
    templateHash,
    normalized,
    template,
    tokens,
    embedding: semanticEmbeddingFromTokens(tokens),
    language: contentLanguage(text),
  };
}

function entryEmbedding(entry: CacheEntry): number[] {
  return Array.isArray(entry.semanticEmbedding) && entry.semanticEmbedding.length > 0
    ? entry.semanticEmbedding
    : semanticEmbeddingFromTokens(entry.semanticTokens);
}

function entryConfidence(entry: CacheEntry): number {
  return typeof entry.confidence === "number"
    ? entry.confidence
    : entry.decision === "allow"
      ? 1 - entry.probability
      : entry.probability;
}

export async function loadUserDecisions(): Promise<UserDecisionRecord[]> {
  const stored = await chrome.storage.local.get([USER_KNOWLEDGE_KEY]);
  const knowledge = normalizeUserKnowledge(stored[USER_KNOWLEDGE_KEY]);
  const signature = JSON.stringify(knowledge);
  try {
    if (signature !== userKnowledgeSignature) {
      const existing = await database.getAll<UserDecisionRecord>(USER_STORE);
      const durableIds = new Set(knowledge.userDecisions.map(({ id }) => id));
      await Promise.all([
        ...knowledge.userDecisions.map((decision) => database.put(USER_STORE, decision)),
        ...existing.filter(({ id }) => !durableIds.has(id)).map(({ id }) => database.delete(USER_STORE, id)),
      ]);
      userKnowledgeSignature = signature;
    }
    return await database.getAll<UserDecisionRecord>(USER_STORE);
  } catch {
    return knowledge.userDecisions;
  }
}

export async function loadDecisionLookupContext(
  policy?: string,
  languages: Array<ReturnType<typeof contentLanguage>> = [],
  now = Date.now(),
): Promise<DecisionLookupContext> {
  const uniqueLanguages = [...new Set(languages)];
  const userDecisions = await loadUserDecisions();
  let semanticEntries: CacheEntry[] = [];
  try {
    semanticEntries =
      policy && uniqueLanguages.length > 0
        ? await Promise.all(
            uniqueLanguages.map((language) =>
              database.getAllByIndex<CacheEntry>("semanticCache", "policyLanguage", [policy, language]),
            ),
          ).then((groups) => groups.flat())
        : await database.getAll<CacheEntry>("semanticCache");
  } catch {
    semanticEntries = [];
  }
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
  authorId?: string,
  postId?: string,
): Promise<LocalDecisionHit | null> {
  const userDecisions = context?.userDecisions ?? (await loadUserDecisions());
  const singlePost = postId
    ? userDecisions
        .filter(
          (decision) =>
            decision.scope === "content" &&
            decision.surface === surface &&
            decision.policyId === surface &&
            decision.postId === postId,
        )
        .toSorted((left, right) => right.updatedAt - left.updatedAt)[0]
    : undefined;
  if (singlePost) return userHit(singlePost);

  const values = await fingerprints(text);
  const policyCorrection = userDecisions
    .filter(
      (decision) =>
        decision.scope === "content" &&
        decision.surface === surface &&
        decision.policyId === policy &&
        decision.contentHash === values.contentHash,
    )
    .toSorted((left, right) => right.updatedAt - left.updatedAt)[0];
  if (policyCorrection) return userHit(policyCorrection);

  const normalizedAuthor = authorId?.toLocaleLowerCase();
  const authorDecision = normalizedAuthor
    ? userDecisions.find(
        (decision) =>
          decision.scope === "author" &&
          decision.surface === surface &&
          decision.authorId?.toLocaleLowerCase() === normalizedAuthor,
      )
    : undefined;
  if (authorDecision) return userHit(authorDecision);

  const semanticUser = userDecisions
    .filter((decision) => decision.scope === "semantic" && decision.surface === surface)
    .map((decision) => ({
      decision,
      similarity: cosineSimilarity(
        values.embedding,
        decision.semanticEmbedding ?? semanticEmbeddingFromTokens(decision.semanticTokens),
      ),
      templateMatch: decision.templateHash === values.templateHash,
    }))
    .filter(
      ({ decision, similarity, templateMatch }) =>
        templateMatch || similarity >= (decision.similarityThreshold ?? 0.94),
    )
    .toSorted(
      (left, right) =>
        Number(right.templateMatch) - Number(left.templateMatch) ||
        right.similarity - left.similarity ||
        right.decision.updatedAt - left.decision.updatedAt,
    )[0];
  if (semanticUser) return userHit(semanticUser.decision);

  const exact = await readCache("exactCache", cacheKey(policy, values.contentHash), now);
  if (exact) return hit(exact, "exact-cache");
  const normalized = await readCache("normalizedCache", cacheKey(policy, values.normalizedHash), now);
  if (normalized) return hit(normalized, "normalized-cache");
  const template = await readCache("templateCache", cacheKey(policy, values.templateHash), now);
  if (template && template.sampleCount >= 2 && entryConfidence(template) >= 0.85)
    return hit(template, "template-cache");

  const semantic = (context?.semanticEntries ?? (await database.getAll<CacheEntry>("semanticCache")))
    .filter(
      (entry) =>
        entry.policyVersion === policy &&
        entry.expiresAt > now &&
        (entry.language ?? contentLanguage(entry.semanticTokens.join(" "))) === values.language &&
        entryConfidence(entry) >= 0.9,
    )
    .map((entry) => ({ entry, similarity: cosineSimilarity(values.embedding, entryEmbedding(entry)) }))
    .filter(({ similarity }) => similarity >= 0.82)
    .toSorted((left, right) => right.similarity - left.similarity)
    .slice(0, 5);
  if (semantic.length >= 3) {
    const votes = new Map<ContentDecision, number>();
    for (const { entry } of semantic) votes.set(entry.decision, (votes.get(entry.decision) ?? 0) + 1);
    const [winner, count] = [...votes.entries()].toSorted((left, right) => right[1] - left[1])[0]!;
    const requiredVotes = semantic.length >= 5 ? 4 : semantic.length;
    const winningEntry = semantic.find(({ entry }) => entry.decision === winner)?.entry;
    if (count >= requiredVotes && winningEntry) return hit(winningEntry, "semantic-cache");
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
    confidence: decision === "allow" ? 1 - probability : probability,
    strategyId,
    semanticTokens: values.tokens,
    semanticEmbedding: values.embedding,
    language: values.language,
    createdAt: now,
    expiresAt: now + CACHE_TTL_MS,
    lastAccessedAt: now,
  };
  const exact: CacheEntry = { ...base, key: cacheKey(policy, values.contentHash), sampleCount: 1 };
  const normalized: CacheEntry = { ...base, key: cacheKey(policy, values.normalizedHash), sampleCount: 1 };
  const templateKey = cacheKey(policy, values.templateHash);
  const semantic: CacheEntry = { ...base, key: cacheKey(policy, values.contentHash), sampleCount: 1 };
  const previousTemplateWrite = templateWriteQueues.get(templateKey) ?? Promise.resolve();
  const templateWrite = previousTemplateWrite
    .catch(() => undefined)
    .then(async () => {
      const storedTemplate = await database.get<CacheEntry>("templateCache", templateKey);
      const previousTemplate = storedTemplate && storedTemplate.expiresAt > now ? storedTemplate : undefined;
      if (storedTemplate && !previousTemplate) await database.delete("templateCache", templateKey);
      const template: CacheEntry = {
        ...base,
        key: templateKey,
        sampleCount: previousTemplate?.decision === decision ? previousTemplate.sampleCount + 1 : 1,
        confidence:
          previousTemplate?.decision === decision
            ? Math.min(entryConfidence(previousTemplate), base.confidence)
            : base.confidence,
      };
      await database.put("templateCache", template);
      return undefined;
    });
  templateWriteQueues.set(templateKey, templateWrite);
  try {
    await Promise.all([
      database.put("exactCache", exact),
      database.put("normalizedCache", normalized),
      templateWrite,
      database.put("semanticCache", semantic),
    ]);
  } finally {
    if (templateWriteQueues.get(templateKey) === templateWrite) templateWriteQueues.delete(templateKey);
  }
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
  policy: string = surface,
): Promise<LocalDecisionHit> {
  const policyCorrection = action === "correct-hide" || action === "correct-allow";
  const scope = action === "hide" || action === "allow" || policyCorrection ? "content" : "semantic";
  const authorAction = action === "block-author" || action === "allow-author";
  if (authorAction && !post.authorId) throw new Error("当前内容缺少可用的作者标识。");
  const effectiveScope = authorAction ? "author" : scope;
  const decision: ContentDecision =
    action === "allow" || action === "allow-author" || action === "correct-allow"
      ? "allow"
      : action === "block-similar" || action === "block-author"
        ? "block"
        : "blur";
  const singlePostAction = effectiveScope === "content" && !policyCorrection;
  if (singlePostAction && !post.postId) {
    return {
      decision,
      probability: decision === "allow" ? 0 : 0.9,
      source: "user",
    };
  }
  const needsContentFeatures = policyCorrection || effectiveScope === "semantic";
  const values = needsContentFeatures ? await fingerprints(post.text) : undefined;
  const id = authorAction
    ? `${surface}:author:${post.authorId!.toLocaleLowerCase()}`
    : policyCorrection
      ? `${surface}:policy:${policy}:${values!.contentHash}`
      : effectiveScope === "content"
        ? `${surface}:post:${post.postId!}`
        : `${surface}:${effectiveScope}:${values!.contentHash}`;
  let record: UserDecisionRecord | undefined;
  let knowledgeSignature = "";
  await updateUserKnowledge(async (knowledge) => {
    const previous = knowledge.userDecisions.find((candidate) => candidate.id === id);
    const updatedAt = Math.max(now, (previous?.updatedAt ?? Number.NEGATIVE_INFINITY) + 1);
    record = {
      id,
      scope: effectiveScope,
      surface,
      policyId: policyCorrection ? policy : surface,
      postId: singlePostAction ? post.postId : undefined,
      contentHash: values?.contentHash ?? "",
      normalizedContent: values?.normalized ?? "",
      semanticTokens: values?.tokens ?? [],
      semanticEmbedding: values?.embedding,
      templateHash: effectiveScope === "semantic" ? values?.templateHash : undefined,
      authorId: authorAction ? post.authorId!.toLocaleLowerCase() : undefined,
      decision,
      similarityThreshold: action === "reduce-similar" ? 0.82 : action === "block-similar" ? 0.75 : undefined,
      createdAt: previous?.createdAt ?? now,
      updatedAt,
      deviceId: await deviceId(),
    };
    const nextKnowledge = mergeUserKnowledge(knowledge, { userDecisions: [record] });
    knowledgeSignature = JSON.stringify(nextKnowledge);
    return nextKnowledge;
  });
  if (!record) throw new Error("用户标注保存失败。");
  try {
    await database.put(USER_STORE, record);
    userKnowledgeSignature = knowledgeSignature;
  } catch {
    userKnowledgeSignature = "";
  }
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
  templateWriteQueues.clear();
}
