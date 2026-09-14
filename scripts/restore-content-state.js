// Artifact fallback for evicted weekly caches. Only consume our own branch's state.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** Search all artifact pages newest first, skipping missing or malformed state. */
export function recoverState(pages, branch, runId, extract, log = console.log) {
  const artifacts = pages.flatMap(page => page.artifacts);
  const matches = artifacts.filter(a => !a.expired && a.name.startsWith('content-research-') &&
    a.workflow_run?.head_branch === branch && String(a.workflow_run?.id) !== runId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  for (const artifact of matches) {
    try {
      const raw = extract(artifact.id);
      const state = JSON.parse(raw);
      if (!Array.isArray(state.pending)) throw new Error('Invalid retained candidate state');
      log(`Restored content state from artifact ${artifact.id}`);
      return raw;
    } catch (error) {
      log(`Artifact ${artifact.id} has no usable state: ${error.message}`);
    }
  }
  log('No retained state; starting with the configured backfill window.');
  return null;
}

/** Restore the newest usable state without overwriting a successful cache restore. */
function main() {
  if (existsSync('.content-state/state.json')) return;
  const pages = JSON.parse(readFileSync('/tmp/content-artifacts.json', 'utf8'));
  const raw = recoverState(pages, process.env.GITHUB_REF_NAME, process.env.GITHUB_RUN_ID, id => {
    const archive = execFileSync('gh', ['api', `repos/${process.env.GITHUB_REPOSITORY}/actions/artifacts/${id}/zip`], { maxBuffer: 50 * 1024 * 1024 });
    writeFileSync('/tmp/content-state.zip', archive);
    return execFileSync('unzip', ['-p', '/tmp/content-state.zip', '.content-state/state.json'], { encoding: 'utf8' });
  });
  if (raw !== null) {
    mkdirSync('.content-state', { recursive: true });
    writeFileSync('.content-state/state.json', raw);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
