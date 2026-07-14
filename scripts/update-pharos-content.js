// =============================================================================
// Weekly Pharos content updater
//
// Researches the latest Pharos Network news/developments/stats with the Gemini
// API (Google Search grounding) and appends them to the site's single content
// store, public/js/data.js. Also diffs the official Pharos ecosystem sources
// against our ecosystem directory and proposes missing partners/projects.
// Designed to run in GitHub Actions on a weekly cron; the workflow then opens
// a PR with whatever this script changed.
//
// All reasoning + Vietnamese writing is done by Gemini ("everything via Gemini").
// This script only orchestrates the API calls, validates the output, and edits
// data.js with low-risk, append-only text surgery.
//
// Env:
//   GEMINI_API_KEY  (required) — Gemini API key
//   GEMINI_MODEL    (optional) — model id, default "gemini-2.5-flash"
//
// Outputs:
//   - Edits public/js/data.js in place (only when there is verified new content)
//   - Writes pr-body.md (PR description; used by the workflow via body-path)
//   - Writes has-changes.txt containing "true" or "false"
// =============================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DATA_FILE = join(REPO_ROOT, "public", "js", "data.js");
const PR_BODY_FILE = join(REPO_ROOT, "pr-body.md");
const HAS_CHANGES_FILE = join(REPO_ROOT, "has-changes.txt");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Allowed news categories (must match the filter buttons on the news page).
const NEWS_CATEGORIES = [
  "Công Nghệ",
  "Thông Báo",
  "Hợp Tác",
  "Nhà phát triển",
  "Cập Nhật",
];

