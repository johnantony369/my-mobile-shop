# Design System & UI Style Guide

This document defines the design language, UI patterns, color tokens, typography, and animation standards for **My Mobile Shop** PWA.

---

## 1. Design Philosophy

- **iOS-Inspired & Minimalist**: Clean native Apple aesthetic featuring grouped card layouts, subtle translucent materials (`backdrop-blur`), and hairline dividers.
- **Fast, High-Tactility POS**: Designed for single-hand mobile operation in busy retail shops. Clear monetary numbers, large tap targets (minimum 44×44px), instant offline feedback.
- **Strictly Offline-First**: Zero external assets or Google web fonts loaded over the network; relies entirely on system font stacks and hardware-accelerated CSS.

---

## 2. Color Palette & Semantic Tokens

| Token | Hex Value | Usage / Semantic Role |
| :--- | :--- | :--- |
| `iosBg` | `#F2F2F7` | Standard grouped background for views and screens |
| `iosCard` | `#FFFFFF` | Grouped cards, sheets, elevated surface blocks |
| `iosBlue` | `#007AFF` | Primary brand accent, selected tabs, CTAs, link buttons |
| `iosGreen` | `#34C759` | Positive monetary balance, sales / income ("In"), synced state |
| `iosRed` | `#FF3B30` | Negative balance, expenses ("Out"), destructive actions, errors |
| `iosSeparator` | `#E5E5EA` | Hairline card dividers, table borders, metric separators |
| `iosLabel` | `#000000` | Primary high-contrast text |
| `iosSecondary`| `#8E8E93` | Secondary labels, timestamp captions, subtle subtitles |
| `iosFill` | `#767680` | Background container fills for segmented controls, badge backdrops |

### Currency & Status Badges
- **UPI Badge**: Blue tint (`bg-blue-50 text-iosBlue`)
- **Card Badge**: Purple tint (`bg-purple-50 text-purple-600`)
- **Cash Badge**: Slate neutral (`bg-gray-100 text-[#8E8E93]`)
- **Repair Badge**: Indigo tint (`bg-indigo-50 text-indigo-600`)

---

## 3. Typography

The app uses the native Apple system font stack for instant zero-latency rendering:
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

### Scale & Hierarchy
- **Large Screen Header**: `32px` (`text-[32px] font-extrabold tracking-tight`)
- **Section Headers**: `15px - 17px` (`text-[17px] font-semibold text-black`)
- **Prominent Numbers (POS Input)**: `36px - 40px` (`text-4xl font-extrabold text-black font-mono tracking-tight`)
- **Card Body Text**: `15px` (`text-[15px] font-medium text-black`)
- **Captions & Metadata**: `11px - 13px` (`text-xs text-[#8E8E93]`)
- **Currency Symbols**: `₹` prefixed, formatted using standard Indian Numbering system (`1,00,000`).

---

## 4. Layout & Spacing Rules

- **Max Container Width**: `max-w-lg mx-auto` (optimally centered on tablets/desktops; edge-to-edge feel on mobile).
- **Corner Radii**:
  - Cards & Grouped Sections: `rounded-[14px]` (`rounded-ios`)
  - Bottom Sheets: `rounded-t-[20px]`
  - Inputs & Text fields: `rounded-[10px]`
  - Pills, Chips & Floating CTAs: `rounded-full`
- **Safe Area Insets**:
  - Always respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
  - Floating Action Buttons stay docked `bottom-[calc(env(safe-area-inset-bottom)+66px)]`.
- **Card Grouping**:
  - Cards sit over `#F2F2F7` background with subtle hairline border: `border border-black/[0.04] shadow-sm`.
  - Nested rows use hairline dividers: `border-b border-[#E5E5EA]` or `border-t border-[#E5E5EA]`.

---

## 5. UI Components

### Bottom Sheets (`BottomSheet.tsx`)
- Slide up from bottom with spring curve: `cubic-bezier(0.32, 0.72, 0, 1)`.
- Backdrop: `bg-black/40 backdrop-blur-[3px]`.
- Top drag handle pill: `w-10 h-1.5 bg-[#C7C7CC] rounded-full`.

### Grouped Segmented Control (`SegmentedControl.tsx`)
- Outer container: `bg-[#767680]/[0.12] rounded-[9px] p-1`.
- Selected tab: `bg-white text-black shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)] font-semibold rounded-[7px]`.
- Unselected tab: `text-[#8E8E93] hover:text-black/80`.

### Bottom Tab Bar (`TabBar.tsx`)
- Fixed bottom dock with frosted glass: `bg-white/90 backdrop-blur-xl border-t border-[#3C3C43]/15`.
- Active tab uses `text-iosBlue font-semibold` with `stroke-[2.2px]`.
- Unread/Ready count badge: `bg-iosGreen text-white text-[10px] font-bold rounded-full`.

### Swipeable List Rows (`SwipeableRow.tsx`)
- Slide left gesture reveals iOS action triggers:
  - Edit: Blue `#007AFF`
  - Delete: Red `#FF3B30`

---

## 6. Minimal Animations & Micro-Interactions

Zero third-party animation libraries. 100% GPU-accelerated CSS transitions:

### Screen Transitions
```css
@keyframes iosFadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-slide-in {
  animation: iosFadeSlideIn 200ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
}
```

### Dialog Alert Pop
```css
@keyframes iosDialogPop {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-dialog-pop {
  animation: iosDialogPop 180ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
}
```

### Tactile Touch Press
```css
.ios-press {
  transition: transform 140ms cubic-bezier(0.25, 1, 0.5, 1), opacity 140ms ease;
}
.ios-press:active {
  transform: scale(0.97);
  opacity: 0.85;
}
```

### Accessibility (Reduced Motion)
```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-slide-in,
  .animate-dialog-pop,
  .animate-entry-highlight,
  .ios-active,
  .ios-press {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
```
