# MyAngan - User Acceptance Testing (UAT) & Accessibility Checklist

This document details the cross-device, viewport responsiveness, browser compatibility, keyboard accessibility, and network resilience test checklist for **MyAngan**.

---

## 1. Viewport Width Responsiveness Matrix

| Viewport Width | Device Category | Layout Behavior | Navigation Bar | Status |
|---|---|---|---|---|
| **360 px** | Compact Mobile (Galaxy S8) | Single-column cards; full-bleed search drawer. | Collapsed burger menu. | ✅ PASSED |
| **390 px** | Standard Mobile (iPhone 12/13/14) | Single-column listing grid; tap targets $\ge 44\text{px}$. | Collapsed burger menu. | ✅ PASSED |
| **768 px** | Tablet Portrait (iPad) | 2-column property card grid; sidebar filter drawer. | Horizontal nav bar with icons. | ✅ PASSED |
| **1024 px** | Tablet Landscape / Small Laptop | 3-column property grid; sticky map view split. | Full header nav with user menu. | ✅ PASSED |
| **1366 px** | Standard Desktop Laptop | 3-column grid + map view side-by-side. | Expanded top navbar. | ✅ PASSED |
| **1920 px** | Full HD Desktop Monitor | Max container width `1400px` centered with margin padding. | Full desktop header. | ✅ PASSED |

---

## 2. Cross-Browser & Accessibility Compliance

* **Browsers Tested:** Chrome, Microsoft Edge, Firefox, Safari.
* **Keyboard Navigation:** All interactive buttons, filter inputs, modal controls, and links support `Tab` / `Shift+Tab` focus cycles with visible focus ring indicators (`ring-2 ring-orange-500`).
* **Screen Reader Readiness:** Form inputs include `aria-label` or `<label>` tags; modal dialogs set `role="dialog"` and `aria-modal="true"`.
* **Color Contrast:** Text-to-background contrast ratios satisfy WCAG 2.1 AA standards ($\ge 4.5:1$ for normal text).
* **Reduced Motion Support:** Motion transitions respect `prefers-reduced-motion: reduce`.

---

## 3. Network Resilience & Route Navigation

* **Deep Route Refresh:** Direct browser refresh on `/properties`, `/favorites`, `/compare`, `/dashboard` loads app shell cleanly without 404 errors.
* **Slow Network Handling:** Loading states display animated skeleton pulses (`animate-pulse`).
* **Offline Recovery:** Displays offline notice banner when internet connection drops.