const SOURCES_TO_RESEARCH = [
  "https://www.pharos.xyz",
  "https://www.pharos.xyz/resources",
  "https://www.pharos.xyz/ecosystem",
  "https://docs.pharosnetwork.xyz",
  "https://x.com/pharos_network",
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fail(msg) {
  console.error(`[update-pharos-content] ERROR: ${msg}`);
  process.exit(1);
}

function today() {
  // Runs in normal Node (CI / local), so Date is available.
  return new Date().toISOString().slice(0, 10);
}

// --- Load the current content object without a browser ------------------------
function loadCurrentData(text) {
  const sandbox = { window: {} };
  vm.runInNewContext(text, sandbox, { filename: "data.js" });
  const data = sandbox.window.PharosData;
  if (!data || typeof data !== "object") {
    fail("Could not read window.PharosData from data.js");
  }
  return data;
}

// --- Gemini REST helpers ------------------------------------------------------
async function geminiCall(body) {
  const url = `${API_BASE}/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    fail(`Gemini API ${res.status}: ${errText.slice(0, 1000)}`);
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text || "").join("").trim();
}

async function researchLatestNews(existing) {
  const knownTitles = existing.news
    .map((n) => `- ${n.date} | ${n.id} | ${n.title}`)
    .join("\n");
  const prompt = `You are a research assistant for a Vietnamese community website about the Pharos Network blockchain.

Find genuinely NEW Pharos Network news, developments, partnerships, ecosystem projects, mainnet/testnet updates, and network statistics published in roughly the last 14 days. Prioritise these official sources:
${SOURCES_TO_RESEARCH.map((s) => `- ${s}`).join("\n")}
You may also use reputable crypto news outlets, but every item MUST be backed by a real, working source URL.

We ALREADY have the following content, so DO NOT report these again (skip anything substantially overlapping):
${knownTitles}

For each new item, give:
- A short factual summary in English.
- The exact source URL.
- The publication date (YYYY-MM-DD) if known.
- Whether it is: news/announcement, an ecosystem partner/project, or an updated network statistic (TPS, total transactions, wallet count, TVL, funding, etc.).

If you find nothing new and verifiable, say exactly "NO NEW UPDATES". Do not invent anything.`;

  return geminiCall({
    contents: [{ role: "user", parts: [{ text: prompt }]}],
    // Google Search grounding. If a model variant rejects this tool name, switch
    // to { google_search_retrieval: {} } here.
    tools: [{ google_search: {} }],
  });
}

// Match a "nothing to report" sentinel as the WHOLE reply, tolerating markdown
// and trailing punctuation. The previous check ("contains the phrase" AND under
// 200 chars) mislabelled a verbose "nothing new, because ..." reply as a real
// find, which then logged news=found and structured to zero items.
function saysNothingNew(text, sentinel) {
  const normalized = String(text ?? "")
    .replace(/[`*_#>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!]+$/, "")
    .toUpperCase();
  return normalized === sentinel;
}

// Cap directory-discovered partners per run to keep PRs reviewable; the rest
// get picked up on the following weekly runs.
const MAX_NEW_PARTNERS_PER_RUN = 10;

async function researchEcosystemDirectory(existing) {
  const knownProjects = existing.ecosystem
    .map((e) => `- ${e.id} | ${e.name}`)
    .join("\n");
  const prompt = `You are a research assistant for a Vietnamese community website about the Pharos Network blockchain.

Check the OFFICIAL Pharos ecosystem sources for partners/projects that are listed there but MISSING from our directory. This is a directory diff, NOT a news search — there is no recency requirement; include projects regardless of when they were added. Sources to check, in priority order:
- https://www.pharos.xyz/ecosystem (the official ecosystem directory)
- https://docs.pharosnetwork.xyz
- https://www.pharos.xyz/resources and https://x.com/pharos_network (partner/integration announcements)

Our directory ALREADY contains the following projects. Skip them, including renames, sub-brands, and near-duplicates of the same project:
${knownProjects}

For each missing project, give:
- The project name.
- What it does and its role on Pharos (integration, partner, dApp, infrastructure, ...).
- A category hint (e.g. DeFi, RWA, Infrastructure, NFT, Gaming, Wallet, Oracle).
- The project's real official website URL (its own site — not a listing or aggregator page).

Report at most ${MAX_NEW_PARTNERS_PER_RUN} projects; prefer the most significant ones.
If everything in the sources is already covered, say exactly "NO NEW PARTNERS". Do not invent projects or URLs.`;

  return geminiCall({
    contents: [{ role: "user", parts: [{ text: prompt }]}],
    tools: [{ google_search: {} }],
  });
}

async function structureToJson(research, existing) {
  const existingNewsIds = existing.news.map((n) => n.id);
  const existingEcoIds = existing.ecosystem.map((e) => e.id);
  const existingEcoNames = existing.ecosystem.map((e) => e.name);
  const techKeys = Object.keys(existing.techSpecs || {});

  const prompt = `Convert the research notes below into STRICT JSON for a Vietnamese website. Respond with ONLY a JSON object, no prose, no markdown fences.

All human-readable text (title, summary, content, description, name, status, tags, techSpecs values) MUST be in natural Vietnamese, matching a concise, professional tone.

JSON shape:
{
  "news": [
    {
      "id": "kebab-case-unique-slug",
      "title": "Tiêu đề tiếng Việt",
      "category": one of ${JSON.stringify(NEWS_CATEGORIES)},
      "date": "YYYY-MM-DD",
      "summary": "Tóm tắt một câu",
      "content": "Một đoạn nội dung đầy đủ",
      "link": "https://real-source-url",
      "source": "e.g. Pharos Blog / Pharos Resources / Pharos Docs / Pharos Ecosystem"
    }
  ],
  "ecosystem": [
    {
      "id": "kebab-case-unique-slug",
      "name": "Tên dự án",
      "category": "vd: RWA / DeFi, Hạ tầng",
      "icon": "một emoji",
      "description": "Mô tả tiếng Việt",
      "tags": ["Tag1", "Tag2"],
      "website": "https://...",
      "status": "vd: Hoạt động, Tích hợp, Đối tác, Đang phát triển"
    }
  ],
  "techSpecs": { "<existingKey>": "Giá trị mới" },
  "sources": ["https://new-source-url"]
}

Rules:
- Only include items that are genuinely new and backed by a source URL from the research.
- Every "link"/"website"/"sources" URL MUST be the canonical article URL on the publisher's own site
  (e.g. pharos.xyz, the exchange, the news outlet). NEVER use a search-engine, vertexaisearch, or redirect URL.
- Do NOT reuse any of these existing news ids: ${JSON.stringify(existingNewsIds)}.
- Do NOT reuse any of these existing ecosystem ids: ${JSON.stringify(existingEcoIds)}.
- Do NOT add an ecosystem project that is the same as (or a rename/sub-brand of) any of these existing projects: ${JSON.stringify(existingEcoNames)}.
- techSpecs may ONLY use these existing keys (and only if the value genuinely changed): ${JSON.stringify(techKeys)}.
- If a section has nothing, use an empty array (or empty object for techSpecs).
- If there is nothing at all, return {"news":[],"ecosystem":[],"techSpecs":{},"sources":[]}.

Research notes:
"""
${research}
"""`;

  const raw = await geminiCall({
    contents: [{ role: "user", parts: [{ text: prompt }]}],
    generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
  });
  return parseJsonLoose(raw);
}

function parseJsonLoose(text) {
  let t = text.trim();
  // Strip ```json ... ``` fences if the model added them.
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // Fall back to the first {...} block.
  if (!t.startsWith("{")) {
    const brace = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (brace !== -1 && end !== -1) t = t.slice(brace, end + 1);
  }
  try {
    return JSON.parse(t);
  } catch (e) {
    fail(`Could not parse Gemini JSON: ${e.message}\n---\n${text.slice(0, 1000)}`);
  }
}

// --- URL resolution -----------------------------------------------------------
function nonEmptyStr(v) {
  return typeof v === "string" && v.trim().length > 0;
}
function isHttpUrl(v) {
  return nonEmptyStr(v) && /^https?:\/\//i.test(v.trim());
}

const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; pharos-vietnam-content-bot/1.0; +https://github.com/sqrDAO/pharos-vietnam)";

// Statuses that mean "this page exists but refuses an automated request".
// Bot protection is common on crypto sites, so these are NOT proof of a bad link.
const BOT_BLOCK_STATUS = new Set([401, 403, 405, 406, 429]);

async function fetchFollow(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": USER_AGENT },
    });
  } finally {
    clearTimeout(timer);
  }
}

