import { useState, useEffect, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  User,
  Calendar, 
  FileText, 
  CreditCard, 
  FlaskConical, 
  Stethoscope, 
  Pill, 
  Baby, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Plus,
  Scissors,
  ClipboardList,
  Shield,
  BookOpen,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { PrintPreviewModal } from '@/components/PrintPreviewModal';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import Dashboard from './components/Dashboard';
import OPD from './components/OPD';
import IPD from './components/IPD';
import Maternity from './components/Maternity';
import Expenses from './components/Expenses';
import OTManagement from './components/OTManagement';
import PatientOverview from './components/PatientOverview';
import Lab from './components/Lab';
import Login from './components/Login';
import UserManual from './components/UserManual';
import Billing from './components/Billing';
import AdminSettings from './components/Settings';
import Staff from './components/Staff';
import Pharmacy from './components/Pharmacy';
import PharmacyPOS from './components/PharmacyPOS';

import { storage, STORAGE_KEYS } from '@/lib/storage';
import { MOCK_PATIENTS, MOCK_USERS } from './mockData';
import { User as UserType } from './types';
import { supabaseService, syncOfflineDataWithSupabase } from '@/services/supabaseService';
import { hasMenuAccess, normalizeRole } from '@/utils/rbac';

const navSections = [
  {
    category: 'Core & Clinical Desk',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'LAB_STAFF', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'RADIOLOGIST'] },
      { name: 'OPD Management', icon: Stethoscope, path: '/opd', roles: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS'] },
      { name: 'IPD Management', icon: Calendar, path: '/ipd', roles: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS'] },
      { name: 'OT Management', icon: Scissors, path: '/ot', roles: ['SUPER_ADMIN', 'DOCTOR', 'SURGEON', 'NURSE'] },
      { name: 'Lab & Radiology', icon: FlaskConical, path: '/lab', roles: ['SUPER_ADMIN', 'LAB_STAFF', 'ACCOUNTANT', 'ACCOUNTS', 'NURSE', 'RADIOLOGIST', 'PATHOLOGIST', 'DOCTOR'] },
      { name: 'Patient 360', icon: User, path: '/patient-overview', roles: ['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'ACCOUNTANT', 'ACCOUNTS'] },
      { name: 'Maternity', icon: Baby, path: '/maternity', roles: ['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK'] },
    ]
  },
  {
    category: 'Pharmacy & Billing',
    items: [
      { name: 'Pharmacy Store', icon: Pill, path: '/pharmacy', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE'] },
      { name: 'Billing & Accounts', icon: CreditCard, path: '/billing', roles: ['SUPER_ADMIN', 'ACCOUNTANT', 'ACCOUNTS'] },
      { name: 'Expenses', icon: FileText, path: '/expenses', roles: ['SUPER_ADMIN', 'ACCOUNTANT', 'ACCOUNTS'] },
    ]
  },
  {
    category: 'Administration',
    items: [
      { name: 'Admin Settings', icon: Settings, path: '/settings', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'ACCOUNTANT', 'ACCOUNTS'] },
      { name: 'Staff Management', icon: Users, path: '/staff', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN'] },
      { name: 'User Manual & Guide', icon: BookOpen, path: '/manual', roles: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'LAB_STAFF', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'SURGEON', 'RADIOLOGIST'] },
    ]
  }
];

const navItems = navSections.flatMap(section => section.items);

function ProtectedRoute({ children, allowedRoles, user }: { children: ReactNode, allowedRoles: string[], user: any }) {
  if (!user) return <>{children}</>;
  
  const userRole = user.role;
  const normalizedUserRole = normalizeRole(userRole);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(normalizedUserRole);
  
  const hasAccess = isAdmin || allowedRoles.some(role => {
    const r = normalizeRole(role);
    return r === normalizedUserRole;
  });

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function SidebarContent({ onLogout, user, hospitalInfo }: { onLogout: () => void, user: UserType | null, hospitalInfo: any }) {
  const location = useLocation();
  const [menuFilter, setMenuFilter] = useState('');
  
  return (
    <div className="flex flex-col h-full bg-slate-50/70 border-r border-slate-200/80 overflow-hidden select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3.5 bg-white border-b border-slate-100 flex-shrink-0 shadow-xs">
        <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-black text-xl overflow-hidden shadow-md shadow-blue-200 flex-shrink-0">
          {hospitalInfo.logo && hospitalInfo.logo !== 'null' && hospitalInfo.logo !== 'undefined' && hospitalInfo.logo.trim() !== '' ? (
            <img src={hospitalInfo.logo} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            (hospitalInfo?.name || 'H').charAt(0)
          )}
        </div>
        <div className="overflow-hidden">
          <h1 className="text-sm font-extrabold leading-tight text-slate-900 truncate uppercase tracking-tight">{hospitalInfo.name}</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Live Hospital System</p>
          </div>
        </div>
      </div>
      
      {/* Quick Menu Search Filter */}
      <div className="px-3.5 pt-3.5 pb-1 flex-shrink-0">
        <div className="relative">
          <Input
            placeholder="Search menu items..."
            value={menuFilter}
            onChange={(e) => setMenuFilter(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs bg-white border-slate-200 rounded-lg shadow-2xs focus-visible:ring-1 focus-visible:ring-blue-500"
          />
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          {menuFilter && (
            <button 
              onClick={() => setMenuFilter('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      {/* Scrollable Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 custom-scrollbar">
        {navSections.map((sec) => {
          const visibleItems = sec.items.filter(item => {
            const matchesRole = !user || hasMenuAccess(item.path, user.role);
            const matchesQuery = !menuFilter || item.name.toLowerCase().includes(menuFilter.toLowerCase());
            return matchesRole && matchesQuery;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={sec.category} className="space-y-1">
              <div className="px-2 py-1 flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
                  {sec.category}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold bg-slate-200/60 px-1.5 py-0.5 rounded-full">
                  {visibleItems.length}
                </span>
              </div>

              <nav className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200/80' 
                          : 'text-slate-600 hover:bg-blue-50/80 hover:text-blue-700'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : 'bg-slate-200/70 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate flex-1">{item.name}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs"></span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>
      
      {/* Bottom User Card */}
      <div className="p-3.5 mt-auto flex-shrink-0 border-t border-slate-200/80 bg-white shadow-xs">
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-2xl p-3 border border-slate-200/80 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <Avatar className="w-10 h-10 border-2 border-white shadow-xs">
                <AvatarImage src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali"} />
                <AvatarFallback className="bg-blue-600 text-white font-bold">{user?.name?.substring(0, 2).toUpperCase() || "AG"}</AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.name || "Dr. Anjali Gupta"}</p>
              <span className="inline-block px-1.5 py-0.5 mt-0.5 rounded-md bg-blue-100 text-blue-800 text-[9px] font-black uppercase tracking-tight">
                {user?.role?.replace('_', ' ') || "Super Admin"}
              </span>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-center gap-1.5 text-xs h-8 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 rounded-xl font-bold border border-rose-100/80 transition-colors"
            onClick={onLogout}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

function GlobalHeaderSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await supabaseService.getPatients();
        if (data) setPatients(data);
      } catch (err) {
        console.warn('Failed to fetch patients for headers:', err);
      }
    };
    loadPatients();
  }, []);

  const handleSearchChange = (val: string) => {
    setQuery(val);
    if (val.trim() === '') {
      setResults([]);
      return;
    }
    const filtered = patients.filter((p: any) => 
      (p.name || '').toLowerCase().includes(val.toLowerCase()) ||
      (p.mrn || '').toLowerCase().includes(val.toLowerCase()) ||
      (p.phone || '').includes(val)
    );
    setResults(filtered.slice(0, 5));
  };

  const handleResultClick = (patientId: string) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    navigate(`/patient-overview?id=${patientId}`);
  };

  return (
    <div className="relative w-64 lg:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input 
        type="text" 
        placeholder="Search patients, MRN, or phone..." 
        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-medical-blue/20 transition-all font-medium"
        value={query}
        onChange={(e) => handleSearchChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      />
      
      {isOpen && results.length > 0 && (
        <div className="absolute top-12 left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-[280px] overflow-y-auto">
          {results.map((p) => (
            <div 
              key={p.id}
              onClick={() => handleResultClick(p.id)}
              className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-slate-800">{p.name}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Phone: {p.phone || 'N/A'} • MRN: {p.mrn}</p>
              </div>
              <span className="text-[9px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full uppercase scale-90 shrink-0">
                {p.registration_type || 'Patient'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickRegisterForm({ currentUser }: { currentUser: UserType | null }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    gender: 'male',
    facility: 'OPD'
  });
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Please fill in required fields');
      return;
    }

    if (isRegistering) return;

    // Duplicate check
    const existingPatients = storage.get(STORAGE_KEYS.PATIENTS, []);
    const trimmedNewName = (formData.name || '').trim().toLowerCase();
    const trimmedNewPhone = (formData.phone || '').trim().replace(/\D/g, '');

    const isDuplicate = existingPatients.some((p: any) => {
      const pName = (p.name || '').trim().toLowerCase();
      const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');

      const nameMatches = pName === trimmedNewName;
      const phoneMatches = trimmedNewPhone && pPhone && (trimmedNewPhone === pPhone);

      if (nameMatches && phoneMatches) return true;
      if (trimmedNewPhone && trimmedNewPhone.length >= 10 && pPhone === trimmedNewPhone) return true;
      if (nameMatches && !trimmedNewPhone && !pPhone) return true;
      return false;
    });

    if (isDuplicate) {
      toast.warning('A patient with this Name and/or Phone Number is already registered!');
      return;
    }

    setIsRegistering(true);
    const mrn = `MRN${Math.floor(Math.random() * 90000) + 10000}`;
    
    let registration_type = 'OPD';
    if (formData.facility === 'Lab') registration_type = 'Quick-Lab';
    else if (formData.facility === 'Pharmacy') registration_type = 'Quick-Pharmacy';
    else if (formData.facility === 'Radiology') registration_type = 'Quick-Radiology';
    else if (formData.facility === 'OPD') registration_type = 'OPD';
    else if (formData.facility === 'Emergency') registration_type = 'Emergency';

    const patientToAdd = {
      name: formData.name,
      phone: formData.phone,
      age: Number(formData.age) || 0,
      gender: formData.gender,
      mrn,
      status: 'Active',
      registration_type
    };

    try {
      // 1. Save patient inside Supabase DB
      const result = await supabaseService.createPatient(patientToAdd);
      
      if (result) {
        // Save patient into the separate Quick Registration database table
        await supabaseService.createQuickRegistration({
          mrn,
          name: formData.name,
          phone: formData.phone,
          age: Number(formData.age) || 0,
          gender: formData.gender,
          facility: formData.facility,
          status: 'Active'
        });

        // 2. If OPD Consultation chosen, book consultation and registration fee invoice
        if (formData.facility === 'OPD') {
          const appointmentDate = new Date().toISOString().split('T')[0];
          const appointmentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) || '10:00 AM';
          
          // Load custom OPD Charges settings from local storage
          const opdCharges = storage.get(STORAGE_KEYS.OPD_CHARGES, {
            reg: 200,
            appt: 200,
            consult: 500
          });

          // Calculate sequential daily token starting from 1 on this date
          const existingAppointments = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
          const sameDayCount = existingAppointments.filter((a: any) => {
            const d = (a.appointment_date || a.date || '').split('T')[0];
            return d === appointmentDate;
          }).length;
          const nextDailyToken = sameDayCount + 1;

          const appointmentSynced = await supabaseService.createAppointment({
            patient_id: result.id,
            patientName: result.name,
            doctor_id: null,
            type: 'OPD',
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            status: 'Scheduled',
            urgency: 'Routine',
            fee: opdCharges.consult, // Dynamic fee directly saved on appointment
            token_number: nextDailyToken
          });

          if (appointmentSynced) {
            // Save inside the separate Live Queue database table
            await supabaseService.createLiveQueueItem({
              patient_id: result.id,
              doctor_id: null,
              appointment_id: appointmentSynced.id,
              token_number: nextDailyToken,
              status: 'Waiting',
              urgency: 'Routine'
            });

            const regFee = opdCharges.reg; // Dynamic registration fee
            const invoiceData = {
              patient_id: result.id,
              invoice_number: `INV-REG-${Date.now()}`,
              status: 'Unpaid',
              total_amount: regFee,
              paid_amount: 0,
              payment_method: 'Cash',
              type: 'OPD',
              created_by: currentUser?.id
            };

            const invoiceItems = [{
              item_name: 'OPD Registration Fee',
              item_type: 'Consultation',
              quantity: 1,
              unit_price: regFee,
              total_price: regFee
            }];

            await supabaseService.createInvoice(invoiceData, invoiceItems);
          }
        }

        // Trigger real-time sync custom event so any active OPD or components refetch immediately
        window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
          detail: { table: 'patients', action: 'insert' } 
        }));

        toast.success(`Patient registered successfully for ${formData.facility}! MRN: ${mrn}`);
        setFormData({ name: '', phone: '', age: '', gender: 'male', facility: 'OPD' });
      } else {
        toast.error('Failed to register patient in database');
      }
    } catch (err: any) {
      console.error('Error in handleRegister:', err);
      toast.error('Failed to register brand new patient due to database error.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="header-name">Full Name *</Label>
          <Input 
            id="header-name" 
            placeholder="Enter patient name" 
            value={formData.name}
            disabled={isRegistering}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="header-phone">Phone Number *</Label>
          <Input 
            id="header-phone" 
            placeholder="Enter phone number" 
            disabled={isRegistering}
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="header-age">Age</Label>
          <Input 
            id="header-age" 
            type="number" 
            placeholder="Age" 
            disabled={isRegistering}
            value={formData.age}
            onChange={(e) => setFormData({...formData, age: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="header-gender">Gender</Label>
          <Select 
            value={formData.gender}
            disabled={isRegistering}
            onValueChange={(v) => setFormData({...formData, gender: v})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="header-facility">Facility / Purpose</Label>
          <Select 
            value={formData.facility}
            disabled={isRegistering}
            onValueChange={(v) => setFormData({...formData, facility: v})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select facility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPD">OPD Consultation</SelectItem>
              <SelectItem value="Emergency">Emergency</SelectItem>
              <SelectItem value="Pharmacy">Pharmacy / Medicine</SelectItem>
              <SelectItem value="Lab">Laboratory / Blood Test</SelectItem>
              <SelectItem value="Radiology">Radiology / X-Ray</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={isRegistering} onClick={() => setFormData({ name: '', phone: '', age: '', gender: 'male', facility: 'OPD' })}>Reset</Button>
        <Button className="bg-medical-blue" disabled={isRegistering} onClick={handleRegister}>
          {isRegistering ? 'Registering...' : 'Confirm Registration'}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function App() {
  const [hospitalInfo, setHospitalInfo] = useState(() => storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
    name: 'Global Multispeciality Hospital',
    address: 'Global Hospital ,Infront of Aura Inn Bansi Road Basti',
    gst: '27AAAAA0000A1Z5',
    phone: '+91 6394517005',
    email: 'info@globalhospital.com',
    logo: null as string | null
  }));

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserType | null>(() => {
    return storage.get(STORAGE_KEYS.SESSION_USER, null);
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return storage.get(STORAGE_KEYS.AUTH_STATUS, false);
  });

  const handleLogin = (userData: UserType) => {
    storage.set(STORAGE_KEYS.AUTH_STATUS, true);
    storage.set(STORAGE_KEYS.SESSION_USER, userData);
    setUser(userData);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    const handleStorage = () => {
      const savedUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
      if (savedUser) {
        setUser(savedUser);
      }
      const auth = storage.get(STORAGE_KEYS.AUTH_STATUS, false);
      setIsAuthenticated(auth);
      
      const savedHospital = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
      if (savedHospital) {
        setHospitalInfo(savedHospital);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Load hospital info and perform automatic offline sync on startup
  useEffect(() => {
    // One-time complete purge of all preloaded mock/demo data to start fresh with empty entries
    try {
      const clearedKey = 'hms_database_cleared_v2';
      if (!localStorage.getItem(clearedKey)) {
        const keysToClear = [
          STORAGE_KEYS.PATIENTS,
          STORAGE_KEYS.APPOINTMENTS,
          STORAGE_KEYS.BILLING,
          STORAGE_KEYS.LAB_BILLS,
          STORAGE_KEYS.NURSING_TASKS,
          STORAGE_KEYS.PHARMACY_BILLS,
          STORAGE_KEYS.PRESCRIPTIONS,
          STORAGE_KEYS.LAB_TEST_ORDERS,
          STORAGE_KEYS.EXTERNAL_REPORTS,
          STORAGE_KEYS.RADIOLOGY_FILES,
          STORAGE_KEYS.PATIENT_VITALS,
          'hms_admissions',
          'hms_discharge_summaries',
          'hms_clinical_notes',
          'hms_live_queue',
          'hms_quick_registrations',
          'hms_lis_bookings',
          'hms_lis_doctors',
          'hms_lis_franchises',
          'hms_ot_schedules'
        ];
        keysToClear.forEach(key => {
          localStorage.removeItem(key);
        });
        localStorage.setItem(clearedKey, 'true');
        console.log('Successfully completed one-time clean database purge.');
      }
    } catch (err) {
      console.warn('Error during one-time database purge:', err);
    }

    const initializeDatabase = async () => {
      try {
        // Fetch hospital info
        const dbHospitalInfo = await supabaseService.getHospitalInfo();
        if (dbHospitalInfo) {
          storage.set(STORAGE_KEYS.HOSPITAL_INFO, dbHospitalInfo);
          setHospitalInfo(dbHospitalInfo);

          if (dbHospitalInfo.template_image) {
            storage.set(STORAGE_KEYS.TEMPLATE_IMAGE, dbHospitalInfo.template_image);
          }
          if (dbHospitalInfo.header_image) {
            storage.set(STORAGE_KEYS.PRESCRIPTION_HEADER_IMAGE, dbHospitalInfo.header_image);
          }
          if (dbHospitalInfo.footer_image) {
            storage.set(STORAGE_KEYS.PRESCRIPTION_FOOTER_IMAGE, dbHospitalInfo.footer_image);
          }
        }
      } catch (err) {
        console.warn('Could not fetch hospital info from database:', err);
      }

      // Check offline records and sync them automatically!
      try {
        const patients = storage.get(STORAGE_KEYS.PATIENTS, []);
        const offlinePatients = patients.filter((p: any) => p.id && String(p.id).startsWith('off-'));
        const appointments = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
        const offlineAppointments = appointments.filter((a: any) => a.id && String(a.id).startsWith('off-'));
        const admissions = storage.get('hms_admissions', []);
        const offlineAdmissions = admissions.filter((ad: any) => ad.id && String(ad.id).startsWith('off-'));
        const prescriptions = storage.get(STORAGE_KEYS.PRESCRIPTIONS, []);
        const offlinePrescriptions = prescriptions.filter((rx: any) => rx.id && String(rx.id).startsWith('off-'));
        const bills = storage.get(STORAGE_KEYS.BILLING, []);
        const offlineInvoices = bills.filter((b: any) => b.id && String(b.id).startsWith('off-'));
        const expenses = storage.get(STORAGE_KEYS.EXPENSES, []);
        const offlineExpenses = expenses.filter((e: any) => e.id && String(e.id).startsWith('off-'));
        
        const hasOfflineData = (
          offlinePatients.length > 0 || 
          offlineAppointments.length > 0 || 
          offlineAdmissions.length > 0 || 
          offlinePrescriptions.length > 0 ||
          offlineInvoices.length > 0 ||
          offlineExpenses.length > 0
        );

        if (hasOfflineData) {
          console.log('Detected offline unsynced data. Initializing auto-sync...');
          const syncResult = await syncOfflineDataWithSupabase();
          if (syncResult && syncResult.success && syncResult.syncCount > 0) {
            console.log(`Auto-synchronized ${syncResult.syncCount} offline records to the cloud!`);
            toast.success('Offline records synchronized with live server!');
            // Dispatch sync event to refresh lists in active components
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { action: 'sync' } }));
          }
        }
      } catch (err) {
        console.warn('Silent auto-sync failure on load:', err);
      }
    };

    if (isAuthenticated) {
      initializeDatabase();
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    storage.remove(STORAGE_KEYS.AUTH_STATUS);
    storage.remove(STORAGE_KEYS.SESSION_USER);
    setUser(null);
    setIsAuthenticated(false);
    toast.info('Logged out successfully');
  };

  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" />
      <PrintPreviewModal />
      <AppLayout 
        user={user}
        hospitalInfo={hospitalInfo}
        handleLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        setUser={setUser}
        setHospitalInfo={setHospitalInfo}
      />
    </Router>
  );
}

function AppLayout({ user, hospitalInfo, handleLogout, isMobileMenuOpen, setIsMobileMenuOpen, setUser, setHospitalInfo }: any) {
  return (
    <div className="flex h-[100dvh] bg-soft-white overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 h-full">
        <SidebarContent onLogout={handleLogout} user={user} hospitalInfo={hospitalInfo} />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 lg:px-8 flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 h-full">
                <SidebarContent onLogout={handleLogout} user={user} hospitalInfo={hospitalInfo} />
              </SheetContent>
            </Sheet>
            
            <div className="relative hidden md:block w-64 lg:w-96">
              <GlobalHeaderSearch />
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {(user?.role === 'SUPER_ADMIN' || user?.role === 'DOCTOR' || user?.role === 'RECEPTION' || user?.role === 'RECEPTIONIST' || user?.role === 'FRONT_DESK' || user?.role === 'NURSE') && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 rounded-full px-4 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                    <Plus className="w-4 h-4" />
                    Emergency
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Quick Patient Registration</DialogTitle>
                  </DialogHeader>
                  <QuickRegisterForm currentUser={user} />
                </DialogContent>
              </Dialog>
            )}
            
            <Separator orientation="vertical" className="h-6 mx-2 hidden sm:block" />
            
            <Button variant="ghost" size="icon" className="relative text-secondary-text">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-soft-red rounded-full border-2 border-white"></span>
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold leading-none">{user?.name}</p>
                <p className="text-[9px] text-muted-foreground uppercase mt-1 font-bold">{user?.role.replace('_', ' ')}</p>
              </div>
              <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-medical-blue/20 transition-all">
                <AvatarImage src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali"} />
                <AvatarFallback>{user?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Routes>
            <Route path="/" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'LAB_STAFF', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'RADIOLOGIST']}><Dashboard /></ProtectedRoute>} />
            <Route path="/opd" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS']}><OPD /></ProtectedRoute>} />
            <Route path="/ipd" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS']}><IPD /></ProtectedRoute>} />
            <Route path="/maternity" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK']}><Maternity /></ProtectedRoute>} />
            <Route path="/ot" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'SURGEON', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK']}><OTManagement /></ProtectedRoute>} />
            <Route path="/lab" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'LAB_STAFF', 'ACCOUNTANT', 'ACCOUNTS', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'RADIOLOGIST', 'PATHOLOGIST', 'DOCTOR']}><Lab /></ProtectedRoute>} />
            <Route path="/patient-overview" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'ACCOUNTANT', 'ACCOUNTS']}><PatientOverview userRole={user?.role} /></ProtectedRoute>} />
            <Route path="/pharmacy" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE']}><Pharmacy /></ProtectedRoute>} />
            <Route path="/pharmacy/pos" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE']}><PharmacyPOS /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ACCOUNTANT', 'ACCOUNTS']}><Expenses /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ACCOUNTANT', 'ACCOUNTS', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK']}><Billing /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN', 'ACCOUNTANT', 'ACCOUNTS']}><AdminSettings currentUser={user} onUserUpdate={(updatedUser) => setUser(updatedUser)} onHospitalUpdate={(info) => setHospitalInfo(info)} /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN']}><Staff /></ProtectedRoute>} />
            <Route path="/manual" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'LAB_STAFF', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'SURGEON', 'RADIOLOGIST']}><UserManual /></ProtectedRoute>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
