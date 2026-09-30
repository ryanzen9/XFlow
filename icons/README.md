# XFlow 扩展图标

`icons/icon-16.png`、`icon-32.png`、`icon-48.png`、`icon-128.png` 是提交到仓库的静态资源，
`manifest.json` 的 `icons` 与 `action.default_icon` 直接引用它们。构建只复制这些文件，
不会在构建期生成图标，因此 `bun run build` 不依赖任何图像工具。

## 设计

- 底板：品牌墨色 `#0a0a0a` 圆角方块（圆角半径约为边长的 22 %）。纯无彩色，符合
  `src/styles/token.css` 的“没有品牌色”原则。
- 图形：`logo.png` 的白色 X，居中放置，宽度约为画布的 64 %。
- 深色工具栏上白 X 清晰，浅色工具栏上墨色底板提供对比，因此单一图标集在两种主题下都可用。

## 重新生成

需要本机安装 ImageMagick 7（`magick`）。在仓库根目录执行：

```bash
mask=$(mktemp -d)
magick logo-dark.png -alpha extract -fuzz 5% -trim +repage "$mask/x-mask.png"
magick -size 693x633 xc:white "$mask/x-mask.png" -alpha off -compose CopyOpacity -composite "$mask/x-white.png"
magick -size 1024x1024 xc:none -fill "#0a0a0a" -draw "roundrectangle 0,0,1023,1023,225,225" "$mask/plate.png"
magick "$mask/plate.png" \( "$mask/x-white.png" -filter Lanczos -resize 660x660 \) -gravity center -composite "$mask/base.png"
for size in 16 32 48 128; do
  magick "$mask/base.png" -filter Lanczos -resize "${size}x${size}" -strip -define png:color-type=6 "icons/icon-${size}.png"
done
```

`scripts/manifest.test.ts` 会读取每个 PNG 的 IHDR，断言实际像素尺寸与 manifest 中声明的
尺寸一致，防止再次出现“用一张大图冒充全部尺寸”的情况。
