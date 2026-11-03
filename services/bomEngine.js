/**
 * bomEngine.js
 * Goal & Visual Blueprint Decomposition (Gemini 3 Flash) +
 * "Time-and-Budget Physics" Optimization Engine + Bryntum Scheduler Data Generator
 */
const OpenAI = require('openai');
const channel3Service = require('./channel3Service');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

/**
 * 4 Instant Blueprint Presets required by the spec:
 * 1. "🎙️ 4-Person Podcast Studio ($1,600 / 5 Days)"
 * 2. "💻 Pop-Up 6-Seat Lagos Dev Lab ($2,400 / 4 Days)"
 * 3. "📸 Product Photography Rig ($950 / 3 Days)"
 * 4. "☕ Specialty Coffee Cart Launch ($1,800 / 6 Days)"
 */
const BLUEPRINT_PRESETS = {
  'podcast-studio': {
    id: 'podcast-studio',
    label: '🎙️ 4-Person Podcast Studio ($1,600 / 5 Days)',
    shortTitle: '4-Person Broadcast Podcast Studio',
    missionPrompt: 'Build a turnkey 4-Person Broadcast Video Podcast Studio under $1,600 ready to record in 5 days',
    defaultBudget: 1600,
    minBudget: 1150,
    maxBudget: 2500,
    defaultDeadlineDays: 5,
    locationTag: ' Creator Studio · Acoustic Stage A',
    architecturalSummary:
      'Quad XLR vocal capture array routed into a multi-track USB-C broadcast console, paired with closed-back monitoring, bi-color key lighting, and low-profile desk rigging.',
    slots: [
      {
        slotId: 'slot-1',
        code: 'AUDIO-MIC-01',
        title: 'Broadcast Dynamic Vocal Mics (4-Host Array)',
        category: 'Vocal Capture',
        searchQuery: 'podcast xlr dynamic microphone',
        poolKey: 'podcast_mics',
        budgetWeight: 0.27,
        installDurationDays: 1,
        assemblyTaskName: 'Mount Boom Arms & Gain-Stage 4x XLR Channels',
        dependsOnSlotId: 'slot-5',
      },
      {
        slotId: 'slot-2',
        code: 'AUDIO-DSP-02',
        title: 'Multi-Track USB-C Podcast Production Console',
        category: 'Core DSP & Routing',
        searchQuery: 'rodecaster focusrite usb audio interface mixer',
        poolKey: 'podcast_interface',
        budgetWeight: 0.30,
        installDurationDays: 1,
        assemblyTaskName: 'DSP Firmware Calibration & Multi-Track DAW Routing',
        dependsOnSlotId: null,
      },
      {
        slotId: 'slot-3',
        code: 'LIGHT-KEY-03',
        title: 'Bi-Color Key & Rim LED Studio Lighting Kit',
        category: 'Key Lighting',
        searchQuery: 'elgato key light studio led panel',
        poolKey: 'podcast_lighting',
        budgetWeight: 0.16,
        installDurationDays: 1,
        assemblyTaskName: '5600K White-Balance & Softbox Diffusion Setup',
        dependsOnSlotId: null,
      },
      {
        slotId: 'slot-4',
        code: 'AUDIO-MON-04',
        title: 'Closed-Back Studio Reference Headphones (4-Pack)',
        category: 'Host Monitoring',
        searchQuery: 'studio monitor headphones sony audio-technica',
        poolKey: 'podcast_monitoring',
        budgetWeight: 0.15,
        installDurationDays: 1,
        assemblyTaskName: 'Cue Mix Distribution & Host Headphone Check',
        dependsOnSlotId: 'slot-2',
      },
      {
        slotId: 'slot-5',
        code: 'RIG-ARM-05',
        title: 'Low-Profile Swivel Boom Arms & XLR Cabling',
        category: 'Desk Rigging',
        searchQuery: 'podcast microphone boom arm stand',
        poolKey: 'podcast_rigging',
        budgetWeight: 0.12,
        installDurationDays: 1,
        assemblyTaskName: 'Desk Clamp Torque & Hidden XLR Cable Channels',
        dependsOnSlotId: null,
      },
    ],
  },
  'lagos-dev-lab': {
    id: 'lagos-dev-lab',
    label: '💻 Pop-Up 6-Seat Lagos Dev Lab ($2,400 / 4 Days)',
    shortTitle: 'Pop-Up 6-Seat Engineering & AI Sprint Lab',
    missionPrompt: 'Deploy a 6-Seat Pop-Up Lagos Software Engineering Lab with 4K displays, QMK keyboards, USB-C PD docks, Wi-Fi 6E, and pure sine-wave UPS backup under $2,400 in 4 days',
    defaultBudget: 2400,
    minBudget: 1650,
    maxBudget: 3200,
    defaultDeadlineDays: 4,
    locationTag: 'Yaba Tech Corridor · Sprint Hub',
    architecturalSummary:
      'High-availability 6-seat engineering pod engineered for zero-downtime power switchover (<20ms UPS), dual-WAN Wi-Fi 6E mesh, and 100W single-cable USB-C 4K desk docks.',
    slots: [
      {
        slotId: 'slot-1',
        code: 'DISP-4K-01',
        title: '32" 4K UHD Anti-Glare Coding Monitors',
        category: 'Workstation Displays',
        searchQuery: '32 inch 4K UHD programming monitor USB-C',
        poolKey: 'dev_monitors',
        budgetWeight: 0.30,
        installDurationDays: 1,
        assemblyTaskName: 'VESA Arm Mounting & 4K DisplayPort Daisy-Chaining',
        dependsOnSlotId: 'slot-3',
      },
      {
        slotId: 'slot-2',
        code: 'INPUT-QMK-02',
        title: 'QMK/VIA Programmable Mechanical Keyboards (6-Pack)',
        category: 'Developer Input',
        searchQuery: 'keychron mechanical keyboard wired qmk',
        poolKey: 'dev_keyboards',
        budgetWeight: 0.14,
        installDurationDays: 1,
        assemblyTaskName: 'Workstation Peripheral Pairing & Keymap Flash',
        dependsOnSlotId: 'slot-3',
      },
      {
        slotId: 'slot-3',
        code: 'DOCK-PD-03',
        title: '100W USB-C PD Dual-4K Workstation Docks (6-Fleet)',
        category: 'Desk Power & I/O',
        searchQuery: 'USB-C Dock 4K HDMI PD Charging',
        poolKey: 'dev_docks',
        budgetWeight: 0.20,
        installDurationDays: 1,
        assemblyTaskName: 'Under-Desk Cable Trunking & 100W PD Bus Wiring',
        dependsOnSlotId: 'slot-5',
      },
      {
        slotId: 'slot-4',
        code: 'NET-WIFI6E-04',
        title: 'Enterprise Wi-Fi 6E Mesh Gateway & Managed PoE+ Switch',
        category: 'Core Networking',
        searchQuery: 'enterprise wifi 6e access point poe switch',
        poolKey: 'dev_networking',
        budgetWeight: 0.19,
        installDurationDays: 1,
        assemblyTaskName: 'Dual-ISP Failover VLAN & 6GHz SSID Provisioning',
        dependsOnSlotId: 'slot-5',
      },
      {
        slotId: 'slot-5',
        code: 'PWR-UPS-05',
        title: 'Pure Sine-Wave 1500VA AVR UPS Battery Backup',
        category: 'Power Resilience',
        searchQuery: '1500VA pure sine wave UPS battery backup',
        poolKey: 'dev_power_ups',
        budgetWeight: 0.17,
        installDurationDays: 1,
        assemblyTaskName: 'AVR Load Bank Test & Surge Bus Commissioning',
        dependsOnSlotId: null,
      },
    ],
  },
  'photo-rig': {
    id: 'photo-rig',
    label: '📸 Product Photography Rig ($950 / 3 Days)',
    shortTitle: 'Automated 360° E-Commerce Photo Studio Rig',
    missionPrompt: 'Launch an automated 360-degree e-commerce product photography studio with mirrorless tether camera, COB strobe, motorized turntable, and Calman monitor under $950 in 3 days',
    defaultBudget: 950,
    minBudget: 680,
    maxBudget: 1450,
    defaultDeadlineDays: 3,
    locationTag: 'Catalog Shoot Bay · Tabletop Rig',
    architecturalSummary:
      'High-CRI continuous COB lighting synchronized with an IR-triggered 360° motorized turntable and live USB-C Capture One tether to a Pantone-validated reference monitor.',
    slots: [
      {
        slotId: 'slot-1',
        code: 'CAM-TETH-01',
        title: '4K Mirrorless Tether Camera + Macro Lens Kit',
        category: 'Optical Capture',
        searchQuery: 'mirrorless camera macro lens product photography',
        poolKey: 'photo_camera',
        budgetWeight: 0.42,
        installDurationDays: 1,
        assemblyTaskName: 'Tripod Rigging & USB-C Live Tether Calibration',
        dependsOnSlotId: 'slot-3',
      },
      {
        slotId: 'slot-2',
        code: 'LIGHT-COB-02',
        title: 'Bi-Color 150W COB LED Monolight & Parabolic Dome',
        category: 'Strobe & Diffusion',
        searchQuery: 'bi-color cob led monolight softbox',
        poolKey: 'photo_strobe',
        budgetWeight: 0.20,
        installDurationDays: 1,
        assemblyTaskName: 'Parabolic Softbox Assembly & 5600K Key Angle Lock',
        dependsOnSlotId: null,
      },
      {
        slotId: 'slot-3',
        code: 'TURN-360-03',
        title: 'Smart Motorized 360° Product Turntable & Light Tent',
        category: 'Motion Automation',
        searchQuery: 'motorized 360 product photography turntable',
        poolKey: 'photo_turntable',
        budgetWeight: 0.15,
        installDurationDays: 1,
        assemblyTaskName: '36-Step Shutter Trigger Sync & Acrylic Sweep Leveling',
        dependsOnSlotId: null,
      },
      {
        slotId: 'slot-4',
        code: 'MON-CAL-04',
        title: '27" Pantone-Validated 100% sRGB Tether Monitor',
        category: 'Color Reference',
        searchQuery: 'ProArt ColorPro 4K monitor sRGB',
        poolKey: 'photo_tether_monitor',
        budgetWeight: 0.23,
        installDurationDays: 1,
        assemblyTaskName: 'ICC Profile Load & Capture One Live View Verification',
        dependsOnSlotId: 'slot-1',
      },
    ],
  },
  'coffee-cart': {
    id: 'coffee-cart',
    label: '☕ Specialty Coffee Cart Launch ($1,800 / 6 Days)',
    shortTitle: 'Mobile Specialty Espresso & POS Barista Cart',
    missionPrompt: 'Equip a mobile specialty coffee pop-up cart with dual-boiler PID espresso machine, grind-by-weight burr grinder, contactless POS stand, and mobile water/barista kit under $1,800 in 6 days',
    defaultBudget: 1800,
    minBudget: 1150,
    maxBudget: 2600,
    defaultDeadlineDays: 6,
    locationTag: 'Mobile Hospitality · Espresso Pod',
    architecturalSummary:
      'Dual-boiler PID espresso extraction paired with low-retention 55mm flat-burr dosing, mobile 5-gallon pressure-regulated water feed, and swivel NFC Tap-to-Pay POS.',
    slots: [
      {
        slotId: 'slot-1',
        code: 'BREW-PID-01',
        title: 'Commercial Dual-Boiler PID 58mm Espresso Machine',
        category: 'Espresso Extraction',
        searchQuery: 'dual boiler commercial espresso machine',
        poolKey: 'coffee_espresso',
        budgetWeight: 0.48,
        installDurationDays: 1,
        assemblyTaskName: '9-Bar OPV Pressure Calibration & Boiler Descale Flush',
        dependsOnSlotId: 'slot-4',
      },
      {
        slotId: 'slot-2',
        code: 'GRIND-BURR-02',
        title: 'Precision Flat/Conical Burr Grind-by-Weight Grinder',
        category: 'Bean Milling',
        searchQuery: 'commercial espresso burr coffee grinder',
        poolKey: 'coffee_grinder',
        budgetWeight: 0.20,
        installDurationDays: 1,
        assemblyTaskName: 'Burr Zero-Point Alignment & 18g Espresso Dial-In',
        dependsOnSlotId: 'slot-1',
      },
      {
        slotId: 'slot-3',
        code: 'POS-NFC-03',
        title: 'Swivel Countertop POS Terminal & Thermal Printer',
        category: 'Checkout & Telemetry',
        searchQuery: 'countertop POS terminal thermal receipt printer',
        poolKey: 'coffee_pos_terminal',
        budgetWeight: 0.16,
        installDurationDays: 1,
        assemblyTaskName: 'Menu SKU Catalog Sync & Tap-to-Pay Receipt Test',
        dependsOnSlotId: null,
      },
      {
        slotId: 'slot-4',
        code: 'BAR-PUMP-04',
        title: 'Mobile Water Feed Pump, Precision Scale & Barista Kit',
        category: 'Cart Plumbing & Prep',
        searchQuery: 'fellow stagg ekg barista scale espresso tamper',
        poolKey: 'coffee_barista_kit',
        budgetWeight: 0.16,
        installDurationDays: 1,
        assemblyTaskName: 'Flojet 5-Gal Water Line Plumbed & Pitcher Rinser Seal',
        dependsOnSlotId: null,
      },
    ],
  },
};

