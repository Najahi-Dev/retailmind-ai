'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ColumnHeader, DataTable } from '@/components/ui/data-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useConvexQuery } from '@/lib/react-convex';
import { AlertTriangle, Calendar, Check, Loader2, MessageSquare, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

const PaymentStatusBadge = ({
  status,
}: {
  status: string;
}) => {
  const getBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'default';
      case 'partially_paid':
        return 'secondary';
      case 'pending_on_delivery':
        return 'warning';
      case 'cheque_pending':
        return 'warning';
      case 'due':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'Paid';
      case 'partially_paid':
        return 'Partially Paid';
      case 'pending_on_delivery':
        return 'Pending on Delivery';
      case 'cheque_pending':
        return 'Cheque Pending';
      case 'due':
        return 'Due';
      default:
        return status;
    }
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full
      ${
        getBadgeVariant(status) === 'default'
          ? 'bg-green-100 text-green-800'
          : getBadgeVariant(status) === 'secondary'
          ? 'bg-gray-100 text-gray-800'
          : getBadgeVariant(status) === 'warning'
          ? 'bg-amber-100 text-amber-800'
          : getBadgeVariant(status) === 'destructive'
          ? 'bg-red-100 text-red-800'
          : 'bg-gray-100 text-gray-800'
      }`}
    >
      {getStatusLabel(status)}
    </span>
  );
};

export default function PaymentsPage() {
  const { currentUser } = useAuth();

  // Role-based access control: only admin and manager can access
  if (!currentUser || !(currentUser.role === 'admin' || currentUser.role === 'manager')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            You don't have permission to view the payments page. This page is restricted to administrators and managers.
          </p>
        </div>
      </div>
    );
  }

  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'paidAt',
    direction: 'desc',
  });

  const {
    data: payments,
    isLoading,
    error,
  } = useConvexQuery('purchaseOrders:getPayments', {});

  // Apply filters and sorting
  const filteredPayments = payments?.filter((payment) => {
    // Status filter
    if (filters.status && payment.po?.paymentStatus?.toLowerCase() !== filters.status.toLowerCase()) {
      return false;
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      const paymentDate = new Date(payment.paidAt).toISOString().split('T')[0];
      if (filters.startDate && paymentDate < filters.startDate) return false;
      if (filters.endDate && paymentDate > filters.endDate) return false;
    }

    // Search filter (search in PO number, supplier name, reference)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const poNumber = payment.po?._id?.toLowerCase() || '';
      const supplierName = payment.supplier?.name?.toLowerCase() || '';
      const reference = (payment.reference || '').toLowerCase();

      return (
        poNumber.includes(searchTerm) ||
        supplierName.includes(searchTerm) ||
        reference.includes(searchTerm)
      );
    }

    return true;
  }) ?? [];

  // Sort payments
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (sortConfig.key === 'paidAt') {
      const dateA = new Date(a.paidAt).getTime();
      const dateB = new Date(b.paidAt).getTime();
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    }
    // Default sort by paidAt descending
    const dateA = new Date(a.paidAt).getTime();
    const dateB = new Date(b.paidAt).getTime();
    return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
  });

  // Handle sort change
  const handleSortChange = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-start space-x-4">
          <AlertTriangle className="h-5 w-5 text-destructive mt-1" />
          <div>
            <h3 className="font-medium text-destructive">Error loading payments</h3>
            <p className="text-sm text-muted-foreground">
              {error.message || 'An unknown error occurred'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <div className="flex flex-wrap space-x-3 mt-4 sm:mt-0">
          <Button variant="outline" onClick={() => toast.success('Export functionality coming soon')}>
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <Label htmlFor="status-filter" className="text-sm font-medium mb-1">
                Payment Status
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Input
                    id="status-filter"
                    placeholder="All Statuses"
                    value={filters.status === '' ? 'All Statuses' : filters.status}
                    readOnly
                    className="w-full"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuItem
                    onClick={() => setFilters((prev) => ({ ...prev, status: '' }))}
                    state={filters.status === '' ? 'checked' : undefined}
                  >
                    All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilters((prev) => ({ ...prev, status: 'paid' }))}
                    state={filters.status === 'paid' ? 'checked' : undefined}
                  >
                    Paid
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilters((prev) => ({ ...prev, status: 'partially_paid' }))}
                    state={filters.status === 'partially_paid' ? 'checked' : undefined}
                  >
                    Partially Paid
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilters((prev) => ({ ...prev, status: 'pending_on_delivery' }))}
                    state={filters.status === 'pending_on_delivery' ? 'checked' : undefined}
                  >
                    Pending on Delivery
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilters((prev) => ({ ...prev, status: 'cheque_pending' }))}
                    state={filters.status === 'cheque_pending' ? 'checked' : undefined}
                  >
                    Cheque Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilters((prev) => ({ ...prev, status: 'due' }))}
                    state={filters.status === 'due' ? 'checked' : undefined}
                  >
                    Due
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Start Date */}
            <div>
              <Label htmlFor="start-date" className="text-sm font-medium mb-1">
                Start Date
              </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full"
                />
            </div>

            {/* End Date */}
            <div>
              <Label htmlFor="end-date" className="text-sm font-medium mb-1">
                End Date
              </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="w-full"
                />
            </div>

            {/* Search */}
            <div>
              <Label htmlFor="payment-search" className="text-sm font-medium mb-1">
                Search
              </Label>
              <div className="flex space-x-2">
                <Input
                  id="payment-search"
                  placeholder="Search PO #, Supplier, Reference..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Clear search"
                  onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg font-semibold">
              Payments ({sortedPayments.length})
            </CardTitle>
            <div className="mt-4 sm:mt-0 flex space-x-2">
              <Button variant="outline" onClick={() => toast.success('Print functionality coming soon')}>
                Print
              </Button>
              <Button variant="outline" onClick={() => toast.success('Refreshing...')}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedPayments.length === 0 ? (
            <div className="text-center py-8">
              <Check className="h-8 w-8 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payments found matching the current filters.</p>
            </div>
          ) : (
            <DataTable>
              <ColumnHeader
                className={sortConfig.key === 'poNumber' ? 'sortable' : 'sortable'}
                onClick={() => handleSortChange('poNumber')}
              >
                PO Number
              </ColumnHeader>
              <ColumnHeader
                className={sortConfig.key === 'supplierName' ? 'sortable' : 'sortable'}
                onClick={() => handleSortChange('supplierName')}
              >
                Supplier
              </ColumnHeader>
              <ColumnHeader className="text-right">Amount (LKR)</ColumnHeader>
              <ColumnHeader className="text-center">Method</ColumnHeader>
              <ColumnHeader
                className={sortConfig.key === 'paymentStatus' ? 'sortable' : 'sortable'}
                onClick={() => handleSortChange('paymentStatus')}
              >
                Status
              </ColumnHeader>
              <ColumnHeader className="text-center">Date</ColumnHeader>
              <ColumnHeader className="text-center">Reference</ColumnHeader>
              <ColumnHeader className="text-center">Actions</ColumnHeader>

              {sortedPayments.map((payment) => {
                const poNumber = payment.po?._id || 'N/A';
                const supplierName = payment.supplier?.name || 'Unknown Supplier';
                const amount = Number(payment.amount || 0).toLocaleString('en-LK', {
                  maximumFractionDigits: 0,
                });
                const method = payment.method || 'Unknown';
                const paymentStatus = payment.po?.paymentStatus || 'Unknown';
                const date = new Date(payment.paidAt).toLocaleDateString('en-LK');
                const reference = payment.reference || '-';

                return (
                  <DataTable.Row key={payment._id}>
                    <DataTable.Cell className="font-mono">{poNumber}</DataTable.Cell>
                    <DataTable.Cell>{supplierName}</DataTable.Cell>
                    <DataTable.Cell className="text-right font-mono">LKR {amount}</DataTable.Cell>
                    <DataTable.Cell className="text-center">
                      {method === 'CASH_ON_DELIVERY' && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                          Cash on Delivery
                        </span>
                      )}
                      {method === 'CHEQUE' && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                          Cheque
                        </span>
                      )}
                      {method === 'CREDIT' && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                          Credit
                        </span>
                      )}
                    </DataTable.Cell>
                    <DataTable.Cell className="text-center">
                      <PaymentStatusBadge status={paymentStatus} />
                    </DataTable.Cell>
                    <DataTable.Cell className="text-center">{date}</DataTable.Cell>
                    <DataTable.Cell className="text-center font-mono">{reference}</DataTable.Cell>
                    <DataTable.Cell className="text-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="View details"
                        onClick={() => toast.success('View details coming soon')}
                      >
                        <Users className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                    </DataTable.Cell>
                  </DataTable.Row>
                );
              })}
            </DataTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}