// A deliberately small CSS dialect: visual declarations, scoped to this veil only.
const selectors: Record<string, string> = {
  ".veil": "::before",
  ".label": " .xflow-veil__label-rate",
  ".action": " .xflow-veil__action",
};
const properties = new Set([
  "color",
  "background",
  "background-color",
  "border",
  "border-color",
  "border-width",
  "border-style",
  "border-radius",
  "box-shadow",
  "text-shadow",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "line-height",
  "text-decoration",
  "padding",
]);

const fail = (error: string) => ({ css: "", error });

export function compileHoverCss(source: string, scope: string): { css: string; error: string | null } {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  if (!clean) return { css: "", error: null };
  if (/[<>@\\]|url\s*\(|expression\s*\(|!important/i.test(clean))
    return fail("CSS 不支持外部资源、@规则、转义字符或 !important。");
  const rules = [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  if (clean.replace(/([^{}]+)\{([^{}]*)\}/g, "").trim() || !rules.length)
    return fail("请使用 .veil { 属性: 值; } 格式。");
  const result: string[] = [];
  for (const rule of rules) {
    const selector = rule[1]!.trim();
    if (!Object.hasOwn(selectors, selector)) return fail("仅支持 .veil、.label 和 .action 选择器。");
    const declarations: string[] = [];
    for (const declaration of rule[2]!.split(";").filter((part) => part.trim())) {
      const colon = declaration.indexOf(":");
      const property = declaration.slice(0, colon).trim().toLowerCase();
      const value = declaration.slice(colon + 1).trim();
      if (colon < 1 || !properties.has(property) || !value)
        return fail(`不支持的 CSS 属性或空值：${property || declaration}`);
      // Restrict values to CSS colors, dimensions and functions; no imports, selectors or strings.
      if (!/^[\w\s#.,()%+*/-]+$/.test(value)) return fail(`无法解析 ${property} 的值。`);
      const variables = [...value.matchAll(/var\(\s*([^,)\s]+)/g)].map((match) => match[1]);
      if (variables.some((name) => name !== "--hitrate" && name !== "--threshold"))
        return fail("CSS 变量仅支持 --hitrate 和 --threshold。");
      declarations.push(`${property}:${value}`);
    }
    result.push(`${scope} .xflow-veil:is(:hover,:focus-visible)${selectors[selector]}{${declarations.join(";")}}`);
  }
  return { css: result.join("\n"), error: null };
}
