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

test('OpenClaw system approvals are listed and use the unified exact resolver', async () => {
  const calls = [];
  const bridge = {status:()=>({state:'paired'}),stop:()=>{},request:async (method, params) => {
    calls.push({method,params});
    if (method === 'openclaw.approval.list') return [{
      id:'system-1', kind:'system-agent', summary:'Change a protected setting', createdAtMs:123, expiresAtMs:456
    }];
    return [];
  }};
  const client = createOpenClawApprovalClient({bridge});
  assert.deepEqual(await client.listApprovals(), [{
    id:'system-1', kind:'system-agent', summary:'system-agent\n\nChange a protected setting', createdAt:123, expiresAt:456
  }]);
  await client.resolveApproval('system-1', 'allow-once');
  assert.deepEqual(calls.at(-1), {
    method:'approval.resolve', params:{id:'system-1',kind:'system-agent',decision:'allow-once'}
  });
});
