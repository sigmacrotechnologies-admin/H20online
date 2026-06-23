# H2O Online — Customer Dashboard: Devices & Hydration Leaderboard

**Document type:** Business Requirements Document (BRD)  
**Product module:** Customer Mobile App — Dashboard  
**Feature set:** Connected Devices (Coming Soon) + Monthly Hydration Leaderboard  
**Version:** 1.0  
**Status:** Implemented (Phase 1)  
**Audience:** Product owners, business analysts, engineering, QA, stakeholders

---

## 1. Executive Summary

This document defines the business requirements, functional specifications, API contracts, data models, privacy rules, and acceptance criteria for two customer-dashboard capabilities within the H2O Online mobile application:

1. **My Devices section** — Presents planned wearable and smart-home integrations (Apple Watch, Smart Bottle, TV Hub) with honest **Coming soon** labelling instead of misleading "Connected" status.
2. **Monthly Hydration Leaderboard** — A gamified engagement feature that ranks customers by **total water intake (liters)** within a calendar month, with explicit **opt-in** controls for public listing and optional **monthly report** subscription.

These features support the platform's strategic goal of **health engagement beyond ordering** (Business Objective BO-06) while maintaining user trust and privacy through consent-based visibility.

---

## 2. Business Context & Objectives

### 2.1 Problem statement

| Issue | Impact |
|-------|--------|
| Device tiles showed "Connected" with green status indicators | Users believed integrations were live; creates support burden and trust erosion |
| No competitive/social hydration motivation | Lower daily engagement with water-intake logging |
| No user control over public hydration ranking | Privacy risk if rankings were shown without consent |

### 2.2 Business objectives

| ID | Objective | KPI / Success measure |
|----|-----------|----------------------|
| BRD-DL-01 | Set accurate expectations for device integrations | Zero support tickets claiming "device already connected" after release |
| BRD-DL-02 | Increase water-intake logging frequency | +15% weekly active loggers among opted-in customers (target) |
| BRD-DL-03 | Drive return visits to customer dashboard | Leaderboard screen views ≥ 20% of MAU (target) |
| BRD-DL-04 | Protect user privacy by default | 100% of public leaderboard entries require explicit opt-in |
| BRD-DL-05 | Prepare foundation for future wearable sync | Device catalogue visible; roadmap communicated as Coming soon |

### 2.3 Stakeholders

| Role | Interest |
|------|----------|
| **Customer (end user)** | Accurate device status; optional social ranking; control over visibility |
| **Product / Marketing** | Engagement, retention, future device partnership narrative |
| **Engineering** | Clear API contracts, scalable monthly aggregation |
| **Legal / Privacy** | Consent for public display; name masking on leaderboard |
| **Operations / Support** | Documented behaviour for FAQ and troubleshooting |

---

## 3. Scope

### 3.1 In scope (Phase 1 — current release)

- Customer dashboard device carousel with **Coming soon** status for three device types
- Leaderboard entry point on dashboard (Monthly Hydration Leaderboard card)
- Dedicated **Leaderboard** screen (`/leaderboard`)
- User preference toggles: **Join leaderboard**, **Monthly report**
- Backend APIs for monthly rankings and preference updates
- Ranking algorithm based on summed `volumeMl` from Water Intake records for calendar month
- Top 50 public entries returned; current user's rank computed when opted in
- Partial name display on leaderboard (first name + last initial)

### 3.2 Out of scope (Phase 1)

- Actual Apple Watch / HealthKit / Google Fit / smart bottle / TV hub pairing
- Push notifications or email delivery for monthly reports (preference stored only)
- Historical month picker UI (API supports `year`/`month` query params; UI defaults to current month)
- Admin portal management of leaderboard
- Rewards/points tied to leaderboard rank (reward points on dashboard remain separate/display-only)
- Society, corporate, or team-based leaderboards

### 3.3 Future phases (roadmap)

| Phase | Capability |
|-------|------------|
| Phase 2 | Email/push monthly hydration report for users with `leaderboardMonthlyReport: true` |
| Phase 3 | Apple Watch / wearables OAuth and automatic intake sync |
| Phase 4 | Smart bottle BLE pairing and real-time sync |
| Phase 5 | TV Hub dashboard widget for household hydration summary |
| Phase 6 | Month selector, badges, streak bonuses, friend invites |

