import {
  MAX_BATCH_SIZE,
  clampProbability,
  getFilterSurface,
  isFilterablePostOnSurface,
  type ExtensionStatus,
  type FilterSurface,
  type PostInput,
  type ReviewResult,
  type UserDecisionAction,
  type VeilDetails,
} from "../shared";
import { ARTICLE_SELECTOR, extractPost } from "./dom/post-extractor";
import { mountPostVeil, type PostVeilPresentation } from "./render/post-veil";
import { mountPostFeedback, type PostFeedbackPresentation } from "./render/post-feedback";
import { getExtensionStatus, reviewPosts, saveUserDecision } from "./services/extension-client";

interface QueueItem extends PostInput {
  article: HTMLElement;
  generation: number;
  surface: FilterSurface;
}

interface DeferredObscure {
  item: QueueItem;
  probability: number;
  details?: VeilDetails;
}

type FilteredPost = DeferredObscure;

const READING_DWELL_MS = 700;
const FAST_SCROLL_VELOCITY = 1.35;
const FAST_SCROLL_COOLDOWN_MS = 180;

export class TimelineController {
  private readonly presentations = new Map<HTMLElement, PostVeilPresentation | null>();
  private readonly feedbackPresentations = new Map<HTMLElement, PostFeedbackPresentation>();
  private readonly deferredObscures = new Map<HTMLElement, DeferredObscure>();
  private readonly filteredPosts = new Map<HTMLElement, FilteredPost>();
  private readonly readingSince = new Map<HTMLElement, number>();
  private readonly revealedPostIds = new Set<string>();
  private readonly queue: QueueItem[] = [];
  private readonly observer: MutationObserver;
  private running = false;
  private active = false;
  private surface: FilterSurface | null = null;
  private lastUrl = location.href;
  private generatedId = 0;
  private generation = 0;
  private settingsRevision = 0;
  private scanTimer: number | undefined;
  private policyTimer: number | undefined;
  private decisionTimer: number | undefined;
  private scrollFrame: number | undefined;
  private lastScrollY = window.scrollY;
  private lastScrollAt = performance.now();
  private fastScrollUntil = 0;
  private ignoreKnowledgeRevisionsUntil = 0;

  constructor() {
    this.observer = new MutationObserver(() => this.handleMutation());
  }

  start(): void {
    this.observer.observe(document.documentElement, { childList: true, subtree: true });
    chrome.storage.onChanged.addListener(this.handleStorageChange);
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    void this.refreshStatus();
  }

  stop(): void {
    this.settingsRevision += 1;
    this.active = false;
    this.observer.disconnect();
    chrome.storage.onChanged.removeListener(this.handleStorageChange);
    window.removeEventListener("scroll", this.handleScroll);
    this.clearPageState();
  }

