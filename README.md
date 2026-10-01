# MDM Register • MahaPoshan (शालेय पोषण आहार हिशोब व नोंदवही)

[![React](https://img.shields.io/badge/React-19.0-blue.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38b2ac.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Clerk Auth](https://img.shields.io/badge/Clerk-Authentication-6c47ff.svg?logo=clerk)](https://clerk.com/)
[![Resend](https://img.shields.io/badge/Resend-Email_API-black.svg?logo=resend)](https://resend.com/)

**MDM Register (MahaPoshan)** is a modern, responsive web application designed for primary and secondary schools in Maharashtra to streamline and automate the **MDM / PM POSHAN (Pradhan Mantri Poshan Shakti Nirman / Mid-Day Meal)** daily calculations, stock ledger management, and official monthly registers.


---

## 🌟 Key Features

### 1. 🍱 Daily Entry & Automatic Calculator (दैनिक नोंद व हिशोब)
- **Attendance-Based Calculations:** Automatically computes the exact requirement of rice (तांदूळ), pulses (कडधान्ये/डाळी), oil (तेल), condiments (मसाले), and vegetables (भाजीपाला) in grams, kilograms, and rupees based on daily student attendance.
- **6-Day Rotating Menu:** Pre-configured with official Maharashtra weekly recipes (Masoor, Moong, Tur, Matki, Chavli, Soya Vadi) with customization options for primary and upper-primary norms.
- **Real-Time Costing:** Live calculation of central cooking costs per student.

### 2. 📊 Official Part-2 Monthly Register (शासकीय नमुना भाग-२)
- **19-Column Material Ledger:** Tracks opening stock, received stock, daily consumption, and closing balance for all standard ingredients.
- **Month-at-a-Glance View:** Complete table view of all school working days in the month with day-wise totals.
- **Monthly Stock Inward Manager:** Record incoming food grain supplies and track stock sufficiency.

### 3. 📄 Export & Print Ready
- **Pixel-Perfect Print Format (`@media print`):** Formatted for standard A4 landscape registers with official government headers, signature rows, and summary tables.
- **Color-Coded Excel (`.xlsx`) Export:** Instant download of monthly registers with formatted column headers and computed formulas via SheetJS.
- **JSON Backup & Restore:** Complete backup of school registers with single-click import/export.

### 4. 🔐 Compulsory Clerk Authentication & Subscription Gate
- **Protected Access:** Guest access is blocked; all users authenticate via Google or Email using Clerk.
- **Approval Workflow:** Newly registered schools enter a pending state and submit their official School Profile (UDISE, Cluster, District, Contact).
- **Access Status Screen:** Real-time visibility into subscription status (Pending, Active, Expired).

### 5. ⚡ Hidden Super Admin Console
- **Secret Route:** Accessible via `/#super-admin` or `/super-admin`.
- **Dual Security:** Developer Passcode (`Admin@2026`) + Clerk Admin Email verification.
- **Duration Controls:** Approve school access requests with flexible durations (1 Month, 3 Months, 6 Months, 1 Year, or Custom Expiry Date).
- **Subscription Management:** Search schools by UDISE, extend subscriptions (+1 month, +6 months), or revoke access.
- **In-App Notification Bell:** Real-time badge counter and dropdown history of new school registration requests.

### 6. 📧 Automated Email Alerts via Resend
- **Instant Admin Alerts:** Dispatches styled HTML email notifications to `poshanregister@gmail.com` when a new school registers or requests renewal.
- **Approval Confirmations:** Sends confirmation receipts to school teachers upon access approval.
- **Built-in Test Trigger:** Test Resend API connectivity directly from the Super Admin dashboard.

### 7. 🌐 Offline-First & Multilingual
- **Offline Storage:** Instant local persistence with zero cloud database latency.
- **Language Switcher:** Seamless switching between **मराठी (Marathi)**, **मराठी / English (Dual)**, and **English**.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool & Dev Server** | [Vite 6](https://vitejs.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + `@tailwindcss/vite` |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Authentication** | [@clerk/react](https://clerk.com/) |
| **Email Service** | [Resend](https://resend.com/) |
| **Spreadsheet Engine** | [SheetJS (xlsx)](https://sheetjs.com/) |
| **Print / PDF Generation** | Native Print CSS (`@media print`) + [html2canvas](https://html2canvas.hertzen.com/) & [jsPDF](https://github.com/parallax/jsPDF) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: Version 18.x or 20.x+
- **npm** (or `pnpm` / `yarn`)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/MahaPoshan-Register.git
cd MahaPoshan-Register
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the project root:

```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Resend Email Integration
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev
SUPER_ADMIN_EMAIL=poshanregister@gmail.com
```

### 4. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to **`http://localhost:3000/`**.

### 5. Build for Production
```bash
npm run build
```
The compiled, production-ready static assets will be created in the `dist/` directory.

---

## 🔒 Super Admin Panel Access

The administration console is hidden from regular school users:

1. In your browser, navigate to:
   ```
   http://localhost:3000/#super-admin
   ```
2. Enter the developer passcode:
   - **Default Passcode:** `Admin@2026`
3. From the dashboard, you can:
   - View pending school registration requests.
   - Set subscription durations (1 mo, 3 mo, 6 mo, 1 yr, or custom date).
   - Extend or revoke active school accounts.
   - Send test alert emails via Resend.

---

## 📁 Project Structure

```
MahaPoshan-Register/
├── api/
│   └── send-email.ts          # Serverless email handler for Vercel/Node deployments
├── src/
│   ├── components/
│   │   ├── AccessPendingView.tsx    # School profile form & pending approval gate
│   │   ├── AdminSettingsView.tsx    # Ingredient rates, menu recipes & backup settings
│   │   ├── AuthLandingView.tsx      # Pre-login SaaS welcome portal (Clerk modals)
│   │   ├── DailyEntryView.tsx       # Daily attendance & consumption calculator
│   │   ├── Header.tsx               # School badge, navigation tabs, user profile
│   │   ├── MonthlyRegisterView.tsx  # Part-2 monthly ledger, stock inward & table view
│   │   ├── OfficialPrintView.tsx    # Official government A4 print layout
│   │   └── SuperAdminPanel.tsx      # Passcode-secured Super Admin console
│   ├── lib/
│   │   ├── constants.ts             # Default school profile, official recipes & ingredients
│   │   ├── email-service.ts         # Resend API email dispatchers
│   │   ├── exportUtils.ts           # Excel (.xlsx) formatting and export engine
│   │   ├── storage.ts               # LocalStorage sync, validation & backups
│   │   └── subscription-store.ts    # Access requests, approvals, expiry & notifications
│   ├── App.tsx                      # Root route dispatcher & access controller
│   ├── main.tsx                     # ClerkProvider and React DOM root
│   └── types.ts                     # TypeScript schemas (Register, Stock, Subscription)
├── .env.local                       # Local API keys (Clerk, Resend)
├── index.html                       # HTML5 entry with Marathi fonts & meta tags
├── package.json
├── tsconfig.json
└── vite.config.ts                   # Vite dev server + Resend API middleware
```

---

## ⚖️ Disclaimer

**MahaPoshan Register** is an independent private software solution (Private SaaS) developed to assist schools and teachers with daily records and calculations. It is **not** an official application of the Government of Maharashtra or the Ministry of Education.

---

## 📄 License

This project is licensed under the **MIT License**.
