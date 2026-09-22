import { normalizeSettings, type AppSettings } from "./strategy";
import { PROVIDER_SECRETS_KEY, normalizeProviderSecrets } from "./providers";
import { normalizeUserKnowledge, syncableUserKnowledge, type UserKnowledge } from "./content-decision";
import { ACTIVITY_DATA_KEY, normalizeActivityData, type ActivityData } from "./activity";

export const CONFIG_SCHEMA_VERSION = 4;
export const CONFIG_VERSION_KEY = "configVersion";
export const CONFIG_UPDATED_AT_KEY = "configUpdatedAt";
export const KNOWLEDGE_REVISION_KEY = "knowledgeRevision";
export const S3_SYNC_KEY = "s3Sync";
export const USER_KNOWLEDGE_KEY = "userKnowledge";

export interface ConfigurationDocument {
  schemaVersion: number;
  configVersion: number;
  knowledgeRevision: number;
  updatedAt: string;
  config: AppSettings;
  knowledge: UserKnowledge;
  activity: ActivityData;
}

export interface S3SyncSettings {
  autoSyncEnabled: boolean;
  endpoint: string;
  region: string;
  bucket: string;
  objectKey: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export const DEFAULT_S3_SYNC_SETTINGS: S3SyncSettings = {
  autoSyncEnabled: false,
  endpoint: "",
  region: "us-east-1",
  bucket: "",
  objectKey: "xfilter/config.json",
  accessKeyId: "",
  secretAccessKey: "",
  sessionToken: "",
};

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function nonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : fallback;
}

const PERSISTENCE_LOCK_NAME = "xflow-configuration-persistence";
let fallbackPersistenceQueue: Promise<void> = Promise.resolve();

export function withPersistenceLock<T>(operation: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (locks) return locks.request(PERSISTENCE_LOCK_NAME, operation) as unknown as Promise<T>;

  const result = fallbackPersistenceQueue.then(operation, operation);
  fallbackPersistenceQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function timestamp(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return new Date(0).toISOString();
  return new Date(value).toISOString();
}

export function normalizeS3SyncSettings(value: unknown): S3SyncSettings {
  const input = value && typeof value === "object" ? (value as Partial<S3SyncSettings>) : {};
  return {
    autoSyncEnabled: input.autoSyncEnabled === true,
    endpoint: typeof input.endpoint === "string" ? input.endpoint.trim().replace(/\/+$/, "") : "",
    region:
      typeof input.region === "string" && input.region.trim() ? input.region.trim() : DEFAULT_S3_SYNC_SETTINGS.region,
    bucket: typeof input.bucket === "string" ? input.bucket.trim() : "",
    objectKey:
      typeof input.objectKey === "string" && input.objectKey.trim()
        ? input.objectKey.trim().replace(/^\/+/, "")
        : DEFAULT_S3_SYNC_SETTINGS.objectKey,
    accessKeyId: typeof input.accessKeyId === "string" ? input.accessKeyId.trim() : "",
    secretAccessKey: typeof input.secretAccessKey === "string" ? input.secretAccessKey : "",
    sessionToken: typeof input.sessionToken === "string" ? input.sessionToken.trim() : "",
  };
}

export async function readConfigurationDocument(): Promise<ConfigurationDocument> {
  const stored = await chrome.storage.local.get(null);
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    configVersion: positiveInteger(stored[CONFIG_VERSION_KEY], 1),
    knowledgeRevision: nonNegativeInteger(stored[KNOWLEDGE_REVISION_KEY], 0),
    updatedAt: timestamp(stored[CONFIG_UPDATED_AT_KEY]),
    config: normalizeSettings(stored),
    knowledge: syncableUserKnowledge(stored[USER_KNOWLEDGE_KEY]),
    activity: normalizeActivityData(stored[ACTIVITY_DATA_KEY]),
  };
}

export function normalizeConfigurationDocument(value: unknown): ConfigurationDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("配置文档必须是 JSON 对象。");
  const input = value as Partial<ConfigurationDocument>;
  if (
    input.schemaVersion !== 1 &&
    input.schemaVersion !== 2 &&
    input.schemaVersion !== 3 &&
    input.schemaVersion !== CONFIG_SCHEMA_VERSION
  ) {
    throw new Error(`仅支持 schemaVersion 1、2、3 或 ${CONFIG_SCHEMA_VERSION}。`);
  }
  if (!input.config || typeof input.config !== "object" || Array.isArray(input.config))
    throw new Error("config 必须是 JSON 对象。");
  if (!Array.isArray((input.config as Partial<AppSettings>).strategies))
    throw new Error("config.strategies 必须是数组。");
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    configVersion: positiveInteger(input.configVersion, 1),
    knowledgeRevision: nonNegativeInteger(input.knowledgeRevision, 0),
    updatedAt: timestamp(input.updatedAt),
    config: normalizeSettings(input.config as unknown as Record<string, unknown>),
    knowledge: syncableUserKnowledge(input.knowledge),
    activity: normalizeActivityData(input.activity),
  };
}

