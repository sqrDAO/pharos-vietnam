// Artifact fallback for evicted weekly caches. Only consume our own branch's state.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

if (!existsSync('.content-state/state.json')) {
  const { artifacts } = JSON.parse(readFileSync('/tmp/content-artifacts.json', 'utf8'));
  const previous = artifacts.find(a => !a.expired && a.name.startsWith('content-research-') &&
    a.workflow_run?.head_branch === process.env.GITHUB_REF_NAME &&
    String(a.workflow_run?.id) !== process.env.GITHUB_RUN_ID);
  if (previous) {
    const archive = execFileSync('gh', ['api', `repos/${process.env.GITHUB_REPOSITORY}/actions/artifacts/${previous.id}/zip`], { maxBuffer: 50 * 1024 * 1024 });
    writeFileSync('/tmp/content-state.zip', archive);
    const raw = execFileSync('unzip', ['-p', '/tmp/content-state.zip', '.content-state/state.json'], { encoding: 'utf8' });
    const state = JSON.parse(raw);
    if (!Array.isArray(state.pending)) throw new Error('Invalid retained candidate state');
    mkdirSync('.content-state', { recursive: true });
    writeFileSync('.content-state/state.json', raw);
    console.log(`Restored content state from artifact ${previous.id}`);
  } else console.log('No retained state; starting with the configured backfill window.');
}
