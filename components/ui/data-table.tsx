'use client';

/**
 * data-table.tsx
 *
 * A lightweight, composable data-table built on the existing
 * shadcn/ui Table primitives. Exports:
 *
 *   - DataTable          – scrollable table wrapper (thead + tbody)
 *   - DataTable.Row      – <tr> inside <tbody>
 *   - DataTable.Cell     – <td> inside a row
 *   - ColumnHeader       – <th> in the <thead> with optional sort support
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ---------------------------------------------------------------------------
// ColumnHeader
// ---------------------------------------------------------------------------
export interface ColumnHeaderProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** When present the header shows a sort-cursor hint */
  onClick?: () => void;
}

export function ColumnHeader({ className, children, onClick, ...props }: ColumnHeaderProps) {
  return (
    <TableHead
      className={cn(
        onClick &&
          'cursor-pointer select-none hover:text-foreground transition-colors',
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </TableHead>
  );
}

// ---------------------------------------------------------------------------
// DataTable.Row
// ---------------------------------------------------------------------------
function DataTableRow({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <TableRow className={cn(className)} {...props}>
      {children}
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// DataTable.Cell
// ---------------------------------------------------------------------------
function DataTableCell({
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <TableCell className={cn('text-sm', className)} {...props}>
      {children}
    </TableCell>
  );
}

// ---------------------------------------------------------------------------
// DataTable root
// ---------------------------------------------------------------------------
/**
 * Usage:
 *
 * ```tsx
 * <DataTable>
 *   <ColumnHeader>Name</ColumnHeader>
 *   <ColumnHeader onClick={() => sort('date')}>Date</ColumnHeader>
 *
 *   {rows.map(row => (
 *     <DataTable.Row key={row.id}>
 *       <DataTable.Cell>{row.name}</DataTable.Cell>
 *       <DataTable.Cell>{row.date}</DataTable.Cell>
 *     </DataTable.Row>
 *   ))}
 * </DataTable>
 * ```
 *
 * Children are partitioned automatically:
 *   - `ColumnHeader` elements go into `<thead>`
 *   - `DataTable.Row` elements go into `<tbody>`
 */
function DataTableRoot({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const childArray = React.Children.toArray(children);

  // Separate ColumnHeader children from Row children
  const headers: React.ReactNode[] = [];
  const rows: React.ReactNode[] = [];

  for (const child of childArray) {
    if (
      React.isValidElement(child) &&
      // Check by display name or function reference
      (child.type === ColumnHeader ||
        (child.type as { displayName?: string }).displayName === 'ColumnHeader')
    ) {
      headers.push(child);
    } else {
      rows.push(child);
    }
  }

  return (
    <Table className={cn(className)}>
      {headers.length > 0 && (
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {headers}
          </TableRow>
        </TableHeader>
      )}
      <TableBody>{rows}</TableBody>
    </Table>
  );
}

// Attach displayName for dev-tools clarity
ColumnHeader.displayName = 'ColumnHeader';
DataTableRow.displayName = 'DataTableRow';
DataTableCell.displayName = 'DataTableCell';
DataTableRoot.displayName = 'DataTable';

// Attach sub-components
export const DataTable = Object.assign(DataTableRoot, {
  Row: DataTableRow,
  Cell: DataTableCell,
});

export default DataTable;