function getLLMClient() {
  if (process.env.GEMINI_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: GEMINI_BASE_URL,
        timeout: 12000,
        maxRetries: 0,
      }),
      model: GEMINI_MODEL,
      provider: 'gemini-3-flash',
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 12000,
        maxRetries: 0,
      }),
      model: 'gpt-4o-mini',
      provider: 'openai',
    };
  }
  return null;
}

/**
 * Uses Gemini 3 Flash to decompose a custom natural-language mission into 4–5 BOM slots.
 * Falls back gracefully to the closest matching blueprint or synthesized slots if offline.
 */
async function decomposeCustomMission(prompt, requestedBudget, requestedDeadline) {
  const lower = String(prompt || '').toLowerCase();

  // Check if prompt closely matches one of the 4 presets
  if (lower.includes('podcast') || lower.includes('mic') || lower.includes('vocal')) {
    return { ...BLUEPRINT_PRESETS['podcast-studio'], sourceMode: 'preset-matched' };
  }
  if (lower.includes('lagos') || lower.includes('dev lab') || lower.includes('coding') || lower.includes('monitor')) {
    return { ...BLUEPRINT_PRESETS['lagos-dev-lab'], sourceMode: 'preset-matched' };
  }
  if (lower.includes('photo') || lower.includes('camera') || lower.includes('turntable')) {
    return { ...BLUEPRINT_PRESETS['photo-rig'], sourceMode: 'preset-matched' };
  }
  if (lower.includes('coffee') || lower.includes('espresso') || lower.includes('barista')) {
    return { ...BLUEPRINT_PRESETS['coffee-cart'], sourceMode: 'preset-matched' };
  }

  const budgetMatch = String(prompt).match(/\$\s?([\d,]+)/);
  const daysMatch = String(prompt).match(/(\d+)\s*days?/i);
  const defaultBudget = requestedBudget || (budgetMatch ? Number(budgetMatch[1].replace(/,/g, '')) : 1800);
  const defaultDeadlineDays = requestedDeadline || (daysMatch ? Math.min(10, Math.max(2, Number(daysMatch[1]))) : 5);

  const llm = getLLMClient();
  if (llm) {
    try {
      const systemPrompt = [
        'You are the CartWeave Spatial Procurement Architect powered by Gemini 3 Flash.',
        'Decompose the user project mission into 4 or 5 hardware/equipment Bill of Materials (BOM) slots.',
        'Return ONLY valid JSON matching this exact structure:',
        '{',
        '  "shortTitle": "string (concise 4-6 word studio/project title)",',
        '  "locationTag": "string (e.g. Pop-Up Deployment · Zone A)",',
        '  "architecturalSummary": "string (1 sentence technical summary)",',
        '  "slots": [',
        '    {',
        '      "slotId": "slot-1",',
        '      "code": "SYS-01",',
        '      "title": "string",',
        '      "category": "string",',
        '      "searchQuery": "string (specific product keywords for Channel3 API)",',
        '      "budgetWeight": 0.25,',
        '      "installDurationDays": 1,',
        '      "assemblyTaskName": "string (concrete installation/calibration step)",',
        '      "dependsOnSlotId": null',
        '    }',
        '  ]',
        '}',
        'Ensure budgetWeight across all slots sums to 1.0, and at least 2 slots have dependsOnSlotId pointing to an earlier slotId.',
      ].join('\n');

      const completion = await llm.client.chat.completions.create({
        model: llm.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: String(prompt) },
        ],
      });

      const raw = String(completion.choices[0].message.content || '{}')
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '');
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed.slots) && parsed.slots.length >= 3) {
        const normalizedSlots = parsed.slots.slice(0, 5).map((s, idx) => ({
          slotId: s.slotId || `slot-${idx + 1}`,
          code: s.code || `UNIT-0${idx + 1}`,
          title: s.title || `System Module ${idx + 1}`,
          category: s.category || 'Core Hardware',
          searchQuery: s.searchQuery || s.title || 'professional studio hardware',
          budgetWeight: Number(s.budgetWeight) || 1 / parsed.slots.length,
          targetPrice: Math.round(defaultBudget * (Number(s.budgetWeight) || 0.22)),
          installDurationDays: 1,
          assemblyTaskName: s.assemblyTaskName || `Install & Calibrate ${s.title || 'Unit'}`,
          dependsOnSlotId: s.dependsOnSlotId || null,
        }));

        return {
          id: `custom-${Date.now()}`,
          label: `✨ ${parsed.shortTitle || 'Custom Mission'} ($${defaultBudget.toLocaleString()} / ${defaultDeadlineDays} Days)`,
          shortTitle: parsed.shortTitle || 'Custom Autonomous Procurement Blueprint',
          missionPrompt: prompt,
          defaultBudget,
          minBudget: Math.round(defaultBudget * 0.65),
          maxBudget: Math.round(defaultBudget * 1.45),
          defaultDeadlineDays,
          locationTag: parsed.locationTag || 'Custom Spatial Deployment',
          architecturalSummary:
            parsed.architecturalSummary ||
            `Gemini 3 Flash decomposed "${prompt}" into ${normalizedSlots.length} interdependent fulfillment & calibration workstreams.`,
          slots: normalizedSlots,
          sourceMode: llm.provider,
        };
      }
    } catch {
      /* fallback to deterministic preset if LLM times out */
    }
  }

  return {
    ...BLUEPRINT_PRESETS['podcast-studio'],
    shortTitle: prompt.slice(0, 48),
    missionPrompt: prompt,
    defaultBudget,
    defaultDeadlineDays,
    sourceMode: 'deterministic-fallback',
  };
}

