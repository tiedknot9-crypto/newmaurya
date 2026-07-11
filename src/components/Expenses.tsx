import { useState, useEffect } from 'react';
import { 
  TrendingDown, 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Calendar,
  ArrowDownRight,
  PieChart as PieChartIcon,
  Wallet,
  Receipt,
  Download,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { canUserEditRecord } from '@/utils/rbac';
import { ConfirmDialog } from './ConfirmDialog';

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newExpense, setNewExpense] = useState({ 
    expense_date: new Date().toISOString().split('T')[0], 
    category: 'Utilities', 
    description: '', 
    amount: 0,
    status: 'Paid'
  });
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });
  const [period, setPeriod] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, period, dateRange]);

  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const [users, setUsers] = useState<any[]>(() => {
    return storage.get(STORAGE_KEYS.USERS, []);
  });

  useEffect(() => {
    supabaseService.getStaff().then(data => {
      if (data && data.length > 0) {
        setUsers(data);
      }
    });
  }, []);

  const isAddedByAdmin = (record: any) => {
    if (!record) return false;
    const creatorId = record.created_by || record.issued_by || record.createdBy;
    if (!creatorId) {
      // Legacy seeded expense with no creator are treated as admin-seeded
      return true;
    }
    if (creatorId === 'u2' || creatorId === 'u-admin' || creatorId === 'u-admingh') return true;
    const creatorUser = users?.find((u: any) => u.id === creatorId || u.email === creatorId);
    if (creatorUser && (creatorUser.role === 'SUPER_ADMIN' || creatorUser.role === 'ADMIN')) return true;
    return false;
  };

  const canModify = (record: any) => {
    return canUserEditRecord(record, currentUser);
  };

  const fetchExpenses = async () => {
    setIsLoading(true);
    const data = await supabaseService.getExpenses();
    if (data) {
      setExpenses(data);
    }
    setIsLoading(false);
  };

  useDataSync(fetchExpenses);

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    const expenseData = {
      ...newExpense,
      created_by: currentUser?.id || 'u-accounts'
    };

    const result = await supabaseService.createExpense(expenseData);
    if (result) {
      toast.success('Expense recorded');
      fetchExpenses();
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'expenses', action: 'insert' } }));
      setNewExpense({ 
        expense_date: new Date().toISOString().split('T')[0], 
        category: 'Utilities', 
        description: '', 
        amount: 0,
        status: 'Paid'
      });
      setIsAddExpenseOpen(false);
    } else {
      toast.error('Failed to record expense');
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense || !editingExpense.description || !editingExpense.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!canModify(editingExpense)) {
      toast.error('This expense record was created by administration and cannot be modified by non-admin roles.');
      return;
    }

    const { id, created_at, ...updates } = editingExpense;
    const result = await supabaseService.updateExpense(id, {
      expense_date: updates.expense_date,
      category: updates.category,
      description: updates.description,
      amount: Number(updates.amount),
      status: updates.status,
      created_by: editingExpense.created_by || editingExpense.issued_by
    });

    if (result) {
      toast.success('Expense record updated');
      fetchExpenses();
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'expenses', action: 'update' } }));
      setEditingExpense(null);
      setIsEditExpenseOpen(false);
    } else {
      toast.error('Failed to update expense record');
    }
  };

  const handleDeleteExpense = (id: string) => {
    const roleUpper = (currentUser?.role || '').toUpperCase();
    if (roleUpper === 'RECEPTIONIST' || roleUpper === 'RECEPTION' || roleUpper === 'FRONT_DESK' || roleUpper === 'DOCTOR' || roleUpper === 'SURGEON' || roleUpper === 'ACCOUNTANT' || roleUpper === 'ACCOUNTS') {
      toast.error('Deletion of expense records is restricted for Front Office, Doctor, and Accountant roles.');
      return;
    }
    const expenseToDelete = expenses.find(e => e.id === id);
    if (expenseToDelete && !canModify(expenseToDelete)) {
      toast.error('This expense record was created by administration and cannot be deleted by non-admin roles.');
      return;
    }

    setDeleteConfirm({
      isOpen: true,
      title: "Delete Expense",
      description: `Are you sure you want to permanently delete this expense of ₹${expenseToDelete?.amount || 0} for ${expenseToDelete?.description || 'this category'}? This action cannot be undone.`,
      onConfirm: async () => {
        const success = await supabaseService.deleteExpense(id);
        if (success) {
          toast.success('Expense record removed');
          fetchExpenses();
          window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'expenses', action: 'delete' } }));
        } else {
          toast.error('Failed to remove expense record');
        }
      }
    });
  };

  const handleExportExpenses = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Status'];
    const rows = expenses.map(e => [
      e.expense_date,
      e.category,
      e.description,
      e.amount,
      e.status
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'hospital_expenses.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Expenses exported as CSV');
  };

  const getLocalDateStrFromVal = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return val.substring(0, 10);
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'this-week': return 'This Week';
      case 'this-month': return 'This Month';
      case 'last-month': return 'Last Month';
      case 'this-year': return 'This Year';
      case 'custom': return 'Custom';
      default: return 'All Time';
    }
  };

  const filteredExpenses = expenses.filter(e => {
    // 1. Search Query Filter
    const matchesSearch = (e.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                          (e.category?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Date-wise & Period-wise Filter
    const dateVal = e.expense_date || e.created_at;
    if (!dateVal) return false;
    const expDateStr = getLocalDateStrFromVal(dateVal);
    if (!expDateStr) return false;

    const now = new Date();
    const todayStr = getLocalDateStrFromVal(now);
    const [y, m] = expDateStr.split('-').map(Number);

    if (period === 'today') {
      return expDateStr === todayStr;
    }

    if (period === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateStrFromVal(yesterday);
      return expDateStr === yesterdayStr;
    }

    if (period === 'this-week') {
      const startOfWeek = new Date();
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfWeekStr = getLocalDateStrFromVal(startOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const endOfWeekStr = getLocalDateStrFromVal(endOfWeek);
      return expDateStr >= startOfWeekStr && expDateStr <= endOfWeekStr;
    }

    if (period === 'this-month') {
      return m === (now.getMonth() + 1) && y === now.getFullYear();
    }

    if (period === 'last-month') {
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(now.getMonth() - 1);
      const lm = lastMonthDate.getMonth() + 1;
      const ly = lastMonthDate.getFullYear();
      return m === lm && y === ly;
    }

    if (period === 'this-year') {
      return y === now.getFullYear();
    }

    if (period === 'custom' && dateRange.start && dateRange.end) {
      const start = getLocalDateStrFromVal(dateRange.start);
      const end = getLocalDateStrFromVal(dateRange.end);
      return expDateStr >= start && expDateStr <= end;
    }

    return true; // default/all
  });

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const utilityBills = filteredExpenses
    .filter(e => e.category === 'Utilities')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const pendingVouchers = filteredExpenses.filter(e => e.status === 'Pending').length;

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense Management</h1>
          <p className="text-muted-foreground">Track daily hospital expenses and operational costs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportExpenses}>
            <Download className="w-4 h-4" />
            Export Expenses
          </Button>
          <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
            <DialogTrigger asChild>
              <Button className="bg-medical-blue gap-2" onClick={() => setIsAddExpenseOpen(true)}>
                <Plus className="w-4 h-4" />
                Add New Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Record New Expense</DialogTitle>
                <DialogDescription>Enter details for a new hospital expense.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Expense Category</Label>
                  <Select 
                    value={newExpense.category}
                    onValueChange={(v) => setNewExpense({...newExpense, category: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Salary">Salary</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    placeholder="e.g. Generator Fuel" 
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={newExpense.amount || ""}
                      onChange={(e) => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input 
                      type="date" 
                      value={newExpense.expense_date}
                      onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Status</Label>
                  <Select 
                    value={newExpense.status}
                    onValueChange={(v) => setNewExpense({...newExpense, status: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddExpenseOpen(false)}>Cancel</Button>
                <Button className="bg-medical-blue" onClick={handleAddExpense}>Add Expense</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditExpenseOpen} onOpenChange={setIsEditExpenseOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Expense Record</DialogTitle>
                <DialogDescription>Modify the details of this hospital expense.</DialogDescription>
              </DialogHeader>
              {editingExpense && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Expense Category</Label>
                    <Select 
                      value={editingExpense.category}
                      onValueChange={(v) => setEditingExpense({...editingExpense, category: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Salary">Salary</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input 
                      placeholder="e.g. Generator Fuel" 
                      value={editingExpense.description || ""}
                      onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount (₹)</Label>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        value={editingExpense.amount || ""}
                        onChange={(e) => setEditingExpense({...editingExpense, amount: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input 
                        type="date" 
                        value={editingExpense.expense_date}
                        onChange={(e) => setEditingExpense({...editingExpense, expense_date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Status</Label>
                    <Select 
                      value={editingExpense.status}
                      onValueChange={(v) => setEditingExpense({...editingExpense, status: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditingExpense(null);
                  setIsEditExpenseOpen(false);
                }}>Cancel</Button>
                <Button className="bg-medical-blue" onClick={handleUpdateExpense}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Total Expenses ({getPeriodLabel()})</p>
              <h3 className="text-3xl font-bold text-rose-600">{formatCurrency(totalFiltered)}</h3>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Utility Bills</p>
              <h3 className="text-3xl font-bold text-blue-600">{formatCurrency(utilityBills)}</h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <Wallet className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Pending Vouchers</p>
              <h3 className="text-3xl font-bold text-amber-600">{pendingVouchers}</h3>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <Receipt className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <CardTitle className="text-lg">Expense Log</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search expense..." 
                className="pl-10 bg-slate-50 border-none h-9 w-full" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px] h-9 bg-slate-50 border-none rounded-md font-medium text-slate-700 flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-medical-blue shrink-0" />
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {period === 'custom' && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 p-1 rounded-md text-slate-800">
                <Input 
                  type="date" 
                  className="h-7 w-28 text-[11px] border-none font-medium bg-transparent focus-visible:ring-0" 
                  value={dateRange.start} 
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
                <span className="text-slate-400 text-xs px-0.5">-</span>
                <Input 
                  type="date" 
                  className="h-7 w-28 text-[11px] border-none font-medium bg-transparent focus-visible:ring-0" 
                  value={dateRange.end} 
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Category</TableHead>
                  <TableHead className="whitespace-nowrap">Description</TableHead>
                  <TableHead className="whitespace-nowrap">Amount</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                      No matching expense records found for the selected period.
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + itemsPerPage);
                    return paginatedExpenses.map((expense) => (
                      <TableRow key={expense.id} className="border-slate-50">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(expense.expense_date)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase">{expense.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium whitespace-nowrap">{expense.description}</TableCell>
                        <TableCell className="font-bold whitespace-nowrap">{formatCurrency(expense.amount)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="secondary" className={`border-none ${
                            expense.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {expense.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2 items-center">
                            {canModify(expense) ? (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-medical-blue" onClick={() => {
                                  setEditingExpense({...expense});
                                  setIsEditExpenseOpen(true);
                                }}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                {(() => {
                                  const r = (currentUser?.role || '').toUpperCase();
                                  return !(r === 'RECEPTIONIST' || r === 'RECEPTION' || r === 'FRONT_DESK' || r === 'DOCTOR' || r === 'SURGEON' || r === 'ACCOUNTANT' || r === 'ACCOUNTS');
                                })() && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDeleteExpense(expense.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] text-slate-400 bg-slate-100 font-bold hover:bg-slate-100 select-none px-2 py-0.5">Admin Locked</Badge>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ));
                  })()
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination Controls */}
          {filteredExpenses.length > itemsPerPage && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-white rounded-b-xl">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold text-slate-700">
                  {Math.min(currentPage * itemsPerPage, filteredExpenses.length)}
                </span>{' '}
                of <span className="font-semibold text-slate-700">{filteredExpenses.length}</span> entries
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.ceil(filteredExpenses.length / itemsPerPage) }, (_, idx) => {
                  const pageNo = idx + 1;
                  if (
                    pageNo === 1 ||
                    pageNo === Math.ceil(filteredExpenses.length / itemsPerPage) ||
                    Math.abs(pageNo - currentPage) <= 2
                  ) {
                    return (
                      <Button
                        key={pageNo}
                        variant={currentPage === pageNo ? 'default' : 'outline'}
                        size="sm"
                        className={`h-8 w-8 p-0 text-xs ${currentPage === pageNo ? 'bg-medical-blue hover:bg-medical-blue/90 text-white' : ''}`}
                        onClick={() => setCurrentPage(pageNo)}
                      >
                        {pageNo}
                      </Button>
                    );
                  } else if (
                    pageNo === 2 ||
                    pageNo === Math.ceil(filteredExpenses.length / itemsPerPage) - 1
                  ) {
                    return <span key={pageNo} className="text-slate-400 px-1 text-xs select-none">...</span>;
                  }
                  return null;
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={currentPage === Math.ceil(filteredExpenses.length / itemsPerPage)}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredExpenses.length / itemsPerPage)))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirm.onConfirm}
        title={deleteConfirm.title}
        description={deleteConfirm.description}
      />
    </div>
  );
}