export function normalizeEditableConfig(value: unknown): AppSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("配置必须是 JSON 对象。");
  const input = value as Record<string, unknown>;
  if (!Array.isArray(input.strategies)) throw new Error("strategies 必须是数组。");
  return normalizeSettings(input);
}

export function writeVersionedSettings(patch: Partial<AppSettings>): Promise<ConfigurationDocument> {
  return withPersistenceLock(async () => {
    const current = await chrome.storage.local.get([CONFIG_VERSION_KEY]);
    const configVersion = positiveInteger(current[CONFIG_VERSION_KEY], 0) + 1;
    const updatedAt = new Date().toISOString();
    await chrome.storage.local.set({
      ...patch,
      [CONFIG_VERSION_KEY]: configVersion,
      [CONFIG_UPDATED_AT_KEY]: updatedAt,
    });
    return readConfigurationDocument();
  });
}

export function updateUserKnowledge(
  update: (knowledge: UserKnowledge) => UserKnowledge | Promise<UserKnowledge>,
): Promise<ConfigurationDocument> {
  return withPersistenceLock(async () => {
    const stored = await chrome.storage.local.get([USER_KNOWLEDGE_KEY, KNOWLEDGE_REVISION_KEY]);
    const knowledge = normalizeUserKnowledge(await update(normalizeUserKnowledge(stored[USER_KNOWLEDGE_KEY])));
    const knowledgeRevision = nonNegativeInteger(stored[KNOWLEDGE_REVISION_KEY], 0) + 1;
    await chrome.storage.local.set({
      [USER_KNOWLEDGE_KEY]: knowledge,
      [KNOWLEDGE_REVISION_KEY]: knowledgeRevision,
    });
    return readConfigurationDocument();
  });
}

export function writeUserKnowledge(knowledge: UserKnowledge): Promise<ConfigurationDocument> {
  return updateUserKnowledge(() => knowledge);
}

export async function applyEditedConfiguration(value: unknown): Promise<ConfigurationDocument> {
  return writeVersionedSettings(normalizeEditableConfig(value));
}

export async function migrateLegacyOpenRouterKey(apiKey: string): Promise<void> {
  const normalizedKey = apiKey.trim();
  if (!normalizedKey) return;
  const stored = await chrome.storage.local.get([PROVIDER_SECRETS_KEY]);
  const secrets = normalizeProviderSecrets(stored[PROVIDER_SECRETS_KEY]);
  if (!secrets.openrouter) {
    await chrome.storage.local.set({ [PROVIDER_SECRETS_KEY]: { ...secrets, openrouter: normalizedKey } });
  }
}

export async function applyRemoteConfiguration(document: ConfigurationDocument): Promise<ConfigurationDocument> {
  const normalized = normalizeConfigurationDocument(document);
  const legacyConfig = document.config as unknown as Record<string, unknown>;
  const legacyApiKey = typeof legacyConfig.apiKey === "string" ? legacyConfig.apiKey.trim() : "";
  await migrateLegacyOpenRouterKey(legacyApiKey);
  await chrome.storage.local.set({
    ...normalized.config,
    [USER_KNOWLEDGE_KEY]: normalizeUserKnowledge(normalized.knowledge),
    [ACTIVITY_DATA_KEY]: normalized.activity,
    [CONFIG_VERSION_KEY]: normalized.configVersion,
    [KNOWLEDGE_REVISION_KEY]: normalized.knowledgeRevision,
    [CONFIG_UPDATED_AT_KEY]: normalized.updatedAt,
  });
  return readConfigurationDocument();
}

export async function readS3SyncSettings(): Promise<S3SyncSettings> {
  const stored = await chrome.storage.local.get([S3_SYNC_KEY]);
  return normalizeS3SyncSettings(stored[S3_SYNC_KEY]);
}

export async function saveS3SyncSettings(settings: S3SyncSettings): Promise<S3SyncSettings> {
  const normalized = normalizeS3SyncSettings(settings);
  await chrome.storage.local.set({ [S3_SYNC_KEY]: normalized });
  return normalized;
}