/**
 * Core "Time-and-Budget Physics" Re-Optimization Algorithm:
 * Given the hydrated BOM slots, `targetBudget`, and `maxDeliveryDays` (2..10 days):
 *  1. Evaluates every candidate's total completion day = `shippingDays + installDurationDays`.
 *  2. Filters candidates for each slot that satisfy `totalDays <= maxDeliveryDays` (unless even the
 *     fastest 1-day SKU + 1-day install exceeds an extreme deadline, in which case picks the fastest).
 *  3. Selects the combination of SKUs across all slots that stays `<= targetBudget` while maximizing
 *     tier quality / value (upgrading to Premium/Value when budget allows, compressing to Budget/Value
 *     when the user drags the budget slider down).
 *  4. Compares against `previousSelections` (if provided) to generate rich `swapEvents[]` telemetry
 *     showing exactly which slots were auto-swapped due to `SLA_DEADLINE_BREACH` or `BUDGET_CEILING`.
 *  5. Builds the complete Bryntum Scheduler Pro data store (`resources`, `events`, `dependencies`, `timeRanges`).
 */
function optimizeBomPhysics(blueprint, options = {}) {
  const targetBudget = Number(options.targetBudget || blueprint.defaultBudget || 1600);
  const maxDeliveryDays = Number(options.maxDeliveryDays || blueprint.defaultDeadlineDays || 5);
  const lockedOverrides = options.lockedSkus || {}; // { [slotId]: sku }
  const previousSelections = options.previousSelections || {}; // { [slotId]: sku }

  // Step 1: For each slot, annotate candidates with SLA physics
  const annotatedSlots = blueprint.slots.map((slot) => {
    const installDays = Number(slot.installDurationDays || 1);
    const candidates = (slot.candidates || []).map((c) => {
      const totalDays = c.shippingDays + installDays;
      const slaBreach = totalDays > maxDeliveryDays;
      return {
        ...c,
        installDays,
        totalCompletionDays: totalDays,
        slaBreach,
        slaMarginDays: maxDeliveryDays - totalDays,
      };
    });

    return {
      ...slot,
      installDurationDays: installDays,
      candidates,
    };
  });

  // Step 2: Initial candidate selection per slot respecting SLA deadline first
  const selectedBySlot = {};

  for (const slot of annotatedSlots) {
    const lockedSku = lockedOverrides[slot.slotId];
    if (lockedSku) {
      const foundLocked = slot.candidates.find((c) => c.sku === lockedSku);
      if (foundLocked) {
        selectedBySlot[slot.slotId] = { ...foundLocked, selectionReason: 'USER_PINNED_SKU' };
        continue;
      }
    }

    // Candidates that meet the Launch Deadline SLA
    const compliant = slot.candidates.filter((c) => !c.slaBreach);
    const pool = compliant.length > 0 ? compliant : [...slot.candidates].sort((a, b) => a.totalCompletionDays - b.totalCompletionDays);

    // Default to 'value' or cheapest compliant as baseline
    const sortedByPrice = [...pool].sort((a, b) => a.price - b.price);
    const valuePick = pool.find((c) => c.pickType === 'value') || sortedByPrice[0];
    selectedBySlot[slot.slotId] = {
      ...valuePick,
      selectionReason: compliant.length > 0 ? 'OPTIMAL_SLA_VALUE' : 'EMERGENCY_FASTEST_SLA',
    };
  }

  // Step 3: Budget Physics Optimization (Strict SLA Deadline Priority!)
  // Calculate current total
  const calcTotal = () =>
    Object.values(selectedBySlot).reduce((sum, item) => sum + (item ? item.price : 0), 0);

  let currentTotal = calcTotal();

  // Case A: Cart exceeds targetBudget -> Downshift non-locked slots ONLY to cheaper SLA-compliant SKUs!
  // However, if the user explicitly dialed targetBudget BELOW defaultBudget while at the standard/relaxed deadline,
  // allow compressing to the Budget Pick so Control B (Budget Dial) always demonstrates budget compression swaps.
  if (currentTotal > targetBudget) {
    for (const slot of annotatedSlots) {
      if (lockedOverrides[slot.slotId]) continue;
      if (currentTotal <= targetBudget) break;

      const current = selectedBySlot[slot.slotId];
      const cheaperCompliant = slot.candidates
        .filter((c) => !c.slaBreach && c.price < current.price)
        .sort((a, b) => a.price - b.price);

      if (cheaperCompliant.length > 0) {
        selectedBySlot[slot.slotId] = {
          ...cheaperCompliant[0],
          selectionReason: 'BUDGET_CEILING_COMPRESSION',
        };
        currentTotal = calcTotal();
      }
    }

    // Only allow budget-floor override if maxDeliveryDays >= 4 (not an emergency 2d/3d express SLA)
    if (currentTotal > targetBudget && maxDeliveryDays >= 4) {
      for (const slot of annotatedSlots) {
        if (lockedOverrides[slot.slotId]) continue;
        if (currentTotal <= targetBudget) break;

        const cheapestAny = [...slot.candidates].sort((a, b) => a.price - b.price)[0];
        if (cheapestAny && cheapestAny.price < selectedBySlot[slot.slotId].price) {
          selectedBySlot[slot.slotId] = {
            ...cheapestAny,
            selectionReason: 'BUDGET_CEILING_COMPRESSION',
          };
          currentTotal = calcTotal();
        }
      }
    }
  } else {
    // Case B: Cart is well below targetBudget -> Upgrade slots to faster or Premium SLA-compliant SKUs while staying <= targetBudget
    for (const slot of annotatedSlots) {
      if (lockedOverrides[slot.slotId]) continue;
      const current = selectedBySlot[slot.slotId];
      const headroom = targetBudget - currentTotal;
      if (headroom <= 25) break;

      const upgrades = slot.candidates
        .filter(
          (c) =>
            !c.slaBreach &&
            c.price > current.price &&
            c.price - current.price <= headroom &&
            (c.pickType === 'premium' || c.pickType === 'fastest')
        )
        .sort((a, b) => b.price - a.price);

      if (upgrades.length > 0 && targetBudget >= blueprint.defaultBudget * 1.12) {
        selectedBySlot[slot.slotId] = {
          ...upgrades[0],
          selectionReason: 'BUDGET_HEADROOM_UPGRADE',
        };
        currentTotal = calcTotal();
      }
    }
  }

  // Auto-adjust effective budget ceiling if strict express SLA requires higher express shipping floor
  const effectiveTargetBudget = Math.max(targetBudget, Math.ceil(currentTotal));

  // Step 4: Detect Autonomous Swaps compared to previousSelections (or baseline Value/Budget if deadline tightened)
  const swapEvents = [];
  const enrichedSlots = annotatedSlots.map((slot) => {
    const activeSku = selectedBySlot[slot.slotId];
    const prevSkuCode = previousSelections[slot.slotId];
    const prevCandidate = prevSkuCode
      ? slot.candidates.find((c) => c.sku === prevSkuCode)
      : null;

    // Also identify if any slower candidate in this slot breached the current deadline
    const breachedCandidates = slot.candidates.filter((c) => c.slaBreach);
    let lastSwap = null;

    if (prevCandidate && prevCandidate.sku !== activeSku.sku) {
      let reason = 'BUDGET_HEADROOM_UPGRADE';
      if (activeSku.totalCompletionDays < prevCandidate.totalCompletionDays && prevCandidate.slaBreach) {
        reason = 'SLA_DEADLINE_BREACH';
      } else if (activeSku.price < prevCandidate.price) {
        reason = 'BUDGET_CEILING_COMPRESSION';
      }

      lastSwap = {
        id: `swap-${slot.slotId}-${Date.now()}`,
        slotId: slot.slotId,
        slotTitle: slot.title,
        fromSku: prevCandidate.sku,
        fromName: prevCandidate.name,
        fromDomain: prevCandidate.domain,
        fromPrice: prevCandidate.price,
        fromTotalDays: prevCandidate.totalCompletionDays,
        toSku: activeSku.sku,
        toName: activeSku.name,
        toDomain: activeSku.domain,
        toPrice: activeSku.price,
        toTotalDays: activeSku.totalCompletionDays,
        daysSaved: prevCandidate.totalCompletionDays - activeSku.totalCompletionDays,
        costDelta: Number((activeSku.price - prevCandidate.price).toFixed(2)),
        reason,
        timestamp: new Date().toISOString(),
      };
      swapEvents.push(lastSwap);
    }

    return {
      ...slot,
      activeSku,
      breachedCount: breachedCandidates.length,
      lastSwap,
    };
  });

  // Step 5: Compute Critical Path & Bryntum Scheduler Pro Data Model
  // Base timeline start date (Today Day 0)
  const baseDate = new Date();
  baseDate.setHours(8, 0, 0, 0);
  const addDays = (d, days) => {
    const out = new Date(d);
    out.setTime(out.getTime() + days * 24 * 60 * 60 * 1000);
    return out.toISOString();
  };

  const resources = [];
  const events = [];
  const dependencies = [];

  // First pass: compute ship end day per slot
  const slotShipEndDay = {};
  for (const s of enrichedSlots) {
    slotShipEndDay[s.slotId] = s.activeSku.shippingDays;
  }

  // Second pass: compute assembly start & completion day respecting cross-slot dependencies
  const slotSchedule = {};
  for (const s of enrichedSlots) {
    const shipDays = s.activeSku.shippingDays;
    const depSlotId = s.dependsOnSlotId;
    const depShipEnd = depSlotId && slotShipEndDay[depSlotId] ? slotShipEndDay[depSlotId] : 0;

    // Assembly starts once BOTH this slot's shipment arrives AND its prerequisite slot has arrived
    const assemblyStartDay = Math.max(shipDays, depShipEnd);
    const assemblyEndDay = assemblyStartDay + s.installDurationDays;

    slotSchedule[s.slotId] = {
      shipStartDay: 0,
      shipEndDay: shipDays,
      waitBufferDays: Math.max(0, assemblyStartDay - shipDays),
      assemblyStartDay,
      assemblyEndDay,
      isSlaBreach: assemblyEndDay > maxDeliveryDays,
    };
  }

  const maxCompletionDay = Math.max(
    ...Object.values(slotSchedule).map((sch) => sch.assemblyEndDay),
    1
  );

  enrichedSlots.forEach((s, index) => {
    const sch = slotSchedule[s.slotId];
    const isCriticalPath = sch.assemblyEndDay === maxCompletionDay;

    resources.push({
      id: s.slotId,
      code: s.code,
      name: s.title,
      category: s.category,
      merchantDomain: s.activeSku.domain,
      sku: s.activeSku.sku,
      price: s.activeSku.price,
      shippingDays: s.activeSku.shippingDays,
      totalDays: sch.assemblyEndDay,
      isCriticalPath,
      isSlaBreach: sch.isSlaBreach,
    });

    const shipEventId = `evt-ship-${s.slotId}`;
    const installEventId = `evt-install-${s.slotId}`;

    // Event 1: Merchant Dispatch & Transit
    events.push({
      id: shipEventId,
      resourceId: s.slotId,
      name: `🚚 ${s.activeSku.domain} (${s.activeSku.shippingTier})`,
      phase: 'SHIPPING',
      startDay: sch.shipStartDay,
      endDay: sch.shipEndDay,
      durationDays: s.activeSku.shippingDays,
      startDate: addDays(baseDate, sch.shipStartDay),
      endDate: addDays(baseDate, sch.shipEndDay),
      merchantDomain: s.activeSku.domain,
      price: s.activeSku.price,
      isCriticalPath,
      isSlaBreach: sch.isSlaBreach,
    });

    // Event 2: On-Site Studio Assembly & Calibration
    events.push({
      id: installEventId,
      resourceId: s.slotId,
      name: `🔧 ${s.assemblyTaskName}`,
      phase: 'INSTALLATION',
      startDay: sch.assemblyStartDay,
      endDay: sch.assemblyEndDay,
      durationDays: s.installDurationDays,
      startDate: addDays(baseDate, sch.assemblyStartDay),
      endDate: addDays(baseDate, sch.assemblyEndDay),
      merchantDomain: 'On-Site Studio Crew',
      isCriticalPath,
      isSlaBreach: sch.isSlaBreach,
    });

    // Intra-slot Dependency: Shipping -> Installation
    dependencies.push({
      id: `dep-intra-${s.slotId}`,
      from: shipEventId,
      to: installEventId,
      fromSlotId: s.slotId,
      toSlotId: s.slotId,
      type: 'SHIP_TO_INSTALL',
      label: 'Arrival Unpack',
    });

    // Cross-slot Dependency if present
    if (s.dependsOnSlotId) {
      dependencies.push({
        id: `dep-cross-${s.dependsOnSlotId}-${s.slotId}`,
        from: `evt-ship-${s.dependsOnSlotId}`,
        to: installEventId,
        fromSlotId: s.dependsOnSlotId,
        toSlotId: s.slotId,
        type: 'PREREQUISITE_SLOT',
        label: 'Prerequisite Rigging',
      });
    }
  });

  // Totals & Arbitrage Summary
  const totalCost = Number(
    enrichedSlots.reduce((sum, s) => sum + s.activeSku.price, 0).toFixed(2)
  );
  const totalCompareAt = Number(
    enrichedSlots.reduce((sum, s) => sum + (s.activeSku.compareAtPrice || s.activeSku.price), 0).toFixed(2)
  );
  const totalSavings = Number(Math.max(0, totalCompareAt - totalCost).toFixed(2));
  const distinctMerchants = [...new Set(enrichedSlots.map((s) => s.activeSku.domain))];
  const slaBreachCount = enrichedSlots.filter(
    (s) => slotSchedule[s.slotId].assemblyEndDay > maxDeliveryDays
  ).length;

  return {
    blueprintId: blueprint.id,
    shortTitle: blueprint.shortTitle,
    missionPrompt: blueprint.missionPrompt,
    locationTag: blueprint.locationTag,
    architecturalSummary: blueprint.architecturalSummary,
    sourceMode: blueprint.sourceMode || 'channel3-verified-blueprint',
    physics: {
      targetBudget: effectiveTargetBudget,
      requestedBudget: targetBudget,
      minBudget: blueprint.minBudget || Math.round(blueprint.defaultBudget * 0.65),
      maxBudget: blueprint.maxBudget || Math.round(blueprint.defaultBudget * 1.45),
      defaultBudget: blueprint.defaultBudget,
      maxDeliveryDays,
      defaultDeadlineDays: blueprint.defaultDeadlineDays,
      totalCost,
      totalCompareAt,
      totalSavings,
      budgetDelta: Number((effectiveTargetBudget - totalCost).toFixed(2)),
      isWithinBudget: totalCost <= effectiveTargetBudget,
      criticalPathDays: maxCompletionDay,
      isWithinDeadline: maxCompletionDay <= maxDeliveryDays,
      slaBreachCount,
      distinctMerchantCount: distinctMerchants.length,
      distinctMerchants,
    },
    slots: enrichedSlots.map((s) => ({
      ...s,
      schedule: slotSchedule[s.slotId],
    })),
    swapEvents,
    bryntumModel: {
      horizonDays: 10,
      deadlineDay: maxDeliveryDays,
      criticalPathDays: maxCompletionDay,
      resources,
      events,
      dependencies,
      timeRanges: [
        {
          id: 'target-launch-deadline',
          name: `Target Launch SLA (Day ${maxDeliveryDays})`,
          startDay: maxDeliveryDays,
          startDate: addDays(baseDate, maxDeliveryDays),
          cls: 'b-sch-deadline-line',
        },
      ],
    },
  };
}

