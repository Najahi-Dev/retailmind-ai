"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/auth-context";
import { ServerUser } from "@/lib/get-server-user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CircleHelpIcon,
  SearchIcon,
  SparklesIcon,
  BookOpenIcon,
  TicketIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  FileTextIcon,
  MailIcon,
  PhoneIcon,
  CheckCircle2Icon,
  RefreshCwIcon,
  SendIcon,
  BotIcon,
  ChevronDownIcon,
  ActivityIcon,
  LifeBuoyIcon,
  Trash2Icon,
  MessageSquareTextIcon,
  ClockIcon,
  AlertTriangleIcon,
  CheckSquareIcon,
  XCircleIcon,
  UserIcon,
  UserCheckIcon,
  MessageCircleIcon,
  SlidersIcon,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  user: ServerUser;
}

const CATEGORIES = [
  {
    id: "getting-started",
    title: "Quick Start & Onboarding",
    desc: "Platform setup, supermarket inventory configuration, and user seat management.",
    icon: BookOpenIcon,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    articles: [
      { title: "Setting up your Supermarket Locations & Warehouse Bays", views: "2.4k views" },
      { title: "Adding & Managing Staff, Manager, and Supplier User Accounts", views: "1.8k views" },
      { title: "Understanding Role-Based Access Control (RBAC) Permissions", views: "3.1k views" },
    ],
  },
  {
    id: "procurement-pos",
    title: "Vendor Purchase Orders & POs",
    desc: "Supplier fulfillment tracking, order status updates, and dispatch confirmations.",
    icon: ShoppingCartIcon,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    articles: [
      { title: "How Suppliers Acknowledge, Ship, and Fulfill Purchase Orders", views: "4.2k views" },
      { title: "Automated Reorder Quantity Generation & Lead Time Days", views: "2.9k views" },
      { title: "Multi-Tenant Vendor Data Isolation Security Explanation", views: "1.5k views" },
    ],
  },
  {
    id: "ai-forecasting",
    title: "AI Demand Forecasting & Analytics",
    desc: "Predictive machine learning models, stockout risk alerts, and pricing suggestions.",
    icon: TrendingUpIcon,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    articles: [
      { title: "Interpreting AI Demand Forecasting & Seasonality Trends", views: "3.8k views" },
      { title: "Configuring Reorder Point (ROP) & Safety Stock Thresholds", views: "2.1k views" },
      { title: "Automated Price Optimizations & Profit Margin Analysis", views: "1.9k views" },
    ],
  },
  {
    id: "security-access",
    title: "Security, Data Privacy & Audits",
    desc: "Row-Level Authorization (RLS), security warnings, and audit logging.",
    icon: ShieldCheckIcon,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    articles: [
      { title: "Understanding Security Audit Logs & Access Warning Alerts", views: "1.2k views" },
      { title: "Encrypted JWT Session Tokens & Convex Database Security", views: "950 views" },
      { title: "Password Hashing & Account Suspension Recovery Procedures", views: "1.4k views" },
    ],
  },
];