// Gemini grounding citations come back as temporary redirect links that expire
// and don't point at the real publisher. Detect and resolve them to the final URL.
function isGroundingRedirect(url) {
  return /vertexaisearch\.cloud\.google\.com\/grounding-api-redirect\//i.test(url || "");
}

async function resolveRedirect(url) {
  if (!isHttpUrl(url)) return null;
  if (!isGroundingRedirect(url)) return url.trim();
  try {
    const res = await fetchFollow(url);
    const final = res.url || url;
    // If it still points at the redirect host, treat as unresolved.
    return isGroundingRedirect(final) ? null : final;
  } catch {
    return null;
  }
}

// Parsing as an http(s) URL is not evidence the page exists: Gemini regularly
// emits a plausible-but-wrong domain for a real project. Fetch each link and
// drop the clearly-dead ones so the item fails validation instead of shipping.
// This cannot catch a live domain that simply isn't the project's (a human
// still reviews the PR) — it only removes links that resolve to nothing.
async function isReachable(url) {
  try {
    const res = await fetchFollow(url);
    if (res.status < 400) return true;
    if (BOT_BLOCK_STATUS.has(res.status)) {
      console.warn(`[unverified url] ${url} — HTTP ${res.status} (bot protection?), keeping`);
      return true;
    }
    console.warn(`[dead url] ${url} — HTTP ${res.status}`);
    return false;
  } catch (e) {
    const why = e?.name === "AbortError" ? "timeout" : e?.message || String(e);
    console.warn(`[dead url] ${url} — ${why}`);
    return false;
  }
}

