import React, { useState } from 'react';
import {
  Truck,
  Tag,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  Zap,
  Check,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

/**
 * BomSlotCard.jsx
 * High-Craft Light-Mode Channel3 Multi-Merchant Slot Card
 *
 * Displays:
 *  - Active Channel3 SKU title, brand, verified merchant domain pill, live price,
 *    compare_at_price discount spread, and shipping + calibration SLA badge.
 *  - Visual telemetry banner when the Time/Budget Physics Engine auto-swaps this slot.
 *  - Expandable "Swap Alternative Channel3 Merchant SKU (4 Options)" drawer comparing:
 *      1. Fastest Shipping Pick (1d express)
 *      2. Best Value Pick (2d balanced)
 *      3. Budget Pick (4–5d economy)
 *      4. Premium Flagship Pick (high spec)
 */
export default function BomSlotCard({
  slot,
  maxDeliveryDays,
  isSelected,
  isLocked,
  onSelect,
  onToggleLock,
  onManualSwapSku,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const active = slot.activeSku || {};
  const candidates = slot.candidates || [];
  const schedule = slot.schedule || {};
  const lastSwap = slot.lastSwap;

  const isBreach = schedule.isSlaBreach;
  const savings = Number(
    Math.max(0, (active.compareAtPrice || active.price) - active.price).toFixed(2)
  );
  const discountPct =
    active.compareAtPrice && active.compareAtPrice > active.price
      ? Math.round(((active.compareAtPrice - active.price) / active.compareAtPrice) * 100)
      : 0;

  const pickBadgeColors = {
    fastest: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    value: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    budget: 'bg-amber-50 text-amber-800 border-amber-200',
    premium: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
        isBreach
          ? 'border-rose-400 ring-2 ring-rose-500/20 animate-sla-pulse'
          : lastSwap
          ? 'border-indigo-400 ring-2 ring-indigo-500/15 shadow-md'
          : isSelected
          ? 'border-indigo-500 shadow-sm'
          : 'border-slate-200/90 hover:border-slate-300 shadow-2xs'
      }`}
    >
      {/* Autonomous Physics Auto-Swap Telemetry Banner */}
      {lastSwap && (
        <div
          className={`px-4 py-2 text-xs font-medium flex flex-wrap items-center justify-between gap-2 border-b ${
            lastSwap.reason === 'SLA_DEADLINE_BREACH'
              ? 'bg-orange-50/90 text-orange-950 border-orange-200'
              : 'bg-indigo-50/90 text-indigo-950 border-indigo-200'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span className="font-bold uppercase tracking-wider font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-orange-200 text-orange-700">
              {lastSwap.reason === 'SLA_DEADLINE_BREACH'
                ? 'SLA BREACH AUTO-SWAP'
                : lastSwap.reason === 'BUDGET_CEILING_COMPRESSION'
                ? 'BUDGET CEILING SWAP'
                : 'HEADROOM UPGRADE'}
            </span>
            <span className="truncate">
              Swapped <span className="font-mono line-through opacity-75">{lastSwap.fromDomain}</span>{' '}
              ({lastSwap.fromTotalDays}d / ${lastSwap.fromPrice}) <ArrowRight className="inline w-3 h-3" />{' '}
              <strong className="font-mono text-indigo-700">{lastSwap.toDomain}</strong> (
              {lastSwap.toTotalDays}d / ${lastSwap.toPrice})
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold">
            {lastSwap.daysSaved > 0 ? `⚡ Saved ${lastSwap.daysSaved}d` : ''}
            {lastSwap.costDelta < 0
              ? ` · -$${Math.abs(lastSwap.costDelta).toFixed(2)}`
              : lastSwap.costDelta > 0
              ? ` · +$${lastSwap.costDelta.toFixed(2)}`
              : ''}
          </span>
        </div>
      )}

      {/* Card Body */}
      <div className="p-4">
        {/* Top Metadata Row: Slot Code + Category + Pick Tier + Lock Button */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              {slot.code}
            </span>
            <span className="text-xs font-semibold text-slate-500">{slot.category}</span>
            {active.pickBadge && (
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                  pickBadgeColors[active.pickType] || 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {active.pickBadge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock && onToggleLock(slot.slotId, active.sku);
              }}
              title={
                isLocked
                  ? 'Slot is pinned (Physics Engine will not auto-swap it)'
                  : 'Pin this SKU so Physics Engine keeps it locked'
              }
              className={`p-1.5 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1 ${
                isLocked
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-mono hidden sm:inline">
                {isLocked ? 'Pinned' : 'Pin'}
              </span>
            </button>
          </div>
        </div>

        {/* Slot Title & Selected Channel3 Product Name */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              {slot.title}
            </div>
            <h3 className="text-sm font-bold text-slate-900 leading-snug mt-0.5">
              {active.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{active.specs}</p>
          </div>

          {/* Right Live Price & Discount Block */}
          <div className="text-right shrink-0">
            <div className="text-lg font-extrabold font-mono text-slate-900 leading-none">
              ${Number(active.price || 0).toFixed(2)}
            </div>
            {savings > 0 && (
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[11px] font-mono text-slate-400 line-through">
                  ${Number(active.compareAtPrice).toFixed(2)}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  -{discountPct}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Merchant Domain, SLA Pill & Swap Drawer Toggle */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Merchant Domain Pill */}
            <a
              href={active.url || '#'}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-mono font-semibold transition"
            >
              <span>@{active.domain}</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>

            {/* Shipping + Assembly SLA Pill */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border ${
                isBreach
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : active.shippingDays <= 1
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>
                {active.shippingDays}d Ship + {slot.installDurationDays}d Rig ={' '}
                <strong>Day {schedule.assemblyEndDay}</strong>
              </span>
            </div>
          </div>

          {/* Expandable Alternative SKUs Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDrawerOpen((v) => !v);
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200/90 transition flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Swap SKU ({candidates.length} Channel3 Options)</span>
            {drawerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Multi-Merchant Candidate Comparison Drawer */}
      {drawerOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="px-4 py-3 bg-slate-50 border-t border-slate-200/90 space-y-2"
        >
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
            <span>Verified Channel3 Merchant Arbitrage Pool</span>
            <span>Target Deadline: Day {maxDeliveryDays}</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {candidates.map((cand) => {
              const isCurrent = cand.sku === active.sku;
              const candTotalDays = cand.shippingDays + (slot.installDurationDays || 1);
              const candBreaches = candTotalDays > maxDeliveryDays;

              return (
                <div
                  key={cand.sku}
                  onClick={() => onManualSwapSku && onManualSwapSku(slot.slotId, cand.sku)}
                  className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                    isCurrent
                      ? 'bg-indigo-50/90 border-indigo-400 shadow-2xs'
                      : candBreaches
                      ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300 opacity-85'
                      : 'bg-white border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          pickBadgeColors[cand.pickType] ||
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {cand.pickBadge || cand.pickType}
                      </span>
                      <span className="font-mono text-xs font-bold text-indigo-600">
                        @{cand.domain}
                      </span>
                      {candBreaches && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          SLA BREACH ({candTotalDays}d &gt; {maxDeliveryDays}d)
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-900 truncate mt-1">
                      {cand.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {cand.shippingTier} · Arrives Day {cand.shippingDays} · Ready Day {candTotalDays}
                    </p>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2.5">
                    <div>
                      <div className="font-mono text-sm font-bold text-slate-900">
                        ${Number(cand.price).toFixed(2)}
                      </div>
                      {cand.compareAtPrice > cand.price && (
                        <div className="text-[10px] font-mono text-emerald-700">
                          Save ${(cand.compareAtPrice - cand.price).toFixed(0)}
                        </div>
                      )}
                    </div>

                    <div
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        isCurrent
                          ? 'bg-indigo-600 text-white border-indigo-600 flex items-center gap-1'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-indigo-600 hover:text-white'
                      }`}
                    >
                      {isCurrent ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <span>Select</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
