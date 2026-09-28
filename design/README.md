# Design source of truth

Recovered from the Claude Design project **JewelryBox**
(`https://claude.ai/design/p/6678e6ca-5bbd-40f9-8a99-e48e29f918e9`) and committed here so the
build no longer depends on a session cache that gets pruned.

| File | Notes |
|---|---|
| `Brand Identity.dc.html` | Tokens, 13-row type scale, warm palette, logo system, motion §07, art direction, component strip. |
| `JewelryBox Prototype.dc.html` | 16 screens. **390px mobile canvas only — no media queries, no desktop layouts.** |

Still missing (never read, not recoverable locally): `Brand Assets.dc.html`,
`Current Site - Coming Soon.dc.html`. Export them from the design project if needed.

## Reading them

Both are self-contained except `./support.js`, which is not included — open them for the markup
and the inline `<script>` state, not to run them.

## Where they disagree with CHECKLIST.md

The prototype predates some decisions. `CHECKLIST.md` wins on **behaviour**, the design files win
on **look**. Known conflicts, all resolved in the build:

- Prototype checkout offers Paystack / Flutterwave and the footer carries their badges — **stale**.
  Payment is bank transfer + pay on delivery only.
- Prototype hardcodes delivery at Lagos ₦5,000 / elsewhere ₦12,000 / free over ₦1M — **stale**.
  Fees come per Lagos area or per state from `delivery_rates`.
- Prototype has a promo code (`HOUSE10`) — dropped; `Order` has no discount field.
- Prototype checkout is **3 steps + a receipt**, not the 4 the checklist claims. Prototype is right.
- No filter rail, no variant chips, no working macro zoom exist in the prototype — those are
  checklist-only and were designed fresh.

Where the two design files disagree with each other, **Brand Identity §07 wins**: 24px reveal rise
(prototype animates 20), hero image `1.04 → 1` over `1.2s` (prototype `1.08` over `2.6s`), 80ms
stagger (prototype 60), cart backdrop 40% (prototype 45%), page change 400ms fade **+ 16px rise**
(prototype fades only).
