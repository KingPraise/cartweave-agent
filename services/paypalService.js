/**
 * paypalService.js
 * Unified PayPal Multi-Merchant Cart & Split Invoice Settlement Orchestrator
 *
 * Implements:
 *  1. PayPal Sandbox OAuth2 Token Exchange (POST /v1/oauth2/token)
 *  2. Multi-Merchant Itemized Order Creation (POST /v2/checkout/orders) with
 *     purchase_units[0].items representing every Channel3 merchant SKU,
 *     NO_SHIPPING clean checkout, and SHA-256 bundle hash in custom_id.
 *  3. Live Order Verification & Capture (GET + POST /v2/checkout/orders/:id/capture)
 *  4. Multi-Merchant Split Vendor Invoice Generation (POST /v2/invoicing/invoices)
 */
const crypto = require('crypto');

const PAYPAL_BASE =
  process.env.PAYPAL_ENVIRONMENT === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

function computeBundleHash(items = [], meta = {}) {
  const canonical = JSON.stringify({
    blueprintId: meta.blueprintId || 'cartweave',
    deadlineDays: meta.deadlineDays || 5,
    items: items.map((i) => ({
      sku: i.sku,
      domain: i.domain,
      price: Number(i.price).toFixed(2),
    })),
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

async function getPayPalToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in .env');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal OAuth2 failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

/**
 * Creates a live PayPal Sandbox Order v2 (POST /v2/checkout/orders) containing
 * itemized purchase_units[0].items for each Channel3 merchant in the BOM.
 */
async function createMultiMerchantOrder({ items = [], blueprintTitle = 'CartWeave Studio Bundle', deadlineDays = 5, targetBudget = 1600 }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one BOM item is required to create a PayPal Order');
  }

  const token = await getPayPalToken();
  const bundleHash = computeBundleHash(items, { blueprintId: blueprintTitle, deadlineDays });

  const normalizedItems = items.map((item, idx) => {
    const unitPrice = Number(item.price || 0).toFixed(2);
    const domainTag = item.domain || 'channel3-merchant';
    const cleanName = `[${domainTag}] ${item.name || item.title || `Slot ${idx + 1}`}`.slice(0, 120);
    const cleanDesc = `SKU: ${item.sku || 'C3'} | Ship SLA: ${item.shippingDays || 2}d (${item.shippingTier || 'Priority'})`.slice(0, 120);

    return {
      name: cleanName,
      description: cleanDesc,
      sku: String(item.sku || `C3_SLOT_${idx + 1}`).slice(0, 120),
      unit_amount: {
        currency_code: 'USD',
        value: unitPrice,
      },
      quantity: '1',
      category: 'PHYSICAL_GOODS',
    };
  });

  const itemTotalValue = normalizedItems
    .reduce((sum, i) => sum + Number(i.unit_amount.value), 0)
    .toFixed(2);

  const distinctDomains = [...new Set(items.map((i) => i.domain).filter(Boolean))];
  const returnBase = process.env.PUBLIC_CLIENT_URL || 'http://localhost:5174';

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: 'CARTWEAVE_MULTI_MERCHANT_BOM',
        description: `CartWeave ChronosCart // ${blueprintTitle} (${distinctDomains.length} Retailers, ${deadlineDays}d SLA)`.slice(0, 127),
        custom_id: `cw_sha256:${bundleHash}`.slice(0, 127),
        amount: {
          currency_code: 'USD',
          value: itemTotalValue,
          breakdown: {
            item_total: {
              currency_code: 'USD',
              value: itemTotalValue,
            },
          },
        },
        items: normalizedItems,
      },
    ],
    application_context: {
      brand_name: 'CARTWEAVE CHRONOSCART STUDIO',
      landing_page: 'LOGIN',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
      return_url: `${returnBase}/?paypal_checkout=approved`,
      cancel_url: `${returnBase}/?paypal_checkout=cancelled`,
    },
  };

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });

  const order = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal Order v2 creation failed (${res.status}): ${JSON.stringify(order)}`);
  }

  const approveLink = (order.links || []).find(
    (l) => l.rel === 'approve' || l.rel === 'payer-action'
  );

  return {
    orderId: order.id,
    status: order.status || 'CREATED',
    approveUrl: approveLink ? approveLink.href : `https://www.sandbox.paypal.com/checkoutnow?token=${order.id}`,
    bundleHash,
    totalAmount: Number(itemTotalValue),
    currency: 'USD',
    merchantCount: distinctDomains.length,
    merchants: distinctDomains,
    itemCount: normalizedItems.length,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Verifies live PayPal Order status (GET /v2/checkout/orders/:orderId) and executes
 * POST /v2/checkout/orders/:orderId/capture if buyer-approved (or returns live Sandbox state).
 */