---

## 4. User Personas & Journeys

### 4.1 Primary persona: Health-conscious customer

**Profile:** Logs water intake 3–5 times per week; uses dashboard for hydration summary and orders.

**Journey A — View devices**
1. Opens Customer Dashboard
2. Scrolls to **My devices** section
3. Sees Apple Watch, Smart Bottle, TV Hub with **Coming soon** badge
4. Understands integrations are planned, not active

**Journey B — Join leaderboard**
1. Taps **Monthly Hydration Leaderboard** card on dashboard
2. Opens Leaderboard screen
3. Enables **Join leaderboard** toggle
4. Views personal rank and monthly liters after logging intake
5. Optionally enables **Monthly report** for future summaries

**Journey C — Privacy-first customer**
1. Opens Leaderboard screen to view top performers
2. Leaves **Join leaderboard** off
3. Sees informational banner: not listed in rankings
4. Can still browse public rankings of opted-in users

---

## 5. Functional Requirements — My Devices

### 5.1 Device catalogue

| Device ID | Display name | Icon | Status (Phase 1) |
|-----------|--------------|------|------------------|
| 1 | Apple Watch | watch-outline | Coming soon |
| 2 | Smart Bottle | water-outline | Coming soon |
| 3 | TV Hub | tv-outline | Coming soon |

### 5.2 UI requirements

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| DEV-UI-01 | Section eyebrow: **Connected**; section header: **My devices** | Must |
| DEV-UI-02 | Horizontal scroll carousel of device cards | Must |
| DEV-UI-03 | Each card shows device icon (gradient circle), name, and status text **Coming soon** | Must |
| DEV-UI-04 | Amber **Soon** badge replaces green connected dot | Must |
| DEV-UI-05 | Status text uses muted colour (not success green) | Must |
| DEV-UI-06 | Device cards are non-interactive in Phase 1 (no false connect flow) | Should |

### 5.3 Business rules

| Rule ID | Rule |
|---------|------|
| DEV-BR-01 | No device may display "Connected" until backend pairing exists |
| DEV-BR-02 | Copy must not imply data is syncing from wearables |
| DEV-BR-03 | Create Profile "Connect device" toggle remains separate onboarding preference for future use |

### 5.4 Implementation reference

| Layer | File |
|-------|------|
| Mobile UI | `mobile/src/screens/DashboardScreen.js` |
| Route | `mobile/app/dashboard.tsx` |

---

## 6. Functional Requirements — Monthly Hydration Leaderboard

### 6.1 Dashboard entry point

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LB-UI-01 | Dashboard card titled **Monthly Hydration Leaderboard** | Must |
| LB-UI-02 | Subtitle: ranked by water intake; tap to view and manage | Must |
| LB-UI-03 | Trophy icon and chevron; navigates to `/leaderboard` | Must |
| LB-UI-04 | Replaces prior placeholder "Summer Hydration Challenge" copy | Must |

