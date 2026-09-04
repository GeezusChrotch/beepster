import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenClawApprovalClient, openClawHelpers } from '../src/openclaw-client.js';

test('approval client rechecks the exact pending id before resolving', async () => {
  const calls = [];
  const bridge = {
    status: () => ({state:'paired'}),
    request: async (method, params) => {
      calls.push({method,params});
      if (method === 'exec.approval.list') return [{id:'exact-1',approvalKind:'exec',request:{command:'echo safe'}}];
      if (method === 'plugin.approval.list') return [];
      if (method === 'exec.approval.resolve') return {ok:true};
    },
    stop: () => {}
  };
  const client = createOpenClawApprovalClient({bridge});
  await assert.rejects(() => client.resolveApproval('wrong-id', 'allow-once'), /no longer pending/);
  await client.resolveApproval('exact-1', 'allow-once');
  assert.deepEqual(calls.at(-1), {method:'exec.approval.resolve',params:{id:'exact-1',decision:'allow-once'}});
});

test('approval client never permits standing grants', async () => {
  const client = createOpenClawApprovalClient({bridge:{status:()=>({state:'paired'}),request:async()=>({approvals:[]}),stop:()=>{}}});
  await assert.rejects(() => client.resolveApproval('exact-1', 'allow-always'), /Only allow-once or deny/);
});

test('approval summaries remove markdown and do not expose unmodeled fields', () => {
  const summary = openClawHelpers.approvalSummary({id:'1',kind:'exec',command:'**Run** `tool`',secret:'do-not-copy'});
  assert.equal(summary, 'exec\n\nRun tool');
  assert.doesNotMatch(summary, /do-not-copy/);
});

test('plugin approvals use their matching resolver rather than the exec resolver', async () => {
  const calls = [];
  const bridge = {status:()=>({state:'paired'}),stop:()=>{},request:async (method, params) => {
    calls.push({method,params});
    if (method === 'exec.approval.list') return [];
    if (method === 'plugin.approval.list') return [{id:'plugin-1',approvalKind:'plugin',request:{title:'Install integration'}}];
    return {ok:true};
  }};
  const client = createOpenClawApprovalClient({bridge});
  await client.resolveApproval('plugin-1', 'deny');
  assert.deepEqual(calls.at(-1), {method:'plugin.approval.resolve',params:{id:'plugin-1',decision:'deny'}});
});
