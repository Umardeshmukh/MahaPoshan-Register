# MahaPoshan Register — Project Documentation

> **PM POSHAN School Nutrition Daily Register & Inventory Management System**  
> *A comprehensive, mobile-first, local-first web application designed for elementary and upper primary schools to automate daily Mid-Day Meal ration calculations, monthly stock reconciliation, and official Government Part-2 booklet reporting.*

---

## 1. Executive Summary & Problem Statement

### 1.1 Context & Background
The **Pradhan Mantri Poshan Shakti Nirman (PM POSHAN)** scheme (formerly the National Mid-Day Meal Scheme) is an extensive school meal initiative providing nutritious cooked lunches to millions of students across Primary (Classes 1 to 5) and Upper Primary (Classes 6 to 8) schools throughout Maharashtra and India.  
Under statutory guidelines, every school is legally required to maintain a comprehensive daily physical log and monthly inventory register designated as **Official Government Format Part-2 (Accounts of Foodgrains and Commodities)**. This format encompasses 24 distinct data columns capturing student attendance, meals served, 19 ingredients (grains, pulses, cooking oil, spices, salt), and cooking expenses.

### 1.2 The Core Problem
- **Complex Fractional Calculations:** Every school day, teachers must calculate fractional amounts in milligrams, grams, and kilograms (e.g., 20 grams of pulses per child, 0.1 grams of cumin seeds, 5 milliliters of edible oil) multiplied by fluctuating daily attendance figures.
- **Error-Prone Manual Stock Registers:** Calculating cumulative monthly consumption, recording received supplies, and reconciling physical opening stock with theoretical closing stock by hand frequently produces accounting discrepancies and audit objections.
- **Heavy Administrative Burden on Teachers:** School teachers and headmasters routinely spend 30 to 45 minutes of instructional time each afternoon manually copying numbers across logbooks.
- **Inspection & Audit Urgency:** Preparing quarterly audits, annual returns, and certified print sheets requires tedious re-tabulation of hundreds of data points.

### 1.3 The Solution: MahaPoshan Register
**MahaPoshan Register** completely automates this workflow. With a single input—**the daily student attendance count**—the application instantly:
1. Computes exact fractional quantities for all 19 ingredients according to statutory Government norms.
2. Accumulates day-by-day consumption figures across the academic month.
3. Calculates official cooking assistance costs (at the statutory rate of ₹2.36 fuel/vegetable cost, or composite norms of ₹5.45 for Primary and ₹8.17 for Upper Primary).
4. Maintains a continuous live inventory ledger: `Closing Stock = (Opening Stock + Received Stock) - Total Consumed`.
5. Generates a pixel-perfect, certified Government Part-2 official document matching Page 43 of the statutory booklet, ready for physical printing, PDF export, or styled Excel (.xlsx) download.

---

## 2. System Architecture & Technical Specifications

### 2.1 High-Level Architecture Diagram
```
+-----------------------------------------------------------------------------------+
|                            CLIENT BROWSER / MOBILE PHONE                          |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                           React 19 + TypeScript SPA                         |  |
|  |  [Daily Entry]  [Monthly Register]  [Part-2 Print]  [Admin Panel]  [Referral]|  |
|  +---------------------------------------+-------------------------------------+  |
|                                          |                                        |
|                     +--------------------+--------------------+                   |
|                     |                                         |                   |
|                     v                                         v                   |
|       +---------------------------+             +---------------------------+     |
|       | Browser LocalStorage      |             | Clerk React SDK           |     |
|       | (Offline Cache & State)   |             | (Identity & JWT Session)  |     |
|       +-------------+-------------+             +-------------+-------------+     |
+---------------------|-----------------------------------------|-------------------+
                      |                                         |
                      | Bi-directional Sync                     | JWT Auth Token
                      v                                         v
+---------------------+---------------------+     +-------------+-------------+
|              SUPABASE CLOUD               |     |    SERVERLESS API / EDGE  |
|  PostgreSQL Database + Row-Level Security |     |  Netlify/Vercel Functions |
|  - school_profiles                        |     |  - /api/send-email.ts     |
|  - daily_registers                        |     |    (Resend Email API)     |
|  - stock_inward & user_access             |     |  - Rate Limiter & CORS    |
+-------------------------------------------+     +---------------------------+
```

