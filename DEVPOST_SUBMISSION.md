# 🏆 Devpost Submission Guide — CartWeave (ChronosCart)

## Project Title
**CartWeave (ChronosCart): Autonomous Multi-Merchant Procurement & Time-Physics Engine**

## Tagline (Short Pitch)
Decompose any launch mission into a multi-merchant Bill of Materials with Gemini 3 Flash, arbitrage real-time SKUs via Channel3, manipulate Time-and-Budget Physics on a live Bryntum Scheduler, and settle 5 retailers in 1 PayPal Order + Split Invoice.

---

## 🎯 Target Prize Tracks
1. **Best Use of Agentic Commerce ($5,000)** — Eliminates multi-site checkout friction by acting as an Autonomous Multi-Merchant Settlement Orchestrator using **PayPal Sandbox Orders v2 (`POST /v2/checkout/orders`)**, **Order Capture (`POST /v2/checkout/orders/:id/capture`)**, and **PayPal Invoicing v2 (`POST /v2/invoicing/invoices`)**.
2. **Most Creative ($5,000)** — Replaces the passive shopping cart and generic chatbot with a tactile **"Time-and-Budget Physics" Studio**: drag the Launch Deadline line earlier on the timeline and watch the AI Agent automatically swap slow-shipping retailers for Next-Day Express merchants in real time.
3. **Best Use of Channel3 ($1,500)** — Parallel multi-slot SKU discovery (`POST https://api.trychannel3.com/v1/search`) hydrating every BOM slot with 4 real swappable merchant tiers (`Fastest Shipping Pick`, `Best Value Pick`, `Budget Pick`, `Premium Flagship Pick`), live discount spreads, and verified merchant domains.
4. **Best Use of Bryntum ($1,000 x3)** — Integrates the official `@bryntum/scheduler` (`v7.3.0`) & `@bryntum/scheduler-react` SDK bound to live `ResourceStore`, `EventStore`, and `DependencyStore` models (`Merchant Dispatch & Transit` ➔ `Studio Assembly & Calibration`) paired with an interactive critical-path SLA canvas.

---

## 💡 Inspiration
When launching a real-world physical project—like a **4-Person Broadcast Podcast Studio**, a **Pop-Up 6-Seat Lagos Engineering Lab**, or a **Specialty Coffee Cart**—buying the gear is a logistical nightmare.
1. You need 5 interdependent hardware categories that rely on each other for installation.
2. Checking 5 different retailers (`bestbuy.com`, `bhphotovideo.com`, `cdw.com`, `newegg.com`, `sweetwater.com`) for both **price** AND **shipping lead time** takes hours.
3. If **one** prerequisite item (like the USB-C Docking Fleet or Broadcast Boom Arms) ships in 5 days instead of 2 days, your entire studio launch misses its deadline!
4. Finally, you have to endure 5 separate checkout flows and reconcile 5 separate receipts.

We built **CartWeave (ChronosCart)** to turn multi-merchant procurement into an interactive **Time-and-Budget Physics Studio**.

---

## ⚙️ What It Does (The 4 Core Mechanics)

### 1. Goal & Visual Blueprint Decomposition (Gemini 3 Flash)
Users type any mission (or click 1 of 4 instant Blueprint Presets):
- `🎙️ 4-Person Podcast Studio ($1,600 / 5 Days)`
- `💻 Pop-Up 6-Seat Lagos Dev Lab ($2,400 / 4 Days)`
- `📸 Product Photography Rig ($950 / 3 Days)`
- `☕ Specialty Coffee Cart Launch ($1,800 / 6 Days)`

**Gemini 3 Flash** (`gemini-3-flash-preview`) decomposes the goal into a 4–5 slot interdependent Bill of Materials (BOM) with budget weights, specific Channel3 search queries, on-site assembly durations, and cross-slot installation dependencies.