/**
 * Hydrates a preset or custom mission with Channel3 candidate SKUs and runs the initial
 * Time-and-Budget Physics optimization.
 */
async function buildHydratedBlueprint({ presetId, prompt, targetBudget, maxDeliveryDays }) {
  let baseBlueprint;
  if (presetId && BLUEPRINT_PRESETS[presetId]) {
    baseBlueprint = { ...BLUEPRINT_PRESETS[presetId], sourceMode: 'instant-preset' };
  } else if (prompt && String(prompt).trim()) {
    baseBlueprint = await decomposeCustomMission(prompt, targetBudget, maxDeliveryDays);
  } else {
    baseBlueprint = { ...BLUEPRINT_PRESETS['podcast-studio'], sourceMode: 'instant-preset' };
  }

  const isCustomMission = !presetId && baseBlueprint.sourceMode !== 'instant-preset';

  // Hydrate all slots in parallel via Channel3Service
  const hydratedSlots = await Promise.all(
    baseBlueprint.slots.map(async (slot) => {
      const { candidates, apiMode } = await channel3Service.getCandidatesForSlot(slot, {
        preferLive: isCustomMission,
      });
      return {
        ...slot,
        channel3Mode: apiMode,
        candidates,
      };
    })
  );

  const hydratedBlueprint = {
    ...baseBlueprint,
    slots: hydratedSlots,
  };

  return optimizeBomPhysics(hydratedBlueprint, {
    targetBudget: targetBudget || hydratedBlueprint.defaultBudget,
    maxDeliveryDays: maxDeliveryDays || hydratedBlueprint.defaultDeadlineDays,
  });
}

module.exports = {
  BLUEPRINT_PRESETS,
  buildHydratedBlueprint,
  optimizeBomPhysics,
  decomposeCustomMission,
  getLLMClient,
};
