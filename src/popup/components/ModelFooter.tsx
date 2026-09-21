export function ModelFooter({ modelId }: { modelId: string }) {
  return (
    <footer className="mt-2.5 grid grid-cols-[auto_auto_1fr] items-center gap-[7px] border-t border-line px-0.5 pt-2.5 text-[9.5px] text-faint">
      <span className="grid size-[13px] place-items-center rounded-full border border-signal/35" aria-hidden="true">
        <i className="size-[5px] rounded-full bg-signal" />
      </span>
      <span>Decision model</span>
      <code className="justify-self-end font-mono text-[9.5px] leading-none font-semibold text-muted">{modelId}</code>
    </footer>
  );
}
