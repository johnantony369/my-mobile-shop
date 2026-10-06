# Daily Summary Notifications Design

## 1. Overview
Provide mobile shop owners with a short, friendly, and motivating daily closing summary notification via native PWA / Device Web Notifications. The notification celebrates today's total revenue, net balance, and delivered repairs, with a customizable notification time in Settings and a one-tap "Send Test Notification" feature.

---

## 2. Requirements & Scope

### 2.1 Functional Requirements
1. **Closing Summary Metrics**:
   - Total collections (`inTotal`) for the current date.
   - Net balance (`net = inTotal - outTotal`).
   - Transaction volume (`inCount`).
   - Number of repairs delivered/completed today (`deliveredCount`).
2. **Notification Copy (English Only)**:
   - **Sales + Delivered Repairs**:
     - *Title*: `Today at [Shop Name]: ₹[Total In] 🎉`
     - *Body*: `Net: ₹[Net] • [N] sales • [X] repairs delivered. Tap to review day book.`
   - **Sales Only (0 Repairs)**:
     - *Title*: `Today at [Shop Name]: ₹[Total In] 🎉`
     - *Body*: `Net: ₹[Net] • [N] sales. Tap to review day book.`
   - **Quiet Day (No transactions today)**:
     - *Title*: `[Shop Name] Closing Wrap-up 🌙`
     - *Body*: `Ready to close today's accounts? Tap to check your day book.`
3. **Customizable Time in Settings**:
   - Default closing time: `20:30` (8:30 PM).
   - Time picker (HTML5 `<input type="time" />` styled cleanly with iOS design guidelines) allowing the shop owner to adjust their closing alert time (e.g., `20:00`, `21:00`, `21:30`).
   - Toggle to enable/disable daily notifications.
   - Graceful permission request on toggle: calls `Notification.requestPermission()`.
   - "Send Test Notification" button: immediately fires a preview notification with today's real numbers so the user can verify device and lockscreen appearance.
4. **Delivery & Single-Firing Guarantee**:
   - Delivered via `ServiceWorkerRegistration.showNotification()` or standard `Notification` API.
   - Notification tag `daily-summary` to prevent screen clutter.
   - Stored `lastSummaryNotificationDate` in `localStorage` prevents firing more than once per calendar day.
   - Clicking the notification focuses the PWA or navigates to `/` (Day Book).

### 2.2 Non-Functional Requirements
- **Zero Server Cost**: 100% client-driven using local IndexedDB data and PWA Service Worker.
- **Privacy & Offline First**: Sensitive financial numbers remain local on device.
- **Resilience**: Gracefully handles devices without Notification support (e.g. non-PWA iOS Safari < 16.4) and permission denied states without errors.

---

## 3. Architecture & Data Flow

```
+-----------------------------------------------------------+
|                      SettingsScreen                       |
|   - Toggle Notification Permission                        |
|   - Custom Time Picker ("20:30")                          |
|   - "Send Test Notification" Button                       |
+-----------------------------+-----------------------------+
                              | Updates AppSettings
                              v
+-----------------------------------------------------------+
|                   notifications.ts                        |
|   - scheduleDailyNotification()                           |
|   - triggerDailySummaryNotification({ isTest })           |
|   - buildDailySummaryMessage(summary, shopName)           |
+-----------------------------+-----------------------------+
                              | Reads
                              v
+-----------------------------------------------------------+
|                      Dexie IndexedDB                      |
|   - db.entries.where('date').equals(today)                |
|   - db.repairs.where('deliveryDate').equals(today)        |
+-----------------------------------------------------------+
                              | Shows
                              v
+-----------------------------------------------------------+
|               ServiceWorkerRegistration                   |
|   - registration.showNotification(title, options)         |
|   - tag: 'daily-summary'                                  |
|   - icon: '/icon-192.png'                                 |
+-----------------------------------------------------------+
```

---

## 4. Components & Modules

### 4.1 Type Definitions (`src/types/index.ts`)
Add to `AppSettings`:
- `notificationsEnabled?: boolean;`
- `summaryNotificationTime?: string;` (HH:mm format, default `"20:30"`)

### 4.2 Notification Engine (`src/utils/notifications.ts`)
- `requestNotificationPermission(): Promise<NotificationPermission>`
- `getNotificationPermission(): NotificationPermission | 'unsupported'`
- `buildDailySummaryMessage(summary: { inTotal: number; net: number; inCount: number; deliveredCount: number; shopName: string }): { title: string; body: string }`
- `triggerDailySummaryNotification(options?: { isTest?: boolean; shopName?: string }): Promise<boolean>`
- `scheduleDailyNotification(timeStr: string, shopName: string): () => void` (returns cleanup function to cancel timer on unmount / time change)

### 4.3 App Updates & Notification Settings (`src/screens/SettingsScreen.tsx`)
Add a new card in Settings:
- Toggle switch for notifications with live permission status badge (`Allowed`, `Blocked`, or `Off`).
- Time input (`<input type="time" value={settings.summaryNotificationTime || '20:30'} />`).
- Test button ("Send Test Notification") with tactile feedback.

### 4.4 App Startup / Background Mount (`src/App.tsx`)
- On app mount, if `settings.notificationsEnabled` is true, calls `scheduleDailyNotification(settings.summaryNotificationTime || '20:30', settings.shopName)`.
- If the current time has already passed `summaryNotificationTime` today and no notification has been shown yet today (`lastSummaryNotificationDate !== today`), fires the summary on app open.

---

## 5. Error Handling & Edge Cases
1. **Notifications Unsupported**: When `window.Notification` is undefined, the toggle is disabled with a helpful tooltip/note: "Install app to home screen to enable notifications".
2. **Permission Denied**: If the user blocked notifications at the browser level, the UI clearly displays "Notifications blocked in browser settings" without crashing.
3. **No Sales / Activity**: Friendly fallback ("Shop Closing Wrap-up 🌙 - Ready to close today's accounts? Tap to check your day book.").
4. **Rapid Multiple Triggers / Testing**: Uses `tag: 'daily-summary'` so repeated calls replace the previous notification on the notification tray instead of stacking up.

---

## 6. Testing Strategy
- Unit tests (`tests/notifications.test.ts`):
  1. `buildDailySummaryMessage`:
     - Both sales and repairs present.
     - Sales present with 0 repairs.
     - 0 sales and 0 repairs (quiet day).
     - Accurate INR formatting without unwanted decimals.
  2. Calculation of delay until target time (`HH:mm`):
     - Target time later today.
     - Target time already passed today (should handle correctly).
  3. Single-dispatch per day validation via `localStorage` key.
  4. Permission checks and graceful fallback when `Notification` is unsupported.
