# DESIGN.md

Direction of record for `apps/web`. This file is design direction, applied as data. It does not override the PRD or the antislop rules.

Dial: **ENERGY 2 / RHYTHM 3 / MOTION 2**

Reading this as: a campus canteen marketplace for students, staff, and stall sellers, in a warm editorial visual language (paper, ink, serif), dial ENERGY 2 / RHYTHM 3 / MOTION 2.

## Source of the direction

The product owner's direction is `PRD-Website-Kantin-Kampus.md` section 7: simple and easy to scan, product content is the focus, not decoration. The owner then asked for a more luxurious visual register without a membership offer. Both are applied here.

Luxury is carried by material and composition, not by claims: warm paper, near-black ink, one deep green accent, a serif display face, wide margins, hairline rules, and sharp panels. No section advertises a tier, a club, or a benefit the backend cannot deliver.

The name "Kantin Kampus" is the product name; the wordmark says that and nothing more. The earlier "Maison Kantin" landing copy and its member club are retired.

## Identity

- A campus marketplace with the manners of a good restaurant: calm, deliberate, and honest about what it serves.
- The product is the content: stall names, dish names, prices, availability, and order status carry the page. No stock photography, no lifestyle imagery, no illustration standing in for food.
- The editorial gesture is the serif heading. It gives the page a voice without turning it into a fine-dining brand.

## Palette

Tokens live in `apps/web/src/app/globals.css`; do not hardcode hex values in components.

| Role | Light | Dark |
| --- | --- | --- |
| Background (paper) | `#f7f4ed` | `#12100d` |
| Surface | `#fffefb` | `#1a1713` |
| Surface muted | `#efe9dd` | `#23201a` |
| Foreground (ink) | `#171512` | `#f0ece3` |
| Muted text | `#6a6357` | `#a9a196` |
| Border | `#ded4c3` | `#35302a` |
| Accent | `#1d4b38` | `#8dbfa4` |

All text pairs are measured at or above WCAG AA: muted text 5.41:1 on paper, 5.89:1 on surface, 4.91:1 on muted surface; ink 16.59:1; accent 9.04:1. Dark mode: muted 7.44:1, ink 16.11:1, accent 9.15:1.

Status colors (`danger`, `success`, `warning`, `info`) are semantic only and always ship with a text label. Danger is `#b91c1c` and success is `#166534` because the lighter defaults fell below 4.5:1 on paper.

The accent picker offers five presets and the default is Hijau. That is a user preference, not a brand palette: the deep green is the identity, and the other four exist because users asked to change it. Never introduce a sixth accent. The focus ring follows the chosen accent.

## Typography

- **Geist** for body, labels, and controls. Reason: neutral, high legibility at the small sizes this app uses for prices and status.
- **Playfair Display** for the wordmark, section headings, product names, and prices on the landing. Reason: one warm editorial note against an otherwise plain interface, and the serif numerals make prices feel considered rather than shouted.
- **Geist Mono** for order codes and card numbers only. Reason: those strings are read aloud and compared character by character.
- Display scale on the landing: hero 44 to 70px, section headings 30 to 48px, product names 20px, prices 18px. Body text never drops below 12px. Micro-labels at 10px are allowed only for uppercase metadata that is not required to complete a task.

## Layout

- RHYTHM 3: the landing mixes compositions. The hero is a 7/5 split with a hairline column rule, the showcase is an open three-column grid with no card boxes, the roles section is a 4/8 editorial split with numbered rows, and the scope section pairs a bordered panel with an inverted ink panel.
- The signed-in app stays uniform on purpose: a workspace should be predictable. The landing is where the composition varies.
- Spacing follows the default Tailwind scale, with section padding at 80 to 112px on the landing. Nothing invents a parallel spacing system.
- Radius: 2px for landing panels and images, 6px for controls, 8px for app panels. Sharp landing panels are a deliberate contrast with the softer app shell.
- Shadow appears only where an element floats above the page: sticky header, dialog, and the one hovered card on the app grid. The landing uses hairlines and one inverted panel instead of elevation.

## Motion

- MOTION 2: scroll-linked entrance on landing sections, plus hover, focus, and press states.
- Scroll-linked entrance is CSS `animation-timeline: view()` inside `@supports`, so browsers without support show the content at rest. No JavaScript observer, no hidden content.
- Every hover and focus transition stays under 300ms. Product photos scale 1.04 on hover to confirm the card is one target. No parallax, no looping animation, no autoplay.
- All motion is disabled under `prefers-reduced-motion: reduce`, including smooth scrolling.

## Copy voice

- Indonesian, plain, specific. Say what the user can do and what happens next.
- No superlatives. No "haute", "premium", "artisanal", "seamless", "revolutionary". The luxury is visual, never claimed in words.
- Name the real mechanism: cash paid at the stall cashier, email OTP, per-stall cart, pickup status.
- Numbers appear only when they come from the API or from the PRD. No invented statistics, no invented social proof, no invented membership.

## Honest content rules

- Every product shown comes from `GET /api/v1/products`. If the API returns nothing, show an empty state, never a curated stand-in.
- No stock photography presented as the product. A dish photo comes from the seller's upload; otherwise the `Tanpa Foto` placeholder is the correct visual.
- Features that do not exist (payment gateway, QRIS settlement, delivery, membership tiers) are not advertised. The landing page states the pilot scope instead.
- Testimonials, ratings, customer counts, and membership offers are absent until real ones exist.

## Composition reasons

- The three role rows sit at equal weight on purpose: buyer, seller, and admin are peers, and giving one more weight would imply a primary role the product does not have. Product cards are equal for the same reason, because a catalog invites comparison.
- The uppercase micro-label with wide tracking above each heading is a menu-board section label: it names the category the heading then expands, the way a canteen board separates sections. It is text only, never a pill, dot, or badge, and it is preceded by a short rule instead of a container.
- The "Belum ada" panel is inverted ink. It is the only high-contrast panel on the page, so the limits of the pilot read before the reader leaves.

## States and accessibility

Every data view ships four states: loading, empty, error with retry, and success. Empty states name the cause and the next action.

All interactive elements are keyboard reachable with a visible focus ring, dialogs trap focus and restore it on close, and every image has `alt` or an accessible placeholder label. Contrast meets WCAG AA in both themes. Tap targets are at least 44px, including the theme toggle.

## Reference points

Not to copy, only to calibrate: GOV.UK for plain language and state clarity; a printed campus cafeteria board for the information density; a restaurant menu for the serif-and-hairline restraint. The layout should feel like it belongs to a canteen, not to a design award.
