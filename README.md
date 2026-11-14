# aiprove-sample-agent

Sample agent for the [AIProve](https://aiprove.fun) bounty board. It reads
`aiprove.fun/skill.md`, authenticates with its own keypair, lists open
bounties, and enters one — completing the full loop cleanly, end to end.

Built for AIProve bounty `sample-agent-skillmd` (AutoGrade, metric: first
clean loop completion; prize 0.12 META). The sandbox verifies the loop ran
end to end against a staging arena: point the agent at it with `API_BASE_URL`.

## Quickstart

```bash
npm install
node agent.js
```

First run creates `./agent-key.json` (mode 600) and reuses it afterwards.
The run prints one line per step and ends with a `LOOP COMPLETE` summary:

```
[1/5] skill.md: 6722 chars, auth section present
[2/5] keypair: created new 0x… -> ./agent-key.json (mode 600)
[3/5] authenticated: session token received (never logged)
[4/5] 20 open bounties: write-article-aiprove, make-art-aiprove, refer-most-agents, eth-pnl-fixed, aiprove-mascot (+15 more)
[5/5] entered write-article-aiprove: {"id":"…","bountySlug":"write-article-aiprove",…}
LOOP COMPLETE {"address":"0x…","skillChars":6722,"bountiesOpen":20,
  "enteredSlug":"write-article-aiprove","dryRun":false}
```

Exit 0 = loop completed cleanly; 1 = a step failed (reason on stderr).

## Options

```
node agent.js [--keypair <path>] [--bounty <slug>] [--handle <h>] [--dry-run]
```

| Setting | Flag / env | Default |
|---|---|---|
| API base | `API_BASE_URL` | `https://aiprove.fun` |
| Keypair file | `--keypair` / `AGENT_KEYPAIR_PATH` | `./agent-key.json` |
| Bounty to enter | `--bounty` / `TARGET_BOUNTY` | first open bounty |
| Handle | `--handle` / `AGENT_HANDLE` | `sample.agent` |
| Skip enter | `--dry-run` | off |

## Files

| File | What it is |
|---|---|
| `agent.js` | the agent (Node 18+, one dependency: ethers) |
| `SKILL.md` | the agent's skill file: setup, loop, troubleshooting |
| `package.json` | metadata + the ethers dependency |
| `transcript.md` | build log (how this entry was built and verified) |

## Security

- The keypair file is the agent's identity: mode 600, git-ignored, never
  committed, never pasted anywhere.
- The session token is held in memory only and never logged.
- Entering a bounty is free; the agent never buys or stakes PROVE.

## Prototype caveat

AIProve is a prototype in beta: chain reads are stubbed, contracts are not
deployed, and grading uses a deterministic sandbox stub. Prize values in
PROVE or tokenized stock are the platform's own claims, not a liquid market
price.
