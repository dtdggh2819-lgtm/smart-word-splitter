# 智能拆词助手 (Smart Word Splitter)

独立于 HiWork 的中文智能拆词网站，基于 Next.js。支持中文分词、词性标注、命名实体识别、上下文消歧、人工修正分类、CSV 导出与移动端布局。

## 运行
需要 Node.js 20+。

```bash
npm install
cp .env.example .env.local
# 将服务端 OPENAI_API_KEY 写入 .env.local
npm run dev
```

访问 http://localhost:3000。

## 部署
在 Vercel 导入 GitHub 仓库，配置 Environment Variables 中的 `OPENAI_API_KEY`（可选 `OPENAI_MODEL`），然后 Deploy。请勿把密钥提交到公开仓库。公开使用前应加入鉴权、限流与预算限制。

## 当前版本的边界
- 必须配置兼容 OpenAI Chat Completions JSON 模式的模型接口才可分析，未配置时会明确报错。
- “快速”和“精准”模式通过不同提示区分，均调用 AI。
- 尚未集成 Web 实时搜索、永久纠错记忆、批量文件处理或 Excel 格式导出。
- 对分析结果进行原文拼接校验，防止遗漏字符；AI 识别不保证 100% 准确。
- 手动修正仅在当前页面保留，刷新后不会记忆。
