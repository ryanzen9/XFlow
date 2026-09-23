import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

type ShimmerButtonProps = Omit<HTMLMotionProps<"a">, "children" | "href" | "whileHover" | "whileTap"> & {
  children: ReactNode;
  href: string;
};

export function ShimmerButton({ children, className = "", href, ...props }: ShimmerButtonProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.a
      {...props}
      className={`shimmer-button ${className}`.trim()}
      href={href}
      whileHover={prefersReducedMotion ? undefined : { y: -2 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
    >
      <span>{children}</span>
      <ArrowUpRight className="shimmer-button__icon" aria-hidden="true" focusable="false" />
    </motion.a>
  );
}
