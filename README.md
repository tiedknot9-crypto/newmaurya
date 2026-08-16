# Hospital Management System (HMS)

A modern, production-grade, offline-resilient Hospital Management System built with React, TypeScript, Tailwind CSS, and Supabase (PostgreSQL).

---

## 🏥 Key Functional Modules

1. **OPD (Outpatient Department)**: Patient registration, live queue management, doctor appointment tokens, and consultation tracking.
2. **IPD (Inpatient Department)**: Ward management, bed allocation, admission tracking, daily rounds, vitals charting, and nursing notes.
3. **Operation Theatre (OT) & Consent Forms**:
   - OT room scheduling and live theatre status tracking.
   - Comprehensive **Surgery & Anesthesia Consent Forms** (Combined, Operation-only, Anesthesia-only, and Blood Transfusion / High-Risk consent).
   - Pre-Anesthesia Checkup (PAC) clearance tracking, ASA grading, and NPO status.
   - Bilingual (Hindi/English) consent print layouts with legal risk disclosures and witness signatures.
4. **Pharmacy & Point of Sale (POS)**: Inventory management, batch tracking, expiry alerts, vendor purchase returns (debit notes), and patient medicine returns/refunds.
5. **Laboratory Information System (LIS)**: Test master configuration, multi-parameter reference ranges (age & gender-specific), sample barcode tracking, and verified report release.
6. **Maternity & Newborn Care**: Delivery records, automatic newborn profile generation, and maternal vitals tracking.
7. **Billing & Invoices**: Real-time invoice generation with automatic itemized charges (bed rates, OT charges, medicines, diagnostic tests), tax slabs, and payment reconciliations.
8. **User Roles & RBAC**: Role-based access control for Admins, Doctors, Surgeons, Anesthetists, Nurses, Pharmacists, and Receptionists.

---

## 🗄️ Database Setup & Migrations (Supabase / PostgreSQL)

The complete SQL schema definitions and migrations are available in **`database.sql`** and **`supabase_schema.sql`**.

### How to Apply Schema on Supabase:
1. Open your [Supabase Dashboard](https://app.supabase.com) and navigate to the **SQL Editor**.
2. Copy the entire contents of `supabase_schema.sql` (or `database.sql`).
3. Paste into the SQL Editor and click **Run**.
4. The script will automatically:
   - Create all necessary tables, constraints, foreign keys, and indexes.
   - Apply Row Level Security (RLS) policies for authenticated and staff roles.
   - Set up automatic timestamp triggers (`updated_at`).
   - Populate initial seed data (OT rooms, departments, default lab test groups, GST slabs).
   - Refresh the PostgREST schema cache.

---

## 🚀 Local Development

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
# 1. Clone the repository
git clone <your-repository-url>
cd <repository-folder>

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Fill in your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (optional, fallback local storage is enabled)

# 4. Start the development server
npm run dev
```

### Production Build
```bash
npm run build
```

---

## 📦 Ready for GitHub Upload
This repository is configured for version control and clean deployment. All changes across the OT Management, Surgery & Anesthesia Consent Forms, LIS, Pharmacy, Maternity, and Billing modules are fully synchronized.