  private readonly handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName !== "session" && areaName !== "local") return;
    if (changes.strategies || changes.homeStrategy || changes.commentsStrategy || changes.modelNickname) {
      // Finish the existing exit animation before reclassifying with the new policy.
      this.settingsRevision += 1;
      this.generation += 1;
      this.transitionPresentationsToVisible();
      if (this.policyTimer !== undefined) window.clearTimeout(this.policyTimer);
      this.policyTimer = window.setTimeout(() => {
        this.policyTimer = undefined;
        void this.refreshStatus(true);
      }, 800);
      return;
    }
    if (changes.activeProvider || changes.providerConfigured) {
      void this.refreshStatus(true);
      return;
    }
    if (changes.decisionKnowledgeRevision) {
      if (performance.now() < this.ignoreKnowledgeRevisionsUntil) return;
      void this.refreshStatus(true);
      return;
    }
    if (this.surface === "timeline" && changes.enabled) {
      void this.applyEnabledState(changes.enabled.newValue !== false);
    }
    if (this.surface === "comments" && changes.commentsEnabled) {
      void this.applyEnabledState(changes.commentsEnabled.newValue === true);
    }
  };

  private readonly handleScroll = (): void => {
    const now = performance.now();
    const elapsed = Math.max(now - this.lastScrollAt, 1);
    const velocity = Math.abs(window.scrollY - this.lastScrollY) / elapsed;
    if (velocity >= FAST_SCROLL_VELOCITY) this.fastScrollUntil = now + FAST_SCROLL_COOLDOWN_MS;
    this.lastScrollY = window.scrollY;
    this.lastScrollAt = now;

    if (this.scrollFrame !== undefined) return;
    this.scrollFrame = requestAnimationFrame(() => {
      this.scrollFrame = undefined;
      this.updateReadingZones();
      this.flushDeferredObscures();
    });
  };

  private handleMutation(): void {
    if (location.href !== this.lastUrl) {
      this.lastUrl = location.href;
      void this.refreshStatus(true);
      return;
    }
    this.scheduleScan();
  }

  private scheduleScan(): void {
    if (this.scanTimer !== undefined) return;
    this.scanTimer = window.setTimeout(() => {
      this.scanTimer = undefined;
      this.scan();
    }, 120);
  }

  private scan(): void {
    const surface = getFilterSurface(location.href);
    if (!this.active || !surface || surface !== this.surface) return;
    this.removeDisconnectedPosts();

    for (const article of document.querySelectorAll<HTMLElement>(ARTICLE_SELECTOR)) {
      if (this.presentations.has(article)) continue;

      const extracted = extractPost(article, `visible-${++this.generatedId}`);
      if (!extracted) continue;

      this.presentations.set(article, null);
      const item: QueueItem = { ...extracted.post, article, generation: this.generation, surface };
      this.feedbackPresentations.set(
        article,
        mountPostFeedback(article, undefined, Boolean(item.authorId), (action) => this.applyUserDecision(item, action)),
      );
      if (!isFilterablePostOnSurface(surface, extracted.post.id, location.href)) continue;
      this.queue.push(item);
    }

    this.updateReadingZones();
    this.flushDeferredObscures();
    void this.drainQueue();
  }

  private async drainQueue(): Promise<void> {
    if (this.running || !this.active) return;
    this.running = true;

    try {
      while (this.active && this.queue.length > 0) {
        const batch = this.queue
          .splice(0, MAX_BATCH_SIZE)
          .filter(
            (item) => item.article.isConnected && item.generation === this.generation && item.surface === this.surface,
          );
        if (batch.length === 0) continue;
        const surface = batch[0]?.surface;
        if (!surface) continue;

        let response;
        try {
          response = await reviewPosts(
            batch.map(({ id, text, authorId }) => ({ id, text, ...(authorId ? { authorId } : {}) })),
            surface,
          );
        } catch {
          response = { ok: false as const, code: "API_ERROR" as const, error: "Extension unavailable." };
        }

        if (batch[0]?.generation !== this.generation) continue;
        if (!response.ok) {
          if (response.code === "DISABLED") {
            this.queue.unshift(...batch);
            this.transitionPresentationsToVisible();
          } else if (response.code === "CONFIG_REQUIRED") {
            this.transitionPresentationsToVisible();
          }
          continue;
        }

        if ("results" in response) this.renderResults(batch, response.results);
      }
    } finally {
      this.running = false;
      if (this.active && this.queue.length > 0) void this.drainQueue();
    }
  }

  private renderResults(batch: QueueItem[], results: ReviewResult[]): void {
    const byId = new Map(results.map((result) => [result.id, result]));
    for (const item of batch) {
      if (item.generation !== this.generation || !item.article.isConnected) continue;
      const result = byId.get(item.id);
      if (!result) continue;
      const probability = clampProbability(result.probability);
      const details = result.details;
      if (result.decision !== "allow" && !this.revealedPostIds.has(item.id)) {
        this.filteredPosts.set(item.article, { item, probability, details });
        if (this.active) {
          if (this.hasSettledInReadingZone(item.article)) {
            this.deferredObscures.set(item.article, { item, probability, details });
          } else {
            this.obscure(item, probability, details);
          }
        }
      }
      const existing = this.feedbackPresentations.get(item.article);
      if (existing) existing.update(result);
      else {
        this.feedbackPresentations.set(
          item.article,
          mountPostFeedback(item.article, result, Boolean(item.authorId), (action) =>
            this.applyUserDecision(item, action),
          ),
        );
      }
    }
  }

  private async applyUserDecision(item: QueueItem, action: UserDecisionAction): Promise<void> {
    this.ignoreKnowledgeRevisionsUntil = performance.now() + 1_000;
    const response = await saveUserDecision(
      { id: item.id, text: item.text, ...(item.authorId ? { authorId: item.authorId } : {}) },
      item.surface,
      action,
    );
    if (!response.ok || !("result" in response)) throw new Error(response.ok ? "Invalid response" : response.error);
    const result = response.result;
    this.feedbackPresentations.get(item.article)?.update(result);
    if (result.decision === "allow") {
      this.revealedPostIds.add(item.id);
      this.filteredPosts.delete(item.article);
      this.deferredObscures.delete(item.article);
      this.presentations.get(item.article)?.reveal();
    } else {
      this.revealedPostIds.delete(item.id);
      const filtered = { item, probability: result.probability, details: result.details };
      this.filteredPosts.set(item.article, filtered);
      this.obscure(item, result.probability, result.details);
    }
    if (this.decisionTimer !== undefined) window.clearTimeout(this.decisionTimer);
    this.decisionTimer = window.setTimeout(() => {
      this.decisionTimer = undefined;
      void this.refreshStatus(true);
    }, 400);
  }

  private obscure(item: QueueItem, probability: number, details?: VeilDetails): void {
    if (
      !this.active ||
      !item.article.isConnected ||
      item.generation !== this.generation ||
      this.revealedPostIds.has(item.id) ||
      this.presentations.get(item.article)
    )
      return;

    const animate = this.isOnScreen(item.article) && performance.now() >= this.fastScrollUntil;
    const presentation = mountPostVeil(item.article, {
      animate,
      probability,
      details,
      onReveal: (reason) => {
        if (reason === "user") this.revealedPostIds.add(item.id);
        if (this.presentations.has(item.article)) this.presentations.set(item.article, null);
        if (reason === "disabled" && this.active) {
          const filtered = this.filteredPosts.get(item.article);
          if (filtered) this.obscure(filtered.item, filtered.probability, filtered.details);
        }
      },
    });
    this.presentations.set(item.article, presentation);
  }

  private updateReadingZones(): void {
    if (!this.active) return;
    const now = performance.now();
    for (const article of this.presentations.keys()) {
      if (!article.isConnected) continue;
      if (this.isInReadingZone(article)) {
        if (!this.readingSince.has(article)) this.readingSince.set(article, now);
      } else {
        this.readingSince.delete(article);
      }
    }
  }

  private flushDeferredObscures(): void {
    for (const [article, deferred] of this.deferredObscures) {
      const { item, probability, details } = deferred;
      if (!article.isConnected || item.generation !== this.generation) {
        this.deferredObscures.delete(article);
        continue;
      }
      if (this.isInReadingZone(article)) continue;
      this.deferredObscures.delete(article);
      this.obscure(item, probability, details);
    }
  }

  private hasSettledInReadingZone(article: HTMLElement): boolean {
    const enteredAt = this.readingSince.get(article);
    return (
      enteredAt !== undefined && this.isInReadingZone(article) && performance.now() - enteredAt >= READING_DWELL_MS
    );
  }

  private isInReadingZone(article: HTMLElement): boolean {
    const rect = article.getBoundingClientRect();
    const zoneTop = window.innerHeight * 0.27;
    const zoneBottom = window.innerHeight * 0.68;
    return rect.bottom > zoneTop && rect.top < zoneBottom;
  }

  private isOnScreen(article: HTMLElement): boolean {
    const rect = article.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  private removeDisconnectedPosts(): void {
    for (const [article, presentation] of this.presentations) {
      if (article.isConnected) continue;
      presentation?.destroy();
      this.presentations.delete(article);
      this.feedbackPresentations.get(article)?.destroy();
      this.feedbackPresentations.delete(article);
      this.deferredObscures.delete(article);
      this.filteredPosts.delete(article);
      this.readingSince.delete(article);
    }
  }

  private clearPageState(): void {
    this.generation += 1;
    if (this.scanTimer !== undefined) window.clearTimeout(this.scanTimer);
    if (this.policyTimer !== undefined) window.clearTimeout(this.policyTimer);
    if (this.decisionTimer !== undefined) window.clearTimeout(this.decisionTimer);
    this.policyTimer = undefined;
    this.decisionTimer = undefined;
    if (this.scrollFrame !== undefined) cancelAnimationFrame(this.scrollFrame);
    this.scanTimer = undefined;
    this.scrollFrame = undefined;
    this.queue.length = 0;
    this.deferredObscures.clear();
    this.filteredPosts.clear();
    this.readingSince.clear();
    for (const presentation of this.presentations.values()) presentation?.destroy();
    for (const presentation of this.feedbackPresentations.values()) presentation.destroy();
    this.presentations.clear();
    this.feedbackPresentations.clear();
  }

  private async refreshStatus(reset = false): Promise<void> {
    const revision = ++this.settingsRevision;
    const surface = getFilterSurface(location.href);
    if (reset) {
      this.active = false;
      this.clearPageState();
    }
    this.surface = surface;
    if (!surface) {
      this.active = false;
      this.clearPageState();
      return;
    }

    try {
      const response = await getExtensionStatus();
      if (revision !== this.settingsRevision) return;
      this.active = response.ok && "configured" in response && this.isSurfaceEnabled(response);
    } catch {
      if (revision !== this.settingsRevision) return;
      this.active = false;
    }

    if (this.active) {
      this.restoreFilteredPosts();
      this.scheduleScan();
      void this.drainQueue();
    }
  }

  private transitionPresentationsToVisible(): void {
    this.active = false;
    this.deferredObscures.clear();
    for (const presentation of this.presentations.values()) {
      presentation?.setFilteringEnabled(false);
    }
  }

  private restoreFilteredPosts(): void {
    for (const [article, filtered] of this.filteredPosts) {
      if (!article.isConnected || this.revealedPostIds.has(filtered.item.id)) continue;
      const presentation = this.presentations.get(article);
      if (presentation) presentation.setFilteringEnabled(true);
      else this.obscure(filtered.item, filtered.probability, filtered.details);
    }
  }

  private async applyEnabledState(enabled: boolean): Promise<void> {
    const revision = ++this.settingsRevision;
    if (!enabled) {
      this.transitionPresentationsToVisible();
      return;
    }
    // The scheduled policy refresh will read the latest switch value after old veils exit.
    if (this.policyTimer !== undefined) return;

    try {
      const response = await getExtensionStatus();
      if (revision !== this.settingsRevision) return;
      this.active = response.ok && "configured" in response && this.isSurfaceEnabled(response);
    } catch {
      if (revision !== this.settingsRevision) return;
      this.active = false;
    }

    if (!this.active) return;
    this.restoreFilteredPosts();
    this.scheduleScan();
    void this.drainQueue();
  }

  private isSurfaceEnabled(status: ExtensionStatus): boolean {
    if (this.surface === "timeline") return status.enabled;
    if (this.surface === "comments") return status.commentsEnabled;
    return false;
  }
}
