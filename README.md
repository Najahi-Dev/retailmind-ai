# 🛍️ RetailMind AI — Intelligent Retail & Inventory Management Platform

An enterprise-grade, AI-driven retail management and predictive inventory platform. **RetailMind AI** empowers retailers to eliminate stockouts, forecast demand, automate purchase reorders, and manage multi-tenant operations with real-time reactive sync.

---

## ✨ Features

- 📊 **Real-time Inventory Dashboard**: Live tracking of stock levels, turnover rates, SKU movements, and inventory valuation powered by Convex's reactive engine.
- 🤖 **AI-Driven Demand Forecasting**: Python FastAPI microservice utilizing machine learning models to forecast SKU demand, identify trends, and calculate optimal stock buffers.
- 🔄 **Automated Reorder Engine**: Dynamic threshold calculations, low-stock alerts, automated purchase order generation, and reorder workflow approvals.
- 👥 **Multi-Tenant & Role-Based Access Control (RBAC)**: Secure multi-organization architecture supporting Super Admin, Organization Admin, Manager, and Staff roles.
- 🛡️ **Super Admin Control Center**: System-wide telemetry, tenant lifecycle management, AI operation monitors, audit trails, and subscription controls.
- 💳 **Stripe Billing & Subscriptions**: Tiered subscription plans (Starter, Growth, Enterprise) with Stripe Checkout, Customer Billing Portal, and webhook sync.
- 🔔 **Intelligent Alerts & Communication**: Automated threshold notifications and email delivery via Resend, Brevo, and Gmail SMTP.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/), [Framer Motion](https://www.framer.com/motion/), [Recharts](https://recharts.org/) |
| **Backend & Database** | [Convex](https://convex.dev/) (Reactive TypeScript backend, realtime database, crons, scheduled actions) |
| **AI Microservice** | [Python 3.12](https://www.python.org/), [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/), [Scikit-learn](https://scikit-learn.org/), [Pandas](https://pandas.pydata.org/) |
| **Authentication** | Custom JWT authentication with role-based session authorization |
| **Payments** | [Stripe](https://stripe.com/) (Checkout Sessions, Billing Portal, Webhooks) |
| **Notifications** | [Resend](https://resend.com/), [Nodemailer](https://nodemailer.com/), [Brevo](https://www.brevo.com/) |

---

## 🔐 Authentication Flow

<img width="1440" height="1840" alt="RetailMind AI Authentication Flow" src="https://github.com/user-attachments/assets/57a40b80-196a-4da1-bd0f-566c762c4c69" />

---

## 📁 Repository Structure

```text
retailmind-ai/
├── app/                      # Next.js App Router (pages, layouts, API routes)
│   ├── (auth)/               # Login, registration, and onboarding routes
│   ├── (dashboard)/          # Authenticated app (inventory, forecasts, reorders, suppliers)
│   ├── super-admin/          # Super admin system operations and tenant control
│   └── api/                  # Serverless route handlers (webhooks, stripe, notifications)
├── convex/                   # Convex reactive backend functions, schemas, crons, and auth
├── ai-service/               # Python FastAPI machine learning & forecasting microservice
│   ├── routers/              # API endpoints for forecasting & dynamic pricing
│   ├── services/             # ML prediction pipelines & data processors
│   └── main.py               # FastAPI application entry point
├── components/               # Reusable UI and domain components
├── lib/                      # Shared client utilities, helpers, and configurations
└── public/                   # Static assets & brand media
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js**: `v20+` or `v22+`
- **Python**: `3.10+` (for AI microservice)
- **Package Manager**: `npm` (or `pnpm` / `yarn`)

### 2. Clone the Repository & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/Najahi-Dev/retailmind-ai.git
cd retailmind-ai

# Install Node.js dependencies
npm install
```

### 3. Configure Environment Variables

Copy the example environment template to `.env.local`:

```bash
cp .env.example .env.local
```

Open `.env.local` and configure:
- `CONVEX_DEPLOYMENT` / `NEXT_PUBLIC_CONVEX_URL`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY` or `GMAIL_EMAIL` & `GMAIL_APP_PASSWORD`
- `AI_SERVICE_URL` (default: `http://localhost:8000`)

---

### 4. Running the Development Environment

You can run the three core services simultaneously:

#### A. Convex Reactive Backend
```bash
npm run dev:convex
```

#### B. AI Forecasting Microservice (Python / FastAPI)
```bash
cd ai-service

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Start the service on port 8000
python main.py
```

#### C. Next.js Frontend Application
```bash
# In the root directory
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js development server on `http://localhost:3000` |
| `npm run dev:convex` | Starts the Convex backend sync process in a repo-safe sandbox |
| `npm run build` | Builds the production Next.js application bundle |
| `npm run start` | Runs the Next.js production server |
| `npm run lint` | Runs ESLint checks across the codebase |

---

## 📄 License

This project is proprietary and maintained by the **RetailMind AI** development team.

