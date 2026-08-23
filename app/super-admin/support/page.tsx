"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HeadphonesIcon, Search, Eye, MessageSquare, AlertCircle, CheckCircle2, Clock, Building2, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function SuperAdminSupport() {
  const { token } = useAuth();
  
  // Queries & Mutations
  const tickets = useQuery(api.communicationsAdmin.getPlatformTickets, { token: token ?? undefined });
  const updateTicket = useMutation(api.communicationsAdmin.updateTicketStatus);
  const addResponse = useMutation(api.communicationsAdmin.addAdminResponse);

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived State (KPIs)
  const stats = useMemo(() => {
    if (!tickets) return { open: 0, urgent: 0, resolvedToday: 0 };
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    return {
      open: tickets.filter((t: any) => t.status === "open").length,
      urgent: tickets.filter((t: any) => t.status === "open" && t.priority === "urgent").length,
      resolvedToday: tickets.filter((t: any) => t.status === "resolved" && (now - (t.respondedAt || 0)) < oneDay).length
    };
  }, [tickets]);

  // Derived State (Filtered Tickets)
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter((t: any) => {
      const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (t.orgId && t.orgId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            t.ticketId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" ? true :
                            statusFilter === "open" ? (t.status === "open" || t.status === "in_progress") : 
                            t.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchTerm, statusFilter]);

  // Handlers
  const handleStatusChange = async (id: any, status: any) => {
    try {
      await updateTicket({ token: token ?? undefined, ticketId: id, status });
      toast.success("Ticket status updated");
    } catch (e: any) {
      toast.error("Failed to update ticket status");
    }
  };

  const handleSendResponse = async (statusOverride?: string) => {
    if (!selectedTicket) return;
    
    const targetStatus = statusOverride || selectedTicket.status;
    const isResolving = targetStatus === "resolved";

    if (isResolving && !responseMessage.trim()) {
      return toast.error("A response message is required to resolve a ticket.");
    }

    try {
      setIsSubmitting(true);
      await addResponse({
        token: token ?? undefined,
        ticketId: selectedTicket._id,
        response: responseMessage,
        status: targetStatus as any
      });
      toast.success(isResolving ? "Ticket resolved & response sent" : "Response saved");
      setSelectedTicket(null);
      setResponseMessage("");
    } catch (e: any) {
      toast.error("Failed to send response");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (tickets === undefined) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading Support Desk...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Global Support Desk</h1>
          <p className="text-indigo-200 mt-1">Manage and resolve support escalations from all tenant organizations.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Open Tickets</p>
              <h3 className="text-3xl font-bold mt-1">{stats.open}</h3>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <MessageSquare className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Urgent Escalations</p>
              <h3 className="text-3xl font-bold mt-1 text-red-600 dark:text-red-400">{stats.urgent}</h3>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Resolved Today</p>
              <h3 className="text-3xl font-bold mt-1">{stats.resolvedToday}</h3>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Area */}
      <Card>
        <div className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-[400px]">
            <TabsList>
              <TabsTrigger value="open">Active Queue</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
              <TabsTrigger value="all">All Tickets</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search subject, ID, or tenant..."
              className="pl-8 bg-muted/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Ticket Details</TableHead>
                <TableHead>Tenant & User</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground border-dashed border-b-0">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                    No tickets found matching the criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket: any) => (
                  <TableRow key={ticket._id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {ticket.ticketId}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-4 py-0 uppercase tracking-wide">
                          {ticket.category}
                        </Badge>
                      </div>
                      <div className="font-semibold text-sm max-w-[250px] truncate" title={ticket.subject}>
                        {ticket.subject}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">
                        <Building2 className="size-3" /> {ticket.orgId || "N/A"}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <UserCircle className="size-3 text-muted-foreground" /> {ticket.userName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        ticket.priority === "urgent" ? "destructive" :
                        ticket.priority === "high" ? "default" : "secondary"
                      } className={ticket.priority === "urgent" ? "animate-pulse" : ""}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={ticket.status} 
                        onValueChange={(val) => handleStatusChange(ticket._id, val)}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs bg-transparent border-dashed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setResponseMessage(ticket.adminResponse || "");
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" /> View & Reply
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- Ticket Resolution Dialog --- */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-2xl w-full flex flex-col max-h-[90vh] bg-slate-50 dark:bg-slate-950 overflow-hidden">
          {selectedTicket && (
            <>
              <DialogHeader className="pb-4 border-b">
                <div className="flex justify-between items-start pr-8">
                  <div>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                      {selectedTicket.subject}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1.5 font-mono text-xs">
                      <Badge variant="outline">{selectedTicket.ticketId}</Badge>
                      <span>•</span>
                      <span>Tenant: {selectedTicket.orgId || "N/A"}</span>
                    </DialogDescription>
                  </div>
                  <Badge variant={
                    selectedTicket.priority === "urgent" ? "destructive" :
                    selectedTicket.priority === "high" ? "default" : "secondary"
                  } className="capitalize shrink-0">
                    {selectedTicket.priority} Priority
                  </Badge>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto py-4 space-y-8 px-2 custom-scrollbar">
                {/* Original Request (Chat Bubble Style) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                      {selectedTicket.userName.substring(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedTicket.userName}</div>
                      <div className="text-xs text-muted-foreground">{new Date(selectedTicket.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl rounded-tl-none border shadow-sm text-sm whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 ml-11 relative">
                    {/* Tiny triangle for chat bubble effect */}
                    <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-white dark:border-t-slate-900 border-l-[10px] border-l-transparent"></div>
                    {selectedTicket.details}
                  </div>
                </div>

                {/* Admin Response Section (Rich Editor Style) */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0">
                      <HeadphonesIcon className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Official Support Response</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedTicket.respondedAt ? `Last saved: ${new Date(selectedTicket.respondedAt).toLocaleString()}` : "Drafting..."}
                      </div>
                    </div>
                  </div>
                  
                  {selectedTicket.status === "closed" ? (
                    <div className="bg-muted p-4 rounded-xl rounded-tl-none border text-sm text-muted-foreground ml-11">
                      {selectedTicket.adminResponse || "Ticket was closed without an official response."}
                      <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">This ticket is closed and cannot be modified.</div>
                    </div>
                  ) : (
                    <div className="ml-11 border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 focus-within:ring-1 focus-within:ring-indigo-500 transition-shadow">
                      {/* Fake Rich Text Toolbar */}
                      <div className="bg-slate-50 dark:bg-slate-950 border-b px-3 py-2 flex items-center gap-2 text-slate-400">
                        <div className="font-serif font-bold text-sm px-1 cursor-not-allowed">B</div>
                        <div className="font-serif italic text-sm px-1 cursor-not-allowed">I</div>
                        <div className="font-serif underline text-sm px-1 cursor-not-allowed">U</div>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                        <div className="text-xs cursor-not-allowed">H1</div>
                        <div className="text-xs cursor-not-allowed">H2</div>
                      </div>
                      <Textarea 
                        placeholder="Type your resolution or response here. This will be visible to the tenant..."
                        className="min-h-[150px] resize-none border-0 rounded-none shadow-none focus-visible:ring-0 p-4"
                        value={responseMessage}
                        onChange={(e) => setResponseMessage(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {selectedTicket.status !== "closed" && (
                <DialogFooter className="pt-4 border-t flex flex-row sm:justify-between items-center gap-3">
                  <Button 
                    variant="outline" 
                    disabled={isSubmitting}
                    onClick={() => handleSendResponse("in_progress")}
                    className="w-full sm:w-auto"
                  >
                    Save & Mark In Progress
                  </Button>
                  <Button 
                    disabled={isSubmitting}
                    onClick={() => handleSendResponse("resolved")}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Send & Resolve Ticket
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
