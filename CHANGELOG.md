# Changelog

## 0.3.6

### Features
- **10 quality & automation enhancements**
  - Sensitive word detection (dim 27): built-in political/sexual/violence word lists
  - Multi-model routing: `modelOverrides` config maps agent roles to different models
  - Spot-fix revise mode: targeted minimal changes with half token budget
  - Character dialogue fingerprinting: extracts per-character speaking style from recent chapters
  - Entity-based context retrieval: lightweight relevant-summary matching from chapter summaries
  - Post-write constraint validation: regex-based prohibition checks (zero LLM cost)
  - Temperature retry threading: scheduler→runner→writer for quality gate retries
  - Failure clustering: per-dimension failure tracking with diagnostic webhook alerts
  - Auto-detection loop in daemon: audit pass → detect → anti-detect rewrite
  - Analytics CLI: `inkos analytics [book-id]` for chapter/word/audit statistics
- Word count control via `--words` flag

### Fixes
- Align capability declarations with actual implementation (genre enum, audit dimensions, truth file count, revise modes)

## 0.3.5

### Features
- **12-feature enhancement** (Phases 1–12 from plan)
  - Chapter summaries for cross-chapter coherence
  - Structural AI-tells detection (paragraph uniformity, cliche density, formulaic transitions)
  - Webhook notifications with HMAC signing
  - Subplot progress board
  - Emotional arc tracking
  - Character interaction matrix with information boundaries
  - Pacing health scoring
  - AIGC detection API integration (`inkos detect`)
  - Style fingerprint learning (`inkos style analyze/import`)
  - Anti-detect rewrite pipeline stage
  - Smart scheduler with quality gates
  - Detection feedback loop with history analytics

### Fixes
- Shared prepack/postpack scripts prevent `workspace:*` leaking into npm tarballs

## 0.3.4

### Features
- CLI UX improvements: auto-detect book-id, `--json` output everywhere, `inkos update` command
- Variadic args for `review approve/reject`

## 0.3.2

### Features
- Dual API format support (OpenAI + Anthropic SDK)
- API key security: key stored in `.env` only, not in `inkos.json`
- Optional LLM params (temperature, maxTokens)
- Global LLM config via `~/.inkos/.env`
- `inkos init` works without arguments (uses current directory)
- Friendly LLM error messages + `inkos doctor` API connectivity test

## 0.3.0

### Features
- Three-layer rule architecture: platform → genre → book
- Genre profiles: xuanhuan, xianxia, urban, horror
- Genre-aware architect, 19-dimension auditor, reviser modes (polish/rewrite/rework)
- Genre CLI commands: `inkos genre list/show/edit`
- Writer prompts extracted into genre-aware prompt builder

## 0.2.0

### Features
- Pluggable radar via `RadarSource` interface
- State snapshots and chapter rewrite command
- Numeric verification rules
- Batch approve command
- Export command for publishing
- Book write lock with index-based chapter numbering

## 0.1.0

### Initial Release
- Multi-agent pipeline: Writer → Auditor → Reviser
- CLI with init, config, book, write, review, status, radar, up/down commands
- Three truth files: current_state, particle_ledger, pending_hooks
- Architect agent for world-building and volume outlines
- OpenAI-compatible LLM provider