### 2.2 Technology Stack Breakdown
| Layer / Component | Technologies / Libraries | Technical Function & Architectural Rationale |
| :--- | :--- | :--- |
| **Frontend Core** | React 19, TypeScript, Vite 6 | Modern functional components with React hooks, fast Hot Module Replacement, and strict compile-time type safety across all statutory data structures. |
| **Styling & Responsive UX** | Tailwind CSS v4, Lucide React | Mobile-first responsive breakpoints, zero CSS bloat, ergonomic touch targets (minimum 44px height), safe-area insets, and smooth horizontal swipe containers (`touch-pan-x`). |
| **Identity & Authentication** | Clerk React SDK (`@clerk/react`) | Enterprise authentication supporting Google OAuth and email verification, session state management, user metadata, and subscription tier synchronization. |
| **Cloud Database & Sync** | Supabase (`@supabase/supabase-js`) | Managed PostgreSQL database storing school profiles, daily registers, stock records, and subscription approvals with Row-Level Security (RLS) enforcement. |
| **Local Persistence** | Browser Web Storage API (LocalStorage) | Zero-latency page loads, offline-first reliability, and debounced auto-save triggers to guarantee data preservation during intermittent connectivity. |
| **Spreadsheet Generation** | `xlsx-js-style` / `xlsx` | Client-side compilation of styled `.xlsx` spreadsheets containing branded header rows, border formatting, and pre-calculated totals. |
| **Document Rendering** | Native CSS `@media print` + Webkit Print | High-precision landscape A4 document formatting that mirrors official Government Part-2 booklet Page 43 standards. |
| **Transactional Messaging** | Resend SDK + Serverless Handlers | Edge functions (`/api/send-email.ts`) featuring in-memory IP rate limiting (20 requests per minute) and CORS validation for customer support and system notices. |

---

## 3. Core Functional Modules

### 3.1 Module 1: Daily Entry Register
The daily entry screen is the primary interface used by school staff at the conclusion of each lunch session:
- **Date Selector & Holiday Flagging:** Rapid date switching with one-touch holiday toggles (Sunday, Statutory Public Holiday, Local School Holiday) accompanied by optional explanatory reason fields.
- **Ergonomic Student Attendance Stepper:** Clean numerical input supplemented by large mobile-friendly stepper buttons (+1, +5, +10, -1, -5, -10) to facilitate rapid tally adjustments on touchscreens.
- **Instant Computational Engine:** Immediately determines total beneficiary meals served, maps the designated recipe for that weekday, and calculates the exact kilogram and gram requirements for all 19 ingredients.
- **Executive 4-Card Summary Banner:** Visual metric cards prominently displaying daily Rice (kg), Pulses/Grains (kg), Vegetables & Cooking Oil, and Cooking Assistance Cost (₹) in real time.
- **Itemized Ingredient Consumption Table:** Expandable table providing item-by-item inspection of gram norms per student, total bulk requirements, and individual cost allocations.

### 3.2 Module 2: Monthly Register & Stock Ledger
A consolidated monthly workspace offering three responsive perspectives:
- **Mobile View 1 (Daily Cards):** Chronological card listing of daily records showing date, weekday, attendance count, dish served, cooking expenditure, and single-tap edit triggers.
- **Mobile View 2 (Stock Ledger Cards):** Dedicated stock inventory cards for all 19 ingredients displaying Opening Balance, Inward Supplies Received, Monthly Consumed Quantity, and Net Closing Stock with inline editing.
- **Mobile View 3 (Full 20-Column Official Matrix):** Complete monthly master ledger matrix presenting every calendar day with frictionless horizontal swipe navigation (`touch-pan-x`).
- **Monthly Executive StatCards:** Aggregate metrics showing Total Working Days, Cumulative Students Served, Total Monthly Cooking Cost, and Inward Supply Records.

