/** CLI transport for opt-in tests against the isolated Dashboard preview. */
export function previewBrowser(name: string) {
  const session = `xflow-${name}-${process.pid}`;
  return async (...args: string[]) => {
    const proc = Bun.spawn(["agent-browser", "--session", session, "--json", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (exitCode !== 0) throw new Error(`${args[0]} failed: ${stderr || stdout}`);
    const output = JSON.parse(stdout);
    if (!output.success) throw new Error(JSON.stringify(output.error));
    return output.data?.result;
  };
}
