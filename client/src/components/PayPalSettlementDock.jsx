import React, { useState } from 'react';
import {
  ShoppingBag,
  CreditCard,
  FileText,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  Layers,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

const SANDBOX_EMAIL = 'sb-piiac53570717@personal.example.com';
const SANDBOX_PASS = 'yY9=iHM0';

/**
 * PayPalSettlementDock.jsx
 * Unified PayPal Multi-Merchant Cart & Split Invoice Settlement Orchestrator
 *
 * Eliminates checking out across 4–5 separate retailer sites by consolidating
 * all Channel3 merchant SKUs into:
 *   1. Live PayPal Sandbox Order v2 (POST /v2/checkout/orders) with itemized purchase_units[0].items
 *   2. Live PayPal Order Capture (POST /v2/checkout/orders/:id/capture)
 *   3. Live PayPal Split Vendor Bill / Invoice v2 (POST /v2/invoicing/invoices)
 */
export default function PayPalSettlementDock({
  slots = [],
  physics = {},
  blueprintTitle = 'CartWeave Studio Bundle',
}) {
  const [orderState, setOrderState] = useState(null);
  const [captureState, setCaptureState] = useState(null);
  const [invoiceState, setInvoiceState] = useState(null);

  const [loadingOrder, setLoadingOrder] = useState(false);
  const [loadingCapture, setLoadingCapture] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [copiedField, setCopiedField] = useState(null);

  const activeItems = slots.map((s) => ({
    slotId: s.slotId,
    code: s.code,
    title: s.title,
    ...(s.activeSku || {}),
  }));

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1800);
  };

  // Workflow 1: Create Live PayPal Sandbox Multi-Merchant Order v2
  const handleCreateOrder = async () => {
    setLoadingOrder(true);
    setErrorMsg(null);
    setCaptureState(null);
    try {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: activeItems,
          blueprintTitle,
          deadlineDays: physics.maxDeliveryDays || 5,
          targetBudget: physics.targetBudget || 1600,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create PayPal Order');
      setOrderState(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingOrder(false);
    }
  };

  // Workflow 2: Verify & Capture PayPal Sandbox Order
  const handleCaptureOrder = async () => {
    if (!orderState?.orderId) return;
    setLoadingCapture(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderState.orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to capture PayPal Order');
      setCaptureState(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingCapture(false);
    }
  };

  // Workflow 3: Generate Live PayPal Split Vendor Invoice v2
  const handleCreateInvoice = async () => {
    setLoadingInvoice(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/paypal/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: activeItems,
          blueprintTitle,
          deadlineDays: physics.maxDeliveryDays || 5,
          totalSavings: physics.totalSavings || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create PayPal Invoice');
      setInvoiceState(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingInvoice(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Dock Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                PayPal Multi-Merchant Settlement Dock
              </h2>
              <p className="text-[11px] text-indigo-200/80">
                Consolidates {physics.distinctMerchantCount || activeItems.length} Retailers into 1 PayPal Order v2
              </p>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            Sandbox Live
          </span>
        </div>

        {/* Consolidated Total & Savings Telemetry */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-baseline justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Unified Settlement Total
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-0.5">
              ${Number(physics.totalCost || 0).toFixed(2)}{' '}
              <span className="text-xs font-normal text-slate-400">USD</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
              Channel3 Arbitrage Saved
            </div>
            <div className="text-sm font-bold font-mono text-emerald-300 mt-0.5">
              -${Number(physics.totalSavings || 0).toFixed(2)} off MSRP
            </div>
          </div>
        </div>
      </div>

      {/* Itemized Multi-Merchant Ledger Breakdown */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
          <span>Itemized purchase_units[0].items</span>
          <span>{activeItems.length} Verified SKUs</span>
        </div>

        <div className="divide-y divide-slate-200/70 bg-white rounded-xl border border-slate-200/90 px-3">
          {activeItems.map((item) => (
            <div key={item.slotId} className="py-2 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-indigo-600">
                    @{item.domain}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono text-[10px] text-slate-500">{item.shippingDays}d SLA</span>
                </div>
                <p className="font-medium text-slate-800 truncate">{item.name}</p>
              </div>
              <span className="font-mono font-bold text-slate-900 shrink-0">
                ${Number(item.price || 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sandbox Buyer Credentials Helper Bar */}
      <div className="px-4 py-3 bg-indigo-50/60 border-b border-indigo-100">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-800">
            PayPal Sandbox Buyer Login Helper
          </span>
          <span className="text-[10px] font-mono text-indigo-600">1-Click Copy</span>
        </div>

        <div className="grid grid-cols-1 gap-1.5 text-xs font-mono">
          <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200/80">
            <span className="truncate text-slate-700 text-[11px]">{SANDBOX_EMAIL}</span>
            <button
              type="button"
              onClick={() => copyText(SANDBOX_EMAIL, 'email')}
              className="ml-2 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {copiedField === 'email' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Email</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200/80">
            <span className="text-slate-700 text-[11px]">Password: {SANDBOX_PASS}</span>
            <button
              type="button"
              onClick={() => copyText(SANDBOX_PASS, 'pass')}
              className="ml-2 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {copiedField === 'pass' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Pass</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons & Live Settlement Receipts */}
      <div className="p-4 space-y-3">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Button 1: 1-Click PayPal Sandbox Order v2 */}
        <button
          type="button"
          onClick={handleCreateOrder}
          disabled={loadingOrder}
          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {loadingOrder ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Creating Multi-Merchant PayPal Order v2...</span>
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              <span>
                1. Create PayPal Multi-Merchant Order (${Number(physics.totalCost || 0).toFixed(2)})
              </span>
            </>
          )}
        </button>

        {/* Live Order Receipt Card */}
        {orderState && (
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-emerald-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Order ID: {orderState.orderId}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                {orderState.status}
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-600 truncate" title={orderState.bundleHash}>
              custom_id: cw_sha256:{orderState.bundleHash?.slice(0, 24)}...
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={orderState.approveUrl}
                target="_blank"
                rel="noreferrer"
                className="py-1.5 px-2.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs transition"
              >
                <span>Approve in PayPal</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={handleCaptureOrder}
                disabled={loadingCapture}
                className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
              >
                {loadingCapture ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>2. Verify / Capture</span>
              </button>
            </div>
          </div>
        )}

        {/* Capture Status Card */}
        {captureState && (
          <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs space-y-1">
            <div className="flex items-center justify-between font-mono font-bold text-indigo-950">
              <span>Order Status: {captureState.orderStatus}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                {captureState.captureStatus}
              </span>
            </div>
            {captureState.message && (
              <p className="text-[11px] text-slate-600 leading-relaxed">{captureState.message}</p>
            )}
          </div>
        )}

        {/* Button 3: Generate PayPal Split Vendor Invoice v2 */}
        <button
          type="button"
          onClick={handleCreateInvoice}
          disabled={loadingInvoice}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {loadingInvoice ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Generating PayPal Invoicing v2 Draft...</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 text-orange-600" />
              <span>3. Generate Split Vendor Bill (PayPal Invoicing v2)</span>
            </>
          )}
        </button>

        {/* Live Invoice v2 Receipt Card */}
        {invoiceState && (
          <div className="p-3 rounded-xl bg-orange-50/80 border border-orange-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-orange-950 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
                Invoice: {invoiceState.invoiceId}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-mono text-[10px] font-bold">
                {invoiceState.status}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-600">
              Ref #{invoiceState.invoiceNumber} · {invoiceState.merchantCount} Retailers Itemized
            </div>
            <div className="text-[11px] text-slate-500">
              Merchants: <span className="font-mono">{invoiceState.merchants?.join(', ')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
