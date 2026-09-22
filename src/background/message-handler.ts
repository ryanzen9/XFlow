import {
  PROVIDERS,
  PROVIDER_IDS,
  policyVersion,
  sanitizePost,
  strategiesFor,
  type ExtensionRequest,
  type ExtensionResponse,
  type FilterSurface,
  type PostInput,
} from "../shared";
import { requestPostReviews } from "./services/jev";
import {
  clearProviderKey,
  getProviderSecrets,
  getProviderSummaries,
  saveProviderKey,
} from "./services/provider-secrets";
import { getSettings } from "./services/settings";
import { saveUserDecision } from "./services/decision-cache";
import {
  clearActivity,
  getActivitySnapshot,
  markActivityStatus,
  recordFilterEvent,
  resetPageActivity,
} from "./services/activity";
import { requestAutomaticSync } from "./services/config-sync";

let reviewChain: Promise<unknown> = Promise.resolve();

async function getStatus(): Promise<ExtensionResponse> {
  const [settings, secrets] = await Promise.all([getSettings(), getProviderSecrets()]);
  return {
    ok: true,
    configured: Boolean(secrets[settings.activeProvider]),
    enabled: settings.enabled,
    commentsEnabled: settings.commentsEnabled,
    activeProvider: settings.activeProvider,
    providerName: PROVIDERS[settings.activeProvider].label,
    modelId: PROVIDERS[settings.activeProvider].modelId,
  };
}

function queueReview(posts: PostInput[], surface: FilterSurface): Promise<ExtensionResponse> {
  const task = reviewChain.then(
    async () => {
      const [settings, secrets] = await Promise.all([getSettings(), getProviderSecrets()]);
      return requestPostReviews(posts, settings, surface, secrets);
    },
    async () => {
      const [settings, secrets] = await Promise.all([getSettings(), getProviderSecrets()]);
      return requestPostReviews(posts, settings, surface, secrets);
    },
  );
  reviewChain = task;
  return task;
}

function isExtensionPage(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id) return false;
  if (sender.url) return sender.url.startsWith(chrome.runtime.getURL(""));
  return sender.tab === undefined;
}

function isContentScript(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id || typeof sender.tab?.id !== "number" || !sender.url) return false;
  try {
    const url = new URL(sender.url);
    return url.protocol === "https:" && (url.hostname === "x.com" || url.hostname === "twitter.com");
  } catch {
    return false;
  }
}