const FAQS = [
  {
    q: "How do I invite a new Supplier or Staff user to RetailMind AI?",
    a: "As an Administrator or Store Manager, navigate to Users & Roles -> Add User. Enter their email, full name, temporary password, and assign their specific role (Admin, Manager, Staff, or Supplier). Non-admin users will immediately receive sign-in access.",
  },
  {
    q: "How does Supplier Data Isolation protect multi-tenant purchase order records?",
    a: "RetailMind AI enforces strict Row-Level Authorization (RLS) on database queries and mutations. When a user logged in with the Supplier role accesses purchase orders, the Convex backend automatically filters records matching their assigned vendor identity. Suppliers cannot view or modify purchase orders assigned to other vendors.",
  },
  {
    q: "What should I do if a supplier account is marked as suspended during sign-in?",
    a: "Our updated authentication handler automatically activates assigned vendor accounts upon sign-in. If an account remains deactivated, an Administrator can navigate to Users -> Edit User and toggle the 'Account Status' switch to Active.",
  },
  {
    q: "How does AI Demand Forecasting calculate suggested reorder quantities?",
    a: "The machine learning engine analyzes historical stock movements over the past 30 to 90 days, combining seasonal demand spikes, average daily sales velocity, and supplier lead time days to generate optimal reorder suggestions.",
  },
  {
    q: "How can I update my profile details or avatar photo?",
    a: "Click your user avatar in the bottom-left sidebar menu and select 'My Profile'. You can edit your full name and upload a new profile photo. Role elevations remain restricted to system administrators.",
  },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  open: { label: "Open / Pending", bg: "bg-blue-500/10", color: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  in_progress: { label: "In Progress", bg: "bg-amber-500/10", color: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  resolved: { label: "Resolved (Approved)", bg: "bg-emerald-500/10", color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
  closed: { label: "Closed (Rejected)", bg: "bg-red-500/10", color: "text-red-600 dark:text-red-400", border: "border-red-500/30" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low Priority", color: "text-slate-500 dark:text-slate-400" },
  medium: { label: "Medium Priority", color: "text-blue-500 font-semibold" },
  high: { label: "High Priority", color: "text-amber-500 font-bold" },
  critical: { label: "Critical Impact", color: "text-red-500 font-bold" },
};

const ROLE_BADGES: Record<string, { label: string; bg: string; color: string; border: string }> = {
  admin: { label: "Admin", bg: "bg-indigo-500/10", color: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/30" },
  manager: { label: "Manager", bg: "bg-emerald-500/10", color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
  staff: { label: "Staff", bg: "bg-blue-500/10", color: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  supplier: { label: "Supplier", bg: "bg-amber-500/10", color: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
};

export default function HelpClient({ user: initialUser }: Props) {
  const router = useRouter();
  const { user: authUser, token } = useAuth();
  const currentUser = authUser ?? initialUser;

  const isAdminOrManager = ["admin", "manager"].includes(currentUser.role);

  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [statusTabFilter, setStatusTabFilter] = useState<string>("all");
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  // Admin Response Dialog State
  const [respondingTicket, setRespondingTicket] = useState<any | null>(null);
  const [adminResponseText, setAdminResponseText] = useState("");
  const [adminStatus, setAdminStatus] = useState<"open" | "in_progress" | "resolved" | "closed">("resolved");
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Ticket Form States
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("general");
  const [ticketPriority, setTicketPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [ticketDetails, setTicketDetails] = useState("");

  // Convex Queries & Mutations
  const userTickets = useQuery(api.supportTickets.getUserTickets, { token: token ?? undefined });
  const createTicketMutation = useMutation(api.supportTickets.createTicket);
  const deleteTicketMutation = useMutation(api.supportTickets.deleteTicket);
  const respondToTicketMutation = useMutation(api.supportTickets.respondToTicket);

  // AI Chat Assistant State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "bot" | "user"; text: string }>>([
    {
      sender: "bot",
      text: `Hello ${currentUser.name}! I am RetailMind AI Assistant. How can I assist you with inventory, purchase orders, or account management today?`,
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  const handleSendTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDetails.trim()) {
      toast.error("Please fill out the ticket subject and description.");
      return;
    }

    setTicketSubmitting(true);
    try {
      const res = await createTicketMutation({
        token: token ?? undefined,
        subject: ticketSubject,
        category: ticketCategory,
        priority: ticketPriority,
        details: ticketDetails,
      });

      setTicketSubmitting(false);
      setIsTicketOpen(false);
      setTicketSubject("");
      setTicketDetails("");
      toast.success("Support Ticket Submitted Successfully!", {
        description: `Ticket Reference ID: ${res.ticketId}`,
      });
    } catch (err: any) {
      setTicketSubmitting(false);
      toast.error(err?.message || "Failed to submit support ticket");
    }
  };

  const handleDeleteTicket = async (ticketDbId: Id<"supportTickets">) => {
    setDeletingTicketId(ticketDbId);
    try {
      await deleteTicketMutation({
        token: token ?? undefined,
        ticketDbId,
      });
      toast.success("Support ticket deleted successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete support ticket");
    } finally {
      setDeletingTicketId(null);
    }
  };

  const handleOpenResponseModal = (ticket: any) => {
    setRespondingTicket(ticket);
    setAdminResponseText(ticket.adminResponse ?? "");
    setAdminStatus(ticket.status ?? "resolved");
  };

  const handleSaveAdminResponse = async () => {
    if (!respondingTicket) return;

    setSubmittingResponse(true);
    try {
      await respondToTicketMutation({
        token: token ?? undefined,
        ticketDbId: respondingTicket._id,
        adminResponse: adminResponseText.trim() || "Reviewed and processed by Administrator.",
        status: adminStatus,
      });

      toast.success(`Ticket ${respondingTicket.ticketId} updated to ${adminStatus.toUpperCase()}`);
      setRespondingTicket(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update ticket response");
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleQuickStatusChange = async (
    ticket: any,
    targetStatus: "resolved" | "closed",
    defaultResponse: string
  ) => {
    try {
      await respondToTicketMutation({
        token: token ?? undefined,
        ticketDbId: ticket._id,
        adminResponse: ticket.adminResponse || defaultResponse,
        status: targetStatus,
      });

      const label = targetStatus === "resolved" ? "Approved & Resolved" : "Rejected & Closed";
      toast.success(`Ticket ${ticket.ticketId} marked as ${label}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update ticket status");
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userText = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setChatInput("");

    setTimeout(() => {
      let botResponse =
        "Thank you for your question! For specific purchase orders or inventory management steps, check our Knowledge Base above or submit a support ticket directly to our engineers.";
      const lower = userText.toLowerCase();

      if (lower.includes("supplier") || lower.includes("po") || lower.includes("order")) {
        botResponse =
          "For Vendor Purchase Orders: Log in as a Supplier to view your assigned POs, confirm receipt, mark shipment, or update delivery dates. Access to other vendor POs is protected by Multi-Tenant Data Isolation.";
      } else if (lower.includes("profile") || lower.includes("name") || lower.includes("avatar")) {
        botResponse =
          "To update your profile: Click your user avatar at the bottom-left sidebar -> My Profile. You can update your full name and profile avatar photo immediately.";
      } else if (lower.includes("reorder") || lower.includes("ai") || lower.includes("forecast")) {
        botResponse =
          "AI Reorders & Forecasting: Our machine learning engine generates automated replenishment suggestions based on daily sales velocity, safety stock thresholds, and supplier lead times.";
      }

      setChatMessages((prev) => [...prev, { sender: "bot", text: botResponse }]);
    }, 800);
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const filteredCategories = CATEGORIES.map((cat) => ({
    ...cat,
    articles: cat.articles.filter((art) =>
      art.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(
    (cat) =>
      cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.articles.length > 0
  );

  const displayedTickets = (userTickets ?? []).filter((t) => {
    if (statusTabFilter === "all") return true;
    return t.status === statusTabFilter;
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">
      {/* ── 1. HERO HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 text-white p-6 sm:p-8 rounded-xl shadow-xl border shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 sm:max-w-2xl w-[95vw] sm:w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5">
                <LifeBuoyIcon className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                Help & Support Center
              </Badge>
              <Badge className="text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5">
                <ActivityIcon className="w-3.5 h-3.5 mr-1 text-emerald-400 animate-pulse" />
                All Systems Operational
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              How can we help you today, {currentUser.name.split(" ")[0]}?
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Explore knowledge base guides, learn about platform security rules, ask our 24/7 AI Assistant, or submit a priority support ticket.
            </p>

            {/* Search Input Bar */}
            <div className="relative pt-2 sm:max-w-xl w-[95vw] sm:w-full">
              <SearchIcon className="w-4 h-4 absolute left-3.5 top-[22px] text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guides, PO management, AI reorders, account setup..."
                className="pl-10 h-11 text-xs rounded-xl bg-slate-950/70 border-indigo-500/30 text-white placeholder:text-slate-400 focus:border-indigo-400 shadow-inner"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* AI Assistant Quick Trigger */}
            <Button
              onClick={() => setIsAiOpen(true)}
              className="h-10 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 shadow-lg border-0"
            >
              <SparklesIcon className="w-4 h-4 mr-2 text-amber-300" />
              Ask AI Assistant
            </Button>

            {/* Submit Support Ticket Modal */}
            <Dialog open={isTicketOpen} onOpenChange={setIsTicketOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border-white/20 px-4"
                >
                  <TicketIcon className="w-4 h-4 mr-2 text-indigo-300" />
                  Submit Support Ticket
                </Button>
              </DialogTrigger>

              <DialogContent className="rounded-xl border-slate-200 dark:border-slate-800 sm:max-w-lg w-[95vw] sm:w-full">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TicketIcon className="w-5 h-5 text-indigo-500" />
                    Submit Priority Support Ticket
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Our technical support engineers will review your ticket and post a response directly to your account.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSendTicket} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Issue Subject <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="e.g. Question regarding purchase order fulfillment status"
                      className="h-9 text-xs rounded-xl"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</Label>
                      <Select value={ticketCategory} onValueChange={setTicketCategory}>
                        <SelectTrigger className="h-9 text-xs rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Support</SelectItem>
                          <SelectItem value="pos">Purchase Orders & Suppliers</SelectItem>
                          <SelectItem value="inventory">Inventory & Stocking</SelectItem>
                          <SelectItem value="ai">AI Forecasting & Pricing</SelectItem>
                          <SelectItem value="account">Account & Permissions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Urgency Level</Label>
                      <Select value={ticketPriority} onValueChange={(val: any) => setTicketPriority(val)}>
                        <SelectTrigger className="h-9 text-xs rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Priority</SelectItem>
                          <SelectItem value="medium">Medium Priority</SelectItem>
                          <SelectItem value="high">High Priority</SelectItem>
                          <SelectItem value="critical">Critical System Impact</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Detailed Explanation <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      value={ticketDetails}
                      onChange={(e) => setTicketDetails(e.target.value)}
                      placeholder="Describe the issue, step to reproduce, or support question..."
                      className="min-h-[100px] text-xs rounded-xl"
                      required
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsTicketOpen(false)}
                      className="rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={ticketSubmitting}
                      className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      {ticketSubmitting ? (
                        <RefreshCwIcon className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <SendIcon className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Submit Ticket
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* ── 2. SUPPORT TICKET CONTROL DESK (ADMIN / MANAGER OR USER VIEW) ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TicketIcon className="w-5 h-5 text-indigo-500" />
                {isAdminOrManager
                  ? "Support Control Desk & Ticket Management"
                  : "My Submitted Support Tickets"}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {isAdminOrManager
                  ? `Review, respond, approve, or reject user support tickets across RetailMind AI`
                  : `Track status updates, staff responses, and manage active support tickets`}
              </CardDescription>
            </div>

            {/* Filter Tabs for Admin/Manager */}
            {isAdminOrManager && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {["all", "open", "in_progress", "resolved", "closed"].map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={statusTabFilter === st ? "default" : "outline"}
                    onClick={() => setStatusTabFilter(st)}
                    className={`h-7 text-[11px] rounded-lg font-semibold capitalize ${
                      statusTabFilter === st
                        ? "bg-indigo-600 text-white border-0 shadow-xs"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    {st === "all" ? "All Tickets" : st.replace("_", " ")}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {userTickets === undefined ? (
            <div className="flex items-center justify-center gap-2 p-8 text-xs font-medium text-slate-500">
              <RefreshCwIcon className="animate-spin size-4 text-indigo-500" />
              Loading support ticket desk...
            </div>
          ) : displayedTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <TicketIcon className="size-8 text-slate-400" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No Support Tickets Found</p>
              <p className="text-[11px] text-slate-500 max-w-sm">
                {isAdminOrManager
                  ? "There are currently no tickets matching the selected filter."
                  : "You haven't submitted any support tickets yet. Click below to submit a ticket."}
              </p>
              {!isAdminOrManager && (
                <Button
                  onClick={() => setIsTicketOpen(true)}
                  variant="outline"
                  size="sm"
                  className="mt-1 rounded-xl text-xs font-semibold"
                >
                  Submit a Support Ticket
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedTickets.map((ticket) => {
                const statusCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
                const priorityCfg = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.medium;
                const roleBadge = ROLE_BADGES[ticket.userRole] ?? ROLE_BADGES.staff;
                const isDeleting = deletingTicketId === ticket._id;

                return (
                  <div
                    key={ticket._id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3 transition-colors hover:border-indigo-500/30"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-extrabold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                          {ticket.ticketId}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {ticket.subject}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Badge className={`text-[11px] font-bold px-2.5 py-0.5 border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                          {statusCfg.label}
                        </Badge>

                        {/* Admin / Manager Action Buttons (Hidden once responded or processed) */}
                        {isAdminOrManager && !ticket.adminResponse && ticket.status !== "resolved" && ticket.status !== "closed" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenResponseModal(ticket)}
                              className="h-7 text-[11px] rounded-lg font-bold border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                            >
                              <MessageSquareTextIcon className="w-3.5 h-3.5 mr-1" /> Respond
                            </Button>

                            <Button
                              size="sm"
                              onClick={() =>
                                handleQuickStatusChange(ticket, "resolved", "Approved & Resolved by Management")
                              }
                              className="h-7 text-[11px] rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-500 border-0"
                            >
                              <CheckSquareIcon className="w-3.5 h-3.5 mr-1" /> Approve / Resolve
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleQuickStatusChange(ticket, "closed", "Rejected & Closed by Management")
                              }
                              className="h-7 text-[11px] rounded-lg font-bold text-red-500 border-red-500/30 hover:bg-red-500/10"
                            >
                              <XCircleIcon className="w-3.5 h-3.5 mr-1" /> Reject / Close
                            </Button>
                          </>
                        )}

                        {/* Delete Ticket Option */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isDeleting}
                              className="size-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-500/10"
                              title="Delete Ticket"
                            >
                              <Trash2Icon className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-xl border-slate-200 dark:border-slate-800">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                                <Trash2Icon className="w-5 h-5" />
                                Delete Support Ticket?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-xs text-slate-500">
                                Are you sure you want to delete ticket <strong className="font-mono text-slate-900 dark:text-white">{ticket.ticketId}</strong>? This action will permanently remove the ticket and support response history.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl text-xs font-semibold">Keep Ticket</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTicket(ticket._id)}
                                className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white border-0"
                              >
                                Delete Ticket
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Submitter User Details Banner (Shown to Admin/Manager or as Info) */}
                    <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6 rounded-md shrink-0 border border-slate-200 dark:border-slate-800">
                          <AvatarImage src={ticket.userImageUrl} alt={ticket.userName} />
                          <AvatarFallback className="text-[10px] font-bold bg-indigo-500/10 text-indigo-600 rounded-md">
                            {ticket.userName ? ticket.userName.slice(0, 2).toUpperCase() : "RM"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-slate-900 dark:text-white">{ticket.userName}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 text-[11px]">{ticket.userEmail}</span>
                        <Badge className={`text-[10px] font-extrabold px-1.5 py-0 border ${roleBadge.bg} ${roleBadge.color} ${roleBadge.border}`}>
                          {roleBadge.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-medium">
                          <ClockIcon className="w-3 h-3 text-slate-400" /> Submitted {formatDate(ticket.createdAt)}
                        </span>
                        <span className={priorityCfg.color}>
                          {priorityCfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Ticket Details Body */}
                    <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
                      {ticket.details}
                    </div>

                    {/* Admin / Technical Support Response Box */}
                    {ticket.adminResponse ? (
                      <div className="p-3.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                            <MessageSquareTextIcon className="w-4 h-4 text-indigo-500" />
                            Official Support Response
                          </p>
                          {ticket.respondedAt && (
                            <span className="text-[10px] text-indigo-500 font-medium">
                              Responded {formatDate(ticket.respondedAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                          {ticket.adminResponse}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Awaiting technical support engineer response...</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── ADMIN / MANAGER TICKET RESPONSE & APPROVAL DIALOG ── */}
      <Dialog open={!!respondingTicket} onOpenChange={(open) => !open && setRespondingTicket(null)}>
        <DialogContent className="rounded-xl border-slate-200 dark:border-slate-800 sm:max-w-lg w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquareTextIcon className="w-5 h-5 text-indigo-500" />
              Respond to Ticket #{respondingTicket?.ticketId}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Submit an official response to <strong className="text-slate-900 dark:text-white">{respondingTicket?.userName}</strong> ({respondingTicket?.userEmail}) and update ticket status.
            </DialogDescription>
          </DialogHeader>

          {respondingTicket && (
            <div className="space-y-4 pt-2">
              {/* Ticket Original Details Preview */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">{respondingTicket.subject}</p>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">{respondingTicket.details}</p>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Set Ticket Status</Label>
                <Select value={adminStatus} onValueChange={(val: any) => setAdminStatus(val)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open / Keep Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved (Approve Ticket)</SelectItem>
                    <SelectItem value="closed">Closed (Reject / Dismiss)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admin Response Textarea */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Official Support Response Message
                </Label>
                <Textarea
                  value={adminResponseText}
                  onChange={(e) => setAdminResponseText(e.target.value)}
                  placeholder="Type your response to the user..."
                  className="min-h-[110px] text-xs rounded-xl"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRespondingTicket(null)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAdminResponse}
                  disabled={submittingResponse}
                  className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {submittingResponse ? (
                    <RefreshCwIcon className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <SendIcon className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Save Response & Update Status
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 3. DIRECT CONTACT CHANNELS BAR ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs hover:border-indigo-500/30 transition-all flex flex-col items-center justify-center text-center space-y-2">
          <div className="size-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <MailIcon className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-900 dark:text-white">Direct Email Support</p>
            <p className="text-[11px] text-slate-500 font-medium">support@retailmind.ai</p>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">24/7 Response Guaranteed</p>
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs hover:border-emerald-500/30 transition-all flex flex-col items-center justify-center text-center space-y-2">
          <div className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <PhoneIcon className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 flex flex-col items-center">
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              Emergency Support Line
            </p>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">+94 11 755 8800</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Sri Lanka 24/7 Support Desk</p>
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs hover:border-amber-500/30 transition-all flex flex-col items-center justify-center text-center space-y-2">
          <div className="size-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <ActivityIcon className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-900 dark:text-white">Convex & Cloud Status</p>
            <p className="text-[11px] text-slate-500 font-medium">Database & AI Sync 100% Active</p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">0 Outages / Incidents</p>
          </div>
        </Card>
      </div>

      {/* ── 4. KNOWLEDGE BASE CATEGORIES GRID ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpenIcon className="w-4 h-4 text-indigo-500" />
            Knowledge Base & Documentation
          </h2>
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="text-xs text-indigo-500 hover:text-indigo-600 h-7 px-2"
            >
              Clear Search
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Card
                key={cat.id}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:border-indigo-500/30 transition-all duration-200"
              >
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-lg ${cat.bg} border ${cat.border} flex items-center justify-center ${cat.color} shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                        {cat.title}
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        {cat.desc}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-3">
                  <div className="space-y-2">
                    {cat.articles.map((art, i) => (
                      <div
                        key={i}
                        onClick={() =>
                          toast.info(`Opening guide: "${art.title}"`, {
                            description: "Comprehensive walkthrough guide loaded.",
                          })
                        }
                        className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 pr-2">
                          <FileTextIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 shrink-0 transition-colors" />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {art.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {art.views}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── 5. FREQUENTLY ASKED QUESTIONS (FAQ) ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CircleHelpIcon className="w-5 h-5 text-indigo-500" />
            Frequently Asked Questions (FAQs)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Quick solutions and platform rules for Supermarket Administrators, Managers, Staff, and Suppliers
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-2">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-colors bg-slate-50/50 dark:bg-slate-900/50"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full text-left p-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-indigo-500" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-3.5 pb-3.5 pt-0 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200/60 dark:border-slate-800/60 mt-1">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── 6. AI ASSISTANT DRAWER / DIALOG ── */}
      <Dialog open={isAiOpen} onOpenChange={setIsAiOpen}>
        <DialogContent className="rounded-xl border-slate-200 dark:border-slate-800 sm:max-w-lg w-[95vw] sm:w-full p-0 overflow-hidden flex flex-col h-[520px]">
          <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-500/20">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <BotIcon className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  RetailMind AI Support Assistant
                  <Badge className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0">
                    Online 24/7
                  </Badge>
                </h3>
                <p className="text-[11px] text-slate-300">Automated assistant for procurement & platform guidance</p>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950/60">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "bot" && (
                  <div className="size-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs mt-0.5">
                    <BotIcon className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] text-xs p-3 rounded-xl leading-relaxed shadow-xs ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              placeholder="Ask a question..."
              className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
            />
            <Button
              onClick={handleSendChat}
              className="size-9 rounded-xl shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white p-0 flex items-center justify-center"
            >
              <SendIcon className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