### 6.2 Leaderboard screen

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| LB-UI-10 | Header: **Hydration leaderboard** with subtitle explaining monthly water-intake ranking | Must |
| LB-UI-11 | **Your preferences** card with two switches | Must |
| LB-UI-12 | Toggle 1: **Join leaderboard** — include my water intake in monthly rankings | Must |
| LB-UI-13 | Toggle 2: **Monthly report** — receive monthly summary of hydration rank | Must |
| LB-UI-14 | When opted out: banner explaining opt-in needed to appear in rankings | Must |
| LB-UI-15 | When opted in: stats card showing rank (#N or —) and total liters for period | Must |
| LB-UI-16 | Rankings list: rank badge, avatar/initials, masked name, liters | Must |
| LB-UI-17 | Current user row highlighted; append **(You)** to name | Must |
| LB-UI-18 | Top 3 ranks use trophy/medal styling | Should |
| LB-UI-19 | Pull-to-refresh reloads leaderboard data | Must |
| LB-UI-20 | Empty state when no opted-in users have intake data | Must |
| LB-UI-21 | Unauthenticated users redirected to login on toggle interaction | Should |

### 6.3 Preference business rules

| Rule ID | Rule |
|---------|------|
| LB-BR-01 | `leaderboardOptIn` defaults to **false** for all users |
| LB-BR-02 | `leaderboardMonthlyReport` defaults to **false** for all users |
| LB-BR-03 | Only users with `role: customer` AND `leaderboardOptIn: true` appear in public rankings |
| LB-BR-04 | Opting out removes user from subsequent ranking queries; historical rank not retained in UI |
| LB-BR-05 | Monthly report toggle is independent of opt-in (user may want report without public listing — stored for Phase 2) |
| LB-BR-06 | Ranking metric is **total milliliters** logged in period, displayed as **liters** (1 decimal) |

### 6.4 Ranking algorithm

**Period:** Calendar month (default: current month in server local date logic via ISO date strings).

**Steps:**
1. Select all customers where `leaderboardOptIn === true`
2. Query `WaterIntake` documents where `date` is between `YYYY-MM-01` and last day of month (inclusive)
3. For each document, sum `entries[].volumeMl`
4. Aggregate by `userId`; sort descending by total ml
5. Assign rank 1..N (ties: same total → order by aggregation sort; no fractional ranks)
6. Return top **50** entries to client
7. Compute requesting user's rank even if outside top 50 (when opted in)

**Display name masking:** `"Rohit Kumar"` → `"Rohit K."`; single name unchanged.

**Tie-breaking:** Users with equal liters receive consecutive ranks based on sort order (standard competition ranking not required in Phase 1).

### 6.5 User stories

| Story ID | As a… | I want to… | So that… |
|----------|-------|------------|----------|
| US-LB-01 | Customer | See devices marked Coming soon | I am not misled about integrations |
| US-LB-02 | Customer | Open a leaderboard from my dashboard | I can compare my hydration with others |
| US-LB-03 | Customer | Opt in to the leaderboard | My logged intake counts toward my rank |
| US-LB-04 | Customer | Opt out of the leaderboard | My data is not shown publicly |
| US-LB-05 | Customer | See my monthly rank and liters | I know how I am performing |
| US-LB-06 | Customer | Enable monthly report | I can receive summaries when that feature launches |
| US-LB-07 | Customer | View top hydrators this month | I stay motivated to log water |
| US-LB-08 | Privacy-conscious user | Browse leaderboard without joining | I can explore without exposing my data |

---

## 7. API Specification

**Base URL:** `{API_HOST}/api`  
**Authentication:** Bearer JWT on all endpoints below (same as existing `auth` middleware).  
**Content-Type:** `application/json`

### 7.1 GET /leaderboard

Retrieves monthly leaderboard rankings, user preferences, and current user's stats.

**Query parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | integer | No | Calendar year (default: current). Valid range: 2020–2100 |
| month | integer | No | Calendar month 1–12 (default: current) |

**Example request**

```
GET /api/leaderboard
Authorization: Bearer <token>
```

```
GET /api/leaderboard?year=2026&month=6
Authorization: Bearer <token>
```

**Success response:** `200 OK`

```json
{
  "period": {
    "from": "2026-06-01",
    "to": "2026-06-30",
    "label": "June 2026"
  },
  "rankings": [
    {
      "rank": 1,
      "userId": "665a1b2c3d4e5f6789012345",
      "name": "Rohit K.",
      "avatarUrl": "https://...",
      "totalLiters": 42.5,
      "isCurrentUser": false
    }
  ],
  "preferences": {
    "optIn": true,
    "monthlyReport": false
  },
  "me": {
    "rank": 12,
    "totalLiters": 18.3,
    "optedIn": true
  }
}
```

**Response field definitions**

| Field | Type | Description |
|-------|------|-------------|
| period.from | string | ISO date start of month (YYYY-MM-DD) |
| period.to | string | ISO date end of month |
| period.label | string | Human-readable month label |
| rankings | array | Up to 50 entries, sorted by rank ascending |
| rankings[].rank | integer | 1-based position |
| rankings[].userId | string | MongoDB user id |
| rankings[].name | string | Masked display name |
| rankings[].avatarUrl | string | Profile image URL or empty string |
| rankings[].totalLiters | number | Rounded to 1 decimal place |
| rankings[].isCurrentUser | boolean | True if row is authenticated user |
| preferences.optIn | boolean | User's leaderboardOptIn setting |
| preferences.monthlyReport | boolean | User's leaderboardMonthlyReport setting |
| me.rank | integer \| null | Null if user not opted in |
| me.totalLiters | number | User's monthly total (0 if none) |
| me.optedIn | boolean | Same as preferences.optIn |

**Error responses**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "error": "..." }` | Missing or invalid token |
| 500 | `{ "error": "..." }` | Server/database error |

---

### 7.2 PUT /leaderboard/preferences

Updates the authenticated user's leaderboard preferences.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| optIn | boolean | No | Set leaderboard opt-in status |
| monthlyReport | boolean | No | Set monthly report preference |

At least one field should be sent. Omitted fields are unchanged.

**Example request**

```
PUT /api/leaderboard/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "optIn": true,
  "monthlyReport": true
}
```

**Success response:** `200 OK`

```json
{
  "optIn": true,
  "monthlyReport": true
}
```

**Error responses**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | Unauthorized | Invalid session |
| 404 | `{ "error": "User not found" }` | User deleted |
| 500 | Server error | Save failure |

---

### 7.3 Related APIs — Water Intake (ranking data source)

Leaderboard rankings depend on water intake logged via existing endpoints.

#### GET /water-intake/summary

Used by dashboard for 7-day chart; leaderboard uses same underlying `WaterIntake` collection with monthly aggregation.

| Parameter | Description |
|-----------|-------------|
| from | Start date YYYY-MM-DD |
| to | End date YYYY-MM-DD |

#### POST /water-intake

Creates intake entry (feeds leaderboard when within month).

**Body:** `{ "date", "type", "quantity", "volumeMl" }`  
**type enum:** `glass`, `jar`, `bottle`, `total`

#### GET /users/me

Returns user profile including `leaderboardOptIn` and `leaderboardMonthlyReport` when present on User document.

---

### 7.4 Mobile API client mapping

| Client method | HTTP |
|---------------|------|
| `api.leaderboard.get(year?, month?)` | GET /api/leaderboard |
| `api.leaderboard.updatePreferences(body)` | PUT /api/leaderboard/preferences |
| `api.waterIntake.add(body)` | POST /api/water-intake |
| `api.waterIntake.summary(from, to)` | GET /api/water-intake/summary |
| `api.users.me()` | GET /api/users/me |

**Client file:** `mobile/src/api/client.js`

---

## 8. Data Model

### 8.1 User schema extensions

**Collection:** `users`  
**Model file:** `backend/models/User.js`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| leaderboardOptIn | Boolean | false | User consents to public monthly ranking |
| leaderboardMonthlyReport | Boolean | false | User wants monthly rank summary (delivery Phase 2) |

### 8.2 WaterIntake (existing)

**Collection:** `waterintakes`  
**Model file:** `backend/models/WaterIntake.js`

| Field | Type | Description |
|-------|------|-------------|
| userId | ObjectId | Reference to User |
| date | String | YYYY-MM-DD |
| entries | Array | `{ type, quantity, volumeMl, createdAt }` |

**Index:** `{ userId: 1, date: 1 }` unique

**Leaderboard aggregation:** Sum all `entries.volumeMl` per userId where date in `[monthStart, monthEnd]`.

---

## 9. Privacy, Security & Compliance

| Topic | Requirement |
|-------|-------------|
| Opt-in default | Public listing **off** by default (GDPR/consent-aligned design) |
| Name display | Partial masking on public leaderboard |
| Email/phone | Never exposed on leaderboard API |
| Role filter | Only `customer` role eligible for rankings |
| Authentication | All leaderboard endpoints require valid JWT |
| Data minimization | Rankings API returns only necessary display fields |
| Monthly report | Preference stored; no PII sent until delivery channel implemented |

---

## 10. Non-Functional Requirements

| NFR ID | Category | Requirement |
|--------|----------|-------------|
| NFR-01 | Performance | GET /leaderboard p95 < 800ms for ≤10k opted-in users |
| NFR-02 | Scalability | Aggregation pipeline indexed on userId + date |
| NFR-03 | Availability | Same as core API (no separate service) |
| NFR-04 | Accessibility | Toggle labels and hints readable; sufficient touch targets |
| NFR-05 | Localization | English only Phase 1; labels externalized for future i18n |

---

## 11. Acceptance Criteria

### 11.1 Devices

- [ ] All three device cards show **Coming soon** text
- [ ] No green "Connected" indicator visible
- [ ] Amber **Soon** badge displayed on each card

### 11.2 Leaderboard — Dashboard

- [ ] Leaderboard card navigates to Leaderboard screen
- [ ] Card copy references monthly water intake ranking

### 11.3 Leaderboard — Preferences

- [ ] Join leaderboard toggle persists via API
- [ ] Monthly report toggle persists via API
- [ ] Opted-out user has `me.rank: null` in API response
- [ ] Opted-in user sees rank after logging intake

### 11.4 Leaderboard — Rankings

- [ ] Only opted-in customers appear in rankings array
- [ ] Sort order is descending by total liters
- [ ] Maximum 50 entries returned
- [ ] Current user row marked with `isCurrentUser: true`
- [ ] Names masked per displayName rules

### 11.5 Integration

- [ ] New intake logged via POST /water-intake reflects in same-month rank after refresh
- [ ] Backend route mounted at `/api/leaderboard` in server.js

---

## 12. Test Scenarios (QA)

| TC ID | Scenario | Expected result |
|-------|----------|-----------------|
| TC-01 | New user opens dashboard devices | All show Coming soon |
| TC-02 | User opens leaderboard, toggles opt-in ON | API returns optIn true; user can appear after logging |
| TC-03 | User toggles opt-in OFF | Removed from rankings on next fetch |
| TC-04 | Two users, different intake totals | Higher liters = better (lower) rank number |
| TC-05 | User opted in, zero intake | Rank computed; totalLiters 0 |
| TC-06 | No opted-in users | Empty rankings; empty state UI |
| TC-07 | Invalid token on GET /leaderboard | 401 |
| TC-08 | Pull to refresh on leaderboard | Data reloads |
| TC-09 | Query previous month via API | Correct period.from/to returned |
| TC-10 | monthlyReport ON, optIn OFF | Both preferences saved independently |

---

## 13. Technical Architecture

```
┌─────────────────────┐     HTTPS/JWT      ┌──────────────────────┐
│  Mobile App         │ ◄────────────────► │  Express Backend     │
│  DashboardScreen    │                    │  /api/leaderboard    │
│  LeaderboardScreen  │                    │  /api/water-intake   │
└─────────────────────┘                    └──────────┬───────────┘
                                                      │
                                           ┌──────────▼───────────┐
                                           │  MongoDB             │
                                           │  users               │
                                           │  waterintakes        │
                                           └──────────────────────┘