export function handleMessage(
  message: ExtensionRequest,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ExtensionResponse) => void,
): boolean {
  if (!message || typeof message !== "object") return false;

  if (message.type === "GET_STATUS") {
    void getStatus().then(sendResponse);
    return true;
  }

  if (
    message.type === "REVIEW_POSTS" &&
    (message.surface === "timeline" || message.surface === "comments") &&
    Array.isArray(message.posts)
  ) {
    void queueReview(message.posts, message.surface).then(sendResponse);
    return true;
  }

  if (message.type === "SAVE_USER_DECISION") {
    const post = sanitizePost(message.post);
    const actions = [
      "hide",
      "allow",
      "reduce-similar",
      "block-similar",
      "block-author",
      "allow-author",
      "correct-hide",
      "correct-allow",
    ] as const;
    if (
      !isContentScript(sender) ||
      (message.surface !== "timeline" && message.surface !== "comments") ||
      !post ||
      !actions.includes(message.action)
    ) {
      sendResponse({ ok: false, code: "INVALID_REQUEST", error: "无效的用户标注请求。" });
      return false;
    }
    void (async () => {
      const settings = await getSettings();
      const correction = message.action === "correct-hide" || message.action === "correct-allow";
      const saved = await saveUserDecision(
        post,
        message.surface,
        message.action,
        Date.now(),
        correction ? await policyVersion(settings, message.surface) : message.surface,
      );
      const strategy = saved.decision === "allow" ? undefined : strategiesFor(settings, message.surface)[0];
      return {
        ok: true,
        result: {
          id: post.id,
          probability: saved.probability,
          decision: saved.decision,
          source: saved.source,
          details: strategy
            ? {
                strategy,
                modelNickname: settings.modelNickname,
                modelId: PROVIDERS[settings.activeProvider].modelId,
                surface: message.surface,
              }
            : undefined,
        },
      } as const;
    })()
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false, code: "API_ERROR", error: "保存用户标注失败，请重试。" }));
    return true;
  }

  if (message.type === "RESET_PAGE_ACTIVITY") {
    if (!isContentScript(sender) || typeof message.pageToken !== "string" || !message.pageToken) {
      sendResponse({ ok: false, code: "INVALID_REQUEST", error: "无效的页面统计重置请求。" });
      return false;
    }
    void resetPageActivity(sender.tab!.id!, message.pageToken)
      .then(() => sendResponse({ ok: true, updated: true }))
      .catch(() => sendResponse({ ok: false, code: "API_ERROR", error: "无法重置页面统计。" }));
    return true;
  }

  if (message.type === "RECORD_FILTER_EVENT") {
    if (
      !isContentScript(sender) ||
      typeof message.pageToken !== "string" ||
      !message.pageToken ||
      (message.surface !== "timeline" && message.surface !== "comments")
    ) {
      sendResponse({ ok: false, code: "INVALID_REQUEST", error: "无效的过滤统计请求。" });
      return false;
    }
    void recordFilterEvent({
      post: message.post,
      surface: message.surface,
      pageToken: message.pageToken,
      tabId: sender.tab!.id!,
      policyId: message.policyId,
      policyName: message.policyName,
    })
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch(() => sendResponse({ ok: false, code: "API_ERROR", error: "无法保存过滤统计。" }));
    return true;
  }

  if (message.type === "MARK_ACTIVITY_STATUS") {
    const allowed =
      (message.status === "revealed" && isContentScript(sender)) ||
      (message.status === "incorrect" && isExtensionPage(sender));
    if (!allowed || typeof message.eventId !== "string" || !message.eventId) {
      sendResponse({ ok: false, code: "INVALID_REQUEST", error: "无效的历史状态更新。" });
      return false;
    }
    void markActivityStatus(message.eventId, message.status)
      .then((updated) => {
        if (!updated) {
          sendResponse({ ok: false, code: "INVALID_REQUEST", error: "未找到对应的过滤记录。" });
          return false;
        }
        sendResponse({ ok: true, updated: true });
        if (message.status === "incorrect") void requestAutomaticSync();
        return true;
      })
      .catch(() => sendResponse({ ok: false, code: "API_ERROR", error: "无法更新过滤记录。" }));
    return true;
  }

  if (message.type === "GET_ACTIVITY_DATA" || message.type === "CLEAR_ACTIVITY_DATA") {
    if (!isExtensionPage(sender)) {
      sendResponse({ ok: false, code: "FORBIDDEN", error: "只有扩展页面可以读取或清除统计数据。" });
      return false;
    }
    if (message.type === "GET_ACTIVITY_DATA") {
      void getActivitySnapshot()
        .then((snapshot) => sendResponse({ ok: true, ...snapshot }))
        .catch(() => sendResponse({ ok: false, code: "API_ERROR", error: "无法读取统计数据。" }));
    } else {
      void clearActivity()
        .then(() => {
          sendResponse({ ok: true, cleared: true });
          void requestAutomaticSync();
          return undefined;
        })
        .catch(() => sendResponse({ ok: false, code: "API_ERROR", error: "无法清除统计数据。" }));
    }
    return true;
  }

  if (
    message.type === "GET_PROVIDER_SUMMARIES" ||
    message.type === "SAVE_PROVIDER_KEY" ||
    message.type === "CLEAR_PROVIDER_KEY"
  ) {
    if (!isExtensionPage(sender)) {
      sendResponse({ ok: false, code: "FORBIDDEN", error: "只有扩展页面可以管理 API Key。" });
      return false;
    }
    void (async () => {
      try {
        const settings = await getSettings();
        if (message.type === "SAVE_PROVIDER_KEY") {
          if (
            !PROVIDER_IDS.includes(message.providerId) ||
            typeof message.apiKey !== "string" ||
            !message.apiKey.trim()
          ) {
            return { ok: false, code: "INVALID_REQUEST", error: "API Key 不能为空。" } as const;
          }
          await saveProviderKey(message.providerId, message.apiKey.slice(0, 512));
        } else if (message.type === "CLEAR_PROVIDER_KEY") {
          if (!PROVIDER_IDS.includes(message.providerId)) {
            return { ok: false, code: "INVALID_REQUEST", error: "未知的 API 渠道。" } as const;
          }
          await clearProviderKey(message.providerId);
        }
        return { ok: true, providerSummaries: await getProviderSummaries(settings.activeProvider) } as const;
      } catch {
        return { ok: false, code: "API_ERROR", error: "API Key 操作失败，请重试。" } as const;
      }
    })().then(sendResponse);
    return true;
  }

  return false;
}
