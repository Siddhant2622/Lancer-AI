# Lancer AI 🛡️⚡
> **Autonomous Milestone Escrow & Multi-Agent Arbitration Platform for the Agentic Economy**  
> *Built for the "Build What's Next with PayPal and AI" Hackathon 2026*

---

## 🌟 Executive Summary

**Lancer AI** solves the billion-dollar trust gap in freelance contracts and agency development. Instead of clients paying upfront for unverified code or freelancers chasing unpaid invoices, Lancer AI:
1. **Locks funds in escrow** using **PayPal Orders v2 (`intent: "AUTHORIZE"`)** without capturing upfront capital.
2. **Audits deliverables** using a **3-Agent AI Tribunal** (Spec & Code Auditor, Multimodal Vision & UX Inspector, Financial Risk Arbiter).
3. **Disburses payments autonomously** via **PayPal Partial Captures (`final_capture: false`)** and **PayPal Batch Payouts API** to multiple micro-agency squad members.
4. **Shields freelancers against chargebacks** by auto-linking tamper-evident **SHA-256 cryptographic certificates** to the **PayPal Disputes API**.

---

## 🏛️ System Architecture

```
                  [Client & Freelancer Milestone Contract]
                                     |
          +-----------------------------------------------------+
          |       PayPal Orders v2 API (intent: AUTHORIZE)       |
          |  Locks $4,000 budget in PayPal Escrow (AUTH-ID)     |
          +-----------------------------------------------------+
                                     |
                                     v
                  [Freelancer Submits Milestone Evidence]
              (GitHub PR diff + Live Staging URL + Figma Spec)
                                     |
    +--------------------------------+--------------------------------+
    |                                |                                |
    v                                v                                v
+-----------------------+  +-----------------------+  +-----------------------+
|  AGENT 1: CODE AUDITOR|  | AGENT 2: UX INSPECTOR |  | AGENT 3: RISK ARBITER |
+-----------------------+  +-----------------------+  +-----------------------+
| • AST diff scan       |  | • Multimodal Figma vs |  | • Check Auth validity |
| • CI/CD tests (42/42) |  |   live DOM snapshot   |  | • Synthesize scores   |
| • Coverage threshold  |  | • Viewport parity     |  | • Calculate capture   |
| • AST secret scan     |  | • PayPal button audit |  | • Split disbursement  |
+-----------------------+  +-----------------------+  +-----------------------+
    |                                |                                |
    +--------------------------------+--------------------------------+
                                     |
                                     v
                  [Tribunal Consensus & Settlement Engine]
                                     |
    +--------------------------------+--------------------------------+
    | (Score >= 90%)                 | (Score 65% - 89%)              | (Score < 65%)
    v                                v                                v
[FULL TRANCHE RELEASE]     [AI MEDIATED SETTLEMENT]     [AUTOMATIC REJECTION]
• 100% Partial Capture     • 80% Capture released       • Zero disbursement
• Batch Payout to squad    • 20% Sub-milestone hold     • Step-by-step
• SHA-256 Certificate      • Dual-signature proposal      remediation checklist
```

---

## 💳 Deep PayPal API Choreography

### Phase 1: Multi-Milestone Budget Reservation (Orders v2 + Authorizations v2)
Client reserves the full contract budget ($4,000) across all itemized milestones without disbursing upfront funds.
```typescript
POST https://api-m.sandbox.paypal.com/v2/checkout/orders
{
  "intent": "AUTHORIZE",
  "purchase_units": [{
    "reference_id": "ESC_8842",
    "amount": { "currency_code": "USD", "value": "4000.00" },
    "items": [
      { "name": "M1: System Architecture & Auth Schema", "unit_amount": { "value": "1000.00", "currency_code": "USD" }, "quantity": "1" },
      { "name": "M2: Core Payment Webhooks & Cart UI", "unit_amount": { "value": "1500.00", "currency_code": "USD" }, "quantity": "1" },
      { "name": "M3: Load Testing & Production Handover", "unit_amount": { "value": "1500.00", "currency_code": "USD" }, "quantity": "1" }
    ]
  }]
}
```

### Phase 2: Partial Capture & Micro-Agency Batch Payout (Captures v2 + Payouts v1)
When Milestone 2 passes verification ($1,500), Lancer AI captures **only** $1,500 while keeping the remaining $1,500 safely locked (`final_capture: false`). Immediately upon capture, it triggers a multi-recipient batch payout:
```typescript
// 2A. Partial Capture
POST https://api-m.sandbox.paypal.com/v2/payments/authorizations/AUTH-9XK284710L/capture
{
  "amount": { "currency_code": "USD", "value": "1500.00" },
  "final_capture": false
}

// 2B. Micro-Agency Split Payout via PayPal Payouts API
POST https://api-m.sandbox.paypal.com/v1/payments/payouts
{
  "sender_batch_header": {
    "sender_batch_id": "BATCH_8822_DISBURSE",
    "email_subject": "Lancer AI: Milestone 2 Funds Disbursed!"
  },
  "items": [
    {
      "recipient_type": "EMAIL",
      "amount": { "value": "1050.00", "currency_code": "USD" }, // 70% Lead Backend Dev
      "receiver": "lead-dev-sandbox@nexus.example.com",
      "sender_item_id": "M2_SPLIT_DEV"
    },
    {
      "recipient_type": "EMAIL",
      "amount": { "value": "450.00", "currency_code": "USD" }, // 30% UI/UX Architect
      "receiver": "ui-architect-sandbox@nexus.example.com",
      "sender_item_id": "M2_SPLIT_DESIGN"
    }
  ]
}
```