### 3.3 Module 3: Official Government Booklet Part-2 (Statutory Register)
Designed to comply precisely with **Page 43 of the statutory Government of Maharashtra PM POSHAN Register**:
- **24-Column Standardized Grid:** Columns 1 through 4 capture Date, Description, Daily Attendance, and Beneficiary Plates Served. Columns 5 through 23 cover all 19 official food grains and commodities. Column 24 records statutory cooking expenses.
- **Dual Top Inward Inventory Rows:** Dedicated opening rows displaying Opening Stock Balance and Current Month Inward Supplies.
- **Bottom Monthly Totals & Balance Rows:** Automatic summation rows computing Total Monthly Consumption and Net Closing Balance.
- **Four-Party Official Verification Signatures:** Footer block providing statutory signature and seal lines for:
  1. Cook / Kitchen Helper Signature
  2. School Nutrition Incharge Teacher Signature
  3. Headmaster Signature and Official School Seal
  4. Inspecting Officer / Extension Officer Signature
- **Government Grievance Helpline Display:** Includes the mandatory national grievance toll-free helpline: `1800 233 9988`.

### 3.4 Module 4: Administrative Master Settings & Live Simulator
A centralized configuration suite divided into four specialized pillars:
1. **General Settings:** School name, 11-digit national UDISE code, Center/Cluster, District, Headmaster credentials, Incharge teacher name, Cook name, Academic year selection, and Default monthly operating days.
2. **Weekly 6-Day Menu Cycle:** Configurable daily recipes for Monday through Saturday, pulse varieties, and supplementary egg/fruit distribution days.
3. **Ingredient Matrix & Live Cost Simulator:** Adjust standard gram allowances per student and current market rates per kilogram. Features an interactive *Real-Time Cost Simulator* allowing administrators to input any hypothetical student count and immediately review the calculated per-plate expense.
4. **Configuration Node & Two-Step Danger Zone:** Export/import configuration JSON files, trigger cloud backups, and access a secure 2-step confirmation modal for clearing register data or resetting the account to factory defaults.

---

## 4. User Access, Subscription & Referral System

### 4.1 Multi-Tier User Access Lifecycle
- `new_user`: First-time authenticated user must submit official school name, 11-digit UDISE, district, and contact number.
- `pending_approval`: Application is held in verification queue awaiting Super Admin approval. Background polling checks status every 10 seconds.
- `active`: Unrestricted read/write access to Daily Entry, Monthly Register, Stock Ledger, Part-2 Print, and Excel Export with active validity counter.
- `expired`: Subscription has elapsed; displays renewal prompt and allows administrative extension.
- `pending_deletion`: User requested account deletion; placed into a 28-day recovery grace period prior to permanent data purge.

### 4.2 Super Admin Control Panel (`#super-admin`)
- **Institution Review Table:** Inspect pending school registration requests, applicant teacher names, UDISE codes, mobile numbers, and administrative notes.
- **Flexible Duration Granting:** Activate schools with configurable validity periods (1 Month, 3 Months, 6 Months, 1 Year, 2 Years, or Unlimited).
- **Passcode-Guarded Administrative Operations:** Permanent account purge, status overrides, and bulk actions protected by administrative passcode validation.
- **Referral Reward Dispatch:** Review verified referral submissions, examine submitted UPI accounts, and record referral reward payments.

### 4.3 Referral & Reward Program (Refer & Earn)
- Automatically assigned unique referral code (e.g., `MP-XXXXXX`) and shareable invitation URL for every teacher.
- One-tap **WhatsApp Sharing** with pre-filled promotional invitation text.
- Direct UPI payout submission (PhonePe, Google Pay, BHIM) to receive direct financial incentives upon verification of referred schools.
- Real-time dashboard tracking Total Referred Schools, Approved Institutions, and Paid Rewards.