async function resolveAndVerify(url) {
  const resolved = await resolveRedirect(url);
  if (!resolved) return null;
  return (await isReachable(resolved)) ? resolved : null;
}

// Resolve every outward link in the payload to a real source URL and verify it
// actually loads, dropping any that can't be resolved or reached (those items
// then fail validation and are skipped).
async function resolveLinks(payload) {
  for (const n of payload.news ?? []) {
    if (nonEmptyStr(n.link)) n.link = (await resolveAndVerify(n.link)) || "";
  }
  for (const e of payload.ecosystem ?? []) {
    if (nonEmptyStr(e.website)) e.website = (await resolveAndVerify(e.website)) || "";
  }
  if (Array.isArray(payload.sources)) {
    const out = [];
    for (const s of payload.sources) {
      const r = await resolveAndVerify(s);
      if (r && !isGroundingRedirect(r)) out.push(r);
    }
    payload.sources = out;
  }
}

// --- Validation ---------------------------------------------------------------

function validate(payload, existing) {
  const existingNewsIds = new Set(existing.news.map((n) => n.id));
  const existingEcoIds = new Set(existing.ecosystem.map((e) => e.id));
  const techKeys = new Set(Object.keys(existing.techSpecs || {}));

  const seenNews = new Set();
  const news = (Array.isArray(payload.news) ? payload.news : []).filter((n) => {
    const ok =
      n &&
      nonEmptyStr(n.id) &&
      /^[a-z0-9-]+$/.test(n.id) &&
      !existingNewsIds.has(n.id) &&
      !seenNews.has(n.id) &&
      nonEmptyStr(n.title) &&
      NEWS_CATEGORIES.includes(n.category) &&
      DATE_RE.test(n.date) &&
      nonEmptyStr(n.summary) &&
      nonEmptyStr(n.content) &&
      isHttpUrl(n.link) &&
      !isGroundingRedirect(n.link) &&
      nonEmptyStr(n.source);
    if (ok) seenNews.add(n.id);
    else console.warn(`[skip news] ${n?.id ?? "(no id)"} — failed validation`);
    return ok;
  });

  const seenEco = new Set();
  const ecosystem = (Array.isArray(payload.ecosystem) ? payload.ecosystem : []).filter((e) => {
    const ok =
      e &&
      nonEmptyStr(e.id) &&
      /^[a-z0-9-]+$/.test(e.id) &&
      !existingEcoIds.has(e.id) &&
      !seenEco.has(e.id) &&
      nonEmptyStr(e.name) &&
      nonEmptyStr(e.category) &&
      nonEmptyStr(e.icon) &&
      nonEmptyStr(e.description) &&
      Array.isArray(e.tags) &&
      e.tags.every(nonEmptyStr) &&
      isHttpUrl(e.website) &&
      !isGroundingRedirect(e.website) &&
      nonEmptyStr(e.status);
    if (ok) seenEco.add(e.id);
    else console.warn(`[skip ecosystem] ${e?.id ?? "(no id)"} — failed validation`);
    return ok;
  });
  if (ecosystem.length > MAX_NEW_PARTNERS_PER_RUN) {
    console.warn(`[cap ecosystem] ${ecosystem.length} new projects, keeping first ${MAX_NEW_PARTNERS_PER_RUN}; the rest will be picked up next run`);
    ecosystem.length = MAX_NEW_PARTNERS_PER_RUN;
  }

  const techSpecs = {};
  const incomingTech = payload.techSpecs && typeof payload.techSpecs === "object" ? payload.techSpecs : {};
  for (const [k, v] of Object.entries(incomingTech)) {
    if (techKeys.has(k) && nonEmptyStr(v) && v.trim() !== existing.techSpecs[k]) {
      techSpecs[k] = v.trim();
    }
  }

  const existingSources = new Set(existing.meta?.sources ?? []);
  const sources = (Array.isArray(payload.sources) ? payload.sources : [])
    .filter((s) => isHttpUrl(s) && !existingSources.has(s.trim()))
    .map((s) => s.trim());

  return { news, ecosystem, techSpecs, sources: [...new Set(sources)] };
}

