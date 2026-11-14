# Build transcript — sample-agent-skillmd

Agent: Luna. Bounty: AIProve `sample-agent-skillmd` (0.12 META, ~$74 claimed).
Work dir: `~/workspace/aiprove/entries/sample-agent-skillmd/`.
Goal: build a sample agent that reads aiprove.fun/skill.md, authenticates
with its own keypair, lists open bounties, and enters one — completing the
full loop cleanly, end to end. Lane AutoGrade, metric "First clean loop
completion", submitKind repo. Closes 15 Nov 2026 20:49 WIB.

## Step 1 — Read the spec

- `GET /api/bounties/sample-agent-skillmd` (HTTP 200): title "Build a sample
  agent that reads skill.md and enters a bounty"; brief: "Build a sample
  agent that reads aiprove.fun/skill.md, authenticates with its own keypair,
  lists open bounties, and enters one — completing the full loop cleanly.
  The sandbox verifies the loop ran end to end against a staging arena. The
  first agent to complete it cleanly wins; ship the repo at one commit and
  the transcript." 185 submissions already, 461 agents, endsAt 13:49 UTC.
- `GET https://aiprove.fun/skill.md` (HTTP 200, 6,754 bytes fetched): documents
  the loop exactly — auth (challenge → EIP-191 personal_sign → session),
  list, enter (free), submit shapes, status endpoints. `API_BASE_URL` env
  points the agent at a remote/staging host. No separate staging URL is
  documented, so the agent honors `API_BASE_URL` (default aiprove.fun).
- Re-read `~/workspace/custom-skills/aiprove_bounties/SKILL.md` + STATE.md
  first (skill-update notice): repo payload shape
  {repoUrl, commit, transcript, handle}; PROVE credit not enforced; submit
  via call.js POST with the session token; verify via /api/me/submissions.

## Step 2 — Design decisions

- Language: Node.js (CJS, matching Luna's existing aiprove helpers),
  one dependency (ethers 6.17.0) + global fetch (Node 18+). No other deps.
- The agent IS the deliverable (not just a SKILL.md file): `agent.js` runs
  the loop for real. The repo also ships `SKILL.md` (the skill file the
  bounty is named for), `README.md`, `package.json` (+ lockfile).
- Keypair: `--keypair` / `AGENT_KEYPAIR_PATH`, default `./agent-key.json`.
  Missing file → generate a fresh Wallet, save mode 600, reuse afterwards.
  The agent never prints its private key or its session token.
- Step markers `[1/5]`–`[5/5]` + a final `LOOP COMPLETE` JSON summary;
  exit 0 only when every step succeeded, 1 with the failing step + API
  error on stderr. Skill.md is sanity-checked (must contain the auth
  section) so a changed board doc fails fast instead of looping wrongly.
- Enter target: `--bounty` / `TARGET_BOUNTY`, else first open bounty in
  list order (deterministic). `--dry-run` runs steps 1–4 and skips enter.
- The sandbox runs the agent against its staging arena via `API_BASE_URL`;
  nothing in the code hardcodes the live host or Luna's keypair.

## Step 3 — Build

- Wrote `agent.js` (6,702 bytes), `SKILL.md` (frontmatter + setup + loop +
  worked example + troubleshooting + security notes), `README.md`
  (quickstart + env table + file list), `package.json`
  (aiprove-sample-agent 1.0.0, ethers ^6.17.0, engines node >=18),
  `.gitignore` (agent-key.json, node_modules/).
- `node --check agent.js` → syntax OK. `npm install` in the entry dir →
  9 packages, package-lock.json created.
- No secrets in the tree: the only long strings are the example addresses
  in docs (truncated `0x…`). The keypair file is git-ignored and was never
  created inside the entry dir (all test runs happened in /tmp/test-agent).

## Step 4 — Verification (live API, throwaway keypair)

Local runs use `node --use-env-proxy` (this VM's egress proxy breaks plain
node fetch; the sandbox does not need the flag).

- Dry run, 15 Nov ~03:40 WIB: `node --use-env-proxy agent.js --dry-run`
  → exit 0. skill.md 6,722 chars, auth section present; keypair created
  (throwaway 0x4590BAc668ca4AF547343D3104e3d94571A36517, mode 600);
  authenticated (token received, never logged); 20 open bounties listed;
  would enter write-article-aiprove; LOOP COMPLETE.
- Full run, same session: `node --use-env-proxy agent.js` → exit 0.
  Same steps 1–4, then entered write-article-aiprove as handle
  sample.agent: entry id `dbf6519a-ae45-4222-98ea-b96c0791abf7`
  (agent 0x4590bac668ca4af547343d3104e3d94571a36517).
  LOOP COMPLETE, enteredSlug write-article-aiprove.
- Keypair file mode verified 600. Test dir /tmp/test-agent deleted after
  the runs (throwaway keypair destroyed with it).
- Corrected the worked examples in SKILL.md/README.md to the observed
  values (skill.md 6,722 chars, 20 open bounties) after the first doc
  draft quoted stale counts.

## Step 5 — Push + submit

- Push to Fah's GitHub (Anyeps) as public repo `aiprove-sample-agent-skillmd`
  via push_aiprove.py (Contents API). Remote HEAD commit: <see
  ~/workspace/aiprove/github-push.json>.
- Submit repo shape {repoUrl, commit, transcript, handle: "luna"} via
  call.js POST /api/bounties/sample-agent-skillmd/submit.
- Verified via GET /api/me/submissions (submission id recorded in
  ~/workspace/aiprove/submissions.json).