### 2. Live Multi-Retailer SKU Arbitrage (Channel3 API)
For every BOM slot, `services/channel3Service.js` queries `POST https://api.trychannel3.com/v1/search` in parallel, extracting real products, merchant domains, live prices, and `compare_at_price` discounts, and hydrates 4 swappable options per slot:
- **Fastest Shipping Pick** (1-Day Express Air)
- **Best Value Pick** (2-Day Priority)
- **Budget Pick** (4–5 Day Economy Ground)
- **Premium Flagship Pick** (Top-Spec Commercial Grade)

### 3. "Time-and-Budget Physics" Interactive Bryntum Scheduler (`FulfillmentScheduler.jsx`)
Instead of a static cart list, the centerpiece is our dual-mode **Bryntum Fulfillment & Critical-Path Scheduler** (`@bryntum/scheduler-react` v7.3.0 + interactive Physics SLA Canvas):
- **Control A — The Hard Launch Deadline Slider / Draggable SLA Line (2 to 10 Days):** Dragging the launch deadline from Day 5 down to Day 2 or Day 3 immediately flags any slow-shipping merchant as an `SLA BREACH` and triggers an **Autonomous Physics Swap** to a 1-day express Channel3 merchant (`bhphotovideo.com`, `bestbuy.com`, `sweetwater.com`) so the project finishes on time.
- **Control B — The Live Target Budget Ceiling Dial:** Dragging the total budget slider down dynamically compresses non-pinned slots to Budget/Value Channel3 SKUs so the active cart never exceeds the user's budget ceiling.

### 4. Unified PayPal Multi-Merchant Cart & Split Invoice Settlement
Once the timeline and budget are locked in, the **PayPal Multi-Merchant Settlement Dock** eliminates checking out across 5 websites:
- **Workflow 1 (`POST /v2/checkout/orders`):** Creates a single live PayPal Sandbox Order containing itemized `purchase_units[0].items` for every Channel3 merchant SKU, `NO_SHIPPING` clean checkout, and a SHA-256 bundle hash (`custom_id: cw_sha256:...`).
- **Workflow 2 (`POST /v2/checkout/orders/:id/capture`):** Verifies live Sandbox order approval status and executes instant payment capture.
- **Workflow 3 (`POST /v2/invoicing/invoices`):** Generates a live PayPal Sandbox Split Vendor Draft Invoice (`INV2-...`) itemizing each retailer's SKU, SLA window, and Channel3 arbitrage savings.

---

## 🛠️ How We Built It
- **Frontend:** React 19, Vite, Tailwind CSS v4, `lucide-react`, and official **`@bryntum/scheduler` (`v7.3.0`) + `@bryntum/scheduler-react`** (`<BryntumScheduler />` with Stockholm Light theme).
- **Backend:** Node.js + Express (`server.js`) orchestrating `services/channel3Service.js`, `services/bomEngine.js`, and `services/paypalService.js`.
- **AI & Sponsor APIs:**
  - **Google Gemini 3 Flash** (`gemini-3-flash-preview` via `https://generativelanguage.googleapis.com/v1beta/openai/`)
  - **Channel3 Product Intelligence API** (`POST https://api.trychannel3.com/v1/search`)
  - **PayPal REST APIs** (`POST /v1/oauth2/token`, `POST /v2/checkout/orders`, `POST /v2/checkout/orders/:id/capture`, `POST /v2/invoicing/invoices`)

---

## 🤖 Mandatory AI Tools & Models Statement
- **Runtime AI Model:** Google **Gemini 3 Flash** (`gemini-3-flash-preview`) via the `openai` Node.js SDK for decomposing natural-language project missions into multi-slot hardware BOMs and installation dependency graphs.
- **Development AI Assistant:** **Google Antigravity** used during development for full-stack architecture, UI styling, and automated API verification tests.

---

## 🎬 2-Minute 40-Second YouTube Demo Video Script

### **0:00 – 0:25 | The Hook: Why Multi-Merchant Project Buying is Broken**
> *"When you're launching a real-world project—like a 4-person podcast studio or a 6-seat pop-up engineering lab—you don't buy a single item. You buy 5 interdependent hardware systems across 5 different retailers. If just one prerequisite shipment is delayed by 3 days, your entire launch misses its deadline, and you still have to complete 5 separate checkouts. Meet **CartWeave (ChronosCart)**: the Autonomous Multi-Merchant Procurement and Time-Physics Studio."*

