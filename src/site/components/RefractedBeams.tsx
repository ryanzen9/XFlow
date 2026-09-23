import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

class Beam {
  x = 0;
  y = 0;
  length = 0;
  speed = 0;
  headSize = 0;
  angle = 0;
  opacity = 0;
  color = "";

  constructor(
    private readonly colors: string[],
    private readonly width: () => number,
    private readonly height: () => number,
  ) {
    this.reset(true);
  }

  reset(initial = false) {
    this.length = 140 + Math.random() * 150;
    this.speed = 220 + Math.random() * 260;
    this.headSize = 1.6 + Math.random() * 1.1;
    this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.08;
    this.opacity = 0.32 + Math.random() * 0.28;
    this.color = this.colors[Math.floor(Math.random() * this.colors.length)] ?? "212, 203, 229";

    if (initial) {
      this.x = Math.random() * this.width();
      this.y = Math.random() * this.height();
    } else {
      this.x = Math.random() * this.width() - this.length * 0.35;
      this.y = -Math.random() * this.length;
    }
  }

  update(delta: number) {
    this.x += Math.cos(this.angle) * this.speed * delta;
    this.y += Math.sin(this.angle) * this.speed * delta;

    if (this.x > this.width() + 32 || this.y > this.height() + 32) this.reset();
  }

  draw(context: CanvasRenderingContext2D) {
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

export function RefractedBeams() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const targetCanvas = canvasRef.current;
    if (!targetCanvas) return;
    const canvas = targetCanvas as HTMLCanvasElement;
    const context = targetCanvas.getContext("2d", { alpha: false });
    if (!context) return;
    const drawingContext = context as CanvasRenderingContext2D;

    const rootStyle = getComputedStyle(document.documentElement);
    const colors = ["--site-beam-lilac-1", "--site-beam-lilac-2", "--site-beam-lilac-3"].map((name) =>
      rootStyle.getPropertyValue(name).trim(),
    );
    const background = getComputedStyle(targetCanvas).backgroundColor;
    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let frameId = 0;
    let lastFrame = 0;
    let inView = true;

    const beams = Array.from(
      { length: 12 },
      () =>
        new Beam(
          colors,
          () => width,
          () => height,
        ),
    );

    function paint(delta: number, animate: boolean) {
      drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      drawingContext.fillStyle = background;
      drawingContext.fillRect(0, 0, width, height);
      drawingContext.globalCompositeOperation = "screen";

      for (const beam of beams) {
        if (animate) beam.update(delta);
        beam.draw(drawingContext);
      }

      drawingContext.globalCompositeOperation = "source-over";
    }

    function render(now: number) {
      const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
      lastFrame = now;
      paint(delta, true);
      frameId = window.requestAnimationFrame(render);
    }

    function syncAnimation() {
      const shouldAnimate = inView && !document.hidden && !prefersReducedMotion;

      if (shouldAnimate && frameId === 0) {
        lastFrame = 0;
        frameId = window.requestAnimationFrame(render);
      } else if (!shouldAnimate && frameId !== 0) {
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
      for (const beam of beams) beam.reset(true);
      paint(0, false);
    }

    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => {
            inView = Boolean(entry?.isIntersecting);
            syncAnimation();
          })
        : undefined;

    observer?.observe(targetCanvas);
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", syncAnimation);
    window.addEventListener("pageshow", syncAnimation);
    resize();
    syncAnimation();

    return () => {
      if (frameId !== 0) window.cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", syncAnimation);
      window.removeEventListener("pageshow", syncAnimation);
    };
  }, [prefersReducedMotion]);

  return <canvas ref={canvasRef} className="beam-canvas" aria-hidden="true" />;
}
