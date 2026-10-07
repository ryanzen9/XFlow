import type { ReactNode } from "react";
import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import { useI18n } from "./i18n";

const chineseControls = {
  "@astryx.appShell.mobileNavigation": "菜单",
  "@astryx.appShell.skipToContent": "跳至内容",
  "@astryx.mobileNav.closeNavigation": "关闭菜单",
  "@astryx.mobileNav.toggle.open": "打开菜单",
  "@astryx.mobileNav.navigation": "导航",
  "@astryx.dialog.close": "关闭",
  "@astryx.toast.dismiss": "关闭通知",
  "@astryx.field.optional": "选填",
  "@astryx.field.required": "必填",
  "@astryx.button.loading": "处理中",
  "@astryx.spinner.loading": "加载中",
  "@astryx.numberInput.decrementLabel": "减少 {label}",
  "@astryx.numberInput.incrementLabel": "增加 {label}",
  "@astryx.selector.placeholder": "请选择…",
  "@astryx.selector.empty": "暂无选项",
  "@astryx.textInput.clearLabel": "清除{label}",
  "@astryx.link.newTab": "（在新标签页打开）",
  "@astryx.table.label": "可横向滚动的表格",
  "@astryx.keyboardHint.toNavigate": "切换标签",
};

export function AstryxLocale({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  return (
    <InternationalizationProvider locale={locale} overrides={{ "zh-CN": chineseControls }}>
      {children}
    </InternationalizationProvider>
  );
}
