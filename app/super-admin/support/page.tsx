"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HeadphonesIcon, Search, Eye, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";

export default function SuperAdminSupport() {
  const { token } = useAuth();
  const tickets = useQuery(api.communicationsAdmin.getPlatformTickets, { token: token ?? undefined });
  const updateTicket = useMutation(api.communicationsAdmin.updateTicketStatus);
  const [searchTerm, setSearchTerm] = useState("");

  if (tickets === undefined) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading Support Tickets...</div>;
  }

  const filtered = tickets.filter((t: any) => 
    t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.orgId && t.orgId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleStatusChange = async (id: any, status: any) => {
    try {
      await updateTicket({ token: token ?? undefined, ticketId: id, status });
      toast.success("Ticket status updated");
    } catch (e: any) {
      toast.error("Failed to update ticket status");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Global Support Desk</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage and resolve support escalations from all tenant organizations.</p>
      </div>

      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
            <HeadphonesIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">Support Queue</h3>
            <p className="text-sm text-muted-foreground">You have {tickets.filter((t:any) => t.status === "open").length} open tickets needing attention.</p>
          </div>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search subject or tenant ID..."
            className="pl-8 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Tenant ID</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground border-dashed border-b-0">
                    <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                    No support tickets found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ticket: any) => (
                  <TableRow key={ticket._id}>
                    <TableCell>
                      <div className="font-medium text-sm">{ticket.subject}</div>
                      <div className="text-xs text-muted-foreground truncate w-48">{ticket.description}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">{ticket.orgId}</TableCell>
                    <TableCell>
                      <Badge variant={
                        ticket.priority === "urgent" ? "destructive" :
                        ticket.priority === "high" ? "default" : "outline"
                      }>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={ticket.status} 
                        onValueChange={(val) => handleStatusChange(ticket._id, val)}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
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
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-2" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