// --- Rendering JS literals ----------------------------------------------------
function jsStr(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

function renderNewsItem(n) {
  return (
    `    {\n` +
    `      id: ${jsStr(n.id)},\n` +
    `      title: ${jsStr(n.title)},\n` +
    `      category: ${jsStr(n.category)},\n` +
    `      date: ${jsStr(n.date)},\n` +
    `      summary: ${jsStr(n.summary)},\n` +
    `      content: ${jsStr(n.content)},\n` +
    `      link: ${jsStr(n.link)},\n` +
    `      source: ${jsStr(n.source)}\n` +
    `    },\n`
  );
}

function renderEcoItem(e) {
  const tags = `[${e.tags.map(jsStr).join(", ")}]`;
  return (
    `    {\n` +
    `      id: ${jsStr(e.id)},\n` +
    `      name: ${jsStr(e.name)},\n` +
    `      category: ${jsStr(e.category)},\n` +
    `      icon: ${jsStr(e.icon)},\n` +
    `      description: ${jsStr(e.description)},\n` +
    `      tags: ${tags},\n` +
    `      website: ${jsStr(e.website)},\n` +
    `      status: ${jsStr(e.status)}\n` +
    `    },\n`
  );
}

// --- Apply edits to data.js (append-only, low risk) ---------------------------
function bumpPatch(version) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version || "");
  if (!m) return null;
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}

function insertAfter(text, anchor, insertion, label) {
  const idx = text.indexOf(anchor);
  if (idx === -1) fail(`Anchor not found in data.js: ${label}`);
  const at = idx + anchor.length;
  return text.slice(0, at) + insertion + text.slice(at);
}

function applyEdits(text, changes, current) {
  let out = text;

  // News: prepend (newest first) right after the array opener.
  if (changes.news.length) {
    const block = changes.news.map(renderNewsItem).join("");
    out = insertAfter(out, "news: [\n", block, "news: [");
  }

  // Ecosystem: prepend after the array opener (order isn't significant).
  if (changes.ecosystem.length) {
    const block = changes.ecosystem.map(renderEcoItem).join("");
    out = insertAfter(out, "ecosystem: [\n", block, "ecosystem: [");
  }

  // New sources: prepend into meta.sources.
  if (changes.sources.length) {
    const block = changes.sources.map((s) => `      ${jsStr(s)},\n`).join("");
    out = insertAfter(out, "sources: [\n", block, "sources: [");
  }

  // techSpecs: replace existing values in place, scoped to the techSpecs block.
  if (Object.keys(changes.techSpecs).length) {
    const start = out.indexOf("techSpecs: {");
    const end = out.indexOf("}", start);
    if (start === -1 || end === -1) fail("techSpecs block not found");
    let block = out.slice(start, end);
    for (const [k, v] of Object.entries(changes.techSpecs)) {
      const re = new RegExp(`(${k}:\\s*)"(?:[^"\\\\]|\\\\.)*"`);
      if (re.test(block)) block = block.replace(re, `$1${jsStr(v)}`);
    }
    out = out.slice(0, start) + block + out.slice(end);
  }

  // meta.version bump + lastUpdated, always when there is any change.
  const newVersion = bumpPatch(current.meta?.version) || current.meta?.version;
  out = out.replace(/(version:\s*)"[^"]*"/, `$1${jsStr(newVersion)}`);
  out = out.replace(/(lastUpdated:\s*)"[^"]*"/, `$1${jsStr(today())}`);

  return { out, newVersion };
}

