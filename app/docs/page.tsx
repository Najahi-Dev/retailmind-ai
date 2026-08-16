import Link from "next/link";
import {
  Layout,
  List,
  Zap,
  Brain,
  ShieldCheck,
  Truck,
  RefreshCw,
  Code,
  Banknote,
  CreditCard,
  CalendarCheck,
  Users,
  BarChart3,
  TrendingUp,
  Percent,
  CheckCircle,
  Copy,
  Terminal,
  Search,
  Menu,
  ChevronRight,
  ExternalLink,
  CornerUpRight,
  CopyCheck,
} from "lucide-react";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-400 selection:bg-violet-500 selection:text-white">
      {/* Top Sticky Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-[57px] bg-slate-950/80 backdrop-blur-sm border-b border-slate-800/80 flex items-center px-6 sm:px-8">
        <div className="flex items-center flex-1">
          {/* Brand Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-r from-violet-500 to-emerald-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              RM
            </div>
            <span className="text-white font-semibold text-lg">RetailMind</span>
          </div>
          <span className="ml-4 text-xs text-slate-500">v1.0</span>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Quick search..."
            className="bg-slate-900/50 border border-slate-800/50 rounded-md px-3 py-1.5 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 w-[200px] sm:w-[250px]"
          />
          <span className="text-xs bg-violet-500/20 text-violet-500 px-2 py-0.5 rounded">Ctrl K</span>
        </div>

        {/* Nav Links */}
        <div className="hidden sm:flex items-center space-x-4 ml-auto">
          <Link href="/" className="text-slate-300 hover:text-slate-200 transition-colors text-sm font-medium">
            Home
          </Link>
          <Link href="/pricing" className="text-slate-300 hover:text-slate-200 transition-colors text-sm font-medium">
            Pricing
          </Link>
          <Link href="/sign-in" className="text-slate-300 hover:text-slate-200 transition-colors text-sm font-medium">
            Sign In
          </Link>
          <Link href="/docs" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Docs
          </Link>
          <Link href="/" className="bg-violet-500 hover:bg-violet-600 text-white px-4 py-2 rounded-md font-medium transition-colors">
            Start Free Trial
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden ml-auto p-1 rounded hover:bg-slate-800/50">
          <Menu className="h-4 w-4 text-slate-400 hover:text-white" />
        </button>
      </nav>

      {/* Main Content */}
      <div className="pt-[57px] min-h-[calc(100vh-57px)] flex">
        {/* Left Navigation Sidebar */}
        <aside className="sticky top-[57px] left-0 w-64 bg-slate-950 border-r border-slate-800/80 h-[calc(100vh-57px)] overflow-y-auto px-4 pb-12">
          <div className="space-y-6">
            {/* Primary Category Tabs */}
            <div className="space-y-2">
              <button className="flex w-full items-center space-x-3 px-3 py-2 rounded-md bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors">
                <List className="h-4 w-4" />
                <span className="text-sm font-medium">Documentation</span>
              </button>
              <button className="flex w-full items-center space-x-3 px-3 py-2 rounded-md hover:bg-slate-800/50 transition-colors text-slate-400">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">AI Models & Forecasting</span>
              </button>
              <button className="flex w-full items-center space-x-3 px-3 py-2 rounded-md hover:bg-slate-800/50 transition-colors text-slate-400">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Near-Expiry Markdown Engine</span>
              </button>
              <button className="flex w-full items-center space-x-3 px-3 py-2 rounded-md hover:bg-slate-800/50 transition-colors text-slate-400">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm font-medium">B2B Settlements & PO</span>
              </button>
            </div>

            {/* Grouped Navigation */}
            <div className="space-y-4 mt-6">
              {/* Getting Started */}
              <div>
                <h3 className="text-xs tracking-wider text-violet-500 uppercase mb-2">GETTING STARTED</h3>
                <nav className="space-y-1">
                  <Link href="#quickstart" className="flex w-full items-center space-x-2 px-2 py-1.5 rounded hover:bg-slate-800/50 transition-colors text-slate-300 text-sm">
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                    <span>Quickstart Setup</span>
                  </Link>
                  <Link href="#architecture" className="flex w-full items-center space-x-2 px-2 py-1.5 rounded hover:bg-slate-800/50 transition-colors text-slate-300 text-sm">
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                    <span>System Architecture</span>
                  </Link>
                  <Link href="#rbac" className="flex w-full items-center space-x-2 px-2 py-1.5 rounded hover:bg-slate-800/50 transition-colors text-slate-300 text-sm">
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                    <span>Role-Based Access (RBAC)</span>
                  </Link>
                </nav>
              </div>

              {/* Core Modules */}
              <div>
                <h3 className="text-xs tracking-wider text-violet-500 uppercase mb-2">CORE MODULES</h3>
                <nav className="space-y-1">
                  <Link href="#forecasting" className="flex w-full items-center space-x-2 px-2 py-1.5 rounded hover:bg-slate-800/50 transition-colors text-slate-300 text-sm">
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                    <span>AI Demand Forecasting</span>
                  </Link>
                  <Link href="#markdowns" className="flex w-full items-center space-x-2 px-2 py-1.5 rounded hover:bg-slate-800/50 transition-colors text-slate-300 text-sm">
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                    <span>Expiry Markdowns</span>
                  </Link>
                  <Link href="#payments" className="flex w-full items-center space-x-2 px-2 py-1.5 rounded hover:bg-slate-800/50 transition-colors text-slate-300 text-sm">
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                    <span>PO / Cheque / Credit (DUE)</span>
                  </Link>
                  <Link href="#trial" className="flex w-full items-center space-x-2 px-2 py-1.5 rounded hover:bg-slate-800/50 transition-colors text-slate-300 text-sm">
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                    <span>14-Day Trial & Billing</span>
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8 sm:p-12 lg:p-16 overflow-y-auto">
          {/* Section A: Hero Header & Overview */}
          <section className="mb-16">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-xs tracking-wider bg-violet-500/20 text-violet-500 px-3 py-1 rounded">GETTING STARTED</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold text-white">Get started with RetailMind AI</h1>
            <p className="text-slate-400 lg:text-lg max-w-3xl">
              RetailMind AI is a supermarket neural intelligence platform that unifies real-time stock control, predictive AI replenishment, dynamic markdown pricing, and multi-tenant B2B vendor fulfillment into a single cohesive system designed for modern retail operations.
            </p>
          </section>

          {/* Section B: Quickstart Workflow */}
          <section id="quickstart" className="mb-16">
            <h2 className="mb-6 text-3xl font-semibold text-white">Quickstart Workflow</h2>
            <p className="mb-8 text-slate-400 max-w-2xl">
              Follow these three steps to launch your RetailMind AI workspace and begin leveraging neural intelligence for your supermarket operations.
            </p>

            {/* Tab Switcher */}
            <div className="mb-12">
              <div className="flex space-x-2 rounded-md bg-slate-900/50 border border-slate-800/50">
                <button
                  className="flex-1 px-4 py-3 text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors border-b-2 border-transparent"
                  aria-current="true"
                >
                  Starter Setup (LKR 2,500)
                </button>
                <button
                  className="flex-1 px-4 py-3 text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors border-b-2 border-transparent"
                >
                  Growth AI Setup (LKR 4,900)
                </button>
                <button
                  className="flex-1 px-4 py-3 text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors border-b-2 border-transparent"
                >
                  Enterprise Multi-Store
                </button>
              </div>
            </div>

            {/* Step 1 */}
            <div className="mb-12">
              <div className="flex items-start space-x-4 mb-4">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-violet-500/20 text-violet-500 rounded-lg text-sm font-bold">
                  [ 01 ]
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-white">Create Workspace & Tenant</h3>
                  <p className="mb-4 text-slate-400">
                    Provision an isolated multi-tenant workspace with dedicated Convex database, secure data separation, and automated AI model initialization.
                  </p>

                  {/* Terminal Code Block */}
                  <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg overflow-hidden">
                    <div className="flex items-center px-4 py-2 bg-slate-900 border-b border-slate-800/50">
                      <Terminal className="h-4 w-4 text-slate-400 mr-2" />
                      <span className="text-sm font-mono text-slate-300">POST /api/workspaces/create-tenant</span>
                      <button className="ml-auto p-1 rounded hover:bg-slate-800/50">
                        <Copy className="h-3 w-3 text-slate-400 hover:text-white" />
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-300 whitespace-pre-wrap">
                      {`curl -X POST https://api.retailmind.ai/workspaces/create-tenant \
                      -H "Authorization: Bearer <access_token>" \
                      -H "Content-Type: application/json" \
                      -d '{
                        "name": "Downtown Supermarket",
                        "plan": "GROWTH",
                        "primaryLocation": {
                          "address": "123 Main St",
                          "city": "Colombo",
                          "postalCode": "00100"
                        }
                      }'`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="mb-12">
              <div className="flex items-start space-x-4 mb-4">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-violet-500/20 text-violet-500 rounded-lg text-sm font-bold">
                  [ 02 ]
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-white">Select Plan & 14-Day Free Trial</h3>
                  <p className="mb-4 text-slate-400">
                    Instantly activate your free trial without credit card requirements. Choose from Starter, Growth, or Enterprise plans to begin immediately.
                  </p>

                  {/* Terminal Code Block */}
                  <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg overflow-hidden">
                    <div className="flex items-center px-4 py-2 bg-slate-900 border-b border-slate-800/50">
                      <Terminal className="h-4 w-4 text-slate-400 mr-2" />
                      <span className="text-sm font-mono text-slate-300">Convex Mutation</span>
                      <button className="ml-auto p-1 rounded hover:bg-slate-800/50">
                        <Copy className="h-3 w-3 text-slate-400 hover:text-white" />
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-300 whitespace-pre-wrap">
                      {`await activateFreeTrial({
                        selectedPlan: 'GROWTH',
                        paymentMethod: null, // No credit card required for trial
                        trialDays: 14
                      })`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="mb-12">
              <div className="flex items-start space-x-4 mb-4">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-violet-500/20 text-violet-500 rounded-lg text-sm font-bold">
                  [ 03 ]
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-white">Sync Catalog & Run Neural Model</h3>
                  <p className="mb-4 text-slate-400">
                    Upload your product inventory and trigger the initial neural network training for demand forecasting and safety stock calculations.
                  </p>

                  {/* Terminal Code Block */}
                  <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg overflow-hidden">
                    <div className="flex items-center px-4 py-2 bg-slate-900 border-b border-slate-800/50">
                      <Terminal className="h-4 w-4 text-slate-400 mr-2" />
                      <span className="text-sm font-mono text-slate-300">Inventory Sync</span>
                      <button className="ml-auto p-1 rounded hover:bg-slate-800/50">
                        <Copy className="h-3 w-3 text-slate-400 hover:text-white" />
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-300 whitespace-pre-wrap">
                      {`curl -X POST https://api.retailmind.ai/inventory/batch-sync \
                      -H "Authorization: Bearer <access_token>" \
                      -H "Content-Type: application/json" \
                      -d '{
                        "workspaceId": "wksp_abc123",
                        "products": [
                          {
                            "sku": "MILK-001",
                            "name": "Full Cream Milk 1L",
                            "category": "Dairy",
                            "currentStock": 45,
                            "reorderPoint": 20,
                            "expiryDate": "2026-08-25"
                          }
                        ]
                      }'`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section C: Role-Based Access Control */}
          <section id="rbac" className="mb-16">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-xs tracking-wider bg-violet-500/20 text-violet-500 px-3 py-1 rounded">CORE MODULES</span>
            </div>
            <h2 className="mb-6 text-3xl font-semibold text-white">Role-Based Access Control (RBAC)</h2>
            <p className="mb-8 text-slate-400 max-w-2xl">
              Enterprise-grade permission system defining strict access controls for supermarket operations, ensuring data security and operational integrity.
            </p>

            {/* RBAC Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full bg-slate-900/50 border border-slate-800/50 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800/50">
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Permissions</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Restrictions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <tr className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 flex items-center space-x-3">
                      <ShieldCheck className="h-4 w-4 text-indigo-500" />
                      <span className="font-semibold text-white">Admin</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 space-y-2">
                      <p className="mb-1">Full system access including:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Workspace & tenant management</li>
                        <li>Billing & subscription controls</li>
                        <li>User management & role assignments</li>
                        <li>AI model configuration & training</li>
                        <li>All operational data access</li>
                      </ul>
                    </td>
                    <td className="px-6 py-4 text-slate-500">None</td>
                  </tr>
                  <tr className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 flex items-center space-x-3">
                      <Brain className="h-4 w-4 text-purple-500" />
                      <span className="font-semibold text-white">Manager</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 space-y-2">
                      <p className="mb-1">Store-level access to:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Inventory forecasting & replenishment</li>
                        <li>Purchase order creation & management</li>
                        <li>Dynamic pricing & markdowns</li>
                        <li>Staff scheduling & task assignment</li>
                        <li>Basic reporting & analytics</li>
                      </ul>
                    </td>
                    <td className="px-6 py-4 text-slate-500 space-y-2">
                      <p className="mb-1">Restricted from:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Workspace settings & billing</li>
                        <li>User management & role creation</li>
                        <li>AI model retraining configs</li>
                        <li>Financial reports & P&L</li>
                      </ul>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 flex items-center space-x-3">
                      <Users className="h-4 w-4 text-emerald-500" />
                      <span className="font-semibold text-white">Staff</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 space-y-2">
                      <p className="mb-1">Day-to-day operations:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Stock intake & barcode scanning</li>
                        <li>Batch counting & inventory updates</li>
                        <li>Receipt generation & processing</li>
                        <li>Basic task execution</li>
                      </ul>
                    </td>
                    <td className="px-6 py-4 text-slate-500 space-y-2">
                      <p className="mb-1">Restricted from:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Analytics dashboards & reports</li>
                        <li>Purchase order approval</li>
                        <li>Financial transactions</li>
                        <li>System configuration</li>
                        <li>Staff management tools</li>
                      </ul>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 flex items-center space-x-3">
                      <ExternalLink className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold text-white">Supplier</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      Isolated portal access for:
                    </td>
                    <td className="px-6 py-4 text-slate-500 space-y-2">
                      <p className="mb-1">Limited to:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Viewing assigned Purchase Orders</li>
                        <li>Confirming shipment receipts</li>
                        <li>Updating delivery statuses</li>
                        <li>Submitting invoice documentation</li>
                      </ul>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section D: Purchase Orders & B2B Settlement */}
          <section id="payments" className="mb-16">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-xs tracking-wider bg-violet-500/20 text-violet-500 px-3 py-1 rounded">CORE MODULES</span>
            </div>
            <h2 className="mb-6 text-3xl font-semibold text-white">Purchase Orders & B2B Settlement Terms</h2>
            <p className="mb-8 text-slate-400 max-w-2xl">
              Flexible payment workflows designed for supermarket supply chains, accommodating various vendor terms while maintaining clear financial tracking.
            </p>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Cash on Delivery */}
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
                <div className="flex items-start space-x-3 mb-4">
                  <Truck className="mt-1 h-5 w-5 text-indigo-500" />
                  <div>
                    <h3 className="mb-1 text-lg font-medium text-white">Cash on Delivery (COD)</h3>
                    <p className="text-slate-400">
                      Settled in cash upon stock arrival at receiving bay with immediate reconciliation.
                    </p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-slate-400 mb-2">Process Flow:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Purchase order created & sent to vendor</li>
                    <li>Goods delivered to receiving bay</li>
                    <li>Cash payment collected on delivery</li>
                    <li>Immediate payment recording & reconciliation</li>
                    <li>Goods released for putaway</li>
                  </ul>
                </div>
              </div>

              {/* Cheque Payment */}
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
                <div className="flex items-start space-x-3 mb-4">
                  <Banknote className="mt-1 h-5 w-5 text-slate-500" />
                  <div>
                    <h3 className="mb-1 text-lg font-medium text-white">Cheque Payment</h3>
                    <p className="text-slate-400">
                      Dynamic form fields capturing Cheque #, Issuing Bank, Amount, and Issue Date with clearance tracking.
                    </p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-slate-400 mb-2">Required Details:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Cheque Number</li>
                    <li>Issuing Bank Name</li>
                    <li>Payment Amount (LKR)</li>
                    <li>Issue Date</li>
                    <li>Expected Clearance Date</li>
                  </ul>
                  <p className="font-medium text-slate-400 mb-2 mt-4">Tracking:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Pending clearance (issued)</li>
                    <li>In clearing (deposited)</li>
                    <li>Cleared (funds received)</li>
                    <li>Returned (insufficient funds)</li>
                  </ul>
                </div>
              </div>

              {/* Credit Payment */}
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
                <div className="flex items-start space-x-3 mb-4">
                  <CreditCard className="mt-1 h-5 w-5 text-rose-500" />
                  <div>
                    <h3 className="mb-1 text-lg font-medium text-white">Credit (Accounts Payable)</h3>
                    <p className="text-slate-400">
                      Automatically registers an outstanding <span className="font-semibold text-emerald-400">DUE</span> status in Payment History with configurable Net 15/30/60 due dates.
                    </p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-slate-400 mb-2">Credit Terms:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Net 15: Payment due 15 days after invoice</li>
                    <li>Net 30: Payment due 30 days after invoice</li>
                    <li>Net 60: Payment due 60 days after invoice</li>
                    <li>Early payment discounts available (1%-2%)</li>
                    <li>Late fees applicable after due date (configurable)</li>
                  </ul>
                  <p className="font-medium text-slate-400 mb-2 mt-4">Status Tracking:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><span className="font-semibold text-emerald-400">DUE</span> - Outstanding balance</li>
                    <li><span className="font-semibold text-slate-400">PAID</span> - Settled in full</li>
                    <li><span className="font-semibold text-slate-400">PARTIAL</span> - Partial payment received</li>
                    <li><span className="font-semibold text-slate-400">OVERDUE</span> - Past due date</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section E: Pricing & Trial */}
          <section id="trial" className="mb-16">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-xs tracking-wider bg-violet-500/20 text-violet-500 px-3 py-1 rounded">CORE MODULES</span>
            </div>
            <h2 className="mb-6 text-3xl font-semibold text-white">Pricing & 14-Day Free Trial</h2>
            <p className="mb-8 text-slate-400 max-w-2xl">
              Transparent, self-serve pricing plans designed for supermarkets of all sizes, all featuring risk-free 14-day trials without credit card requirements.
            </p>

            <div className="grid gap-8 md:grid-cols-2">
              {/* Starter Plan */}
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
                <div className="flex items-start space-x-3 mb-4">
                  <CheckCircle className="mt-1 h-5 w-5 text-emerald-500" />
                  <div>
                    <h3 className="mb-1 text-lg font-medium text-white">Starter Plan</h3>
                    <p className="text-slate-400 mb-2">LKR 2,500/month</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="font-medium text-slate-400 mb-2">Includes:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Up to 100 SKUs</li>
                    <li>Single store location</li>
                    <li>Manual purchase order creation</li>
                    <li>Basic stock tracking</li>
                    <li>Standard email support</li>
                    <li>14-day free trial</li>
                  </ul>
                  <p className="font-medium text-slate-400 mb-2">Ideal for:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Small supermarkets</li>
                    <li>Convenience stores</li>
                    <li>Independent grocers</li>
                    <li>Specialty food shops</li>
                  </ul>
                </div>
              </div>

              {/* Growth Plan */}
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
                <div className="flex items-start space-x-3 mb-4">
                  <CheckCircle className="mt-1 h-5 w-5 text-emerald-500" />
                  <div>
                    <h3 className="mb-1 text-lg font-medium text-white">Growth Plan</h3>
                    <p className="text-slate-400 mb-2">LKR 4,900/month</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="font-medium text-slate-400 mb-2">Includes:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Unlimited SKUs</li>
                    <li>Up to 3 store locations</li>
                    <li>Neural AI demand forecasting</li>
                    <li>Automated reorder generation</li>
                    <li>Dynamic expiry markdowns</li>
                    <li>Advanced analytics dashboard</li>
                    <li>24/7 priority support (email & phone)</li>
                    <li>API access for integrations</li>
                    <li>14-day free trial</li>
                  </ul>
                  <p className="font-medium text-slate-400 mb-2">Ideal for:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Growing supermarket chains</li>
                    <li>Mid-size retail groups</li>
                    <li>Franchise operations</li>
                    <li>Regional supermarket operators</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center text-slate-500">
              <p className="text-sm">
                ✨ Both Starter and Growth plans include a 14-day free trial with no credit card required. Cancel anytime during the trial period.
              </p>
              <Link href="/pricing" className="inline-block mt-4 bg-violet-500 hover:bg-violet-600 text-white px-6 py-3 rounded-md font-medium transition-colors">
                View Detailed Pricing
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}