### **0:25 – 0:55 | Mechanic 1 & 2: Gemini 3 Flash BOM Decomposition + Live Channel3 Arbitrage**
> *[Action: Click the **"💻 Pop-Up 6-Seat Lagos Dev Lab ($2,400 / 4 Days)"** preset pill at the top, or type a custom mission into the prompt bar.]*
> *"With one click—or any custom natural-language mission decomposed by **Gemini 3 Flash**—CartWeave generates a 5-slot interdependent Bill of Materials: 4K Coding Monitors, QMK Mechanical Keyboards, 100W USB-C Docks, Enterprise Wi-Fi 6E, and Pure Sine-Wave UPS Backup. In parallel, our backend queries the live **Channel3 API** (`POST /v1/search`), hydrating every slot with 4 real swappable merchant options—Fastest Shipping, Best Value, Budget, and Premium—across verified retailers like CDW, Newegg, BestBuy, B&H Photo, and Adorama."*

### **0:55 – 1:45 | Mechanic 3: Time-and-Budget Physics on the Live Bryntum Scheduler**
> *[Action: Point to the **Bryntum Fulfillment & Critical-Path Scheduler** in the center. Drag the orange **SLA: DAY 4** vertical line left to **DAY 2**, or click the `2d SLA` button.]*
> *"Here is our centerpiece: the **Bryntum-powered Fulfillment & Critical-Path Scheduler**, running both our interactive Physics SLA Canvas and the live mounted **`@bryntum/scheduler-react`** engine below it. Watch what happens when our launch deadline suddenly tightens from 4 days down to **2 days**."*
> *[Action: Show the Autonomous Physics Swap Telemetry box and the `⚡ AUTO-SWAPPED` badges on the BOM cards below.]*
> *"Immediately, any merchant taking more than 2 days flags an SLA Breach, and our Physics Engine **autonomously swaps** the Wi-Fi 6E Mesh and UPS Backup from 3-day freight to **1-day Express Air** via B&H Photo and BestBuy! Now watch **Control B: the Target Budget Ceiling Dial**."*
> *[Action: Drag Control B (Target Budget Slider) down from $2,400 to $1,900. Also click **"Swap SKU (4 Channel3 Options)"** on a BOM card and click **"Bryntum Store"** to briefly show the live store JSON.]*
> *"As we dial our budget ceiling down to $1,900, the Agent dynamically compresses our Monitors, Keyboards, and Docks to Channel3's highest-value SKUs—saving over $450 off MSRP while staying strictly under our $1,900 cap!"*

### **1:45 – 2:40 | Mechanic 4: Unified PayPal Multi-Merchant Order v2, Capture & Split Invoice v2**
> *[Action: Scroll/focus on the right-hand **PayPal Multi-Merchant Settlement Dock**.]*
> *"Finally, instead of checking out across 5 separate retailer websites, CartWeave acts as the Unified Settlement Orchestrator powered by **PayPal Orders v2** and **Invoicing v2**."*
> *[Action: Click **"1. Create PayPal Multi-Merchant Order"**.]*
> *"With one click, we call `POST /v2/checkout/orders` in PayPal Sandbox, consolidating all 5 Channel3 retailers into a single itemized order embedded with a cryptographic SHA-256 bundle hash. Judges can copy the Sandbox Buyer credentials right here with 1 click, click **Approve in PayPal**, and click **2. Verify / Capture** (`POST /v2/checkout/orders/:id/capture`)."*
> *[Action: Click **"3. Generate Split Vendor Bill (PayPal Invoicing v2)"** and point to the `INV2-...` receipt card.]*
> *"And for enterprise procurement teams, clicking **Generate Split Vendor Bill** calls `POST /v2/invoicing/invoices` to issue a live PayPal Sandbox Draft Invoice itemizing every Channel3 merchant SKU, shipping SLA, and arbitrage discount. That's CartWeave—Autonomous Time-and-Budget Physics for Agentic Commerce."*