// --- PR body ------------------------------------------------------------------
function buildPrBody(changes, newVersion) {
  const lines = [
    "## Cập nhật nội dung Pharos hàng tuần",
    "",
    `Tự động tạo bởi Gemini (\`${GEMINI_MODEL}\`) qua GitHub Actions.`,
    `Phiên bản nội dung: \`${newVersion}\` · Ngày: \`${today()}\``,
    "",
  ];
  if (changes.news.length) {
    lines.push(`### 📰 Tin tức mới (${changes.news.length})`);
    for (const n of changes.news) lines.push(`- **${n.title}** (${n.date}, ${n.category}) — ${n.link}`);
    lines.push("");
  }
  if (changes.ecosystem.length) {
    lines.push(`### 🧩 Dự án hệ sinh thái mới (${changes.ecosystem.length})`);
    for (const e of changes.ecosystem) lines.push(`- **${e.name}** (${e.category}) — ${e.website}`);
    lines.push("", "_Mục mới dùng icon emoji; có thể thay bằng logo trong `public/images/partners/` sau khi merge._", "");
  }
  if (Object.keys(changes.techSpecs).length) {
    lines.push("### ⚙️ Cập nhật thông số kỹ thuật");
    for (const [k, v] of Object.entries(changes.techSpecs)) lines.push(`- \`${k}\` → ${v}`);
    lines.push("");
  }
  if (changes.sources.length) {
    lines.push("### 🔗 Nguồn mới");
    for (const s of changes.sources) lines.push(`- ${s}`);
    lines.push("");
  }
  lines.push(
    "---",
    "_Vui lòng kiểm tra tính chính xác và nguồn của từng mục trước khi merge._",
  );
  return lines.join("\n");
}

// --- Main ---------------------------------------------------------------------
async function main() {
  if (!GEMINI_API_KEY) fail("GEMINI_API_KEY is not set");

  const text = readFileSync(DATA_FILE, "utf8");
  const current = loadCurrentData(text);

  console.log(`[update-pharos-content] model=${GEMINI_MODEL}, existing news=${current.news.length}, ecosystem=${current.ecosystem.length}`);

  const [newsResearch, ecoResearch] = await Promise.all([
    researchLatestNews(current),
    researchEcosystemDirectory(current),
  ]);

  const hasNews = !saysNothingNew(newsResearch, "NO NEW UPDATES");
  const hasPartners = !saysNothingNew(ecoResearch, "NO NEW PARTNERS");
  console.log(`[update-pharos-content] research: news=${hasNews ? "found" : "none"}, ecosystem partners=${hasPartners ? "found" : "none"}`);

  if (!hasNews && !hasPartners) {
    console.log("[update-pharos-content] Gemini reported no new updates or partners.");
    return finishNoChanges();
  }

  const research = [
    hasNews ? `## Latest news\n\n${newsResearch}` : "",
    hasPartners ? `## Ecosystem directory — projects missing from our site\n\n${ecoResearch}` : "",
  ].filter(Boolean).join("\n\n");

  const payload = await structureToJson(research, current);
  await resolveLinks(payload); // turn Gemini grounding redirects into real source URLs
  const changes = validate(payload, current);

  const total =
    changes.news.length +
    changes.ecosystem.length +
    Object.keys(changes.techSpecs).length;

  if (total === 0) {
    console.log("[update-pharos-content] No valid new content after validation.");
    return finishNoChanges();
  }

  const { out, newVersion } = applyEdits(text, changes, current);

  // Sanity: the edited file must still evaluate to a valid PharosData object.
  loadCurrentData(out);

  writeFileSync(DATA_FILE, out, "utf8");
  writeFileSync(PR_BODY_FILE, buildPrBody(changes, newVersion), "utf8");
  writeFileSync(HAS_CHANGES_FILE, "true\n", "utf8");

  console.log(
    `[update-pharos-content] Applied: news=${changes.news.length}, ecosystem=${changes.ecosystem.length}, techSpecs=${Object.keys(changes.techSpecs).length}, sources=${changes.sources.length}. version -> ${newVersion}`,
  );
}

function finishNoChanges() {
  writeFileSync(HAS_CHANGES_FILE, "false\n", "utf8");
  writeFileSync(PR_BODY_FILE, "No new Pharos content this week.\n", "utf8");
}

main().catch((e) => fail(e?.stack || String(e)));
