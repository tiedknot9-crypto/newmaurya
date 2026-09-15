import { useState, useMemo } from 'react';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Coins, 
  Printer, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RotateCcw, 
  CreditCard, 
  ShieldCheck, 
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate, getLocalDateStr } from '@/lib/utils';
import { toast } from 'sonner';
import { reconcileOPDAppointments, toDeterministicUuid } from '@/lib/billingUtils';

interface OPDSummaryViewProps {
  appointments: any[];
  users: any[];
  invoices?: any[];
}

export default function OPDSummaryView({ appointments = [], users = [], invoices = [] }: OPDSummaryViewProps) {
  const [summaryType, setSummaryType] = useState<'date' | 'doctor' | 'month' | 'year'>('date');
  const [dateFilterPreset, setDateFilterPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Paid' | 'Pending' | 'Refunded'>('all');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');

  // Quick Preset Date handler
  const handleApplyPreset = (preset: 'all' | 'today' | 'week' | 'month') => {
    setDateFilterPreset(preset);
    const today = new Date();
    const todayStr = getLocalDateStr(today);

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      setStartDate(getLocalDateStr(monday));
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(getLocalDateStr(firstDay));
      setEndDate(todayStr);
    }
  };

  // 1. Process and Reconcile appointments with invoices
  const processedAppts = useMemo(() => {
    return reconcileOPDAppointments(appointments, invoices, users);
  }, [appointments, users, invoices]);

  // 2. Filter processed appointments based on user criteria
  const filteredAppts = useMemo(() => {
    return processedAppts.filter(apt => {
      // Date Range Filter
      if (startDate && apt.cleanDate < startDate) return false;
      if (endDate && apt.cleanDate > endDate) return false;

      // Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'Paid' && !apt.isPaid) return false;
        if (statusFilter === 'Pending' && (apt.isPaid || apt.isCancelled || apt.isRefunded)) return false;
        if (statusFilter === 'Refunded' && !apt.isRefunded) return false;
      }

      // Doctor Filter
      if (doctorFilter !== 'all' && apt.cleanDoctor !== doctorFilter) return false;

      return true;
    });
  }, [processedAppts, startDate, endDate, statusFilter, doctorFilter]);

  // 3. Financial and Operational Summary Metrics (Strictly reconciled with Invoices)
  const totalRegistrations = filteredAppts.length;
  const nonCancelledAppts = filteredAppts.filter(a => !a.isCancelled);
  const totalBookings = nonCancelledAppts.length;
  const paidBookings = filteredAppts.filter(a => a.isPaid).length;
  const pendingBookings = filteredAppts.filter(a => a.paymentStatus === 'Pending' || a.paymentStatus === 'Partial').length;
  const cancelledBookings = filteredAppts.filter(a => a.isCancelled).length;
  const refundedBookings = filteredAppts.filter(a => a.isRefunded).length;

  const totalBilled = nonCancelledAppts.reduce((sum, item) => sum + item.billedAmount, 0);
  const totalPaid = nonCancelledAppts.reduce((sum, item) => sum + item.paidAmount, 0);
  const totalPending = Math.max(0, totalBilled - totalPaid);
  const totalRefunded = filteredAppts.filter(a => a.isRefunded).reduce((sum, item) => sum + (item.grossFee - item.discountAmount), 0);
  const averagePaidFee = paidBookings > 0 ? Math.round(totalPaid / paidBookings) : 0;

  // Mode-wise collection breakdown
  const paymentModeBreakdown = useMemo(() => {
    const modes: Record<string, number> = {};
    filteredAppts.filter(a => a.isPaid).forEach(apt => {
      const mode = apt.paymentMode || 'Cash';
      modes[mode] = (modes[mode] || 0) + apt.paidAmount;
    });
    return modes;
  }, [filteredAppts]);

  // Active doctors list for dropdown
  const doctorsList = useMemo(() => {
    const docSet = new Set<string>();
    processedAppts.forEach(apt => {
      if (apt.cleanDoctor) docSet.add(apt.cleanDoctor);
    });
    users.forEach(u => {
      if (['DOCTOR', 'SUPER_ADMIN', 'SURGEON'].includes((u.role || '').toUpperCase()) && u.name) {
        docSet.add(u.name);
      }
    });
    return Array.from(docSet).sort();
  }, [processedAppts, users]);

  // 1. Date-wise Data Grouping (sorted recent first)
  const dateWiseData = useMemo(() => {
    const groups: Record<string, { date: string; count: number; billed: number; paid: number; pending: number; doctors: Set<string> }> = {};
    filteredAppts.forEach(apt => {
      const key = apt.cleanDate;
      if (!groups[key]) {
        groups[key] = { date: key, count: 0, billed: 0, paid: 0, pending: 0, doctors: new Set() };
      }
      if (!apt.isCancelled) {
        groups[key].count += 1;
        groups[key].billed += apt.billedAmount;
        groups[key].paid += apt.paidAmount;
        groups[key].pending += apt.pendingDue;
      }
      if (apt.cleanDoctor) {
        groups[key].doctors.add(apt.cleanDoctor);
      }
    });
    return Object.values(groups)
      .map(g => ({ ...g, doctorsList: Array.from(g.doctors) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredAppts]);

  // 2. Doctor-wise Data Grouping (sorted paid collection highest first)
  const doctorWiseData = useMemo(() => {
    const groups: Record<string, { doctor: string; department: string; count: number; billed: number; paid: number; pending: number }> = {};
    filteredAppts.forEach(apt => {
      const key = apt.cleanDoctor;
      if (!groups[key]) {
        groups[key] = { doctor: key, department: apt.doctorDepartment, count: 0, billed: 0, paid: 0, pending: 0 };
      }
      if (!apt.isCancelled) {
        groups[key].count += 1;
        groups[key].billed += apt.billedAmount;
        groups[key].paid += apt.paidAmount;
        groups[key].pending += apt.pendingDue;
      }
    });
    return Object.values(groups).sort((a, b) => b.paid - a.paid);
  }, [filteredAppts]);

  // 3. Month-wise Data Grouping (Chronologically reverse sorted)
  const monthWiseData = useMemo(() => {
    const groups: Record<string, { monthYear: string; year: string; monthNum: string; count: number; billed: number; paid: number; pending: number }> = {};
    filteredAppts.forEach(apt => {
      const key = apt.monthYear;
      if (!groups[key]) {
        groups[key] = { monthYear: key, year: apt.year, monthNum: apt.monthNum, count: 0, billed: 0, paid: 0, pending: 0 };
      }
      if (!apt.isCancelled) {
        groups[key].count += 1;
        groups[key].billed += apt.billedAmount;
        groups[key].paid += apt.paidAmount;
        groups[key].pending += apt.pendingDue;
      }
    });
    return Object.values(groups).sort((a, b) => b.year.localeCompare(a.year) || b.monthNum.localeCompare(a.monthNum));
  }, [filteredAppts]);

  // 4. Year-wise Data Grouping
  const yearWiseData = useMemo(() => {
    const groups: Record<string, { year: string; count: number; billed: number; paid: number; pending: number }> = {};
    filteredAppts.forEach(apt => {
      const key = apt.year;
      if (!groups[key]) {
        groups[key] = { year: key, count: 0, billed: 0, paid: 0, pending: 0 };
      }
      if (!apt.isCancelled) {
        groups[key].count += 1;
        groups[key].billed += apt.billedAmount;
        groups[key].paid += apt.paidAmount;
        groups[key].pending += apt.pendingDue;
      }
    });
    return Object.values(groups).sort((a, b) => b.year.localeCompare(a.year));
  }, [filteredAppts]);

  // Max collection across items for CSS custom progress bars
  const maxCollection = useMemo(() => {
    const currentData = 
      summaryType === 'date' ? dateWiseData :
      summaryType === 'doctor' ? doctorWiseData :
      summaryType === 'month' ? monthWiseData : yearWiseData;
    
    if (currentData.length === 0) return 1;
    return Math.max(...currentData.map((d: any) => d.paid || d.billed || 1));
  }, [summaryType, dateWiseData, doctorWiseData, monthWiseData, yearWiseData]);

  // Direct print option for summary report
  const handlePrintSummary = () => {
    const printWindow = window.open('', '_blank', 'width=950,height=950');
    if (!printWindow) {
      toast.error('Please allow popups to print summary report');
      return;
    }

    let reportTitle = '';
    let tableHeaders = '';
    let tableRows = '';

    if (summaryType === 'date') {
      reportTitle = 'OPD Date-Wise Financial & Registration Summary';
      tableHeaders = '<th>Target Date</th><th>Physicians</th><th>Bookings</th><th>Billed (₹)</th><th>Collected / Paid (₹)</th><th>Pending Due (₹)</th>';
      tableRows = dateWiseData.map(d => {
        const docsStr = d.doctorsList && d.doctorsList.length > 0 ? d.doctorsList.join(', ') : 'General OPD';
        return `
          <tr>
            <td><strong>${formatDate(d.date)}</strong></td>
            <td>${docsStr}</td>
            <td>${d.count}</td>
            <td>₹${d.billed.toLocaleString()}</td>
            <td style="color: #0f766e; font-weight: bold;">₹${d.paid.toLocaleString()}</td>
            <td style="color: #b45309;">₹${d.pending.toLocaleString()}</td>
          </tr>
        `;
      }).join('');
    } else if (summaryType === 'doctor') {
      reportTitle = 'OPD Doctor-Wise Collections Summary';
      tableHeaders = '<th>Doctor Name</th><th>Department</th><th>Bookings</th><th>Billed (₹)</th><th>Collected (₹)</th><th>Pending Due (₹)</th>';
      tableRows = doctorWiseData.map(d => `
        <tr>
          <td><strong>${d.doctor}</strong></td>
          <td>${d.department || 'General Medicine'}</td>
          <td>${d.count}</td>
          <td>₹${d.billed.toLocaleString()}</td>
          <td style="color: #0f766e; font-weight: bold;">₹${d.paid.toLocaleString()}</td>
          <td style="color: #b45309;">₹${d.pending.toLocaleString()}</td>
        </tr>
      `).join('');
    } else if (summaryType === 'month') {
      reportTitle = 'OPD Monthly Financial Summary';
      tableHeaders = '<th>Month / Period</th><th>Bookings</th><th>Billed (₹)</th><th>Collected (₹)</th><th>Pending Due (₹)</th>';
      tableRows = monthWiseData.map(d => `
        <tr>
          <td><strong>${d.monthYear}</strong></td>
          <td>${d.count}</td>
          <td>₹${d.billed.toLocaleString()}</td>
          <td style="color: #0f766e; font-weight: bold;">₹${d.paid.toLocaleString()}</td>
          <td style="color: #b45309;">₹${d.pending.toLocaleString()}</td>
        </tr>
      `).join('');
    } else {
      reportTitle = 'OPD Annual Financial Summary';
      tableHeaders = '<th>Financial Year</th><th>Total Bookings</th><th>Billed (₹)</th><th>Collected (₹)</th><th>Pending Due (₹)</th>';
      tableRows = yearWiseData.map(d => `
        <tr>
          <td><strong>Year ${d.year}</strong></td>
          <td>${d.count}</td>
          <td>₹${d.billed.toLocaleString()}</td>
          <td style="color: #0f766e; font-weight: bold;">₹${d.paid.toLocaleString()}</td>
          <td style="color: #b45309;">₹${d.pending.toLocaleString()}</td>
        </tr>
      `).join('');
    }

    const printHtml = `
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 20px; margin-bottom: 30px; }
            .hospital-info h1 { margin: 0; font-size: 24px; color: #0f766e; }
            .hospital-info p { margin: 4px 0 0 0; font-size: 14px; color: #666; }
            .report-title h2 { margin: 0; font-size: 20px; color: #1e293b; }
            .report-title p { margin: 4px 0 0 0; font-size: 13px; color: #888; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; text-align: center; }
            .stat-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: bold; }
            .stat-card .value { font-size: 20px; font-weight: bold; margin-top: 6px; color: #0f766e; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #0f766e; text-align: left; padding: 12px 14px; font-size: 12px; text-transform: uppercase; color: white; letter-spacing: 0.05em; }
            td { padding: 11px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { border-top: 1px solid #e2e8f0; margin-top: 50px; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hospital-info">
              <h1>CURELINE MEDICAL CENTER</h1>
              <p>OPD Analytics & Finance Reconciliation Unit</p>
            </div>
            <div class="report-title">
              <h2>${reportTitle}</h2>
              <p>Generated on: ${new Date().toLocaleDateString()} | Filter: ${startDate || 'Earliest'} to ${endDate || 'Latest'}</p>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="label">Booked Appointments</div>
              <div class="value">${totalBookings} Patients</div>
            </div>
            <div class="stat-card">
              <div class="label">Total Billed Value</div>
              <div class="value">₹${totalBilled.toLocaleString()}</div>
            </div>
            <div class="stat-card">
              <div class="label">Paid Collections</div>
              <div class="value" style="color: #0f766e;">₹${totalPaid.toLocaleString()}</div>
            </div>
            <div class="stat-card">
              <div class="label">Pending Dues</div>
              <div class="value" style="color: #b45309;">₹${totalPending.toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                ${tableHeaders}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer">
            <p>Confidential Medical Facility Reports. Strictly reconciled with Billing and Recent Invoices. © ${new Date().getFullYear()} CureLine. All rights reserved.</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Live Reconciliation Status Banner */}
      <div className="bg-teal-50/80 border border-teal-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-teal-900 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-teal-950">Recent Invoices Data Synchronization: </span>
            <span className="text-teal-800">
              OPD Summary metrics are fully reconciled with Billing Invoices.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono font-bold text-[11px] bg-white/80 px-2.5 py-1 rounded-md border border-teal-200 text-teal-950 shrink-0">
          <span>Paid: ₹{totalPaid.toLocaleString()}</span>
          <span className="text-slate-300">|</span>
          <span className="text-amber-700">Due: ₹{totalPending.toLocaleString()}</span>
        </div>
      </div>

      {/* Analytics Overview KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Bookings */}
        <Card className="border border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              OPD Registrations
            </CardDescription>
            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-baseline justify-between">
              <span>{totalBookings}</span>
              <span className="text-xs font-normal text-muted-foreground">{totalRegistrations} logged</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 text-teal-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                {paidBookings} Paid
              </span>
              <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                {pendingBookings} Pending
              </span>
            </div>
            {cancelledBookings > 0 && (
              <div className="text-[11px] text-rose-600 font-medium">
                {cancelledBookings} cancelled bookings excluded
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Paid Collections */}
        <Card className="border border-teal-200 shadow-sm bg-teal-50/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-wider text-teal-700">
              Total Paid Collection
            </CardDescription>
            <CardTitle className="text-2xl font-black text-teal-800 tracking-tight">
              ₹{totalPaid.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-1 text-xs text-teal-700 font-semibold">
              <Coins className="w-3.5 h-3.5" />
              <span>
                {totalBilled > 0 ? `${Math.round((totalPaid / totalBilled) * 100)}% collected of billed` : '100% collected'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Billed & Pending */}
        <Card className="border border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Total Billed & Due
            </CardDescription>
            <CardTitle className="text-2xl font-black text-slate-800 tracking-tight flex items-baseline justify-between">
              <span>₹{totalBilled.toLocaleString()}</span>
              {totalPending > 0 ? (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  ₹{totalPending.toLocaleString()} Due
                </span>
              ) : (
                <span className="text-xs font-semibold text-emerald-600">All Settled</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              <span>Net billable consultation value</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Average Paid Fee & Refunds */}
        <Card className="border border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Avg Consultation Fee
            </CardDescription>
            <CardTitle className="text-2xl font-black text-indigo-700 tracking-tight flex items-baseline justify-between">
              <span>₹{averagePaidFee.toLocaleString()}</span>
              <span className="text-xs font-normal text-muted-foreground">/ patient</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1 text-indigo-700 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Realized mean fee</span>
              </span>
              {totalRefunded > 0 && (
                <span className="text-[11px] text-rose-600 font-medium">
                  ₹{totalRefunded.toLocaleString()} refunded
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Filters Toolbar Card */}
      <Card className="border border-slate-200/80 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Quick Presets & Date Inputs */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <Button 
                  variant={dateFilterPreset === 'all' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => handleApplyPreset('all')}
                  className={`text-xs h-7 px-2.5 ${dateFilterPreset === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`}
                >
                  All Time
                </Button>
                <Button 
                  variant={dateFilterPreset === 'today' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => handleApplyPreset('today')}
                  className={`text-xs h-7 px-2.5 ${dateFilterPreset === 'today' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`}
                >
                  Today
                </Button>
                <Button 
                  variant={dateFilterPreset === 'week' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => handleApplyPreset('week')}
                  className={`text-xs h-7 px-2.5 ${dateFilterPreset === 'week' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`}
                >
                  This Week
                </Button>
                <Button 
                  variant={dateFilterPreset === 'month' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => handleApplyPreset('month')}
                  className={`text-xs h-7 px-2.5 ${dateFilterPreset === 'month' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`}
                >
                  This Month
                </Button>
              </div>

              {/* Custom Date Range Picker */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">From</Label>
                  <Input 
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDateFilterPreset('custom');
                    }}
                    className="h-8 w-32 text-xs font-medium"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase">To</Label>
                  <Input 
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDateFilterPreset('custom');
                    }}
                    className="h-8 w-32 text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Dropdown Filters & Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Payment Status Filter */}
              <div className="w-36">
                <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                  <SelectTrigger className="h-8 text-xs font-medium">
                    <SelectValue placeholder="Payment Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="Paid">Paid Only</SelectItem>
                    <SelectItem value="Pending">Pending / Unpaid</SelectItem>
                    <SelectItem value="Refunded">Refunded Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Doctor Filter */}
              <div className="w-44">
                <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                  <SelectTrigger className="h-8 text-xs font-medium">
                    <SelectValue placeholder="All Physicians" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Physicians</SelectItem>
                    {doctorsList.map(doc => (
                      <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(startDate || endDate || statusFilter !== 'all' || doctorFilter !== 'all') && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    handleApplyPreset('all');
                    setStatusFilter('all');
                    setDoctorFilter('all');
                  }}
                  className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reset
                </Button>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Aggregate Toggles & Interactive View */}
      <Card className="border border-slate-200/80 shadow-sm bg-white overflow-hidden">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4 border-b border-slate-100">
          <div>
            <CardTitle className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              OPD Operations & Revenue Reconciliation
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Multi-dimensional operational breakdown matching Recent Invoices.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <Button 
                variant={summaryType === 'date' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setSummaryType('date')}
                className={`text-xs h-8 px-3 ${summaryType === 'date' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`}
              >
                Date-wise
              </Button>
              <Button 
                variant={summaryType === 'doctor' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setSummaryType('doctor')}
                className={`text-xs h-8 px-3 ${summaryType === 'doctor' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`}
              >
                Doctor-wise
              </Button>
              <Button 
                variant={summaryType === 'month' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setSummaryType('month')}
                className={`text-xs h-8 px-3 ${summaryType === 'month' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`}
              >
                Month-wise
              </Button>
              <Button 
                variant={summaryType === 'year' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setSummaryType('year')}
                className={`text-xs h-8 px-3 ${summaryType === 'year' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`}
              >
                Year-wise
              </Button>
            </div>

            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1.5 text-xs hover:bg-teal-50 border-teal-600/30 text-teal-700 h-8 font-bold"
              onClick={handlePrintSummary}
            >
              <Printer className="w-3.5 h-3.5" />
              Print Audit Sheet
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            
            {/* 1. Date Wise Summary Table */}
            {summaryType === 'date' && (
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                  <TableRow>
                    <TableHead className="w-1/4">Target Date</TableHead>
                    <TableHead className="w-1/6 text-center">Registrations</TableHead>
                    <TableHead className="w-1/6 text-right">Billed (₹)</TableHead>
                    <TableHead className="w-1/6 text-right">Paid Collection (₹)</TableHead>
                    <TableHead className="w-1/6 text-right">Pending Due (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dateWiseData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs font-medium">
                        No appointment records match the selected date and filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dateWiseData.map((d) => {
                      const sharePct = Math.round((d.paid / maxCollection) * 100) || 5;
                      return (
                        <TableRow key={d.date} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell className="font-bold text-slate-800 text-xs py-3.5">
                            <div>{formatDate(d.date)}</div>
                            {d.doctorsList && d.doctorsList.length > 0 && (
                              <div className="text-[10px] text-muted-foreground font-normal mt-1 flex flex-wrap gap-1 items-center">
                                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mr-0.5">Staff:</span>
                                {d.doctorsList.map((doc: string) => (
                                  <span key={doc} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                                    {doc}
                                  </span>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-700 text-xs">
                            <Badge variant="outline" className="bg-slate-50 text-slate-800 border-slate-200 font-extrabold">
                              {d.count} patients
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-600 text-xs">
                            ₹{d.billed.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-black text-teal-700 text-xs">
                            ₹{d.paid.toLocaleString()}
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden max-w-[90px] ml-auto mt-1">
                              <div className="bg-teal-600 h-full rounded-full" style={{ width: `${sharePct}%` }} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-xs">
                            {d.pending > 0 ? (
                              <span className="text-amber-700">₹{d.pending.toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">₹0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}

            {/* 2. Doctor Wise Summary Table */}
            {summaryType === 'doctor' && (
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                  <TableRow>
                    <TableHead className="w-1/4">Consultant Physician</TableHead>
                    <TableHead className="w-1/6 text-center">Consultations</TableHead>
                    <TableHead className="w-1/6 text-right">Billed (₹)</TableHead>
                    <TableHead className="w-1/6 text-right">Paid Collection (₹)</TableHead>
                    <TableHead className="w-1/6 text-right">Pending Due (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctorWiseData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs font-medium">
                        No physician records found matching the active filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    doctorWiseData.map((d) => {
                      const sharePct = Math.round((d.paid / maxCollection) * 100) || 5;
                      const collectionRate = d.billed > 0 ? Math.round((d.paid / d.billed) * 100) : 100;
                      return (
                        <TableRow key={d.doctor} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell className="font-bold text-slate-800 text-xs py-3.5">
                            <div>{d.doctor}</div>
                            <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                              {d.department || 'General Medicine'}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-700 text-xs">
                            <Badge variant="outline" className="bg-slate-50 text-slate-800 border-slate-200 font-extrabold">
                              {d.count} sessions
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-600 text-xs">
                            ₹{d.billed.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-black text-teal-700 text-xs">
                            ₹{d.paid.toLocaleString()}
                            <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                              {collectionRate}% collected
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden max-w-[90px] ml-auto mt-1">
                              <div className="bg-teal-600 h-full rounded-full" style={{ width: `${sharePct}%` }} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-xs">
                            {d.pending > 0 ? (
                              <span className="text-amber-700">₹{d.pending.toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">₹0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}

            {/* 3. Month Wise Summary Table */}
            {summaryType === 'month' && (
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                  <TableRow>
                    <TableHead className="w-1/4">Monthly Period</TableHead>
                    <TableHead className="w-1/6 text-center">Consultations</TableHead>
                    <TableHead className="w-1/6 text-right">Billed (₹)</TableHead>
                    <TableHead className="w-1/6 text-right">Paid Collection (₹)</TableHead>
                    <TableHead className="w-1/6 text-right">Pending Due (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthWiseData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs font-medium">
                        No appointments found to generate monthly summaries.
                      </TableCell>
                    </TableRow>
                  ) : (
                    monthWiseData.map((d) => {
                      const sharePct = Math.round((d.paid / maxCollection) * 100) || 5;
                      return (
                        <TableRow key={d.monthYear} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell className="font-bold text-slate-800 text-xs py-3.5">
                            {d.monthYear}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-700 text-xs">
                            <Badge variant="outline" className="bg-slate-50 text-slate-800 border-slate-200 font-extrabold">
                              {d.count} patients
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-600 text-xs">
                            ₹{d.billed.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-black text-teal-700 text-xs">
                            ₹{d.paid.toLocaleString()}
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden max-w-[90px] ml-auto mt-1">
                              <div className="bg-teal-600 h-full rounded-full" style={{ width: `${sharePct}%` }} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-xs">
                            {d.pending > 0 ? (
                              <span className="text-amber-700">₹{d.pending.toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">₹0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}

            {/* 4. Year Wise Summary Table */}
            {summaryType === 'year' && (
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                  <TableRow>
                    <TableHead className="w-1/4">Annual Period</TableHead>
                    <TableHead className="w-1/6 text-center">Registrations</TableHead>
                    <TableHead className="w-1/6 text-right">Annual Billed (₹)</TableHead>
                    <TableHead className="w-1/6 text-right">Annual Paid (₹)</TableHead>
                    <TableHead className="w-1/6 text-right">Pending Due (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearWiseData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs font-medium">
                        No appointments found to generate annual summary reports.
                      </TableCell>
                    </TableRow>
                  ) : (
                    yearWiseData.map((d) => {
                      const sharePct = Math.round((d.paid / maxCollection) * 100) || 5;
                      return (
                        <TableRow key={d.year} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell className="font-bold text-slate-800 text-xs py-3.5">
                            Financial Year {d.year}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-700 text-xs">
                            <Badge variant="outline" className="bg-slate-50 text-slate-800 border-slate-200 font-extrabold">
                              {d.count} sessions
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-600 text-xs">
                            ₹{d.billed.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-black text-teal-700 text-xs">
                            ₹{d.paid.toLocaleString()}
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden max-w-[90px] ml-auto mt-1">
                              <div className="bg-teal-600 h-full rounded-full" style={{ width: `${sharePct}%` }} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-xs">
                            {d.pending > 0 ? (
                              <span className="text-amber-700">₹{d.pending.toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">₹0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
