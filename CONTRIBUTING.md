# Contributing to InkOS

## Setup

```bash
git clone https://github.com/Narcooo/inkos.git
cd inkos
pnpm install
pnpm build
```

## Development

```bash
pnpm dev          # Watch mode (core + cli)
pnpm typecheck    # Type checking
pnpm test         # Run all tests
```

### Project Structure

```
packages/
  core/     # Agents, pipeline, state, models — the engine
  cli/      # Commander.js CLI — thin wrapper over core
  studio/   # Web UI (future)
```

### Key conventions

- **TypeScript strict mode** — no `any` unless unavoidable
- **Immutable patterns** — create new objects, never mutate
- **Small files** — 200–400 lines typical, 800 max
- **Zod schemas** — all external data validated at boundaries
- **Tests** — `vitest`, co-located in `__tests__/`

## Submitting changes

1. Fork and create a feature branch
2. Write tests for new functionality
3. Ensure `pnpm typecheck && pnpm test` passes
4. Open a PR with a clear description

### Commit messages

```
<type>: <description>

Types: feat, fix, refactor, docs, test, chore, perf
```

## Reporting bugs

Use the [bug report template](https://github.com/Narcooo/inkos/issues/new?template=bug_report.yml).

## Feature requests

Use the [feature request template](https://github.com/Narcooo/inkos/issues/new?template=feature_request.yml).