```

**Backend route file:** `backend/routes/leaderboard.js`  
**Server mount:** `app.use("/api/leaderboard", require("./routes/leaderboard"))`

**Mobile screens:**
- `mobile/src/screens/DashboardScreen.js`
- `mobile/src/screens/LeaderboardScreen.js`
- `mobile/app/leaderboard.tsx`

---

## 14. Dependencies & Assumptions

| Item | Assumption |
|------|------------|
| Water intake logging | Users log via existing Water Intake screen |
| Auth | Customer logged in with JWT |
| Date storage | Intake dates stored as YYYY-MM-DD strings (UTC slice) |
| Monthly report | Phase 1 stores preference only; no notification job |
| Device integrations | Phase 1 is UI-only Coming soon state |

---

## 15. Glossary

| Term | Definition |
|------|------------|
| **Opt-in** | User explicitly enables leaderboard participation |
| **Monthly report** | Future notification summarizing user's rank and intake |
| **Total liters** | Sum of logged volumeMl ÷ 1000, rounded to 1 decimal |
| **Coming soon** | Feature announced but not yet available for use |
| **Masked name** | First name plus last initial for privacy |

---

## 16. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | June 2026 | H2O Product Engineering | Initial BRD for Devices + Leaderboard Phase 1 |

---

*End of document — H2O Online Customer Dashboard Devices & Hydration Leaderboard BRD v1.0*
