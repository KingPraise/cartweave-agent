/**
 * server.js
 * CartWeave (ChronosCart) Express API Server (Port 4001)
 *
 * Powers:
 *  1. Goal & Visual Blueprint Decomposition (Gemini 3 Flash + 4 Instant Presets)
 *  2. Live Multi-Retailer SKU Arbitrage (Channel3 API POST /v1/search)
 *  3. Time-and-Budget Physics Engine & Bryntum Scheduler Pro Data Model
 *  4. Unified PayPal Multi-Merchant Cart & Split Invoice Settlement (Orders v2 + Invoicing v2)
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const channel3Service = require('./services/channel3Service');
const {
  BLUEPRINT_PRESETS,
  buildHydratedBlueprint,
  optimizeBomPhysics,
  getLLMClient,
} = require('./services/bomEngine');
const {
  createMultiMerchantOrder,
  captureMultiMerchantOrder,
  createMultiMerchantInvoice,
} = require('./services/paypalService');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Health & Live API Telemetry
app.get('/api/health', (req, res) => {
  const llm = getLLMClient();
  res.json({
    service: 'CartWeave (ChronosCart) Spatial & Timeline Procurement Engine',
    status: 'OK',
    llmProvider: llm ? llm.provider : 'deterministic',
    llmModel: llm ? llm.model : 'deterministic-blueprint',
    channel3Live: channel3Service.hasLiveApi(),
    paypalSandbox: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    paypalEnvironment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
  });
});

// List the 4 Instant Blueprint Presets
app.get('/api/presets', (req, res) => {
  const presets = Object.values(BLUEPRINT_PRESETS).map((p) => ({
    id: p.id,
    label: p.label,
    shortTitle: p.shortTitle,
    missionPrompt: p.missionPrompt,
    defaultBudget: p.defaultBudget,
    minBudget: p.minBudget,
    maxBudget: p.maxBudget,
    defaultDeadlineDays: p.defaultDeadlineDays,
    locationTag: p.locationTag,
    slotCount: p.slots.length,
  }));
  res.json({ presets });
});

// Generate or Load a Blueprint (Preset or Custom Gemini 3 Flash Mission)
app.post('/api/blueprint/generate', async (req, res) => {
  try {
    const { presetId, prompt, targetBudget, maxDeliveryDays } = req.body || {};
    const result = await buildHydratedBlueprint({
      presetId,
      prompt,
      targetBudget,
      maxDeliveryDays,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real-Time "Time-and-Budget Physics" Re-Optimization (Deadline Slider, Budget Dial, or Manual SKU Lock)
app.post('/api/blueprint/optimize', (req, res) => {
  try {
    const {
      blueprint,
      targetBudget,
      maxDeliveryDays,
      lockedSkus,
      previousSelections,
    } = req.body || {};

    if (!blueprint || !Array.isArray(blueprint.slots)) {
      return res.status(400).json({ error: 'Valid blueprint object with slots[] is required' });
    }

    const optimized = optimizeBomPhysics(blueprint, {
      targetBudget,
      maxDeliveryDays,
      lockedSkus,
      previousSelections,
    });
    res.json(optimized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live Channel3 Search for Any Slot or Custom Query
app.post('/api/channel3/search', async (req, res) => {
  try {
    const { query, maxPrice, limit } = req.body || {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query (string) is required' });
    }
    const result = await channel3Service.queryLiveChannel3(query, maxPrice, limit || 6);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PayPal Workflow 1: Multi-Merchant Itemized Order Creation (POST /v2/checkout/orders)
app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { items, blueprintTitle, deadlineDays, targetBudget } = req.body || {};
    const order = await createMultiMerchantOrder({
      items,
      blueprintTitle,
      deadlineDays,
      targetBudget,
    });
    res.json(order);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// PayPal Workflow 2: Verify & Capture Order (POST /v2/checkout/orders/:id/capture)
app.post('/api/paypal/capture-order', async (req, res) => {
  try {
    const { orderId } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }
    const result = await captureMultiMerchantOrder(orderId);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// PayPal Workflow 3: Split Vendor Bill / Invoice Generation (POST /v2/invoicing/invoices)
app.post('/api/paypal/create-invoice', async (req, res) => {
  try {
    const { items, blueprintTitle, deadlineDays, totalSavings, recipientEmail } = req.body || {};
    const invoice = await createMultiMerchantInvoice({
      items,
      blueprintTitle,
      deadlineDays,
      totalSavings,
      recipientEmail,
    });
    res.json(invoice);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Serve compiled frontend (client/dist) in production
const clientDist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

const PORT = process.env.PORT || 4001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`⚡ CartWeave (ChronosCart) Engine listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
