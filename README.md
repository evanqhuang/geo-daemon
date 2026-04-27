# geo-daemon

Personal Generative Engine Optimization daemon. Weekly cron queries five AI search engines for a fixed prompt set, detects whether the target person is mentioned, and publishes the time-series.

Public dashboard: https://evanqhuang.com/geo

## How it works

1. GitHub Actions runs `src/run.ts` weekly (Sundays 12:00 UTC)
2. Each provider in `src/providers/` queries its engine with the prompts in `queries.yaml`
3. Responses are parsed for mentions and citations, written to `data/runs/<date>.json`
4. A rolled-up `data/runs/index.json` is rebuilt from all run files
5. The portfolio repo is notified via `repository_dispatch` to rebuild the dashboard

## Run locally

```bash
npm ci
npm run daemon -- --dry-run    # hits real APIs, doesn't commit
```

Required environment variables: `PERPLEXITY_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `SERPAPI_API_KEY`.
