const canvas = document.querySelector("[data-refracted-beams]");
const context = canvas?.getContext("2d", { alpha: false });

if (canvas instanceof HTMLCanvasElement && context) {
  const rootStyle = getComputedStyle(document.documentElement);
  const beamChannels = getComputedStyle(canvas)
    .color.match(/[\d.]+/g)
    ?.slice(0, 3) ?? ["255", "255", "255"];
  const beamColor = beamChannels.join(", ");
  const background = rootStyle.backgroundColor;
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let frameId = 0;
  let lastFrame = 0;
  let inView = true;

  class Beam {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.length = 140 + Math.random() * 150;
      this.speed = 24 + Math.random() * 30;
      this.headSize = 1.3 + Math.random() * 1.1;
      this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.08;
      this.opacity = 0.28 + Math.random() * 0.28;
      this.color = beamColor;

      if (initial) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
      } else {
        this.x = Math.random() * width - this.length * 0.35;
        this.y = -Math.random() * this.length;
      }
    }

    update(delta) {
      this.x += Math.cos(this.angle) * this.speed * delta;
      this.y += Math.sin(this.angle) * this.speed * delta;

      if (this.x > width + 32 || this.y > height + 32) this.reset();
    }

    draw() {
      context.save();
      context.translate(this.x, this.y);
      context.rotate(this.angle);

      const tail = context.createLinearGradient(-this.length, 0, 0, 0);
      tail.addColorStop(0, `rgba(${this.color}, 0)`);
      tail.addColorStop(0.74, `rgba(${this.color}, ${this.opacity * 0.34})`);
      tail.addColorStop(1, `rgba(${this.color}, ${this.opacity})`);

      context.fillStyle = tail;
      context.beginPath();
      context.moveTo(-this.length, -0.5);
      context.lineTo(0, -this.headSize);
      context.lineTo(0, this.headSize);
      context.lineTo(-this.length, 0.5);
      context.closePath();
      context.fill();

      context.shadowColor = `rgba(${this.color}, 0.9)`;
      context.shadowBlur = this.headSize * 6;
      context.fillStyle = `rgba(${this.color}, ${Math.min(1, this.opacity * 1.4)})`;
      context.beginPath();
      context.arc(0, 0, this.headSize, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  const beams = Array.from({ length: 9 }, () => new Beam());

  function paint(delta, animate) {
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = "screen";

    for (const beam of beams) {
      if (animate) beam.update(delta);
      beam.draw();
    }

    context.globalCompositeOperation = "source-over";
  }

  function render(now) {
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
    lastFrame = now;
    paint(delta, true);
    frameId = window.requestAnimationFrame(render);
  }

  function syncAnimation() {
    const shouldAnimate = inView && !document.hidden && !motionPreference.matches;

    if (shouldAnimate && frameId === 0) {
      lastFrame = 0;
      frameId = window.requestAnimationFrame(render);
      return;
    }

    if (!shouldAnimate && frameId !== 0) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
      lastFrame = 0;
    }

    if (!shouldAnimate) paint(0, false);
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    for (const beam of beams) {
      beam.x = Math.random() * width;
      beam.y = Math.random() * height;
    }
    paint(0, false);
  }

  const observer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
          inView = Boolean(entry?.isIntersecting);
          syncAnimation();
        })
      : undefined;

  observer?.observe(canvas);
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", syncAnimation);
  motionPreference.addEventListener("change", syncAnimation);
  window.addEventListener("pageshow", syncAnimation);
  resize();
  syncAnimation();
}
