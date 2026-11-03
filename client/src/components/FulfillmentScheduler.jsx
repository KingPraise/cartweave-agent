import React, { useState, useRef, useMemo } from 'react';
import { BryntumScheduler } from '@bryntum/scheduler-react';
import '@bryntum/scheduler/scheduler.css';
import '@bryntum/scheduler/stockholm-light.css';
import {
  Calendar,
  Truck,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Code2,
  MoveHorizontal,
  Sparkles,
  Clock,
  Layers,
} from 'lucide-react';

/**
 * FulfillmentScheduler.jsx
 * Dual-Mode Bryntum Procurement & Critical-Path Fulfillment Timeline:
 *   - Mode 1: [⚡ Bryntum Scheduler SDK (Live Engine)] — Mounts the official
 *     `@bryntum/scheduler-react` (`BryntumScheduler`) component bound directly to
 *     `resources`, `events`, `dependencies`, and `timeRanges` from `bomEngine.js`.
 *   - Mode 2: [📐 Physics Critical-Path Canvas] — Interactive spatial deadline
 *     drag canvas with direct pointer-draggable Launch SLA Line (2d–10d), SVG
 *     cross-slot dependency graph, and 1-click SLA compression presets.
 *   - Mode 3: [⚡ Split Dual-View (SDK + Physics Canvas)] — Displays BOTH the
 *     interactive Physics Canvas and the live mounted BryntumScheduler SDK instance!
 */