### Phase 3: Cryptographic Proof-of-Delivery & Dispute Shield (Disputes v1)
Every verified milestone receives a tamper-evident SHA-256 certificate containing commit hashes, AST evaluation logs, PayPal Authorization IDs, and Capture IDs. When `CUSTOMER.DISPUTE.CREATED` arrives via webhook, the certificate is automatically supplied to the PayPal Disputes API via the `provide-evidence` endpoint.

---

## 🎬 3-Minute Hackathon Demo Beat Sheet Script

| Timing | Scene & Actions | Voiceover & Key Takeaways |
| :--- | :--- | :--- |
| **0:00 – 0:25** | **The Hook & Trust Gap**<br>Landing page hero + stats overview. | *"Freelancers spend 20+ hours a month chasing unpaid invoices. Clients fear paying upfront for buggy deliverables. Traditional escrow charges 5-10% and takes weeks to arbitrate disputes. Welcome to Lancer AI — an autonomous escrow platform powered by PayPal and a 3-agent AI Tribunal."* |
| **0:25 – 1:00** | **Text-to-Escrow & PayPal Authorization**<br>Click "+ New AI Escrow Contract", type project prompt, generate milestones, switch to Client View, click PayPal Authorize button. | *"With our AI Contract Architect, a plain-English prompt generates a machine-verifiable milestone roadmap. The client locks $4,000 using the PayPal Orders v2 Authorize API. Notice: funds are reserved safely on the card, but zero money changes hands until the work is verified."* |
| **1:00 – 1:55** | **The 3-Agent Tribunal & Partial Capture**<br>Click [Scenario A: 96% Pass]. Watch Agent 1, 2, and 3 run live in parallel. Open the Multimodal Vision slider. Show Partial Capture and Batch Payout. | *"In the Tribunal Console, three agents inspect the deliverable in parallel. Agent 1 scans AST diffs and CI tests. Agent 2 compares the Figma design against the live DOM with a visual slider. Agent 3 synthesizes scores, triggers a PayPal Partial Capture for $1,500, and splits the payout: $1,050 to the backend developer and $450 to the UI designer via PayPal Payouts!"* |
| **1:55 – 2:35** | **The 'Wow' Moment: AI Mediated Partial Settlement**<br>Click [Scenario B: 78% Partial]. Watch the AI Settlement Proposal card appear. Notice the Sub-Milestone generated on the Gantt chart. | *"Here's what makes Lancer AI extraordinary. Real deliveries are rarely 100% perfect. In Scenario B, the submission scored 78% because of a minor tablet navbar glitch. Instead of a deadlocked dispute, our AI Mediated Settlement releases $1,200 immediately via partial capture and automatically creates a $300 Sub-Milestone on the Gantt chart for the fix!"* |
| **2:35 – 3:00** | **Ledger, Dispute Shield & Conclusion**<br>Click 'View AI Verification Certificate' modal, copy JSON, then show AG Grid Financial Ledger with raw PayPal request/response payloads. | *"Every release generates a tamper-evident SHA-256 certificate linked to the PayPal Disputes API for instant chargeback protection. The AG Grid Ledger provides a complete enterprise audit trail with raw PayPal REST payloads. Lancer AI: Autonomous escrow for the agentic economy."* |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js 18+ or 20+ installed
- npm or pnpm

### 2. Run Locally
```bash
# Navigate to project folder
cd escrowmate-ai

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to view the landing page, or jump directly to `http://localhost:3000/dashboard/contract/ESC-8842` for the **Judge's God-Mode Control Bar**.

---

## 🏆 Hackathon Checklist & Deliverables

- [x] **PayPal Orders v2 API (`intent: AUTHORIZE`)**
- [x] **PayPal Captures v2 API (`final_capture: false`)**
- [x] **PayPal Payouts v1 API (Batch Split Disbursements)**
- [x] **PayPal Webhooks Engine (`/api/webhooks/paypal`)**
- [x] **3-Agent Autonomous Arbitration Tribunal Console**
- [x] **Interactive Multimodal Figma vs Live DOM Comparison Slider**
- [x] **Dynamic AI Mediated Partial Settlement & Sub-Milestones**
- [x] **Cryptographic SHA-256 Proof-of-Delivery Certificate**
- [x] **AG Grid Enterprise-style Financial Ledger with Payload Inspector**
- [x] **AI Contract Architect (Text-to-Escrow Generator Modal)**
- [x] **Judge's God-Mode Control Bar with 3-Way Persona Switcher & 1-Click Scenarios**

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.
