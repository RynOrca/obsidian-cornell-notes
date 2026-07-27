# Changelog

## v1.0.5 (2025-07-27)

### perf: 核心渲染性能优化
- **并行渲染**：所有行的 cue/note 改为 `Promise.all` 并发渲染，渲染耗时从 O(2N×单次) 降为 O(单次)
- **Source memoization**：源码未变时跳过全部解析+渲染管线，避免 Live Preview 下每次光标移动都重渲染
- **AbortController**：新渲染触发时取消上一次未完成的渲染，防止快速打字时任务堆积
- **DOM 预清理**：渲染前 `el.empty()` 清理旧 DOM，避免 Component 子节点内存泄漏
- **骨架先行**：所有 DOM 结构同步构建后一次性插入，再并发填充内容，减少回流次数

### fix: parser 修复
- `::note` 在 `::cue` 之前出现不再被静默丢弃

### chore
- tsconfig.json 添加 `skipLibCheck: true`（绕过 obsidian.d.ts 的 HistoryHandler 类型错误）
