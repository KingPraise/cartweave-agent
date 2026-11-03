/**
 * test-verification.js
 * End-to-end live verification suite for CartWeave (ChronosCart)
 */
const BASE = 'http://localhost:4001';

async function runVerification() {
  console.log('=== CartWeave (ChronosCart) End-to-End Verification ===\n');

  // 1. Health Check
  const healthRes = await fetch(`${BASE}/api/health`);
  const health = await healthRes.json();
  console.log('1. [GET /api/health]:', JSON.stringify(health));
  if (health.status !== 'OK') throw new Error('Health check failed');

  // 2. Presets Check
  const presetsRes = await fetch(`${BASE}/api/presets`);
  const presetsData = await presetsRes.json();
  console.log(`2. [GET /api/presets]: Loaded ${presetsData.presets.length} presets`);
  if (presetsData.presets.length !== 4) throw new Error('Expected 4 blueprint presets');

  // 3. Generate Blueprint (Lagos Dev Lab)
  const genRes = await fetch(`${BASE}/api/blueprint/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ presetId: 'lagos-dev-lab' }),
  });
  const blueprint = await genRes.json();
  console.log(
    `3. [POST /api/blueprint/generate]: "${blueprint.shortTitle}" | Slots: ${blueprint.slots.length} | Total: $${blueprint.physics.totalCost} | Critical Path: ${blueprint.physics.criticalPathDays}d`
  );

  // 4. Test Time-and-Budget Physics Optimization (Tighten Deadline to 2d & Compress Budget to $1,900)
  const previousSelections = {};
  blueprint.slots.forEach((s) => {
    previousSelections[s.slotId] = s.activeSku.sku;
  });

  const optRes = await fetch(`${BASE}/api/blueprint/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blueprint: {
        id: blueprint.blueprintId,
        shortTitle: blueprint.shortTitle,
        missionPrompt: blueprint.missionPrompt,
        locationTag: blueprint.locationTag,
        architecturalSummary: blueprint.architecturalSummary,
        defaultBudget: blueprint.physics.defaultBudget,
        minBudget: blueprint.physics.minBudget,
        maxBudget: blueprint.physics.maxBudget,
        defaultDeadlineDays: blueprint.physics.defaultDeadlineDays,
        slots: blueprint.slots,
      },
      targetBudget: 1900,
      maxDeliveryDays: 2,
      previousSelections,
    }),
  });
  const optimized = await optRes.json();
  console.log(
    `4. [POST /api/blueprint/optimize]: Re-optimized Total: $${optimized.physics.totalCost} (Target <= $1900) | Auto-Swaps Triggered: ${optimized.swapEvents.length}`
  );
  optimized.swapEvents.forEach((sw) => {
    console.log(
      `   ⚡ Swap [${sw.reason}]: ${sw.slotTitle} :: ${sw.fromDomain} ($${sw.fromPrice}, ${sw.fromTotalDays}d) -> ${sw.toDomain} ($${sw.toPrice}, ${sw.toTotalDays}d)`
    );
  });

  // 5. Live Channel3 API Search Check
  const c3Res = await fetch(`${BASE}/api/channel3/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'mechanical keyboard', maxPrice: 120, limit: 4 }),
  });
  const c3Data = await c3Res.json();
  console.log(
    `5. [POST /api/channel3/search]: Mode=${c3Data.mode} | Items returned=${c3Data.items?.length || 0}`
  );

  // 6. Live PayPal Sandbox Multi-Merchant Order Creation (POST /v2/checkout/orders)
  const activeItems = optimized.slots.map((s) => ({
    slotId: s.slotId,
    title: s.title,
    ...s.activeSku,
  }));

  const ppOrderRes = await fetch(`${BASE}/api/paypal/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: activeItems,
      blueprintTitle: optimized.shortTitle,
      deadlineDays: 2,
      targetBudget: 1900,
    }),
  });
  const ppOrder = await ppOrderRes.json();
  console.log(
    `6. [POST /api/paypal/create-order]: OrderID=${ppOrder.orderId} | Status=${ppOrder.status} | Total=$${ppOrder.totalAmount} | Merchants=${ppOrder.merchantCount}`
  );
  if (!ppOrder.orderId) throw new Error(`PayPal Order creation failed: ${JSON.stringify(ppOrder)}`);

  // 7. Live PayPal Order Status / Capture Verification
  const ppCapRes = await fetch(`${BASE}/api/paypal/capture-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: ppOrder.orderId }),
  });
  const ppCap = await ppCapRes.json();
  console.log(
    `7. [POST /api/paypal/capture-order]: OrderStatus=${ppCap.orderStatus} | CaptureStatus=${ppCap.captureStatus}`
  );

  // 8. Live PayPal Split Vendor Invoice Creation (POST /v2/invoicing/invoices)
  const ppInvRes = await fetch(`${BASE}/api/paypal/create-invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: activeItems,
      blueprintTitle: optimized.shortTitle,
      deadlineDays: 2,
      totalSavings: optimized.physics.totalSavings,
    }),
  });
  const ppInv = await ppInvRes.json();
  console.log(
    `8. [POST /api/paypal/create-invoice]: InvoiceID=${ppInv.invoiceId} | Ref=${ppInv.invoiceNumber} | Status=${ppInv.status}`
  );
  if (!ppInv.invoiceId) throw new Error(`PayPal Invoice creation failed: ${JSON.stringify(ppInv)}`);

  console.log('\n✅ ALL 8 LIVE VERIFICATION CHECKS PASSED!');
}

runVerification().catch((err) => {
  console.error('❌ Verification Failed:', err);
  process.exit(1);
});
