import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Lancer AI Production API Integration', () => {
  it('serves landing, portfolio, real workspace, dashboard, and A2A manifest with HTTP 200', async () => {
    const routes = [
      '/',
      '/workspace',
      '/dashboard',
      '/dashboard/contract/ESC-8842',
      '/.well-known/agent.json',
      '/api/agent/capabilities',
      '/api/contracts',
      '/api/system/health',
    ];
    for (const route of routes) {
      const res = await fetch(`${BASE}${route}`);
      assert.equal(res.status, 200, `Expected 200 for ${route}, got ${res.status}`);
    }
  });

  it('rejects invalid authorization and capture amounts with 400', async () => {
    const authRes = await fetch(`${BASE}/api/paypal/create-authorization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: -100 }),
    });
    assert.equal(authRes.status, 400);

    const capRes = await fetch(`${BASE}/api/paypal/capture-and-payout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 0 }),
    });
    assert.equal(capRes.status, 400);
  });

  it('validates split ratios summing to 100% and resets cleanly', async () => {
    const contractData = await (await fetch(`${BASE}/api/contracts/ESC-8842`)).json();
    const invalidContract = structuredClone(contractData.contract);
    invalidContract.milestones[1].splitRatios = [
      { recipientName: 'Dev', recipientEmail: 'dev@example.com', role: 'Dev', percentage: 50, amount: 750 },
      { recipientName: 'UI', recipientEmail: 'ui@example.com', role: 'UI', percentage: 20, amount: 300 },
    ];

    const invalidRes = await fetch(`${BASE}/api/contracts/ESC-8842`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract: invalidContract }),
    });
    assert.equal(invalidRes.status, 400);

    const resetRes = await fetch(`${BASE}/api/contracts/ESC-8842`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });
    assert.equal(resetRes.status, 200);
    const resetBody = await resetRes.json();
    assert.equal(resetBody.success, true);
  });

  it('processes PayPal CUSTOMER.DISPUTE.CREATED webhook via Dispute Shield', async () => {
    const res = await fetch(`${BASE}/api/webhooks/paypal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'CUSTOMER.DISPUTE.CREATED',
        contractId: 'ESC-8842',
        resource: { dispute_id: 'PP-D-TEST01', dispute_amount: { value: '500.00' } },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.received, true);
    assert.equal(body.disputeEvidenceSubmitted, true);

    // Clean reset after test
    await fetch(`${BASE}/api/contracts/ESC-8842`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });
  });

  it('creates real-mode contract with custom squadSplits, rejects invalid splits, and guards authorization lookup', async () => {
    const invalidRes = await fetch(`${BASE}/api/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'real',
        title: 'Invalid Split Contract',
        squadSplits: [
          { recipientName: 'Alice', recipientEmail: 'alice@example.com', role: 'Dev', percentage: 60 },
        ],
        milestones: [{ title: 'M1', amount: 1000 }],
      }),
    });
    assert.equal(invalidRes.status, 400);

    const createRes = await fetch(`${BASE}/api/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'real',
        id: 'ESC-REALTEST',
        title: 'Real Workspace Integration Test',
        currency: 'EUR',
        clientName: 'Test Client',
        clientEmail: 'client@test.example',
        freelancerName: 'Real Squad',
        freelancerEmail: 'lead@test.example',
        squadSplits: [
          { recipientName: 'Alice', recipientEmail: 'alice@test.example', role: 'Lead', percentage: 65 },
          { recipientName: 'Bob', recipientEmail: 'bob@test.example', role: 'UI', percentage: 35 },
        ],
        milestones: [
          {
            title: 'Phase 1',
            amount: 1000,
            acceptanceCriteria: ['Builds cleanly', 'Passes unit tests'],
          },
        ],
      }),
    });
    assert.equal(createRes.status, 200);
    const createdBody = await createRes.json();
    assert.equal(createdBody.success, true);
    assert.equal(createdBody.contract.status, 'draft');
    assert.equal(createdBody.contract.currency, 'EUR');
    assert.equal(createdBody.contract.authorizationId, '');
    assert.equal(createdBody.contract.milestones[0].splitRatios[0].recipientEmail, 'alice@test.example');
    assert.equal(createdBody.contract.milestones[0].splitRatios[0].amount, 650);

    const authCheckRes = await fetch(`${BASE}/api/paypal/authorization/AUTH-INVALID`);
    assert.equal(authCheckRes.status, 400);
    const authCheckBody = await authCheckRes.json();
    assert.equal(authCheckBody.success, false);
    assert.equal(authCheckBody.simulated, true);

    const deleteRes = await fetch(`${BASE}/api/contracts/ESC-REALTEST`, {
      method: 'DELETE',
    });
    assert.equal(deleteRes.status, 200);
    const deleteBody = await deleteRes.json();
    assert.equal(deleteBody.success, true);

    const missingAfterDelete = await fetch(`${BASE}/api/contracts/ESC-REALTEST`);
    assert.equal(missingAfterDelete.status, 404);
  });

  it('enforces liveness probe, 404 for unknown contracts, screenshot MIME safety, and double-capture protection', async () => {
    const quickHealth = await fetch(`${BASE}/api/system/health?quick=1`);
    assert.equal(quickHealth.status, 200);
    const quickBody = await quickHealth.json();
    assert.equal(quickBody.status, 'ok');

    const missingRes = await fetch(`${BASE}/api/contracts/ESC-DOES-NOT-EXIST-999`);
    assert.equal(missingRes.status, 404);

    const badImgRes = await fetch(`${BASE}/api/agent/verify-milestone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractId: 'ESC-8842',
        milestoneId: 'm2',
        submissionEvidence: {
          screenshotBase64: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
        },
      }),
    });
    assert.equal(badImgRes.status, 400);

    // m1 in ESC-8842 is already disbursed in seed data -> must block duplicate capture (409)
    const dupCaptureRes = await fetch(`${BASE}/api/paypal/capture-and-payout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractId: 'ESC-8842',
        milestoneId: 'm1',
        amount: 1000,
        simulate: true,
      }),
    });
    assert.equal(dupCaptureRes.status, 409);
  });
});

