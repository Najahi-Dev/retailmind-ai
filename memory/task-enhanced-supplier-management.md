---
name: task-enhanced-supplier-management
description: Enhanced supplier management with password generation and removal options
metadata:
  type: project
---

Enhanced supplier management functionality to include:
1. Password generation feature for suppliers when created through the supplier page
2. Automatic creation of corresponding user records for suppliers (so they appear in user management)
3. Supplier removal/delete functionality with proper cleanup of associated user records

Changes made:

## 1. Enhanced AddSupplierDialog (`app/(dashboard)/suppliers/AddSupplierDialog.tsx`)
- Added password state (`password`, `showPassword`) for secure password handling
- Added `generatePassword()` function that creates 12-character secure random passwords
- Added password input field with show/hide toggle (EyeIcon/EyeOffIcon)
- Added "Generate Password" button for easy password creation
- Modified `handleSubmit` to:
  * First create the supplier record using the existing createSupplier mutation
  * Then create a corresponding user record with role="supplier" using the created supplier's details and supplierId
  * Clear password state after successful submission for security
  * Use the generated password (or let system use default if none provided) for the user record

## 2. Enhanced Suppliers Backend (`convex/suppliers.ts`)
- Added `deleteSupplier` mutation that:
  * Performs organization access control validation (admin/manager only)
  * Finds and deletes all associated user records (where supplierId matches the supplier being deleted)
  * Deletes the supplier record itself
  * Prevents deletion of suppliers belonging to other organizations
- Updated `createUser` mutation to accept an optional `supplierId` field for linking users to suppliers
- Modified `syncSupplierForUserRole` helper function to use the provided `supplierId` when linking a user to a supplier
- Maintains referential integrity by cleaning up associated user records when a supplier is deleted

## 3. Enhanced Suppliers UI (`app/(dashboard)/suppliers/SuppliersClient.tsx`)
- Added delete supplier functionality with confirmation UI
- Added trash icon (Trash2Icon) in the Actions column for each supplier row
- Added deletion state handling with visual feedback (spinning refresh icon during deletion)
- Added column header "Actions" to the suppliers table
- Integrated with the new deleteSupplier backend mutation

## Features Implemented:
✅ **Password Generation**: Admins can generate secure random passwords when creating suppliers
✅ **User Linking**: Created suppliers automatically appear in the User Management page with role="supplier"
✅ **Supplier Removal**: Admins can delete suppliers, which also removes their associated user accounts
✅ **Security**: Proper organization-scoped access controls prevent cross-workspace operations
✅ **Clean State Management**: Password fields reset after use, deletion states properly handled

## Files Modified:
1. `app/(dashboard)/suppliers/AddSupplierDialog.tsx` - Added password generation and user creation (using useMutation for createUser, passing supplierId)
2. `convex/suppliers.ts` - Added deleteSupplier mutation, updated createUser to accept supplierId, updated syncSupplierForUserRole
3. `app/(dashboard)/suppliers/SuppliersClient.tsx` - Added delete UI and actions column
4. Memory files for tracking: `memory/task-enhanced-supplier-management.md` and updated `MEMORY.md`

This implementation ensures that when admins create suppliers through the supplier page:
1. They can generate or set a secure password for the supplier's system access
2. A corresponding user record is automatically created in the users table (with role="supplier" and linked via supplierId)
3. The supplier appears in both the Suppliers page and User Management page
4. When a supplier is deleted, their associated user record is also cleaned up
5. All operations maintain proper organization scoping and security