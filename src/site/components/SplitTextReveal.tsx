import { useEffect } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { useState } from "react";

function secondsForToken(name: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const amount = Number.parseFloat(value);
  return value.endsWith("ms") ? amount / 1000 : amount;
}

export function SplitTextReveal({ text }: { text: string }) {
  const [scope, setScope] = useState<HTMLSpanElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || !scope) return;

    const characters = scope.querySelectorAll<HTMLElement>("[data-split-character]");
    const duration = secondsForToken("--duration-swift");
    const stagger = secondsForToken("--duration-instant") / 6;
    const animations = Array.from(characters, (character, index) =>
      animate(
        character,
        { opacity: [0, 1], y: [18, 0], filter: ["blur(8px)", "blur(0px)"] },
        { duration, delay: index * stagger, ease: "easeOut" },
      ),
    );

    return () => animations.forEach((animation) => animation.stop());
  }, [prefersReducedMotion, scope]);

  return (
    <span ref={setScope} className="split-text">
      <span className="sr-only">{text}</span>
      <span className="split-text__visual" aria-hidden="true">
        {Array.from(text, (character, index) => (
          <span className="split-text__character" data-split-character key={`${character}-${index}`}>
            {character === " " ? "\u00a0" : character}
          </span>
        ))}
      </span>
    </span>
  );
}
