import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/* The type ladder in token.css is expressed as semantic roles (`text-meta`,
   `text-ui`, `text-readout`, …). tailwind-merge cannot know those names, so
   without this it reads `text-meta` as a colour and silently drops it when the
   same element also sets `text-ink`. Registering the roles as font sizes keeps
   a role and a colour independent, exactly like `text-xs text-muted`. */
const tailwindMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: ["caption", "meta", "label", "ui", "heading", "title", "display", "hero", "readout", "code"],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return tailwindMerge(clsx(inputs));
}