async function captureMultiMerchantOrder(orderId) {
  if (!orderId) {
    throw new Error('orderId is required');
  }

  const token = await getPayPalToken();
  const getRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!getRes.ok) {
    const errBody = await getRes.text();
    throw new Error(`PayPal Order lookup failed (${getRes.status}): ${errBody}`);
  }

  const orderData = await getRes.json();
  const liveStatus = orderData.status || 'CREATED';

  if (liveStatus === 'APPROVED') {
    const capRes = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': crypto.randomUUID(),
        },
      }
    );
    const capData = await capRes.json().catch(() => ({}));
    if (capRes.ok) {
      const captureId =
        capData?.purchase_units?.[0]?.payments?.captures?.[0]?.id || `CAP-${orderId}`;
      return {
        orderId,
        orderStatus: capData.status || 'COMPLETED',
        captureStatus: 'CAPTURED_LIVE',
        captureId,
        payerEmail: capData?.payer?.email_address || 'sb-piiac53570717@personal.example.com',
        settledAt: new Date().toISOString(),
      };
    }
    return {
      orderId,
      orderStatus: liveStatus,
      captureStatus: `CAPTURE_HTTP_${capRes.status}`,
      settledAt: new Date().toISOString(),
    };
  }

  if (liveStatus === 'COMPLETED') {
    const captureId =
      orderData?.purchase_units?.[0]?.payments?.captures?.[0]?.id || `CAP-${orderId}`;
    return {
      orderId,
      orderStatus: 'COMPLETED',
      captureStatus: 'CAPTURED_LIVE',
      captureId,
      payerEmail: orderData?.payer?.email_address || 'sb-piiac53570717@personal.example.com',
      settledAt: new Date().toISOString(),
    };
  }

  // Order is CREATED in Sandbox — provide clean status so user can approve in popup or finalize demo
  return {
    orderId,
    orderStatus: liveStatus,
    captureStatus: 'SANDBOX_ORDER_VERIFIED_AWAITING_BUYER_APPROVAL',
    message:
      'Order is live in PayPal Sandbox (status: CREATED). Sign in at the PayPal Checkout popup with the Sandbox Buyer credentials to complete payer capture, or generate the Split Vendor Invoice below.',
    settledAt: new Date().toISOString(),
  };
}

/**
 * Creates a live PayPal Sandbox Split Vendor Bill / Draft Invoice (POST /v2/invoicing/invoices)
 * itemizing each Channel3 merchant SKU, shipping SLA window, and bundle hash.
 */
async function createMultiMerchantInvoice({
  items = [],
  blueprintTitle = 'CartWeave Studio Bundle',
  deadlineDays = 5,
  totalSavings = 0,
  recipientEmail = 'procurement-desk@cartweave.example.com',
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one BOM item is required to generate a PayPal Invoice');
  }

  const token = await getPayPalToken();
  const invNum = `CW-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
  const bundleHash = computeBundleHash(items, { blueprintId: blueprintTitle, deadlineDays });
  const distinctDomains = [...new Set(items.map((i) => i.domain).filter(Boolean))];

  const invoiceItems = items.map((item, idx) => ({
    name: `[${item.domain || 'channel3'}] ${item.name || item.title || `BOM Slot ${idx + 1}`}`.slice(0, 190),
    description: `Channel3 SKU: ${item.sku} | Dispatch SLA: ${item.shippingDays}d (${item.shippingTier || 'Verified'}) | MSRP: $${Number(item.compareAtPrice || item.price).toFixed(2)}`.slice(0, 240),
    quantity: '1',
    unit_amount: {
      currency_code: 'USD',
      value: Number(item.price || 0).toFixed(2),
    },
  }));

  const totalAmount = invoiceItems
    .reduce((sum, i) => sum + Number(i.unit_amount.value), 0)
    .toFixed(2);

  const payload = {
    detail: {
      invoice_number: invNum,
      currency_code: 'USD',
      note: `CartWeave ChronosCart Split Multi-Merchant Procurement Invoice | Mission: ${blueprintTitle} | Consolidated across ${distinctDomains.length} verified Channel3 retailers (${distinctDomains.join(', ')}) | Target Launch SLA: ${deadlineDays} Days`,
      memo: `Bundle SHA-256: ${bundleHash} | Channel3 Arbitrage Savings: $${Number(totalSavings || 0).toFixed(2)} USD`,
    },
    invoicer: {
      name: {
        given_name: 'CartWeave',
        surname: 'ChronosCartSettlement',
      },
    },
    primary_recipients: [
      {
        billing_info: {
          name: {
            given_name: 'Autonomous',
            surname: 'ProcurementDesk',
          },
          email_address: recipientEmail,
        },
      },
    ],
    items: invoiceItems,
  };

  const res = await fetch(`${PAYPAL_BASE}/v2/invoicing/invoices`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`PayPal Invoicing v2 failed (${res.status}): ${JSON.stringify(data)}`);
  }

  let invoiceId = data.id || null;
  if (!invoiceId && typeof data.href === 'string') {
    invoiceId = data.href.split('/').pop();
  }
  if (!invoiceId && Array.isArray(data.links)) {
    const selfLink = data.links.find((l) => l.rel === 'self' && typeof l.href === 'string');
    if (selfLink) invoiceId = selfLink.href.split('/').pop();
  }

  return {
    invoiceId: invoiceId || invNum,
    invoiceNumber: invNum,
    status: data.status || 'DRAFT',
    totalAmount: Number(totalAmount),
    currency: 'USD',
    merchantCount: distinctDomains.length,
    merchants: distinctDomains,
    bundleHash,
    href: data.href || null,
    createdAt: new Date().toISOString(),
  };
}

module.exports = {
  getPayPalToken,
  createMultiMerchantOrder,
  captureMultiMerchantOrder,
  createMultiMerchantInvoice,
  computeBundleHash,
};
