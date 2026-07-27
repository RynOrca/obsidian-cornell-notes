# Cornell Notes Plugin 性能优化计划

## 根因
`renderer.ts` 中对每行 cue/note 串行 `await MarkdownRenderer.render()`，导致 N 行笔记需要 2N 次串行渲染。

## 优化计划

### Phase 1: 核心性能（P0）
- [x] Source memoization：source 未变则跳过渲染
- [x] 并行渲染：`Promise.all` 替代串行 `await`
- [x] AbortController：新渲染触发时取消旧渲染
- [x] 渲染前清理 DOM：`el.empty()` 防止内存泄漏

### Phase 2: 结构优化（P1）
- [x] DOM 骨架先构建，再填充内容（改善首屏感知）

### Phase 3: 正确性修复（P2）
- [x] `::note` 在 `::cue` 之前出现时被静默丢弃的 bug
- [ ] CSS 优化：减少不必要的 setProperty 调用
