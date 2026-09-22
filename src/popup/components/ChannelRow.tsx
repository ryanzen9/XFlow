import { cn } from "../../ui/cn";

export interface ChannelRowProps {
  name: string;
  configured: boolean;
}

/**
 * Secondary row: which channel the popup is reporting on, and whether it holds
 * a local credential. Credentials themselves never render here.
 */
export function ChannelRow({ name, configured }: ChannelRowProps) {
  return (
    <div className="flex min-h-12 items-center gap-2.5 px-3 py-2" data-state={configured ? "configured" : "empty"}>
      <span className="min-w-0 flex-1 truncate text-ui leading-tight" title={name}>
        {name}
      </span>
      <span
        className={cn(
          "shrink-0 font-mono text-caption leading-none whitespace-nowrap uppercase",
          configured ? "text-muted" : "text-warn",
        )}
      >
        {configured ? "已配置" : "需要 API Key"}
      </span>
    </div>
  );
}