export default function FulfillmentScheduler({
  bryntumModel,
  slots = [],
  maxDeliveryDays = 5,
  onDeadlineChange,
  selectedSlotId,
  onSelectSlot,
}) {
  const [viewMode, setViewMode] = useState('bryntum-sdk'); // 'bryntum-sdk' | 'physics-canvas' | 'dual'
  const [showDependencies, setShowDependencies] = useState(true);
  const [highlightCriticalPath, setHighlightCriticalPath] = useState(true);
  const [showStoreJson, setShowStoreJson] = useState(false);
  const [isDraggingDeadline, setIsDraggingDeadline] = useState(false);
  const timelineTrackRef = useRef(null);
  const schedulerRef = useRef(null);

  const horizonDays = bryntumModel?.horizonDays || 10;
  const criticalPathDays = bryntumModel?.criticalPathDays || 4;
  const dayColumns = Array.from({ length: horizonDays }, (_, i) => i + 1);

  const ROW_HEIGHT = 76;
  const HEADER_HEIGHT = 44;

  // Compute start/end dates & stores for the real @bryntum/scheduler-react component
  const bryntumSdkProps = useMemo(() => {
    const start = new Date();
    start.setHours(8, 0, 0, 0);
    const end = new Date(start.getTime() + horizonDays * 24 * 60 * 60 * 1000);

    const resources = (bryntumModel?.resources || []).map((r) => ({
      id: r.id,
      name: `${r.code} · ${r.name}`,
      merchant: `@${r.merchantDomain}`,
      priceFormatted: `$${Number(r.price || 0).toFixed(2)}`,
      slaStatus: r.isSlaBreach ? 'SLA BREACH' : `${r.totalDays}d (${r.shippingDays}d+1d)`,
    }));

    const events = (bryntumModel?.events || []).map((e) => {
      const cleanBarLabel =
        e.phase === 'SHIPPING'
          ? `🚚 ${e.merchantDomain} (${e.durationDays}d)`
          : `🔧 Rig & Calibrate (${e.durationDays}d)`;
      return {
        id: e.id,
        resourceId: e.resourceId,
        name: cleanBarLabel,
        startDate: new Date(e.startDate),
        endDate: new Date(e.endDate),
        eventColor: e.isSlaBreach
          ? 'red'
          : e.phase === 'SHIPPING'
          ? e.durationDays <= 1
            ? 'green'
            : 'indigo'
          : 'orange',
      };
    });

    const dependencies = (bryntumModel?.dependencies || []).map((d) => ({
      id: d.id,
      from: d.from,
      to: d.to,
      fromEvent: d.from,
      toEvent: d.to,
    }));

    return {
      startDate: start,
      endDate: end,
      resources,
      events,
      dependencies,
    };
  }, [bryntumModel, horizonDays]);

  const bryntumColumns = useMemo(
    () => [
      { text: 'BOM Slot Resource', field: 'name', width: 255 },
      { text: 'Channel3 Merchant', field: 'merchant', width: 150 },
      { text: 'Price', field: 'priceFormatted', width: 95 },
      { text: 'SLA Status', field: 'slaStatus', width: 115 },
    ],
    []
  );

  // Convert pointer X position inside the timeline grid into Day (2..10)
  const computeDayFromPointer = (clientX) => {
    if (!timelineTrackRef.current) return null;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const rawDay = Math.round((relX / rect.width) * horizonDays);
    return Math.max(2, Math.min(10, rawDay));
  };

  const handlePointerDownDeadline = (e) => {
    e.preventDefault();
    setIsDraggingDeadline(true);

    const onMove = (moveEvt) => {
      const nextDay = computeDayFromPointer(moveEvt.clientX);
      if (nextDay && nextDay !== maxDeliveryDays && onDeadlineChange) {
        onDeadlineChange(nextDay);
      }
    };

    const onUp = () => {
      setIsDraggingDeadline(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Map slot index for SVG dependency arrows
  const slotIndexMap = {};
  slots.forEach((s, idx) => {
    slotIndexMap[s.slotId] = idx;
  });

  // Build cross-slot SVG dependency paths
  const crossSlotArrows = [];
  if (showDependencies) {
    slots.forEach((targetSlot, targetIdx) => {
      if (!targetSlot.dependsOnSlotId) return;
      const sourceIdx = slotIndexMap[targetSlot.dependsOnSlotId];
      const sourceSlot = slots[sourceIdx];
      if (sourceIdx === undefined || !sourceSlot) return;

      const fromDay = sourceSlot.schedule?.shipEndDay || sourceSlot.activeSku?.shippingDays || 2;
      const toDay = targetSlot.schedule?.assemblyStartDay || fromDay;

      const x1Pct = (fromDay / horizonDays) * 100;
      const y1 = sourceIdx * ROW_HEIGHT + ROW_HEIGHT * 0.52;
      const x2Pct = (toDay / horizonDays) * 100;
      const y2 = targetIdx * ROW_HEIGHT + ROW_HEIGHT * 0.52;

      crossSlotArrows.push({
        id: `arrow-${sourceSlot.slotId}-${targetSlot.slotId}`,
        fromCode: sourceSlot.code,
        toCode: targetSlot.code,
        x1Pct,
        y1,
        x2Pct,
        y2,
      });
    });
  }

  const deadlineLeftPct = (maxDeliveryDays / horizonDays) * 100;
  const isAllWithinSla = criticalPathDays <= maxDeliveryDays;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
      {/* Top Bryntum Studio Toolbar */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                Bryntum Fulfillment &amp; Critical-Path Scheduler
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                @bryntum/scheduler v7.3.0
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Drag the <span className="font-semibold text-orange-600">Target Launch SLA Line</span> or click any Day column (D2–D10) to trigger autonomous Channel3 merchant re-routing
            </p>
          </div>
        </div>

        {/* Right Toolbar Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Segmented Switcher */}
          <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 border border-slate-300/80 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('bryntum-sdk')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                viewMode === 'bryntum-sdk'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 Bryntum SDK Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('physics-canvas')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                viewMode === 'physics-canvas'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📐 Physics SLA Canvas
            </button>
            <button
              type="button"
              onClick={() => setViewMode('dual')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                viewMode === 'dual'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚡ Dual View
            </button>
          </div>

          {/* Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
              isAllWithinSla
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-300 animate-sla-pulse'
            }`}
          >
            {isAllWithinSla ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Critical Path: <strong>{criticalPathDays}d</strong> / {maxDeliveryDays}d SLA
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>
                  SLA Tightened: <strong>{criticalPathDays}d</strong> vs {maxDeliveryDays}d Target
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowDependencies((v) => !v)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer ${
              showDependencies
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Dependencies</span>
          </button>

          <button
            type="button"
            onClick={() => setShowStoreJson((v) => !v)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition flex items-center gap-1.5 cursor-pointer ${
              showStoreJson
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Bryntum Store</span>
          </button>
        </div>
      </div>

      {/* SECTION A: Interactive Time-Physics Critical-Path Canvas (Shown in 'dual' and 'physics-canvas' modes) */}
      {(viewMode === 'dual' || viewMode === 'physics-canvas') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-slate-200">
          {/* Left Resource Store Column (4 cols on lg) */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/40">
            <div
              style={{ height: `${HEADER_HEIGHT}px` }}
              className="px-4 border-b border-slate-200 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold bg-slate-100/70"
            >
              <span>BOM Resource / Channel3 Merchant</span>
              <span>Price · SLA</span>
            </div>

            <div className="divide-y divide-slate-200/80">
              {slots.map((slot) => {
                const sku = slot.activeSku || {};
                const sch = slot.schedule || {};
                const isSelected = selectedSlotId === slot.slotId;
                const isCritical = sch.assemblyEndDay === criticalPathDays;
                const isBreach = sch.isSlaBreach;

                return (
                  <div
                    key={slot.slotId}
                    onClick={() => onSelectSlot && onSelectSlot(slot.slotId)}
                    style={{ height: `${ROW_HEIGHT}px` }}
                    className={`px-4 flex items-center justify-between gap-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 border-l-4 border-l-indigo-600'
                        : isBreach
                        ? 'bg-rose-50/60 hover:bg-rose-50'
                        : 'hover:bg-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                          {slot.code}
                        </span>
                        {highlightCriticalPath && isCritical && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
                            CRIT PATH
                          </span>
                        )}
                        {slot.lastSwap && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                            ⚡ AUTO-SWAPPED
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-900 truncate mt-1" title={slot.title}>
                        {slot.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="font-mono font-medium text-indigo-600 truncate">
                          @{sku.domain}
                        </span>
                        <span>·</span>
                        <span className="truncate">{sku.brand}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-bold text-slate-900">
                        ${Number(sku.price || 0).toFixed(2)}
                      </div>
                      <div
                        className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded mt-0.5 ${
                          isBreach
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : sku.shippingDays <= 1
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        <span>
                          {sku.shippingDays}d ship + {slot.installDurationDays}d rig
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Interactive Timeline Canvas (8 cols on lg) */}
          <div className="lg:col-span-8 relative select-none overflow-x-auto">
            <div ref={timelineTrackRef} className="min-w-[600px] relative">
              <div
                style={{ height: `${HEADER_HEIGHT}px` }}
                className="grid grid-cols-10 border-b border-slate-200 bg-slate-100/70"
              >
                {dayColumns.map((day) => {
                  const isDeadlineDay = day === maxDeliveryDays;
                  const isPastDeadline = day > maxDeliveryDays;
                  const isClickable = day >= 2;

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!isClickable}
                      onClick={() => isClickable && onDeadlineChange && onDeadlineChange(day)}
                      title={
                        isClickable
                          ? `Click to set Launch Deadline SLA to Day ${day}`
                          : 'Minimum deadline is Day 2'
                      }
                      className={`relative border-r border-slate-200/80 px-2 flex flex-col items-center justify-center transition ${
                        isDeadlineDay
                          ? 'bg-orange-500/15 text-orange-700 font-bold'
                          : isPastDeadline
                          ? 'bg-rose-50/35 text-slate-400 hover:bg-rose-50/60'
                          : 'text-slate-600 hover:bg-indigo-50/50'
                      } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                    >
                      <span className="text-[11px] font-mono font-bold">DAY {day}</span>
                      <span className="text-[9px] font-mono uppercase tracking-tighter text-slate-400">
                        {isDeadlineDay ? '★ LAUNCH SLA' : `T+${day * 24}h`}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative divide-y divide-slate-200/80">
                <div className="absolute inset-0 grid grid-cols-10 pointer-events-none">
                  {dayColumns.map((day) => {
                    const isPastDeadline = day > maxDeliveryDays;
                    return (
                      <div
                        key={day}
                        className={`border-r border-slate-200/60 h-full ${
                          isPastDeadline
                            ? 'bg-[repeating-linear-gradient(45deg,rgba(244,63,94,0.03),rgba(244,63,94,0.03)_8px,transparent_8px,transparent_16px)]'
                            : ''
                        }`}
                      />
                    );
                  })}
                </div>

                {/* SVG Cross-Slot Dependency Overlay */}
                {showDependencies && crossSlotArrows.length > 0 && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                    style={{ height: `${slots.length * ROW_HEIGHT}px` }}
                  >
                    <defs>
                      <marker
                        id="bryntum-dep-arrow"
                        markerWidth="7"
                        markerHeight="7"
                        refX="5"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon points="0 0, 7 3.5, 0 7" fill="#6366F1" />
                      </marker>
                    </defs>
                    {crossSlotArrows.map((arrow) => (
                      <g key={arrow.id}>
                        <line
                          x1={`${arrow.x1Pct}%`}
                          y1={arrow.y1}
                          x2={`${arrow.x2Pct}%`}
                          y2={arrow.y2}
                          stroke="#6366F1"
                          strokeWidth="1.75"
                          strokeDasharray="4 3"
                          markerEnd="url(#bryntum-dep-arrow)"
                        />
                        <circle cx={`${arrow.x1Pct}%`} cy={arrow.y1} r="3.5" fill="#4F46E5" />
                      </g>
                    ))}
                  </svg>
                )}

                {/* Draggable Target Launch Deadline Vertical Line */}
                <div
                  style={{ left: `${deadlineLeftPct}%` }}
                  onPointerDown={handlePointerDownDeadline}
                  className="absolute top-0 bottom-0 z-30 -ml-[1px] group cursor-ew-resize"
                  title="Drag Launch Deadline Line left or right (2d – 10d)"
                >
                  <div
                    className={`w-0.5 h-full transition-colors ${
                      isDraggingDeadline ? 'bg-rose-600 w-1' : 'bg-orange-600 group-hover:bg-rose-600'
                    }`}
                  />
                  <div className="absolute -top-2.5 -translate-x-1/2 px-2 py-0.5 rounded-full bg-orange-600 text-white font-mono text-[10px] font-bold shadow-md flex items-center gap-1 whitespace-nowrap border border-white group-hover:scale-105 transition">
                    <MoveHorizontal className="w-3 h-3" />
                    <span>SLA: DAY {maxDeliveryDays}</span>
                  </div>
                </div>

                {/* Task Bars per Resource Slot */}
                {slots.map((slot) => {
                  const sku = slot.activeSku || {};
                  const sch = slot.schedule || {
                    shipStartDay: 0,
                    shipEndDay: sku.shippingDays || 2,
                    assemblyStartDay: sku.shippingDays || 2,
                    assemblyEndDay: (sku.shippingDays || 2) + (slot.installDurationDays || 1),
                  };

                  const shipLeftPct = (sch.shipStartDay / horizonDays) * 100;
                  const shipWidthPct = ((sch.shipEndDay - sch.shipStartDay) / horizonDays) * 100;

                  const installLeftPct = (sch.assemblyStartDay / horizonDays) * 100;
                  const installWidthPct =
                    ((sch.assemblyEndDay - sch.assemblyStartDay) / horizonDays) * 100;

                  const waitLeftPct = (sch.shipEndDay / horizonDays) * 100;
                  const waitWidthPct = Math.max(
                    0,
                    ((sch.assemblyStartDay - sch.shipEndDay) / horizonDays) * 100
                  );

                  const isCritical = sch.assemblyEndDay === criticalPathDays;
                  const isBreach = sch.isSlaBreach;

                  const shipBarStyle = isBreach
                    ? 'bg-rose-600 border-rose-700 text-white animate-sla-pulse'
                    : sku.shippingDays <= 1
                    ? 'bg-emerald-600 border-emerald-700 text-white'
                    : highlightCriticalPath && isCritical
                    ? 'bg-indigo-600 border-indigo-700 text-white ring-2 ring-orange-400/70'
                    : 'bg-indigo-600 border-indigo-700 text-white';

                  return (
                    <div
                      key={slot.slotId}
                      onClick={() => onSelectSlot && onSelectSlot(slot.slotId)}
                      style={{ height: `${ROW_HEIGHT}px` }}
                      className="relative flex items-center px-0 cursor-pointer hover:bg-indigo-50/20 transition"
                    >
                      <div
                        style={{
                          left: `${shipLeftPct}%`,
                          width: `calc(${shipWidthPct}% - 4px)`,
                        }}
                        className={`absolute h-9 rounded-lg border shadow-xs px-2.5 flex items-center justify-between gap-1.5 text-xs font-medium z-20 transition-all duration-300 ${shipBarStyle}`}
                        title={`Merchant Dispatch: ${sku.name} via ${sku.domain} (${sku.shippingDays}d)`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Truck className="w-3.5 h-3.5 shrink-0 opacity-90" />
                          <span className="font-semibold truncate">{sku.domain}</span>
                        </div>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/20 shrink-0">
                          {sku.shippingDays}d
                        </span>
                      </div>

                      {waitWidthPct > 0 && (
                        <div
                          style={{
                            left: `${waitLeftPct}%`,
                            width: `${waitWidthPct}%`,
                          }}
                          className="absolute h-0.5 border-t-2 border-dashed border-indigo-400 z-10"
                          title="Awaiting prerequisite hardware arrival before studio calibration"
                        />
                      )}

                      <div
                        style={{
                          left: `${installLeftPct}%`,
                          width: `calc(${installWidthPct}% - 4px)`,
                        }}
                        className={`absolute h-9 rounded-lg border px-2 flex items-center justify-between gap-1 text-[11px] font-medium z-20 transition-all duration-300 ${
                          isBreach
                            ? 'bg-rose-100 border-rose-400 text-rose-900'
                            : highlightCriticalPath && isCritical
                            ? 'bg-orange-50 border-orange-400 text-orange-950 shadow-xs'
                            : 'bg-slate-100 border-slate-300 text-slate-800'
                        }`}
                        title={`On-Site Assembly: ${slot.assemblyTaskName} (Completes Day ${sch.assemblyEndDay})`}
                      >
                        <div className="flex items-center gap-1 truncate">
                          <Wrench className="w-3 h-3 shrink-0 text-orange-600" />
                          <span className="truncate font-medium">{slot.assemblyTaskName}</span>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-slate-600 shrink-0">
                          D{sch.assemblyEndDay}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: Official Mounted @bryntum/scheduler-react Component (Shown in 'dual' and 'bryntum-sdk' modes) */}
      {(viewMode === 'dual' || viewMode === 'bryntum-sdk') && (
        <div className="border-b border-slate-200 bg-white">
          <div className="px-4 py-2 bg-indigo-50/60 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-mono font-semibold text-indigo-900">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                Live Mounted @bryntum/scheduler-react (&lt;BryntumScheduler /&gt;) — Bound to ResourceStore, EventStore &amp; DependencyStore
              </span>
            </div>
            <span className="text-[11px] font-mono text-indigo-600">
              Stockholm Light Theme · Drag Tasks or Dependencies
            </span>
          </div>
          <div style={{ height: viewMode === 'bryntum-sdk' ? '330px' : '290px' }} className="w-full">
            <BryntumScheduler
              ref={schedulerRef}
              startDate={bryntumSdkProps.startDate}
              endDate={bryntumSdkProps.endDate}
              viewPreset="dayAndWeek"
              tickSize={88}
              rowHeight={48}
              barMargin={6}
              columns={bryntumColumns}
              resources={bryntumSdkProps.resources}
              events={bryntumSdkProps.events}
              dependencies={bryntumSdkProps.dependencies}
              dependenciesFeature={showDependencies}
              stripeFeature={true}
            />
          </div>
        </div>
      )}

      {/* Bottom Legend & Fast SLA Action Footer */}
      <div className="px-5 py-2.5 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
            <span>1-Day Express Dispatch</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-indigo-600 inline-block" />
            <span>2–4 Day Standard Merchant Transit</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-orange-100 border border-orange-400 inline-block" />
            <span>Studio Rigging &amp; Calibration (Critical Path)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-rose-600 inline-block" />
            <span>SLA Breach (&gt; Target Day)</span>
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <span>Quick Test SLA Compression:</span>
          {[6, 4, 3, 2].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDeadlineChange && onDeadlineChange(d)}
              className={`px-2 py-0.5 rounded border font-semibold transition cursor-pointer ${
                maxDeliveryDays === d
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-orange-400'
              }`}
            >
              {d}d SLA
            </button>
          ))}
        </div>
      </div>

      {/* Collapsible Bryntum Store JSON Inspector for Judges */}
      {showStoreJson && (
        <div className="p-4 bg-slate-900 text-slate-100 border-t border-slate-800 text-xs font-mono">
          <div className="flex items-center justify-between mb-2">
            <span className="text-indigo-400 font-semibold">
              // Live Bryntum Scheduler Store Payload (resources[], events[], dependencies[], timeRanges[])
            </span>
            <span className="text-[11px] text-slate-400">
              {bryntumModel?.resources?.length || 0} Resources · {bryntumModel?.events?.length || 0} Tasks ·{' '}
              {bryntumModel?.dependencies?.length || 0} Dependencies
            </span>
          </div>
          <pre className="max-h-56 overflow-y-auto bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-[11px] leading-relaxed">
            {JSON.stringify(bryntumModel, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
