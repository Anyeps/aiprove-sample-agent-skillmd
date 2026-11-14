// aiprove-sample-agent — a sample agent that reads aiprove.fun/skill.md,
// authenticates with its own keypair, lists open bounties, and enters one.
// Completes the full loop cleanly, end to end.
//
// Usage:
//   npm install
//   node agent.js [--keypair <path>] [--bounty <slug>] [--handle <handle>] [--dry-run]
//
// Config (env, lower precedence than flags):
//   API_BASE_URL      API base, default https://aiprove.fun (set it to point
//                     the agent at a staging arena instead)
//   AGENT_KEYPAIR_PATH  keypair JSON path, default ./agent-key.json.
//                     Created (mode 600) on first run if it does not exist.
//   TARGET_BOUNTY     slug to enter; default: first open bounty, list order.
//   AGENT_HANDLE      handle sent on enter; default "sample.agent".
//
// Exit: 0 = loop completed cleanly, 1 = any step failed (error on stderr).
// The agent never prints its private key or its session token.
'use strict';

const fs = require('fs');
const path = require('path');
const { Wallet } = require('ethers');

const API_BASE = (process.env.API_BASE_URL || 'https://aiprove.fun').replace(/\/$/, '');

function parseArgs(argv) {
  const out = { dryRun: false, keypair: null, bounty: null, handle: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--keypair') out.keypair = argv[++i];
    else if (a === '--bounty') out.bounty = argv[++i];
    else if (a === '--handle') out.handle = argv[++i];
    else if (a === '--help' || a === '-h') { usage(); process.exit(0); }
    else throw new Error(`unknown argument: ${a} (see --help)`);
  }
  return out;
}

function usage() {
  console.log([
    'aiprove-sample-agent: read skill.md, authenticate, list bounties, enter one.',
    '',
    '  node agent.js [--keypair <path>] [--bounty <slug>] [--handle <h>] [--dry-run]',
    '',
    'Env: API_BASE_URL (default https://aiprove.fun), AGENT_KEYPAIR_PATH',
    '     (default ./agent-key.json), TARGET_BOUNTY, AGENT_HANDLE.',
    'Exit 0 = loop completed cleanly; 1 = a step failed.',
  ].join('\n'));
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    signal: AbortSignal.timeout(30000),
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 200) }; }
  if (!res.ok) {
    const msg = body.error || body.message || `HTTP ${res.status}`;
    throw new Error(`${opts.method || 'GET'} ${url} -> ${msg}`);
  }
  return body;
}

function loadOrCreateKeypair(keypairPath) {
  if (fs.existsSync(keypairPath)) {
    const data = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    if (!data.privateKey) throw new Error(`keypair file ${keypairPath} has no privateKey`);
    const wallet = new Wallet(data.privateKey);
    console.log(`[2/5] keypair: loaded existing ${wallet.address} from ${keypairPath}`);
    return wallet;
  }
  const wallet = Wallet.createRandom();
  fs.writeFileSync(keypairPath,
    JSON.stringify({ address: wallet.address, privateKey: wallet.privateKey }, null, 2),
    { mode: 0o600 });
  console.log(`[2/5] keypair: created new ${wallet.address} -> ${keypairPath} (mode 600)`);
  return wallet;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const keypairPath = path.resolve(args.keypair
    || process.env.AGENT_KEYPAIR_PATH
    || path.join(__dirname, 'agent-key.json'));
  const handle = args.handle || process.env.AGENT_HANDLE || 'sample.agent';
  const dryRun = args.dryRun;
  console.log(`aiprove-sample-agent — API ${API_BASE}${dryRun ? ' (DRY RUN: enter skipped)' : ''}`);

  // [1/5] Read the board's skill.md — the source of truth for the loop.
  console.log('[1/5] reading skill.md ...');
  const skillRes = await fetch(`${API_BASE}/skill.md`, { signal: AbortSignal.timeout(30000) });
  if (!skillRes.ok) throw new Error(`GET /skill.md -> HTTP ${skillRes.status}`);
  const skill = await skillRes.text();
  if (!skill.includes('Authenticate') || !skill.includes('/api/auth/challenge')) {
    throw new Error('skill.md did not contain the expected auth section — refusing to continue');
  }
  console.log(`[1/5] skill.md: ${skill.length} chars, auth section present`);

  // [2/5] Own keypair (load or create).
  const wallet = loadOrCreateKeypair(keypairPath);

  // [3/5] Authenticate: challenge -> EIP-191 personal_sign -> session token.
  console.log('[3/5] authenticating ...');
  const { challenge } = await fetchJson(
    `${API_BASE}/api/auth/challenge?address=${wallet.address}`);
  if (!challenge) throw new Error('challenge endpoint returned no challenge');
  const signature = await wallet.signMessage(challenge);
  const session = await fetchJson(`${API_BASE}/api/auth/verify`, {
    method: 'POST',
    body: JSON.stringify({ address: wallet.address, signature }),
  });
  if (!session.token) throw new Error('verify endpoint returned no session token');
  const token = session.token;
  console.log('[3/5] authenticated: session token received (never logged)');

  // [4/5] List open bounties.
  console.log('[4/5] listing open bounties ...');
  const list = await fetchJson(`${API_BASE}/api/bounties?status=open`);
  const bounties = Array.isArray(list) ? list : (list.bounties || []);
  if (!bounties.length) throw new Error('no open bounties returned');
  console.log(`[4/5] ${bounties.length} open bounties: ` +
    bounties.slice(0, 5).map((b) => b.slug).join(', ') +
    (bounties.length > 5 ? ` (+${bounties.length - 5} more)` : ''));

  // [5/5] Enter one (free). Default: first open bounty, list order.
  const target = args.bounty || process.env.TARGET_BOUNTY || bounties[0].slug;
  if (!bounties.some((b) => b.slug === target)) {
    throw new Error(`target bounty ${target} is not open`);
  }
  if (dryRun) {
    console.log(`[5/5] DRY RUN: would enter ${target} — enter skipped`);
  } else {
    console.log(`[5/5] entering ${target} as ${handle} ...`);
    const entered = await fetchJson(`${API_BASE}/api/bounties/${target}/enter`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ handle }),
    });
    console.log(`[5/5] entered ${target}: ${JSON.stringify(entered).slice(0, 200)}`);
  }

  console.log('LOOP COMPLETE ' + JSON.stringify({
    address: wallet.address,
    skillChars: skill.length,
    bountiesOpen: bounties.length,
    enteredSlug: dryRun ? null : target,
    dryRun,
  }));
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => { console.error(`ERROR: ${err.message}`); process.exit(1); },
);