---

## 5. Mathematical Formulations & Government MDM Norms

### 5.1 Statutory Ingredient Norms per Student (Schedule-II Standards)
| Ingredient Category | Primary Norm (Classes 1 to 5) | Upper Primary Norm (Classes 6 to 8) | Standard Unit |
| :--- | :--- | :--- | :--- |
| **Food Grains / Rice** | 100.00 | 150.00 | Grams (g) |
| **Pulses / Legumes** | 20.00 | 30.00 | Grams (g) |
| **Green Vegetables** | 50.00 | 75.00 | Grams (g) |
| **Edible Oil & Fat** | 5.00 | 7.50 | Grams (g) / ml |
| **Mustard Seeds** | 0.10 | 0.15 | Grams (g) |
| **Cumin Seeds** | 0.10 | 0.15 | Grams (g) |
| **Turmeric Powder** | 0.50 | 0.75 | Grams (g) |
| **Red Chilli Powder** | 0.50 | 0.75 | Grams (g) |
| **Iodized Salt** | 1.00 | 1.50 | Grams (g) |
| **Supplementary Nutrition (Egg / Fruit)** | 1.00 | 1.00 | Unit / Piece |

### 5.2 Core Mathematical Formulas
1. **Daily Bulk Requirement Formula:**
   $$\text{Total Weight (Kg)} = \frac{\text{Beneficiary Attendance} \times \text{Norm in Grams}}{1000}$$
2. **Daily Cooking Expense Formula:**
   $$\text{Daily Cooking Cost (₹)} = \text{Beneficiary Attendance} \times \text{CostNormPerStudent}$$
   *(Primary Standard: ₹2.36 fuel/vegetable subsidy, or ₹5.45 composite cooking norm; Upper Primary: ₹8.17 composite cooking norm).*
3. **Monthly Stock Reconciliation Formula:**
   $$\text{Total Stock Available (Kg)} = \text{OpeningStockKg} + \text{ReceivedStockKg}$$
   $$\text{Closing Balance (Kg)} = \text{Total Stock Available (Kg)} - \text{TotalMonthlyConsumedKg}$$

---

## 6. Security, Legal Compliance & Privacy

- **28-Day Soft Deletion Protocol:** Accounts marked for deletion enter a mandatory 28-calendar-day holding pattern, allowing complete recovery in case of accidental requests before final database purge.
- **Two-Step Confirmation Safety:** Destructive operations (resetting registers or factory resets) require two consecutive confirmation modals displaying exact record impact counts.
- **Mandatory Legal Transparency:** Full dedicated modals for Terms & Conditions, Privacy Policy, Refund Policy, and Grievance Redressal (`poshanregister@gmail.com`).

---

## 7. Installation, Setup & Deployment Guide

### 7.1 Local Development Workflow
```bash
# 1. Clone repository
git clone https://github.com/your-org/MahaPoshan-Register.git
cd MahaPoshan-Register

# 2. Install dependencies
npm install

# 3. Configure local environment variables
cp .env.example .env.local

# 4. Start local Vite development server
npm run dev
```     

### 7.2 Environment Variables Specification (`.env`)
```env
# Clerk Authentication Configuration
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Supabase Cloud Database Configuration
VITE_SUPABASE_URL=https://xyzcompany.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni...

# Super Admin Access Passcode
VITE_SUPER_ADMIN_PASSCODE=YOUR_ADMIN_SECRET_KEY

# Email Notification API (Serverless / Netlify / Vercel)
RESEND_API_KEY=re_123456789...
ADMIN_NOTIFICATION_EMAIL=poshanregister@gmail.com
```

### 7.3 Build & Verification Commands
```bash
# Execute strict TypeScript type-checking and linting
npm run lint

# Compile optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

---
*MahaPoshan Register • Comprehensive Project Documentation • 100% English Edition*
