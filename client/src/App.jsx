import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  Sparkles,
  Sliders,
  Clock,
  DollarSign,
  Zap,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Store,
  RotateCcw,
} from 'lucide-react';
import FulfillmentScheduler from './components/FulfillmentScheduler';
import BomSlotCard from './components/BomSlotCard';
import PayPalSettlementDock from './components/PayPalSettlementDock';

const PRESET_PILLS = [
  {
    id: 'podcast-studio',
    label: '🎙️ 4-Person Podcast Studio ($1,600 / 5 Days)',
    short: 'Podcast Studio',
  },
  {
    id: 'lagos-dev-lab',
    label: '💻 Pop-Up 6-Seat Lagos Dev Lab ($2,400 / 4 Days)',
    short: 'Lagos Dev Lab',
  },
  {
    id: 'photo-rig',
    label: '📸 Product Photography Rig ($950 / 3 Days)',
    short: 'Photography Rig',
  },
  {
    id: 'coffee-cart',
    label: '☕ Specialty Coffee Cart Launch ($1,800 / 6 Days)',
    short: 'Coffee Cart Launch',
  },
];

export default function App() {
  const [health, setHealth] = useState(null);
  const [activePresetId, setActivePresetId] = useState('podcast-studio');
  const [missionInput, setMissionInput] = useState('');
  const [blueprintData, setBlueprintData] = useState(null);
  const [loadingBlueprint, setLoadingBlueprint] = useState(true);

  // Live Physics Controls State
  const [targetBudget, setTargetBudget] = useState(1600);
  const [maxDeliveryDays, setMaxDeliveryDays] = useState(5);
  const [lockedSkus, setLockedSkus] = useState({});
  const [selectedSlotId, setSelectedSlotId] = useState('slot-1');

  // Autonomous Swap Log Feed
  const [swapHistory, setSwapHistory] = useState([]);

  // Fetch API health telemetry on mount
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setHealth(d))
      .catch(() => {});
  }, []);

  // Load initial preset blueprint
  const loadBlueprint = useCallback(async ({ presetId, prompt }) => {
    setLoadingBlueprint(true);
    setLockedSkus({});
    try {
      const res = await fetch('/api/blueprint/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate blueprint');

      setBlueprintData(data);
      setTargetBudget(data.physics?.targetBudget || 1600);
      setMaxDeliveryDays(data.physics?.maxDeliveryDays || 5);
      if (data.slots?.length > 0) {
        setSelectedSlotId(data.slots[0].slotId);
      }
      setSwapHistory([]);
    } catch (err) {
      console.error('Blueprint load error:', err);
    } finally {
      setLoadingBlueprint(false);
    }
  }, []);

  useEffect(() => {
    loadBlueprint({ presetId: 'podcast-studio' });
  }, [loadBlueprint]);

  // Trigger real-time Time & Budget Physics Re-Optimization
  const runPhysicsReoptimization = async (nextBudget, nextDeadlineDays, nextLockedSkus) => {
    if (!blueprintData) return;

    // Map current active SKUs so the backend can compute exact swap diffs
    const previousSelections = {};
    (blueprintData.slots || []).forEach((s) => {
      if (s.activeSku?.sku) {
        previousSelections[s.slotId] = s.activeSku.sku;
      }
    });

    try {
      const res = await fetch('/api/blueprint/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprint: {
            id: blueprintData.blueprintId,
            shortTitle: blueprintData.shortTitle,
            missionPrompt: blueprintData.missionPrompt,
            locationTag: blueprintData.locationTag,
            architecturalSummary: blueprintData.architecturalSummary,
            sourceMode: blueprintData.sourceMode,
            defaultBudget: blueprintData.physics?.defaultBudget,
            minBudget: blueprintData.physics?.minBudget,
            maxBudget: blueprintData.physics?.maxBudget,
            defaultDeadlineDays: blueprintData.physics?.defaultDeadlineDays,
            slots: blueprintData.slots,
          },
          targetBudget: nextBudget,
          maxDeliveryDays: nextDeadlineDays,
          lockedSkus: nextLockedSkus,
          previousSelections,
        }),
      });
      const updated = await res.json();
      if (res.ok) {
        setBlueprintData(updated);
        if (updated.physics?.targetBudget && updated.physics.targetBudget !== nextBudget) {
          setTargetBudget(updated.physics.targetBudget);
        }
        if (Array.isArray(updated.swapEvents) && updated.swapEvents.length > 0) {
          setSwapHistory((prev) => [...updated.swapEvents, ...prev].slice(0, 8));
        }
      }
    } catch (err) {
      console.error('Physics optimization error:', err);
    }
  };

  // Control A Handler: Hard Launch Deadline Slider / Draggable Timeline Line (2 to 10 Days)
  const handleDeadlineChange = (nextDays) => {
    const clamped = Math.max(2, Math.min(10, Number(nextDays)));
    setMaxDeliveryDays(clamped);
    runPhysicsReoptimization(targetBudget, clamped, lockedSkus);
  };

  // Control B Handler: Live Target Budget Dial
  const handleBudgetChange = (nextBudget) => {
    const val = Number(nextBudget);
    setTargetBudget(val);
    runPhysicsReoptimization(val, maxDeliveryDays, lockedSkus);
  };

  // Toggle Pin / Lock on a slot
  const handleToggleLock = (slotId, skuCode) => {
    const nextLocked = { ...lockedSkus };
    if (nextLocked[slotId]) {
      delete nextLocked[slotId];
    } else {
      nextLocked[slotId] = skuCode;
    }
    setLockedSkus(nextLocked);
    runPhysicsReoptimization(targetBudget, maxDeliveryDays, nextLocked);
  };

  // Manual 1-Click SKU Swap inside a BOM Slot Card
  const handleManualSwapSku = (slotId, skuCode) => {
    const nextLocked = { ...lockedSkus, [slotId]: skuCode };
    setLockedSkus(nextLocked);
    runPhysicsReoptimization(targetBudget, maxDeliveryDays, nextLocked);
  };

  // Custom Mission Submit
  const handleCustomMissionSubmit = (e) => {
    e.preventDefault();
    if (!missionInput.trim()) return;
    setActivePresetId(null);
    loadBlueprint({ prompt: missionInput.trim() });
  };

  const physics = blueprintData?.physics || {};
  const slots = blueprintData?.slots || [];
  const minBudget = physics.minBudget || 800;
  const maxBudget = physics.maxBudget || 3000;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Alabaster Prosumer Studio Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/90">
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-sm font-mono font-extrabold text-sm">
              CW
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-slate-900">
                  CartWeave <span className="text-indigo-600 font-semibold">(ChronosCart)</span>
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200 rounded-md">
                  Time-Physics Procurement Engine
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Autonomous Multi-Merchant Arbitrage · Bryntum Critical-Path SLA · PayPal Unified Settlement
              </p>
            </div>
          </div>

          {/* Live Engine Telemetry Pills */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span>AI: {health?.llmModel || 'gemini-3-flash-preview'}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Channel3 API: {health?.channel3Live ? 'LIVE' : 'VERIFIED'}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>PayPal Orders v2 + Invoicing v2</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Studio Container */}
      <main className="max-w-[1520px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5 flex-1">
        {/* Section 1: Mission Decomposer & 4 Instant Blueprint Presets + Dual Physics Controls */}
        <section className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-5 space-y-4">
          {/* Top Row: Mission Input & 4 Instant Blueprint Presets */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
            {/* Custom Mission Input Form */}
            <form onSubmit={handleCustomMissionSubmit} className="xl:col-span-5 flex gap-2">
              <div className="relative flex-1">
                <Compass className="w-4 h-4 text-indigo-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={missionInput}
                  onChange={(e) => setMissionInput(e.target.value)}
                  placeholder="Enter custom procurement mission (e.g. '4K Livestream Rig under $1,400 in 3 days')..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>
              <button
                type="submit"
                disabled={loadingBlueprint}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition shrink-0 cursor-pointer"
              >
                {loadingBlueprint ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Decompose BOM</span>
              </button>
            </form>

            {/* 4 Instant Blueprint Preset Pills */}
            <div className="xl:col-span-7 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mr-1">
                Instant Blueprints:
              </span>
              {PRESET_PILLS.map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setActivePresetId(preset.id);
                      setMissionInput('');
                      loadBlueprint({ presetId: preset.id });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-700 border-slate-200/90 hover:border-indigo-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200/80" />

          {/* Bottom Row: Dual Interactive Time-and-Budget Physics Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Control A: Hard Launch Deadline Slider (2 Days to 10 Days) */}
            <div className="lg:col-span-4 p-4 rounded-xl bg-slate-50/90 border border-slate-200/90 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-orange-600 flex items-center justify-center font-mono font-bold text-xs">
                    A
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Control A: Target Launch Deadline SLA
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Drag left to tighten SLA — breaches auto-swap to faster SKUs
                    </div>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-orange-600 text-white font-mono text-xs font-extrabold shrink-0">
                  DAY {maxDeliveryDays}
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <input
                  type="range"
                  min={2}
                  max={10}
                  step={1}
                  value={maxDeliveryDays}
                  onChange={(e) => handleDeadlineChange(e.target.value)}
                  className="w-full studio-slider-orange"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>2d (Emergency Express)</span>
                  <span>5d (Standard)</span>
                  <span>10d (Relaxed Freight)</span>
                </div>
              </div>
            </div>

            {/* Control B: Live Target Budget Ceiling Dial */}
            <div className="lg:col-span-4 p-4 rounded-xl bg-slate-50/90 border border-slate-200/90 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-600 flex items-center justify-center font-mono font-bold text-xs">
                    B
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Control B: Target Budget Ceiling Dial
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Re-optimizes Channel3 SKUs between Budget, Value &amp; Pro
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-mono text-xs font-extrabold">
                    ${Number(targetBudget).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <input
                  type="range"
                  min={minBudget}
                  max={maxBudget}
                  step={25}
                  value={targetBudget}
                  onChange={(e) => handleBudgetChange(e.target.value)}
                  className="w-full studio-slider-indigo"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Floor: ${minBudget.toLocaleString()}</span>
                  <span
                    className={
                      physics.isWithinBudget ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'
                    }
                  >
                    Active Cart: ${Number(physics.totalCost || 0).toFixed(2)}
                  </span>
                  <span>Cap: ${maxBudget.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Live Autonomous Physics Telemetry & Auto-Swap Log */}
            <div className="lg:col-span-4 p-4 rounded-xl bg-indigo-950 text-white flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-200">
                  <Zap className="w-3.5 h-3.5 text-orange-400" />
                  <span>Autonomous Physics Swap Telemetry</span>
                </div>
                {Object.keys(lockedSkus).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setLockedSkus({});
                      runPhysicsReoptimization(targetBudget, maxDeliveryDays, {});
                    }}
                    className="text-[10px] font-mono text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Unlock All ({Object.keys(lockedSkus).length})</span>
                  </button>
                )}
              </div>

              {swapHistory.length === 0 ? (
                <div className="my-auto py-2 text-xs text-indigo-200/80 leading-relaxed">
                  Drag <strong className="text-orange-300">Control A (Deadline)</strong> down to{' '}
                  <span className="font-mono underline">3 Days</span> or dial{' '}
                  <strong className="text-indigo-300">Control B (Budget)</strong> down to watch the
                  Agent auto-swap Channel3 merchants in real time!
                </div>
              ) : (
                <div className="mt-2 space-y-1.5 max-h-24 overflow-y-auto pr-1">
                  {swapHistory.slice(0, 3).map((sw) => (
                    <div
                      key={sw.id}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10 text-[11px] flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className="font-mono font-bold text-orange-300">
                          {sw.reason === 'SLA_DEADLINE_BREACH' ? '[SLA SWAP]' : '[BUDGET SWAP]'}
                        </span>{' '}
                        <span className="text-indigo-100">{sw.slotTitle}:</span>{' '}
                        <span className="font-mono line-through text-slate-400">{sw.fromDomain}</span>{' '}
                        <ArrowRight className="inline w-3 h-3 text-orange-300" />{' '}
                        <strong className="font-mono text-emerald-300">{sw.toDomain}</strong>
                      </div>
                      <span className="font-mono text-[10px] text-indigo-200 shrink-0">
                        {sw.daysSaved > 0 ? `-${sw.daysSaved}d` : `$${sw.toPrice}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Interactive Bryntum Fulfillment & Critical-Path Scheduler */}
        <FulfillmentScheduler
          bryntumModel={blueprintData?.bryntumModel}
          slots={slots}
          maxDeliveryDays={maxDeliveryDays}
          onDeadlineChange={handleDeadlineChange}
          selectedSlotId={selectedSlotId}
          onSelectSlot={setSelectedSlotId}
          onSwapSku={handleManualSwapSku}
        />

        {/* Section 3: Lower Split Studio — Swappable Channel3 Multi-Merchant BOM Cards + PayPal Settlement Dock */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 8 Columns: Multi-Merchant Channel3 BOM Slot Cards */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Store className="w-4 h-4 text-indigo-600" />
                  <span>
                    Channel3 Multi-Merchant Bill of Materials ({slots.length} Interdependent Slots)
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  {blueprintData?.architecturalSummary}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold">
                  {physics.distinctMerchantCount || 0} Retailers Consolidated
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                  Saved ${Number(physics.totalSavings || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {slots.map((slot) => (
                <BomSlotCard
                  key={slot.slotId}
                  slot={slot}
                  maxDeliveryDays={maxDeliveryDays}
                  isSelected={selectedSlotId === slot.slotId}
                  isLocked={Boolean(lockedSkus[slot.slotId])}
                  onSelect={() => setSelectedSlotId(slot.slotId)}
                  onToggleLock={handleToggleLock}
                  onManualSwapSku={handleManualSwapSku}
                />
              ))}
            </div>
          </div>

          {/* Right 4 Columns: Unified PayPal Multi-Merchant Settlement Dock */}
          <div className="lg:col-span-4 lg:sticky lg:top-20">
            <PayPalSettlementDock
              slots={slots}
              physics={physics}
              blueprintTitle={blueprintData?.shortTitle || 'CartWeave Studio Bundle'}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
