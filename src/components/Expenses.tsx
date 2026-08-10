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
import { formatCurrency, formatDate, getLocalDateStr } from '@/lib/utils';
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
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [newExpense, setNewExpense] = useState({ 
    expense_date: new Date().toISOString().split('T')[0], 
    category: 'Utilities', 
    description: '', 
    amount: 0,
    payment_mode: 'Cash',
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
  }, [searchQuery, period, dateRange, paymentModeFilter, categoryFilter, startDate, endDate]);

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
      payment_mode: newExpense.payment_mode || 'Cash',
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
        payment_mode: 'Cash',
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
      payment_mode: updates.payment_mode || updates.payment_method || 'Cash',
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
    const headers = ['Date', 'Category', 'Description', 'Payment Mode', 'Amount', 'Status'];
    const rows = filteredExpenses.map(e => [
      e.expense_date,
      e.category,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.payment_mode || e.payment_method || 'Cash',
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
    toast.success('Filtered expenses exported as CSV');
  };

  const getLocalDateStrFromVal = (val: any): string => getLocalDateStr(val);

  const getPeriodLabel = () => {
    if (startDate || endDate) {
      return `Custom (${startDate || 'Start'} to ${endDate || 'End'})`;
    }
    switch (period) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'this-week': return 'This Week';
      case 'this-month': return 'This Month';
      case 'last-month': return 'Last Month';
      case 'this-year': return 'This Year';
      case 'custom': return 'Custom Range';
      default: return 'All Time';
    }
  };

  const filteredExpenses = expenses.filter(e => {
    // 1. Search Query Filter (description, category, payment mode, date, amount)
    const modeStr = e.payment_mode || e.payment_method || 'Cash';
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (e.description?.toLowerCase() || '').includes(q) ||
      (e.category?.toLowerCase() || '').includes(q) ||
      modeStr.toLowerCase().includes(q) ||
      String(e.amount || '').includes(q) ||
      (e.expense_date || '').includes(q);
    if (!matchesSearch) return false;

    // 2. Category Filter
    if (categoryFilter !== 'all' && (e.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }

    // 3. Payment Mode Filter
    if (paymentModeFilter !== 'all') {
      const pm = (e.payment_mode || e.payment_method || 'Cash').toLowerCase();
      if (paymentModeFilter === 'cash' && pm !== 'cash') return false;
      if (paymentModeFilter === 'upi' && !pm.includes('upi')) return false;
      if (paymentModeFilter === 'card' && !pm.includes('card')) return false;
      if (paymentModeFilter === 'netbanking' && !pm.includes('net') && !pm.includes('bank')) return false;
      if (paymentModeFilter === 'cheque' && !pm.includes('cheque')) return false;
      if (paymentModeFilter === 'other' && (pm === 'cash' || pm.includes('upi') || pm.includes('card') || pm.includes('net') || pm.includes('cheque'))) return false;
    }

    // 4. Date-wise & Period-wise Filter
    const dateVal = e.expense_date || e.created_at;
    if (!dateVal) return false;
    const expDateStr = getLocalDateStrFromVal(dateVal);
    if (!expDateStr) return false;

    // Direct Start & End date inputs override
    if (startDate && expDateStr < startDate) return false;
    if (endDate && expDateStr > endDate) return false;

    if (!startDate && !endDate && period !== 'all') {
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
    }

    return true;
  });

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const cashExpenses = filteredExpenses
    .filter(e => (e.payment_mode || e.payment_method || 'Cash').toLowerCase() === 'cash')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const digitalExpenses = totalFiltered - cashExpenses;
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select 
                      value={newExpense.payment_mode || 'Cash'}
                      onValueChange={(v) => setNewExpense({...newExpense, payment_mode: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI / QR</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Net Banking">Net Banking</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Payment Mode</Label>
                      <Select 
                        value={editingExpense.payment_mode || editingExpense.payment_method || 'Cash'}
                        onValueChange={(v) => setEditingExpense({...editingExpense, payment_mode: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="UPI">UPI / QR</SelectItem>
                          <SelectItem value="Card">Card</SelectItem>
                          <SelectItem value="Net Banking">Net Banking</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground font-black uppercase tracking-wider mb-1">Total Filtered Expenses</p>
              <h3 className="text-2xl font-black text-rose-600">{formatCurrency(totalFiltered)}</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">{getPeriodLabel()}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground font-black uppercase tracking-wider mb-1">Cash Expenses</p>
              <h3 className="text-2xl font-black text-slate-800">{formatCurrency(cashExpenses)}</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Paid in Cash</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 text-slate-700">
              <Wallet className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground font-black uppercase tracking-wider mb-1">Digital / Cheque</p>
              <h3 className="text-2xl font-black text-blue-600">{formatCurrency(digitalExpenses)}</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">UPI, Card, NetBanking</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <Wallet className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground font-black uppercase tracking-wider mb-1">Pending Vouchers</p>
              <h3 className="text-2xl font-black text-amber-600">{pendingVouchers}</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Unsettled Payments</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <Receipt className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-col gap-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-black text-slate-800">Expense Log</CardTitle>
              <CardDescription className="text-xs">
                Showing <span className="font-bold text-slate-900">{filteredExpenses.length}</span> record(s) matching selected filters. Total Amount: <span className="font-black text-rose-600">{formatCurrency(totalFiltered)}</span>
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search description, category, date..." 
                  className="pl-10 bg-slate-50 border-none h-9 w-full text-xs" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px] h-9 bg-white border-slate-200 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 truncate">
                    <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <SelectValue placeholder="Category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Salary">Salary</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
                <SelectTrigger className="w-[135px] h-9 bg-white border-slate-200 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 truncate">
                    <Wallet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <SelectValue placeholder="Payment Mode" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI / QR</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="netbanking">Net Banking</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={period} onValueChange={(v) => {
                setPeriod(v);
                if (v !== 'custom') {
                  setDateRange({ start: '', end: '' });
                }
              }}>
                <SelectTrigger className="w-[130px] h-9 bg-white border-slate-200 text-xs font-semibold">
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
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Search (From / To inputs) */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 h-9">
                <span className="text-[9px] uppercase font-bold text-muted-foreground px-1">From:</span>
                <Input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-7 w-28 text-[11px] border-none bg-transparent font-bold p-0 focus-visible:ring-0"
                />
                <span className="text-[9px] uppercase font-bold text-muted-foreground px-1">To:</span>
                <Input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-7 w-28 text-[11px] border-none bg-transparent font-bold p-0 focus-visible:ring-0"
                />
                {(startDate || endDate || paymentModeFilter !== 'all' || categoryFilter !== 'all' || searchQuery || period !== 'all') && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-[10px] uppercase font-bold"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setPaymentModeFilter('all');
                      setCategoryFilter('all');
                      setSearchQuery('');
                      setPeriod('all');
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Filtered Expenses Banner */}
        <div className="mx-6 mb-4 p-3.5 bg-gradient-to-r from-rose-50/80 via-slate-50 to-amber-50/60 border border-rose-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider block">Total Filtered Expenses</span>
              <span className="text-2xl font-black text-rose-700 leading-none">{formatCurrency(totalFiltered)}</span>
            </div>
            <div className="h-8 w-px bg-rose-200 hidden sm:block" />
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Cash Expenses</span>
              <span className="text-lg font-black text-slate-800 leading-none">{formatCurrency(cashExpenses)}</span>
            </div>
            <div className="h-8 w-px bg-rose-200 hidden sm:block" />
            <div>
              <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider block">Digital / Online</span>
              <span className="text-lg font-black text-blue-700 leading-none">{formatCurrency(digitalExpenses)}</span>
            </div>
          </div>
          <Badge variant="outline" className="bg-white text-rose-700 border-rose-300 font-extrabold text-xs px-3 py-1.5 shadow-2xs">
            {filteredExpenses.length} Expense Record{filteredExpenses.length === 1 ? '' : 's'}
          </Badge>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Category</TableHead>
                  <TableHead className="whitespace-nowrap">Description</TableHead>
                  <TableHead className="whitespace-nowrap">Payment Mode</TableHead>
                  <TableHead className="whitespace-nowrap">Amount</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                      No matching expense records found for the selected filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + itemsPerPage);
                    return paginatedExpenses.map((expense) => (
                      <TableRow key={expense.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">{formatDate(expense.expense_date)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase border-slate-200">{expense.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">{expense.description}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="secondary" className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200/60">
                            {expense.payment_mode || expense.payment_method || 'Cash'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 whitespace-nowrap">{formatCurrency(expense.amount)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="secondary" className={`border-none ${
                            expense.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 font-bold' : 'bg-amber-50 text-amber-600 font-bold'
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
