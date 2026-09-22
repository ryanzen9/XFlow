export function ModelFooter({ modelId }: { modelId: string }) {
  return (
    <footer className="mt-2.5 grid grid-cols-[auto_auto_1fr] items-center gap-[7px] border-t border-line px-0.5 pt-2.5 text-caption text-muted">
      <span className="grid size-[13px] place-items-center rounded-full border border-live/40" aria-hidden="true">
        <i className="size-[5px] rounded-full bg-live" />
      </span>
      <span>Decision model</span>
      <code className="justify-self-end font-mono text-caption leading-none font-semibold text-muted">{modelId}</code>
    </footer>
  );
}
