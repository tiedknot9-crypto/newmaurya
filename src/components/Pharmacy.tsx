import { useState, useEffect, useMemo } from 'react';
import { 
  Pill, 
  Search, 
  Plus, 
  AlertTriangle, 
  Package, 
  History, 
  ArrowRight,
  ShoppingCart,
  Calendar,
  CreditCard,
  Download,
  Printer,
  Trash2,
  Edit,
  Loader2,
  Settings,
  RotateCcw,
  Undo2,
  User,
  FileText,
  CheckCircle2,
  Receipt,
  X
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
import { Separator } from '@/components/ui/separator';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDate } from '@/lib/utils';
import { printHtmlWithPreview } from '@/components/PrintPreviewModal';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { canUserModifyRecord, normalizeRole } from '@/utils/rbac';
import { toast } from 'sonner';
import { ConfirmDialog } from './ConfirmDialog';
import { Link, useSearchParams } from 'react-router-dom';
import { generatePharmacyInvoiceHtml, generatePharmacyReturnReceiptHtml, DEFAULT_PHARMACY_SETTINGS } from '@/lib/pharmacyInvoicePrint';

export default function Pharmacy() {
  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const isAccountant = normalizeRole(currentUser?.role) === 'ACCOUNTANT';

  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || (isAccountant ? 'billing' : 'inventory');
  const [activeTab, setActiveTab] = useState(initialTab);

  const [inventory, setInventory] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [returnRecords, setReturnRecords] = useState<any[]>(() => {
    return storage.get(STORAGE_KEYS.PHARMACY_RETURNS, []);
  });

  const [loading, setLoading] = useState(true);
  const templateImage = storage.get(STORAGE_KEYS.TEMPLATE_IMAGE, null);

  const [pharmacySettings, setPharmacySettings] = useState<any>(() => {
    return storage.get('hms_pharmacy_settings', DEFAULT_PHARMACY_SETTINGS);
  });

  const [editingBillInner, setEditingBillInner] = useState<any | null>(null);
  const [isEditBillOpen, setIsEditBillOpen] = useState(false);
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

  // --- Return Medicine States ---
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnPatientType, setReturnPatientType] = useState<'OPD' | 'IPD' | 'Walk-in'>('OPD');
  const [returnPatientSearch, setReturnPatientSearch] = useState('');
  const [selectedReturnPatient, setSelectedReturnPatient] = useState<any | null>(null);
  const [selectedReturnBill, setSelectedReturnBill] = useState<any | null>(null);
  const [returnCart, setReturnCart] = useState<Array<{
    id: string;
    itemId?: string;
    name: string;
    quantity: number;
    maxQuantity?: number;
    price: number;
    isLoose?: boolean;
    unitType?: string;
    reason: string;
  }>>([]);
  const [restockInventory, setRestockInventory] = useState(true);
  const [refundMode, setRefundMode] = useState('Cash Refund');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnSearchQuery, setReturnSearchQuery] = useState('');

  // Manual return medicine state
  const [manualMedicineId, setManualMedicineId] = useState('');
  const [manualReturnQty, setManualReturnQty] = useState(1);
  const [manualReturnUnit, setManualReturnUnit] = useState<'strip' | 'loose'>('strip');
  const [manualReturnPrice, setManualReturnPrice] = useState<number | ''>('');
  const [manualReturnReason, setManualReturnReason] = useState('Discontinued by Doctor');

  const handleSaveEditBillInner = async () => {
    if (!editingBillInner) return;
    
    const updatedBill = {
      ...editingBillInner,
      is_edited: true,
      tpa_approval_status: 'Edited',
      total_amount: Number(editingBillInner.totalAmount) || Number(editingBillInner.total_amount),
      paid_amount: Number(editingBillInner.paidAmount) || Number(editingBillInner.paid_amount) || Number(editingBillInner.totalAmount) || Number(editingBillInner.total_amount),
    };

    try {
      const dbRes = await supabaseService.updateInvoice(
        editingBillInner.id,
        updatedBill,
        editingBillInner.invoice_items || []
      );
      
      const sessionBills = storage.get(STORAGE_KEYS.BILLING, []);
      const index = sessionBills.findIndex((b: any) => b.id === editingBillInner.id);
      if (index !== -1) {
        sessionBills[index] = {
          ...sessionBills[index],
          ...updatedBill,
          patient_name: editingBillInner.patient_name || editingBillInner.patient_name,
          patient_phone: editingBillInner.patient_phone || editingBillInner.patient_phone,
          prescribing_doctor: editingBillInner.prescribing_doctor || editingBillInner.prescribing_doctor,
          totalAmount: Number(editingBillInner.totalAmount),
          total_amount: Number(editingBillInner.totalAmount),
          paid_amount: Number(editingBillInner.totalAmount),
          is_edited: true
        };
        storage.set(STORAGE_KEYS.BILLING, sessionBills);
      }
      
      toast.success('Pharmacy billing invoice updated successfully & marked as Edited!');
      setIsEditBillOpen(false);
      setEditingBillInner(null);
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to update billing invoice');
    }
  };

  const fetchData = async () => {
    if (inventory.length === 0) {
      setLoading(true);
    }
    const [invData, invoicesData, patientsData, admissionsData, dbSettings] = await Promise.all([
      supabaseService.getPharmacyItems(),
      supabaseService.getInvoices(),
      supabaseService.getPatients(),
      supabaseService.getAdmissions ? supabaseService.getAdmissions() : Promise.resolve([]),
      supabaseService.getPharmacySettings ? supabaseService.getPharmacySettings() : Promise.resolve(null)
    ]);

    if (invData) setInventory(invData);
    if (invoicesData) setBills(invoicesData.filter(inv => inv.type === 'Pharmacy' || inv.invoice_items?.some((item: any) => item.category === 'PHARMACY')));
    if (patientsData) setPatients(patientsData);
    if (admissionsData) setAdmissions(admissionsData);
    if (dbSettings) {
      setPharmacySettings(dbSettings);
      const currentSettings = storage.get('hms_pharmacy_settings', null);
      if (JSON.stringify(currentSettings) !== JSON.stringify(dbSettings)) {
        storage.set('hms_pharmacy_settings', dbSettings);
      }
    }
    setLoading(false);
  };

  useDataSync(fetchData);

  // --- Return Medicine Helpers ---
  const filteredPatientsForReturn = useMemo(() => {
    const query = returnPatientSearch.trim().toLowerCase();
    
    if (returnPatientType === 'IPD') {
      return admissions
        .filter(adm => {
          if (!query) return true;
          const nameMatch = (adm.patient_name || '').toLowerCase().includes(query);
          const mrnMatch = (adm.mrn || '').toLowerCase().includes(query);
          const ipdMatch = (adm.ipd_number || '').toLowerCase().includes(query);
          const bedMatch = (adm.bed_number || '').toLowerCase().includes(query);
          return nameMatch || mrnMatch || ipdMatch || bedMatch;
        })
        .map(adm => ({
          id: adm.patient_id || adm.id,
          name: adm.patient_name,
          mrn: adm.mrn,
          phone: adm.patient_phone || adm.phone || '',
          patientType: 'IPD',
          ipdNo: adm.ipd_number,
          bedNo: adm.bed_number,
          doctorName: adm.attending_doctor_name || adm.doctor_name
        }));
    } else if (returnPatientType === 'OPD') {
      return patients
        .filter(p => {
          if (!query) return true;
          const nameMatch = (p.name || '').toLowerCase().includes(query);
          const mrnMatch = (p.mrn || '').toLowerCase().includes(query);
          const phoneMatch = (p.phone || p.mobile || '').toLowerCase().includes(query);
          return nameMatch || mrnMatch || phoneMatch;
        })
        .slice(0, 15)
        .map(p => ({
          id: p.id,
          name: p.name,
          mrn: p.mrn,
          phone: p.phone || p.mobile || '',
          patientType: 'OPD'
        }));
    }
    return [];
  }, [returnPatientType, returnPatientSearch, patients, admissions]);

  const sequencedBills = useMemo(() => {
    // Sort all bills by date ascending to assign stable chronological sequence numbers
    const chronologicalBills = [...bills].sort((a, b) => {
      const dateA = new Date(a.created_at || a.date || 0).getTime();
      const dateB = new Date(b.created_at || b.date || 0).getTime();
      return dateA - dateB;
    });

    // Create a map from bill.id to sequence number
    const sequenceMap = new Map<string, string>();
    chronologicalBills.forEach((bill, index) => {
      const seqNum = `PHA-${String(1001 + index).padStart(4, '0')}`;
      sequenceMap.set(bill.id, seqNum);
    });

    // Return bills mapped with sequenceNumber
    return bills.map(bill => ({
      ...bill,
      sequenceNumber: sequenceMap.get(bill.id) || `PHA-${bill.id.slice(0, 8).toUpperCase()}`
    }));
  }, [bills]);

  const patientBillsForReturn = useMemo(() => {
    if (!selectedReturnPatient) return [];
    return sequencedBills.filter(bill => {
      const matchId = bill.patient_id && bill.patient_id === selectedReturnPatient.id;
      const matchName = bill.patient_name && bill.patient_name.toLowerCase() === selectedReturnPatient.name?.toLowerCase();
      const matchMrn = bill.mrn && bill.mrn.toLowerCase() === selectedReturnPatient.mrn?.toLowerCase();
      return matchId || matchName || matchMrn;
    });
  }, [selectedReturnPatient, sequencedBills]);

  const totalReturnRefundAmount = useMemo(() => {
    return returnCart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  }, [returnCart]);

  const handleSelectReturnPatient = (patient: any) => {
    setSelectedReturnPatient(patient);
    setSelectedReturnBill(null);
    setReturnCart([]);
    if (patient.patientType === 'IPD') {
      setRefundMode('Adjusted in IPD Bill');
    } else {
      setRefundMode('Cash Refund');
    }
  };

  const handleSelectReturnBill = (bill: any) => {
    setSelectedReturnBill(bill);
    const items = bill.invoice_items || bill.items || [];
    if (items.length > 0) {
      const initialCart = items.map((item: any, idx: number) => ({
        id: `ret-${idx}-${Date.now()}`,
        itemId: item.item_id || item.medicine_id || item.id,
        name: item.item_name || item.name || 'Medicine Item',
        quantity: item.quantity || 1,
        maxQuantity: item.quantity || 1,
        price: Number(item.unit_price || item.price || item.rate || 0),
        isLoose: !!item.isLoose,
        unitType: item.unitType || (item.isLoose ? 'Tablet(s)' : 'Strip/Unit'),
        reason: 'Discontinued by Doctor'
      }));
      setReturnCart(initialCart);
    }
  };

  const handleAddManualReturnItem = () => {
    const invItem = inventory.find(i => i.id === manualMedicineId);
    if (!invItem) {
      toast.error('Please select a medicine from inventory');
      return;
    }
    const isLoose = manualReturnUnit === 'loose';
    const unitPrice = manualReturnPrice !== '' 
      ? Number(manualReturnPrice) 
      : (isLoose 
          ? Math.round((invItem.mrp || invItem.price || 0) / (invItem.units_per_strip || 10)) 
          : (invItem.mrp || invItem.price || 0));

    setReturnCart(prev => [...prev, {
      id: `ret-item-${Date.now()}-${Math.random()}`,
      itemId: invItem.id,
      name: invItem.name,
      quantity: Number(manualReturnQty) || 1,
      maxQuantity: 999,
      price: unitPrice,
      isLoose,
      unitType: isLoose ? 'Tablet(s)' : (invItem.unit || 'Strip'),
      reason: manualReturnReason || 'Excess / Unused Medicine'
    }]);

    setManualMedicineId('');
    setManualReturnQty(1);
    setManualReturnPrice('');
    toast.success(`Added ${invItem.name} to return list`);
  };

  const handleProcessReturnSubmit = async () => {
    if (returnCart.length === 0) {
      toast.error('Please add at least one medicine item to return');
      return;
    }

    const patientName = selectedReturnPatient?.name || (returnPatientType === 'Walk-in' ? 'Walk-in Customer' : 'Unknown Patient');
    const mrn = selectedReturnPatient?.mrn || 'N/A';
    const returnNo = `RET-${String(1001 + returnRecords.length).padStart(4, '0')}`;
    const timestamp = new Date().toISOString();

    const record = {
      id: `ret-${Date.now()}`,
      returnNo,
      date: timestamp,
      patientId: selectedReturnPatient?.id || null,
      patientName,
      patientPhone: selectedReturnPatient?.phone || '',
      mrn,
      patientType: returnPatientType,
      ipdNo: selectedReturnPatient?.ipdNo || '',
      bedNo: selectedReturnPatient?.bedNo || '',
      originalBillNo: selectedReturnBill?.sequenceNumber || selectedReturnBill?.id || '',
      prescribingDoctor: selectedReturnBill?.prescribing_doctor || selectedReturnPatient?.doctorName || '',
      items: returnCart.map(c => ({
        name: c.name,
        quantity: c.quantity,
        isLoose: c.isLoose,
        unitType: c.unitType,
        price: c.price,
        total: c.quantity * c.price,
        reason: c.reason
      })),
      totalRefundAmount: totalReturnRefundAmount,
      refundMode,
      notes: returnNotes,
      restocked: restockInventory,
      performedBy: currentUser?.name || 'Pharmacist'
    };

    // 1. Re-stock Inventory if enabled
    if (restockInventory) {
      for (const item of returnCart) {
        const invItem = inventory.find(i => i.id === item.itemId || i.name.toLowerCase() === item.name.toLowerCase());
        if (invItem) {
          const unitsPerStrip = invItem.units_per_strip || 10;
          let updatePayload: any = {};

          if (item.isLoose) {
            const currentTotalUnits = (invItem.stock * unitsPerStrip) + (invItem.loose_stock || 0);
            const newTotalUnits = currentTotalUnits + item.quantity;
            updatePayload = {
              stock: Math.floor(newTotalUnits / unitsPerStrip),
              loose_stock: newTotalUnits % unitsPerStrip,
              updated_at: timestamp
            };
          } else {
            updatePayload = {
              stock: invItem.stock + item.quantity,
              updated_at: timestamp
            };
          }

          await supabaseService.updatePharmacyItem(invItem.id, updatePayload);

          await supabaseService.logInventoryTransaction({
            item_id: invItem.id,
            transaction_type: 'RETURN',
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.quantity * item.price,
            reference_id: returnNo,
            performed_by: currentUser?.id,
            notes: `Returned by ${patientName} (${returnPatientType}) - ${item.reason}`
          });
        }
      }
    }

    // 2. Post credit invoice entry if IPD Patient and Adjusted in IPD Bill
    if (returnPatientType === 'IPD' && refundMode === 'Adjusted in IPD Bill' && selectedReturnPatient) {
      try {
        const creditInvoice = {
          patient_id: selectedReturnPatient.id,
          patient_name: patientName,
          patient_phone: selectedReturnPatient.phone || '',
          total_amount: -totalReturnRefundAmount,
          paid_amount: 0,
          discount_amount: 0,
          payment_status: 'Credit Applied',
          payment_method: 'IPD Bill Adjustment',
          status: 'Settled',
          type: 'Pharmacy Return',
          invoice_type: 'IPD',
          date: timestamp,
          notes: `Medicine Return Voucher #${returnNo}`
        };

        await supabaseService.createInvoice(creditInvoice, returnCart.map(c => ({
          item_name: `[RETURN CREDIT] ${c.name}`,
          quantity: -c.quantity,
          unit_price: c.price,
          total_price: -(c.quantity * c.price),
          category: 'PHARMACY_RETURN'
        })));
      } catch (err) {
        console.error('Error posting IPD return credit invoice:', err);
      }
    }

    // 3. Save to Storage
    const updatedReturns = [record, ...returnRecords];
    setReturnRecords(updatedReturns);
    storage.set(STORAGE_KEYS.PHARMACY_RETURNS, updatedReturns);

    toast.success(`Medicine Return ${returnNo} processed successfully!`);
    setIsReturnModalOpen(false);

    // Reset Form
    setReturnCart([]);
    setSelectedReturnPatient(null);
    setSelectedReturnBill(null);
    setReturnNotes('');

    fetchData();

    // Print Receipt
    const voucherHtml = generatePharmacyReturnReceiptHtml(record, pharmacySettings);
    printHtmlWithPreview(voucherHtml, `Medicine Return Voucher - ${returnNo}`);
  };

  const handlePrintReturnRecord = (record: any) => {
    const voucherHtml = generatePharmacyReturnReceiptHtml(record, pharmacySettings);
    printHtmlWithPreview(voucherHtml, `Medicine Return Voucher - ${record.returnNo}`);
  };

  const filteredReturnRecords = useMemo(() => {
    if (!returnSearchQuery.trim()) return returnRecords;
    const q = returnSearchQuery.toLowerCase();
    return returnRecords.filter(r => 
      (r.returnNo || '').toLowerCase().includes(q) ||
      (r.patientName || '').toLowerCase().includes(q) ||
      (r.mrn || '').toLowerCase().includes(q) ||
      (r.ipdNo || '').toLowerCase().includes(q)
    );
  }, [returnRecords, returnSearchQuery]);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [inventory, searchQuery]);

  const [billingSearchQuery, setBillingSearchQuery] = useState('');
  const [billingStartDate, setBillingStartDate] = useState('');
  const [billingEndDate, setBillingEndDate] = useState('');
  const [billingPaymentFilter, setBillingPaymentFilter] = useState('ALL');

  const filteredBills = useMemo(() => {
    let result = sequencedBills;
    if (billingSearchQuery.trim()) {
      const q = billingSearchQuery.toLowerCase();
      result = result.filter(bill => {
        const patient = patients.find(p => p.id === bill.patient_id);
        const name = (bill.patient_name || patient?.name || 'Walk-in Customer').toLowerCase();
        const mrn = (patient?.mrn || '').toLowerCase();
        const seqNum = (bill.sequenceNumber || '').toLowerCase();
        return name.includes(q) || mrn.includes(q) || seqNum.includes(q) || bill.id.toLowerCase().includes(q);
      });
    }

    if (billingStartDate) {
      const start = new Date(billingStartDate + 'T00:00:00').getTime();
      result = result.filter(bill => {
        const bTime = new Date(bill.created_at || bill.date || 0).getTime();
        return bTime >= start;
      });
    }

    if (billingEndDate) {
      const end = new Date(billingEndDate + 'T23:59:59').getTime();
      result = result.filter(bill => {
        const bTime = new Date(bill.created_at || bill.date || 0).getTime();
        return bTime <= end;
      });
    }

    if (billingPaymentFilter && billingPaymentFilter !== 'ALL') {
      result = result.filter(bill => {
        const pm = (bill.payment_method || bill.paymentMethod || '').toLowerCase();
        return pm.includes(billingPaymentFilter.toLowerCase());
      });
    }

    return result;
  }, [sequencedBills, billingSearchQuery, billingStartDate, billingEndDate, billingPaymentFilter, patients]);

  const filteredBillsTotalAmount = useMemo(() => {
    return filteredBills.reduce((sum, b) => sum + (Number(b.payable_amount ?? b.payableAmount ?? b.total_amount ?? b.totalAmount) || 0), 0);
  }, [filteredBills]);

  // Purchase Return States
  const [purchaseReturns, setPurchaseReturns] = useState<any[]>(() => {
    return storage.get(STORAGE_KEYS.PHARMACY_PURCHASE_RETURNS, []);
  });
  const [isPurchaseReturnModalOpen, setIsPurchaseReturnModalOpen] = useState(false);
  const [purchaseReturnVendor, setPurchaseReturnVendor] = useState('');
  const [purchaseReturnMedicineId, setPurchaseReturnMedicineId] = useState('');
  const [purchaseReturnQty, setPurchaseReturnQty] = useState(1);
  const [purchaseReturnReason, setPurchaseReturnReason] = useState('Near Expiry');
  const [purchaseReturnRefNo, setPurchaseReturnRefNo] = useState('');

  const [newItem, setNewItem] = useState({ 
    name: '', 
    category: 'Medicine', 
    stock: 0, 
    unit: 'Tablets', 
    min_stock_level: 10,
    mrp: 0,
    selling_price: 0,
    purchase_price: 0,
    tax_percentage: 12,
    hsn_code: '',
    rack_number: '',
    batch_number: '',
    expiry_date: '',
    mfg_date: '',
    vendor_name: '',
    vendor_phone: '',
    purchase_date: '',
    purchase_bill_no: '',
    composition: '',
    is_loose_sale_enabled: false,
    units_per_strip: 10,
    loose_selling_price: 0,
    loose_stock: 0,
  });
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const handleAddItem = async () => {
    if (!newItem.name) {
      toast.error('Please enter item name');
      return;
    }
    const itemToAdd = {
      name: newItem.name,
      category: newItem.category,
      unit: newItem.unit,
      hsn_code: newItem.hsn_code,
      rack_number: newItem.rack_number,
      batch_number: newItem.batch_number,
      expiry_date: newItem.expiry_date || null,
      mfg_date: newItem.mfg_date || null,
      vendor_name: newItem.vendor_name || '',
      vendor_phone: newItem.vendor_phone || '',
      purchase_date: newItem.purchase_date || null,
      purchase_bill_no: newItem.purchase_bill_no || '',
      stock: Number(newItem.stock),
      mrp: Number(newItem.mrp),
      selling_price: Number(newItem.selling_price),
      purchase_price: Number(newItem.purchase_price),
      tax_percentage: Number(newItem.tax_percentage),
      min_stock_level: Number(newItem.min_stock_level),
      composition: newItem.composition,
      is_loose_sale_enabled: newItem.is_loose_sale_enabled,
      units_per_strip: Number(newItem.units_per_strip || 10),
      loose_selling_price: Number(newItem.loose_selling_price || 0),
      loose_stock: Number(newItem.loose_stock || 0)
    };
    
    const result = await supabaseService.createPharmacyItem(itemToAdd);
    if (result) {
      toast.success('New item added to inventory');
      fetchData();
      setNewItem({ 
        name: '', 
        category: 'Medicine', 
        stock: 0, 
        unit: 'Tablets', 
        min_stock_level: 10,
        mrp: 0,
        selling_price: 0,
        purchase_price: 0,
        tax_percentage: 12,
        hsn_code: '',
        rack_number: '',
        batch_number: '',
        expiry_date: '',
        mfg_date: '',
        vendor_name: '',
        vendor_phone: '',
        purchase_date: '',
        purchase_bill_no: '',
        composition: '',
        is_loose_sale_enabled: false,
        units_per_strip: 10,
        loose_selling_price: 0,
        loose_stock: 0,
      });
    } else {
      toast.error('Failed to add item');
    }
  };

  const handleProcessPurchaseReturn = async () => {
    const invItem = inventory.find(i => i.id === purchaseReturnMedicineId);
    if (!invItem) {
      toast.error('Please select a medicine item to return');
      return;
    }
    if (!purchaseReturnVendor.trim()) {
      toast.error('Please enter vendor name');
      return;
    }
    if (purchaseReturnQty <= 0) {
      toast.error('Please enter a valid return quantity');
      return;
    }

    const returnNo = `PRET-${String(1001 + purchaseReturns.length).padStart(4, '0')}`;
    const timestamp = new Date().toISOString();
    const purchasePrice = invItem.purchase_price || (invItem.selling_price ? invItem.selling_price * 0.8 : 0);
    const totalAmount = purchaseReturnQty * purchasePrice;

    const record = {
      id: `pret-${Date.now()}`,
      returnNo,
      date: timestamp,
      vendorName: purchaseReturnVendor.trim(),
      purchaseBillNo: purchaseReturnRefNo.trim() || 'N/A',
      itemId: invItem.id,
      itemName: invItem.name,
      batchNo: invItem.batch_number || 'N/A',
      quantity: purchaseReturnQty,
      purchasePrice,
      totalAmount,
      reason: purchaseReturnReason,
      performedBy: currentUser?.name || 'Pharmacist'
    };

    // Deduct stock from inventory
    const newStock = Math.max(0, invItem.stock - purchaseReturnQty);
    await supabaseService.updatePharmacyItem(invItem.id, {
      stock: newStock,
      updated_at: timestamp
    });

    // Save purchase return record
    const updated = [record, ...purchaseReturns];
    setPurchaseReturns(updated);
    storage.set(STORAGE_KEYS.PHARMACY_PURCHASE_RETURNS, updated);

    toast.success(`Purchase Return ${returnNo} processed & ${purchaseReturnQty} units deducted from stock!`);
    setIsPurchaseReturnModalOpen(false);
    setPurchaseReturnVendor('');
    setPurchaseReturnMedicineId('');
    setPurchaseReturnQty(1);
    setPurchaseReturnRefNo('');
    fetchData();
  };

  const handleDeleteItem = (id: string) => {
    const item = inventory.find(i => i.id === id);
    if (item && !canUserModifyRecord(item, currentUser)) {
      toast.error("Access Denied: This inventory item was created by an Admin and cannot be deleted by non-admin users.");
      return;
    }
    setDeleteConfirm({
      isOpen: true,
      title: "Remove Inventory Item",
      description: `Are you sure you want to delete ${item?.name || 'this item'} from pharmacy inventory? This action cannot be undone.`,
      onConfirm: async () => {
        const success = await supabaseService.deletePharmacyItem(id);
        if (success) {
          setInventory(inventory.filter(item => item.id !== id));
          toast.success('Item removed from inventory');
        } else {
          toast.error('Failed to delete item');
        }
      }
    });
  };

  const printPharmacyInvoice = (bill: any) => {
    const patient = patients.find(p => p.id === bill.patient_id);
    const patientDetails = {
      name: bill.patientName || bill.patient_name || patient?.name || 'Walk-in Customer',
      phone: bill.patientPhone || bill.patient_phone || patient?.phone || 'N/A',
      address: patient?.address || 'N/A',
      gstin: patient?.gst_no || 'N/A'
    };

    const invoiceHtml = generatePharmacyInvoiceHtml(
      { ...bill, invoiceId: bill.sequenceNumber || bill.id },
      inventory,
      patientDetails,
      pharmacySettings
    );
    printHtmlWithPreview(invoiceHtml, `Pharmacy Bill - ${bill.sequenceNumber || bill.id}`);
  };

  const handleExportInventory = () => {
    const headers = ['Name', 'Category', 'Stock', 'Unit', 'Min Level', 'Expiry Date'];
    const rows = inventory.map((item: any) => [
      item.name,
      item.category,
      item.stock,
      item.unit,
      item.min_stock_level,
      item.expiry_date || 'N/A'
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'pharmacy_inventory.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Inventory exported as CSV');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-2 font-medium">Loading Pharmacy...</span>
      </div>
    );
  }

  const lowStockCount = inventory.filter(i => i.stock < (i.min_stock_level || 10)).length;
  const expiringSoonCount = inventory.filter(i => {
    if (!i.expiry_date) return false;
    const expiry = new Date(i.expiry_date);
    const today = new Date();
    const monthsDiff = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsDiff >= 0 && monthsDiff < 3;
  }).length;
  const totalInvValue = inventory.reduce((acc, i) => acc + (i.stock * (i.purchase_price || 0)), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Dynamic, Vibrant, Richly Colored Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 text-white p-6 sm:p-8 shadow-xl shadow-orange-100 animate-in fade-in duration-500">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-rose-400/20 blur-3xl pointer-events-none"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest bg-white/20 text-white px-3 py-1 rounded-full uppercase my-1 select-none w-fit">
              ★ PHARMACY DEPOT ONLINE
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
              Pharmacy & Inventory
            </h1>
            <p className="text-orange-50 text-sm font-medium max-w-xl">
              Real-time stock level analysis, drug formulation indices, expiry tracking alerts, and loose tablet POS sales tracking.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-inner">
            <Link to="/pharmacy/pos">
              <Button className="bg-white text-orange-950 hover:bg-orange-50 gap-2 rounded-xl font-black h-10 shadow-md">
                <ShoppingCart className="w-4 h-4 text-orange-600" />
                POS Sell Terminal
              </Button>
            </Link>
            <Button 
              className="gap-2 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-bold h-10 shadow-md border border-rose-400/30"
              onClick={() => {
                setActiveTab('returns');
                setIsReturnModalOpen(true);
              }}
            >
              <RotateCcw className="w-4 h-4" />
              Return Medicine (OPD/IPD)
            </Button>
            <Button variant="outline" className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white hover:text-orange-900 rounded-xl font-bold h-10" onClick={handleExportInventory}>
              <Download className="w-4 h-4" />
              Export Stock
            </Button>
            {!isAccountant && (
              <Button 
                variant="outline" 
                className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white hover:text-orange-900 rounded-xl font-bold h-10" 
                onClick={() => setIsPurchaseOpen(true)}
              >
                <History className="w-4 h-4" />
                Purchase Stock
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
        <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Purchase New Stock</DialogTitle>
                <DialogDescription>Record a new purchase from a supplier.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="space-y-2">
                  <Label>Medicine / Item</Label>
                  <Select 
                    onValueChange={(val) => {
                      const item = inventory.find(i => i.id === val);
                      if (item) {
                        setEditingItem(item);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventory.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {editingItem && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity to Add</Label>
                        <Input 
                          type="number" 
                          id="purchase-qty"
                          placeholder="0" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>New Purchase Price (₹)</Label>
                        <Input 
                          type="number" 
                          id="purchase-price"
                          defaultValue={editingItem.purchase_price}
                          placeholder="0.00" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>New MRP (₹)</Label>
                        <Input 
                          type="number" 
                          id="purchase-mrp"
                          defaultValue={editingItem.mrp}
                          placeholder="0.00" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>New Selling Price (₹)</Label>
                        <Input 
                          type="number" 
                          id="purchase-sp"
                          defaultValue={editingItem.selling_price}
                          placeholder="0.00" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Batch Number</Label>
                      <Input id="purchase-batch" placeholder="Enter batch number" defaultValue={editingItem.batch_number} />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input type="date" id="purchase-expiry" defaultValue={editingItem.expiry_date} />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Supplier Name</Label>
                  <Input placeholder="Enter supplier name" id="purchase-supplier" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsPurchaseOpen(false);
                  setEditingItem(null);
                }}>Cancel</Button>
                <Button className="bg-medical-blue" onClick={async () => {
                  if (!editingItem) {
                    toast.error('Please select an item');
                    return;
                  }
                  
                  const qtyToAdd = Number((document.getElementById('purchase-qty') as HTMLInputElement)?.value || 0);
                  const newPP = Number((document.getElementById('purchase-price') as HTMLInputElement)?.value || editingItem.purchase_price);
                  const newMRP = Number((document.getElementById('purchase-mrp') as HTMLInputElement)?.value || editingItem.mrp);
                  const newSP = Number((document.getElementById('purchase-sp') as HTMLInputElement)?.value || editingItem.selling_price);
                  const newBatch = (document.getElementById('purchase-batch') as HTMLInputElement)?.value || editingItem.batch_number;
                  const newExpiry = (document.getElementById('purchase-expiry') as HTMLInputElement)?.value || editingItem.expiry_date;
                  const supplier = (document.getElementById('purchase-supplier') as HTMLInputElement)?.value || 'N/A';

                  const updates = {
                    stock: editingItem.stock + qtyToAdd,
                    purchase_price: newPP,
                    mrp: newMRP,
                    selling_price: newSP,
                    batch_number: newBatch,
                    expiry_date: newExpiry,
                    updated_at: new Date().toISOString()
                  };

                  const result = await supabaseService.updatePharmacyItem(editingItem.id, updates);
                  
                  if (result) {
                    // Log the transaction
                    await supabaseService.logInventoryTransaction({
                      item_id: editingItem.id,
                      transaction_type: 'PURCHASE',
                      quantity: qtyToAdd,
                      unit_price: newPP,
                      total_price: qtyToAdd * newPP,
                      reference_id: `SUP-${supplier}`,
                      performed_by: currentUser?.id
                    });

                    toast.success('Stock purchase recorded and inventory updated');
                    fetchData();
                    setIsPurchaseOpen(false);
                    setEditingItem(null);
                  } else {
                    toast.error('Failed to update stock');
                  }
                }}>Record Purchase</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
            {!isAccountant && (
              <DialogTrigger asChild>
                <Button className="bg-medical-blue gap-2">
                  <Plus className="w-4 h-4" />
                  Add New Stock
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Medicine/Item</DialogTitle>
                <DialogDescription>Add a new item to the pharmacy inventory.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Item Name</Label>
                    <Input 
                      placeholder="e.g. Ibuprofen 400mg" 
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={newItem.category}
                      onValueChange={(v) => setNewItem({...newItem, category: v as any})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Medicine">Medicine</SelectItem>
                        <SelectItem value="Surgical">Surgical</SelectItem>
                        <SelectItem value="Consumable">Consumable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input 
                      placeholder="e.g. Tablets, Bottles" 
                      value={newItem.unit}
                      onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Initial Stock</Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={newItem.stock}
                      onChange={(e) => setNewItem({...newItem, stock: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Stock Level</Label>
                    <Input 
                      type="number" 
                      placeholder="10" 
                      value={newItem.min_stock_level}
                      onChange={(e) => setNewItem({...newItem, min_stock_level: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rack No.</Label>
                    <Input 
                      placeholder="A-1" 
                      value={newItem.rack_number}
                      onChange={(e) => setNewItem({...newItem, rack_number: e.target.value})}
                    />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Purchase Price (₹)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={newItem.purchase_price}
                      onChange={(e) => setNewItem({...newItem, purchase_price: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>MRP (₹)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={newItem.mrp}
                      onChange={(e) => setNewItem({...newItem, mrp: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Selling Price (₹)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={newItem.selling_price}
                      onChange={(e) => setNewItem({...newItem, selling_price: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Percentage (%)</Label>
                    <Select 
                      value={newItem.tax_percentage.toString()}
                      onValueChange={(v) => setNewItem({...newItem, tax_percentage: Number(v)})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Tax" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const activeSlabs = storage.get(STORAGE_KEYS.TAX_SLABS, [
                            { id: 'tax-ex', name: 'GST Zero (Exempt)', rate: 0, type: 'GST', isActive: true },
                            { id: 'tax-5', name: 'GST 5%', rate: 5, type: 'GST', isActive: true },
                            { id: 'tax-12', name: 'GST 12%', rate: 12, type: 'GST', isActive: true },
                            { id: 'tax-18', name: 'GST 18%', rate: 18, type: 'GST', isActive: true },
                            { id: 'tax-28', name: 'GST 28%', rate: 28, type: 'GST', isActive: true }
                          ]).filter((s: any) => s.isActive);
                          
                          return activeSlabs.map((s: any) => (
                            <SelectItem key={s.id} value={s.rate.toString()}>
                              {s.name} ({s.rate}%)
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>HSN Code</Label>
                    <Input 
                      placeholder="HSN" 
                      value={newItem.hsn_code}
                      onChange={(e) => setNewItem({...newItem, hsn_code: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Batch Number</Label>
                    <Input 
                      placeholder="Batch" 
                      value={newItem.batch_number}
                      onChange={(e) => setNewItem({...newItem, batch_number: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mfg Date</Label>
                    <Input 
                      type="date" 
                      value={newItem.mfg_date}
                      onChange={(e) => setNewItem({...newItem, mfg_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input 
                      type="date" 
                      value={newItem.expiry_date}
                      onChange={(e) => setNewItem({...newItem, expiry_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-dashed">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vendor & Purchase Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vendor / Supplier Name</Label>
                      <Input 
                        placeholder="e.g. Global Medical Agencies" 
                        value={newItem.vendor_name}
                        onChange={(e) => setNewItem({...newItem, vendor_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vendor Contact</Label>
                      <Input 
                        placeholder="e.g. +91 9876543210" 
                        value={newItem.vendor_phone}
                        onChange={(e) => setNewItem({...newItem, vendor_phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Purchase Date</Label>
                      <Input 
                        type="date" 
                        value={newItem.purchase_date}
                        onChange={(e) => setNewItem({...newItem, purchase_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Purchase Invoice / Bill No.</Label>
                      <Input 
                        placeholder="e.g. INV-8890" 
                        value={newItem.purchase_bill_no}
                        onChange={(e) => setNewItem({...newItem, purchase_bill_no: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-dashed col-span-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Salt Composition & Loose Sale Setup</h4>
                  <div className="space-y-2">
                    <Label>Chemical Composition / Salt Formula</Label>
                    <Input 
                      placeholder="e.g. Amoxicillin + Clavulanic Acid" 
                      value={newItem.composition}
                      onChange={(e) => setNewItem({...newItem, composition: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50/50 border border-orange-100 mt-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-slate-800 cursor-pointer" htmlFor="loose-sale-checkbox">Enable Loose Sale</Label>
                      <p className="text-[10px] text-muted-foreground">Allows selling pills or capsules individually</p>
                    </div>
                    <input 
                      id="loose-sale-checkbox"
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      checked={newItem.is_loose_sale_enabled}
                      onChange={(e) => setNewItem({...newItem, is_loose_sale_enabled: e.target.checked})}
                    />
                  </div>

                  {newItem.is_loose_sale_enabled && (
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">Units per Strip</Label>
                        <Input 
                          type="number" 
                          placeholder="10" 
                          value={newItem.units_per_strip}
                          onChange={(e) => setNewItem({...newItem, units_per_strip: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">Loose Price (₹)</Label>
                        <Input 
                          type="number" 
                          placeholder="12.00" 
                          value={newItem.loose_selling_price}
                          onChange={(e) => setNewItem({...newItem, loose_selling_price: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">Loose Stock</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={newItem.loose_stock}
                          onChange={(e) => setNewItem({...newItem, loose_stock: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <DialogTrigger asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogTrigger>
                <Button className="bg-medical-blue" onClick={() => {
                  handleAddItem();
                  setIsAddStockOpen(false);
                }}>Add Item</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 p-1 flex flex-wrap gap-1">
          {!isAccountant && <TabsTrigger value="inventory">Inventory</TabsTrigger>}
          <TabsTrigger value="billing">Pharmacy Billing</TabsTrigger>
          <TabsTrigger value="returns" className="flex gap-2 items-center text-rose-700 data-[state=active]:bg-rose-600 data-[state=active]:text-white font-bold">
            <RotateCcw className="w-4 h-4" />
            Return Medicine (OPD/IPD)
          </TabsTrigger>
          {!isAccountant && (
            <TabsTrigger value="purchase_returns" className="flex gap-2 items-center text-amber-800 data-[state=active]:bg-amber-600 data-[state=active]:text-white font-bold">
              <Undo2 className="w-4 h-4" />
              Purchase Return (Vendor)
            </TabsTrigger>
          )}
          {!isAccountant && (
            <TabsTrigger value="settings" className="flex gap-2 items-center">
              <Settings className="w-4 h-4" />
              Pharmacy Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="inventory" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Inventory Items</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <h3 className="text-3xl font-bold">{inventory.length}</h3>
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <Package className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Low Stock Alerts</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <h3 className="text-3xl font-bold text-amber-600">
                  {lowStockCount}
                </h3>
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Expiring Soon (30 Days)</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <h3 className="text-3xl font-bold text-rose-600">{expiringSoonCount}</h3>
                <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
                  <Calendar className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Medicine Inventory</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search medicine..." 
                    className="pl-10 bg-slate-50 border-none h-9" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Link to="/pharmacy/pos">
                  <Button className="bg-teal-accent hover:bg-teal-600 h-9 gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    New Sale (POS)
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="whitespace-nowrap">Medicine Name</TableHead>
                      <TableHead className="whitespace-nowrap">Category</TableHead>
                      <TableHead className="whitespace-nowrap">MRP / Selling</TableHead>
                      <TableHead className="whitespace-nowrap">Stock</TableHead>
                      <TableHead className="whitespace-nowrap">Vendor & Purchase Info</TableHead>
                      <TableHead className="whitespace-nowrap">Expiry Date</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.id} className="border-slate-50">
                        <TableCell className="font-medium whitespace-nowrap">
                          <div>
                            <p>{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">Rack: {item.rack_number || 'N/A'} | Batch: {item.batch_number || 'N/A'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground line-through">MRP: {formatCurrency(item.mrp || 0)}</span>
                            <span className="font-bold text-medical-blue">SP: {formatCurrency(item.selling_price || 0)}</span>
                            <span className="text-[10px] text-emerald-600">Tax: {item.tax_percentage || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold">{item.stock} {item.unit}</span>
                            {item.is_loose_sale_enabled && (
                              <span className="text-[10px] font-semibold text-amber-600">
                                + {item.loose_stock || 0} Loose Units ({ (item.stock * (item.units_per_strip || 10)) + (item.loose_stock || 0) } total)
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">Min Level: {item.min_stock_level || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <div>
                            <p className="font-semibold text-slate-700">{item.vendor_name || 'N/A'}</p>
                            {item.purchase_date && <p className="text-[10px] text-teal-700 font-medium">Purchased: {formatDate(item.purchase_date)}</p>}
                            {item.purchase_bill_no && <p className="text-[9px] text-slate-400">Bill: {item.purchase_bill_no}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {item.expiry_date ? formatDate(item.expiry_date) : 'N/A'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="secondary" className={`border-none ${
                            item.stock > (item.min_stock_level || 0) ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {item.stock > (item.min_stock_level || 0) ? 'In Stock' : 'Low Stock'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Dialog open={editingItem?.id === item.id} onOpenChange={(open) => setEditingItem(open ? item : null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-medical-blue gap-1 h-8">
                                Manage
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Manage Stock: {item.name}</DialogTitle>
                                <DialogDescription>Update stock levels or edit item details.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Current Stock</Label>
                                    <Input 
                                      type="number" 
                                      id={`stock-${item.id}`}
                                      defaultValue={item.stock} 
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Min Stock Level</Label>
                                    <Input 
                                      type="number" 
                                      id={`min-stock-${item.id}`}
                                      defaultValue={item.min_stock_level}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>MRP (₹)</Label>
                                    <Input 
                                      type="number" 
                                      id={`mrp-${item.id}`}
                                      defaultValue={item.mrp}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Selling Price (₹)</Label>
                                    <Input 
                                      type="number" 
                                      id={`selling-price-${item.id}`}
                                      defaultValue={item.selling_price}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Batch Number</Label>
                                    <Input 
                                      id={`batch-${item.id}`}
                                      defaultValue={item.batch_number}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Tax (%)</Label>
                                    <Input 
                                      type="number"
                                      id={`tax-${item.id}`}
                                      defaultValue={item.tax_percentage}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Expiry Date</Label>
                                  <Input 
                                    type="date" 
                                    id={`expiry-${item.id}`}
                                    defaultValue={item.expiry_date} 
                                  />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-dashed col-span-2">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loose Sale Setup</h4>
                                  <div className="space-y-2">
                                    <Label>Composition / Salt Formula</Label>
                                    <Input 
                                      id={`composition-${item.id}`}
                                      defaultValue={item.composition || ''}
                                      placeholder="e.g. Amoxicillin + Clavulanic Acid"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50/50 border border-orange-100 mt-2">
                                    <div className="space-y-0.5">
                                      <Label className="text-sm font-bold text-slate-800 cursor-pointer" htmlFor={`loose-enabled-${item.id}`}>Enable Loose Sale</Label>
                                      <p className="text-[10px] text-muted-foreground">Allows selling pills or capsules individually</p>
                                    </div>
                                    <input 
                                      id={`loose-enabled-${item.id}`}
                                      type="checkbox" 
                                      className="uncontrolled-loose-checkbox w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                                      defaultChecked={item.is_loose_sale_enabled || false}
                                      onChange={(e) => {
                                        const subDiv = document.getElementById(`loose-sub-fields-${item.id}`);
                                        if (subDiv) subDiv.style.display = e.target.checked ? 'grid' : 'none';
                                      }}
                                    />
                                  </div>

                                  <div 
                                    id={`loose-sub-fields-${item.id}`}
                                    className="grid grid-cols-3 gap-3 pt-2"
                                    style={{ display: item.is_loose_sale_enabled ? 'grid' : 'none' }}
                                  >
                                    <div className="space-y-1">
                                      <Label className="text-xs font-semibold">Units/Strip</Label>
                                      <Input 
                                        type="number" 
                                        id={`units-per-strip-${item.id}`}
                                        defaultValue={item.units_per_strip || 10}
                                        placeholder="10"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs font-semibold">Loose Price (₹)</Label>
                                      <Input 
                                        type="number" 
                                        id={`loose-price-${item.id}`}
                                        defaultValue={item.loose_selling_price || 0}
                                        placeholder="12.00"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs font-semibold">Loose Stock</Label>
                                      <Input 
                                        type="number" 
                                        id={`loose-stock-${item.id}`}
                                        defaultValue={item.loose_stock || 0}
                                        placeholder="0"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <DialogFooter className="flex justify-between sm:justify-between">
                                {!isAccountant && (
                                  <Button 
                                    variant="ghost" 
                                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                    onClick={() => {
                                      handleDeleteItem(item.id);
                                      setEditingItem(null);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Item
                                  </Button>
                                )}
                                <div className="flex gap-2">
                                  <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                                {!isAccountant && (
                                  <Button className="bg-medical-blue" onClick={async () => {
                                    const stock = Number((document.getElementById(`stock-${item.id}`) as HTMLInputElement)?.value);
                                    const min_stock_level = Number((document.getElementById(`min-stock-${item.id}`) as HTMLInputElement)?.value);
                                    const mrp = Number((document.getElementById(`mrp-${item.id}`) as HTMLInputElement)?.value);
                                    const selling_price = Number((document.getElementById(`selling-price-${item.id}`) as HTMLInputElement)?.value);
                                    const batch_number = (document.getElementById(`batch-${item.id}`) as HTMLInputElement)?.value;
                                    const tax_percentage = Number((document.getElementById(`tax-${item.id}`) as HTMLInputElement)?.value);
                                    const expiry_date = (document.getElementById(`expiry-${item.id}`) as HTMLInputElement)?.value;
                                    const composition = (document.getElementById(`composition-${item.id}`) as HTMLInputElement)?.value;
                                    const is_loose_sale_enabled = (document.getElementById(`loose-enabled-${item.id}`) as HTMLInputElement)?.checked;
                                    const units_per_strip = Number((document.getElementById(`units-per-strip-${item.id}`) as HTMLInputElement)?.value || 10);
                                    const loose_selling_price = Number((document.getElementById(`loose-price-${item.id}`) as HTMLInputElement)?.value || 0);
                                    const loose_stock = Number((document.getElementById(`loose-stock-${item.id}`) as HTMLInputElement)?.value || 0);

                                    const updates = {
                                      stock,
                                      min_stock_level,
                                      mrp,
                                      selling_price,
                                      batch_number,
                                      tax_percentage,
                                      expiry_date,
                                      composition,
                                      is_loose_sale_enabled,
                                      units_per_strip,
                                      loose_selling_price,
                                      loose_stock
                                    };

                                    const result = await supabaseService.updatePharmacyItem(item.id, updates);
                                    if (result) {
                                      toast.success('Stock updated successfully');
                                      fetchData();
                                      setEditingItem(null);
                                    } else {
                                      toast.error('Failed to update stock');
                                    }
                                  }}>Update Stock</Button>
                                )}
                                </div>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6 space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-black text-slate-800">Pharmacy Billing History</CardTitle>
                  <CardDescription className="text-xs">View and manage pharmacy sales, filter by date range and payment mode.</CardDescription>
                </div>

                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">Total Billed Amount</span>
                    <span className="text-xl font-black text-emerald-700 leading-none">{formatCurrency(filteredBillsTotalAmount)}</span>
                  </div>
                  <Badge variant="outline" className="bg-white text-emerald-800 border-emerald-300 font-bold ml-2 text-xs">
                    {filteredBills.length} Bills
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-100 mt-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Search invoice or patient..." 
                    className="pl-9 bg-slate-50 border-slate-200 h-10 text-xs font-semibold rounded-xl" 
                    value={billingSearchQuery}
                    onChange={(e) => setBillingSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 h-10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">From:</span>
                  <input 
                    type="date"
                    className="bg-transparent text-xs font-bold text-slate-700 w-full focus:outline-none"
                    value={billingStartDate}
                    onChange={(e) => setBillingStartDate(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 h-10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">To:</span>
                  <input 
                    type="date"
                    className="bg-transparent text-xs font-bold text-slate-700 w-full focus:outline-none"
                    value={billingEndDate}
                    onChange={(e) => setBillingEndDate(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select value={billingPaymentFilter} onValueChange={setBillingPaymentFilter}>
                    <SelectTrigger className="h-10 bg-slate-50 border-slate-200 text-xs font-bold rounded-xl">
                      <SelectValue placeholder="Payment Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Payment Modes</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="UPI">UPI / QR</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Credit">Credit</SelectItem>
                      <SelectItem value="Multi">Multi-mode Split</SelectItem>
                    </SelectContent>
                  </Select>

                  {(billingStartDate || billingEndDate || billingSearchQuery || billingPaymentFilter !== 'ALL') && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-10 px-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs shrink-0"
                      onClick={() => {
                        setBillingSearchQuery('');
                        setBillingStartDate('');
                        setBillingEndDate('');
                        setBillingPaymentFilter('ALL');
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="whitespace-nowrap">Bill No.</TableHead>
                      <TableHead className="whitespace-nowrap">Patient</TableHead>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map((bill) => {
                      const patient = patients.find(p => p.id === bill.patient_id);
                      return (
                        <TableRow key={bill.id} className="border-slate-50">
                          <TableCell className="font-medium text-medical-blue whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              <span>{bill.sequenceNumber}</span>
                              {(bill.is_edited || bill.tpa_approval_status === 'Edited') && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200 font-bold select-none">
                                  Edited
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div>
                              <p className="font-medium text-sm">
                                {bill.patient_name || patient?.name || 'Walk-in Customer'}
                              </p>
                              {bill.patient_phone && <p className="text-[10px] text-muted-foreground">Ph: {bill.patient_phone}</p>}
                              {bill.prescribing_doctor && <p className="text-[10px] text-medical-blue italic">Dr: {bill.prescribing_doctor}</p>}
                              {!bill.patient_phone && patient?.mrn && <p className="text-xs text-muted-foreground">{patient.mrn}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(bill.date || bill.created_at || bill.issued_at)}</TableCell>
                          <TableCell className="font-bold whitespace-nowrap">{formatCurrency(bill.payable_amount ?? bill.payableAmount ?? bill.total_amount ?? bill.totalAmount ?? 0)}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none">
                              Paid
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex justify-end gap-2">
                              {!isAccountant && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-medical-blue" 
                                  title="Edit Pharmacy Bill"
                                  onClick={() => {
                                    setEditingBillInner({
                                      ...bill,
                                      patient_name: bill.patient_name || patient?.name || 'Walk-in Customer',
                                      patient_phone: bill.patient_phone || patient?.phone || ''
                                    });
                                    setIsEditBillOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => printPharmacyInvoice(bill)}>
                                <Printer className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.success('Downloading invoice...')}>
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns" className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                Medicine Return Records (OPD & IPD)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Process returned medicines for Outpatients and Admitted IPD Patients, re-stock inventory, and issue credit/refund vouchers.
              </p>
            </div>
            <Button 
              className="bg-rose-600 hover:bg-rose-700 text-white gap-2 font-bold shadow-md rounded-xl"
              onClick={() => setIsReturnModalOpen(true)}
            >
              <RotateCcw className="w-4 h-4" />
              New Medicine Return
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-gradient-to-br from-white to-rose-50/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Return Vouchers</p>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">{returnRecords.length}</h3>
                </div>
                <div className="p-3 rounded-xl bg-rose-100 text-rose-600">
                  <RotateCcw className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-gradient-to-br from-white to-amber-50/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Refund Amount</p>
                  <h3 className="text-2xl font-black text-amber-700 mt-1">
                    {formatCurrency(returnRecords.reduce((acc, r) => acc + (r.totalRefundAmount || 0), 0))}
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
                  <CreditCard className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-gradient-to-br from-white to-blue-50/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">OPD Patient Returns</p>
                  <h3 className="text-2xl font-black text-blue-700 mt-1">
                    {returnRecords.filter(r => r.patientType === 'OPD' || !r.patientType).length}
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                  <User className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-gradient-to-br from-white to-purple-50/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">IPD Bed Returns</p>
                  <h3 className="text-2xl font-black text-purple-700 mt-1">
                    {returnRecords.filter(r => r.patientType === 'IPD').length}
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
                  <FileText className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg font-bold">Return History Logs</CardTitle>
                <CardDescription>Track all pharmacy returns, restocked items, and refund settlements.</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search Return No / Patient / MRN..." 
                  className="pl-8 text-xs bg-slate-50"
                  value={returnSearchQuery}
                  onChange={(e) => setReturnSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredReturnRecords.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl my-2">
                  <RotateCcw className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold text-slate-600">No Medicine Return Vouchers Found</p>
                  <p className="text-xs text-muted-foreground mt-1">Click "New Medicine Return" to issue a return refund for OPD or IPD patients.</p>
                  <Button 
                    className="mt-4 bg-rose-600 text-white hover:bg-rose-700 gap-2 text-xs font-bold rounded-lg"
                    onClick={() => setIsReturnModalOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" /> New Medicine Return
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold">Return Voucher</TableHead>
                        <TableHead className="font-bold">Date & Time</TableHead>
                        <TableHead className="font-bold">Patient Details</TableHead>
                        <TableHead className="font-bold">Type</TableHead>
                        <TableHead className="font-bold">Returned Items</TableHead>
                        <TableHead className="font-bold text-right">Refund Amount</TableHead>
                        <TableHead className="font-bold">Refund Method</TableHead>
                        <TableHead className="font-bold text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReturnRecords.map((record) => (
                        <TableRow key={record.id} className="hover:bg-slate-50/80 transition-colors">
                          <TableCell className="font-mono text-xs font-bold text-rose-700">
                            {record.returnNo}
                            {record.originalBillNo && (
                              <div className="text-[10px] text-muted-foreground font-normal">
                                Bill: #{record.originalBillNo}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(record.date)}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-bold text-slate-800">{record.patientName}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {record.mrn !== 'N/A' && `MRN: ${record.mrn}`}
                              {record.ipdNo && ` | IPD: ${record.ipdNo}`}
                              {record.bedNo && ` | Bed: ${record.bedNo}`}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={
                                record.patientType === 'IPD' 
                                  ? 'bg-purple-50 text-purple-700 border-purple-200 font-bold' 
                                  : 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                              }
                            >
                              {record.patientType || 'OPD'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px]">
                            <div className="font-semibold text-slate-700 truncate">
                              {record.items?.map((i: any) => `${i.name} (${i.quantity} ${i.unitType || ''})`).join(', ')}
                            </div>
                            <div className="text-[10px] text-emerald-600 font-medium">
                              {record.restocked ? '✓ Inventory Re-stocked' : 'No Restock'}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-rose-600 text-right">
                            {formatCurrency(record.totalRefundAmount)}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-medium">
                              {record.refundMode || 'Cash'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 gap-1.5 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                              onClick={() => handlePrintReturnRecord(record)}
                            >
                              <Printer className="w-3.5 h-3.5" /> Print Voucher
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Pharmacy & Billing Settings</CardTitle>
              <CardDescription>
                Configure pharmacy headers, GST details, bank accounts, UPI codes, and terms for invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Brand & Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Brand Information</h3>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-name">Pharmacy Professional Name</Label>
                    <Input 
                      id="pharmacy-name" 
                      value={pharmacySettings.pharmacyName}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, pharmacyName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-tagline">Dynamic Tagline / Promotion</Label>
                    <Input 
                      id="pharmacy-tagline" 
                      value={pharmacySettings.tagline}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, tagline: e.target.value })}
                      placeholder="e.g. A single stop for all your Healthcare needs!"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="logo-url">Pharmacy Logo URL</Label>
                      <span className="text-[10px] text-muted-foreground">Upload image or enter web link</span>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        id="logo-url" 
                        value={pharmacySettings.logoUrl}
                        onChange={(e) => setPharmacySettings({ ...pharmacySettings, logoUrl: e.target.value })}
                        placeholder="https://..."
                      />
                      <div className="relative">
                        <Button variant="outline" className="cursor-pointer relative overflow-hidden" asChild nativeButton={false}>
                          <label className="text-xs">
                            Upload
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setPharmacySettings({ ...pharmacySettings, logoUrl: reader.result as string });
                                    toast.success('Logo uploaded successfully!');
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }} 
                            />
                          </label>
                        </Button>
                      </div>
                    </div>
                    {pharmacySettings.logoUrl && (
                      <div className="mt-2 p-2 border border-dashed rounded flex justify-between items-center bg-slate-50">
                        <img src={pharmacySettings.logoUrl} className="max-h-12 max-w-[120px] object-contain rounded" alt="Preview" />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 h-8 hover:text-red-600 hover:bg-red-50 text-xs"
                          onClick={() => setPharmacySettings({ ...pharmacySettings, logoUrl: '' })}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-phone">Support Contacts (Phone)</Label>
                    <Input 
                      id="pharmacy-phone" 
                      value={pharmacySettings.phone}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-address">Retail Location (Address)</Label>
                    <Input 
                      id="pharmacy-address" 
                      value={pharmacySettings.address}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-gstin">Enterprise Tax Reference (GSTIN)</Label>
                    <Input 
                      id="pharmacy-gstin" 
                      value={pharmacySettings.gstin}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, gstin: e.target.value })}
                    />
                  </div>
                </div>

                {/* Bank / Payment config */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Acquirer & Bank Accounts</h3>
                  <div className="space-y-2">
                    <Label htmlFor="bank-name">Financial Institution (Bank Name)</Label>
                    <Input 
                      id="bank-name" 
                      value={pharmacySettings.bankName}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-branch">Branch Location</Label>
                    <Input 
                      id="bank-branch" 
                      value={pharmacySettings.bankBranch}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankBranch: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-acc">Deposit Account Number</Label>
                    <Input 
                      id="bank-acc" 
                      value={pharmacySettings.bankAccNo}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankAccNo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-ifsc">Routing Code (IFSC)</Label>
                    <Input 
                      id="bank-ifsc" 
                      value={pharmacySettings.bankIfsc}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankIfsc: e.target.value })}
                      className="font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upi-id">UPI Virtual Address (UPI ID)</Label>
                    <Input 
                      id="upi-id" 
                      value={pharmacySettings.upiId}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, upiId: e.target.value })}
                      placeholder="e.g. name@bank"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-4 bg-slate-100" />

              {/* Terms and Footers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="terms-conditions">Terms & Conditions (One per line)</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">Use line breaks</span>
                  </div>
                  <textarea 
                    id="terms-conditions" 
                    className="w-full h-32 border border-slate-200 rounded-md p-3 text-xs focus:ring-1 focus:ring-medical-blue focus:outline-none"
                    value={pharmacySettings.termsAndConditions.join('\n')}
                    onChange={(e) => {
                      const list = e.target.value.split('\n').filter(line => line.trim() !== '');
                      setPharmacySettings({ ...pharmacySettings, termsAndConditions: list });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-footer">Document Footer Slogan</Label>
                  <textarea 
                    id="invoice-footer" 
                    className="w-full h-32 border border-slate-200 rounded-md p-3 text-xs focus:ring-1 focus:ring-medical-blue focus:outline-none"
                    value={pharmacySettings.additionalFooter}
                    onChange={(e) => setPharmacySettings({ ...pharmacySettings, additionalFooter: e.target.value })}
                    placeholder="e.g. Thanks for your order!"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDeleteConfirm({
                      isOpen: true,
                      title: "Reset Pharmacy Settings",
                      description: "Are you sure you want to reset to default Medicare Wholesale Pharmacy settings? This will overwrite your current settings.",
                      onConfirm: async () => {
                        setPharmacySettings(DEFAULT_PHARMACY_SETTINGS);
                        storage.set('hms_pharmacy_settings', DEFAULT_PHARMACY_SETTINGS);
                        if (supabaseService.updatePharmacySettings) {
                          await supabaseService.updatePharmacySettings(DEFAULT_PHARMACY_SETTINGS);
                        }
                        toast.success('Reset to defaults successfully');
                      }
                    });
                  }}
                >
                  Reset Defaults
                </Button>
                <Button 
                  className="bg-medical-blue text-white hover:bg-medical-blue/90"
                  onClick={async () => {
                    storage.set('hms_pharmacy_settings', pharmacySettings);
                    if (supabaseService.updatePharmacySettings) {
                      await supabaseService.updatePharmacySettings(pharmacySettings);
                    }
                    toast.success('Pharmacy settings saved successfully!');
                  }}
                >
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Return (Vendor) Tab */}
        <TabsContent value="purchase_returns" className="mt-6 space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-black text-slate-800">Vendor Purchase Returns (Debit Notes)</CardTitle>
                <CardDescription className="text-xs">Record items returned to pharmaceutical vendors/suppliers and automatically deduct stock.</CardDescription>
              </div>
              <Button 
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2 rounded-xl"
                onClick={() => setIsPurchaseReturnModalOpen(true)}
              >
                <Undo2 className="w-4 h-4" />
                Process New Purchase Return
              </Button>
            </CardHeader>
            <CardContent>
              {purchaseReturns.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                    <Undo2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No Purchase Returns Recorded</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">When near-expiry or damaged items are sent back to vendors, create a purchase return entry here to adjust inventory levels.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-xs">Return No / Date</TableHead>
                        <TableHead className="font-bold text-xs">Vendor Name</TableHead>
                        <TableHead className="font-bold text-xs">Invoice Ref No.</TableHead>
                        <TableHead className="font-bold text-xs">Returned Item</TableHead>
                        <TableHead className="font-bold text-xs">Batch</TableHead>
                        <TableHead className="font-bold text-xs">Qty</TableHead>
                        <TableHead className="font-bold text-xs">Debit Amount</TableHead>
                        <TableHead className="font-bold text-xs">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseReturns.map((ret: any) => (
                        <TableRow key={ret.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-bold text-xs">
                            <span className="text-amber-700 font-mono font-black">{ret.returnNo}</span>
                            <span className="text-[10px] text-slate-400 block">{formatDate(ret.date)}</span>
                          </TableCell>
                          <TableCell className="font-bold text-xs text-slate-800">{ret.vendorName}</TableCell>
                          <TableCell className="text-xs text-slate-500 font-mono">{ret.purchaseBillNo || 'N/A'}</TableCell>
                          <TableCell className="font-bold text-xs text-slate-700">{ret.itemName}</TableCell>
                          <TableCell className="text-xs font-mono text-slate-500">{ret.batchNo}</TableCell>
                          <TableCell className="font-black text-xs text-rose-600">-{ret.quantity} units</TableCell>
                          <TableCell className="font-black text-xs text-slate-800">{formatCurrency(ret.totalAmount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                              {ret.reason}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Process Purchase Return Modal */}
      <Dialog open={isPurchaseReturnModalOpen} onOpenChange={setIsPurchaseReturnModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800">Process Purchase Return to Vendor</DialogTitle>
            <DialogDescription className="text-xs">
              This will deduct stock from the pharmacy inventory and create a vendor debit note record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Vendor / Supplier Name *</Label>
                <Input 
                  placeholder="e.g. Global Medical Agencies"
                  className="h-9 text-xs"
                  value={purchaseReturnVendor}
                  onChange={(e) => setPurchaseReturnVendor(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Purchase Bill / Invoice No.</Label>
                <Input 
                  placeholder="e.g. INV-8890"
                  className="h-9 text-xs"
                  value={purchaseReturnRefNo}
                  onChange={(e) => setPurchaseReturnRefNo(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Select Medicine Item *</Label>
              <Select 
                value={purchaseReturnMedicineId} 
                onValueChange={(val) => {
                  setPurchaseReturnMedicineId(val);
                  const item = inventory.find(i => i.id === val);
                  if (item && item.vendor_name && !purchaseReturnVendor) {
                    setPurchaseReturnVendor(item.vendor_name);
                  }
                  if (item && item.purchase_bill_no && !purchaseReturnRefNo) {
                    setPurchaseReturnRefNo(item.purchase_bill_no);
                  }
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Search inventory medicine..." />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map(item => (
                    <SelectItem key={item.id} value={item.id} className="text-xs">
                      {item.name} (Batch: {item.batch_number || 'N/A'}, In Stock: {item.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Return Quantity *</Label>
                <Input 
                  type="number" 
                  min="1"
                  max={inventory.find(i => i.id === purchaseReturnMedicineId)?.stock || 9999}
                  className="h-9 text-xs font-bold"
                  value={purchaseReturnQty}
                  onChange={(e) => setPurchaseReturnQty(Math.max(1, Number(e.target.value)))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Reason for Return</Label>
                <Select value={purchaseReturnReason} onValueChange={setPurchaseReturnReason}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Near Expiry">Near Expiry / Expired</SelectItem>
                    <SelectItem value="Damaged Batch">Damaged Batch / Packaging</SelectItem>
                    <SelectItem value="Quality Defect">Quality / Recall Defect</SelectItem>
                    <SelectItem value="Overstock Return">Overstock / Excess Supply</SelectItem>
                    <SelectItem value="Wrong Item Received">Wrong Item Supplied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {purchaseReturnMedicineId && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-amber-900">Current Stock in Inventory:</span>
                  <span className="font-black text-amber-800">
                    {inventory.find(i => i.id === purchaseReturnMedicineId)?.stock || 0} units
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-amber-900">Estimated Total Refund Amount:</span>
                  <span className="font-black text-amber-800">
                    {formatCurrency(
                      purchaseReturnQty * (
                        inventory.find(i => i.id === purchaseReturnMedicineId)?.purchase_price || 
                        ((inventory.find(i => i.id === purchaseReturnMedicineId)?.selling_price || 0) * 0.8)
                      )
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl text-xs font-bold" onClick={() => setIsPurchaseReturnModalOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl" onClick={handleProcessPurchaseReturn}>
              Confirm Return & Adjust Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Pharmacy Bill Dialog */}
      <Dialog open={isEditBillOpen} onOpenChange={setIsEditBillOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Pharmacy Bill #{editingBillInner?.id.slice(0, 8).toUpperCase()}</DialogTitle>
            <DialogDescription>
              Modify customer details and total amount. This action will label the bill as Edited.
            </DialogDescription>
          </DialogHeader>
          {editingBillInner && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-bill-name">Patient/Customer Name</Label>
                <Input
                  id="edit-bill-name"
                  value={editingBillInner.patient_name || ''}
                  onChange={(e) => setEditingBillInner({ ...editingBillInner, patient_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bill-phone">Customer Phone (Optional)</Label>
                <Input
                  id="edit-bill-phone"
                  value={editingBillInner.patient_phone || ''}
                  onChange={(e) => setEditingBillInner({ ...editingBillInner, patient_phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bill-doctor">Prescribing Doctor</Label>
                <Input
                  id="edit-bill-doctor"
                  value={editingBillInner.prescribing_doctor || ''}
                  onChange={(e) => setEditingBillInner({ ...editingBillInner, prescribing_doctor: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bill-amount">Total Bill Amount</Label>
                <Input
                  id="edit-bill-amount"
                  type="number"
                  value={editingBillInner.totalAmount ?? editingBillInner.total_amount ?? 0}
                  onChange={(e) => setEditingBillInner({ 
                    ...editingBillInner, 
                    totalAmount: Number(e.target.value),
                    total_amount: Number(e.target.value),
                    paidAmount: Number(e.target.value),
                    paid_amount: Number(e.target.value)
                  })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditBillOpen(false);
              setEditingBillInner(null);
            }}>
              Cancel
            </Button>
            <Button className="bg-medical-blue text-white" onClick={handleSaveEditBillInner}>
              Save and Mark Edited
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Return Medicine Dialog Modal */}
      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 text-xl font-bold">
              <RotateCcw className="w-5 h-5" /> Return Medicine (OPD / IPD Patient)
            </DialogTitle>
            <DialogDescription>
              Select patient type, locate patient/bill, choose medicine items to return, and credit refund amount.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Step 1: Patient Type Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Step 1: Patient Category</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={returnPatientType === 'OPD' ? 'default' : 'outline'}
                  className={returnPatientType === 'OPD' ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold' : ''}
                  onClick={() => {
                    setReturnPatientType('OPD');
                    setSelectedReturnPatient(null);
                    setSelectedReturnBill(null);
                    setReturnCart([]);
                  }}
                >
                  <User className="w-4 h-4 mr-1.5" /> OPD Patient
                </Button>
                <Button
                  type="button"
                  variant={returnPatientType === 'IPD' ? 'default' : 'outline'}
                  className={returnPatientType === 'IPD' ? 'bg-purple-600 hover:bg-purple-700 text-white font-bold' : ''}
                  onClick={() => {
                    setReturnPatientType('IPD');
                    setSelectedReturnPatient(null);
                    setSelectedReturnBill(null);
                    setReturnCart([]);
                  }}
                >
                  <FileText className="w-4 h-4 mr-1.5" /> IPD Admitted Patient
                </Button>
                <Button
                  type="button"
                  variant={returnPatientType === 'Walk-in' ? 'default' : 'outline'}
                  className={returnPatientType === 'Walk-in' ? 'bg-slate-700 hover:bg-slate-800 text-white font-bold' : ''}
                  onClick={() => {
                    setReturnPatientType('Walk-in');
                    setSelectedReturnPatient({ name: 'Walk-in Customer', mrn: 'N/A', patientType: 'Walk-in' });
                    setSelectedReturnBill(null);
                    setReturnCart([]);
                  }}
                >
                  <ShoppingCart className="w-4 h-4 mr-1.5" /> Walk-in / Direct
                </Button>
              </div>
            </div>

            {/* Step 2: Patient Search & Selection */}
            {returnPatientType !== 'Walk-in' && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Step 2: Select {returnPatientType} Patient
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder={returnPatientType === 'IPD' ? "Search IPD Patient by Name, IPD No., Bed No..." : "Search OPD Patient by Name, Phone, MRN..."}
                    className="pl-9 bg-slate-50 text-xs"
                    value={returnPatientSearch}
                    onChange={(e) => setReturnPatientSearch(e.target.value)}
                  />
                </div>

                {/* Patient Search Results */}
                {selectedReturnPatient ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{selectedReturnPatient.name}</span>
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                          Selected ({selectedReturnPatient.patientType})
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        MRN: {selectedReturnPatient.mrn || 'N/A'}
                        {selectedReturnPatient.ipdNo && ` | IPD No: ${selectedReturnPatient.ipdNo}`}
                        {selectedReturnPatient.bedNo && ` | Bed: ${selectedReturnPatient.bedNo}`}
                        {selectedReturnPatient.doctorName && ` | Doctor: ${selectedReturnPatient.doctorName}`}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs text-slate-500 hover:text-rose-600"
                      onClick={() => {
                        setSelectedReturnPatient(null);
                        setSelectedReturnBill(null);
                        setReturnCart([]);
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto border rounded-xl divide-y bg-white">
                    {filteredPatientsForReturn.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground text-center">
                        No {returnPatientType} patients found matching query.
                      </div>
                    ) : (
                      filteredPatientsForReturn.map(pt => (
                        <div 
                          key={pt.id} 
                          className="p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-xs transition-colors"
                          onClick={() => handleSelectReturnPatient(pt)}
                        >
                          <div>
                            <span className="font-bold text-slate-800">{pt.name}</span>
                            <span className="text-muted-foreground ml-2">MRN: {pt.mrn || 'N/A'}</span>
                            {pt.ipdNo && <span className="text-purple-700 font-semibold ml-2">IPD: {pt.ipdNo} (Bed {pt.bedNo})</span>}
                          </div>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] font-bold">Select</Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Select Pharmacy Bill or Manual Medicine Add */}
            {selectedReturnPatient && (
              <div className="space-y-3 pt-2 border-t border-dashed">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Step 3: Choose Medicines to Return
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Select from previous bill or add manually</span>
                </div>

                {/* Patient Previous Bills Dropdown */}
                {patientBillsForReturn.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 border space-y-2">
                    <Label className="text-xs font-bold">Previous Pharmacy Bills for Patient:</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {patientBillsForReturn.map(bill => (
                        <div 
                          key={bill.id} 
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${selectedReturnBill?.id === bill.id ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-400/20' : 'bg-white hover:border-slate-300'}`}
                          onClick={() => handleSelectReturnBill(bill)}
                        >
                          <div className="flex justify-between font-bold text-slate-800">
                            <span>Bill #{bill.sequenceNumber || bill.id.slice(0, 8)}</span>
                            <span className="text-orange-700">{formatCurrency(bill.total_amount || bill.totalAmount || 0)}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex justify-between mt-1">
                            <span>{formatDate(bill.created_at || bill.date)}</span>
                            <span>{bill.invoice_items?.length || bill.items?.length || 0} items</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Item Add Form */}
                <div className="p-3 rounded-xl border bg-slate-50/70 space-y-3">
                  <Label className="text-xs font-bold text-slate-700">Add Medicine Item to Return List Manually:</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-5 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Select Medicine</Label>
                      <Select value={manualMedicineId} onValueChange={setManualMedicineId}>
                        <SelectTrigger className="h-9 text-xs bg-white">
                          <SelectValue placeholder="Search inventory medicine..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {inventory.map(item => (
                            <SelectItem key={item.id} value={item.id} className="text-xs">
                              {item.name} (Stock: {item.stock} strips)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Unit Type</Label>
                      <Select value={manualReturnUnit} onValueChange={(v: 'strip' | 'loose') => setManualReturnUnit(v)}>
                        <SelectTrigger className="h-9 text-xs bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="strip">Strip / Unit</SelectItem>
                          <SelectItem value="loose">Loose Tablet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Qty</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        value={manualReturnQty}
                        onChange={(e) => setManualReturnQty(Number(e.target.value))}
                        className="h-9 text-xs bg-white"
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <Button 
                        type="button" 
                        className="w-full h-9 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1"
                        onClick={handleAddManualReturnItem}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Item
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Return Cart Table */}
                {returnCart.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-800">Return Cart Items ({returnCart.length}):</Label>
                    <div className="border rounded-xl overflow-hidden bg-white">
                      <Table>
                        <TableHeader className="bg-slate-100">
                          <TableRow>
                            <TableHead className="text-xs font-bold">Medicine Name</TableHead>
                            <TableHead className="text-xs font-bold w-24">Return Qty</TableHead>
                            <TableHead className="text-xs font-bold w-24">Unit Price</TableHead>
                            <TableHead className="text-xs font-bold w-28 text-right">Subtotal</TableHead>
                            <TableHead className="text-xs font-bold w-36">Reason</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {returnCart.map((item, index) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-xs font-bold text-slate-800">
                                {item.name}
                                {item.isLoose && <Badge variant="outline" className="ml-2 text-[9px] bg-orange-50 text-orange-700">Loose</Badge>}
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  max={item.maxQuantity}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const val = Math.max(1, Number(e.target.value));
                                    setReturnCart(prev => prev.map((c, i) => i === index ? { ...c, quantity: val } : c));
                                  }}
                                  className="h-8 text-xs w-20"
                                />
                              </TableCell>
                              <TableCell className="text-xs font-semibold">
                                ₹{item.price.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-xs font-bold text-rose-700 text-right">
                                {formatCurrency(item.quantity * item.price)}
                              </TableCell>
                              <TableCell>
                                <Select 
                                  value={item.reason} 
                                  onValueChange={(val) => {
                                    setReturnCart(prev => prev.map((c, i) => i === index ? { ...c, reason: val } : c));
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-[11px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Discontinued by Doctor">Discontinued by Doctor</SelectItem>
                                    <SelectItem value="Excess / Unused Medicine">Excess / Unused Medicine</SelectItem>
                                    <SelectItem value="Wrong Medication Dispensed">Wrong Medication</SelectItem>
                                    <SelectItem value="Patient Discharged / Expired">Patient Discharged</SelectItem>
                                    <SelectItem value="Side Effect / Allergy">Side Effect / Allergy</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setReturnCart(prev => prev.filter((_, i) => i !== index))}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Settlement & Restock Options */}
            {returnCart.length > 0 && (
              <div className="space-y-4 pt-3 border-t border-dashed">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Step 4: Refund Settlement & Inventory Policy
                </Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Refund Payment Method</Label>
                    <Select value={refundMode} onValueChange={setRefundMode}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {returnPatientType === 'IPD' && (
                          <SelectItem value="Adjusted in IPD Bill">
                            Adjusted in IPD Final Bill (Credit Note)
                          </SelectItem>
                        )}
                        <SelectItem value="Cash Refund">Cash Refund</SelectItem>
                        <SelectItem value="UPI / Online Transfer">UPI / Bank Refund</SelectItem>
                        <SelectItem value="Store Credit Voucher">Store Credit Voucher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50/60 border border-orange-100">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-slate-800 cursor-pointer" htmlFor="restock-switch">
                        Re-stock Inventory Stock
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Automatically increases stock levels in inventory</p>
                    </div>
                    <input 
                      id="restock-switch"
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      checked={restockInventory}
                      onChange={(e) => setRestockInventory(e.target.checked)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Return Notes / Reason Remarks</Label>
                  <Input 
                    placeholder="Enter additional remarks or doctor recommendation..."
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Total Refund Payable</span>
                    <p className="text-[10px] text-rose-600">Voucher will be generated & printed</p>
                  </div>
                  <span className="text-2xl font-black text-rose-700">
                    {formatCurrency(totalReturnRefundAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReturnModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2"
              disabled={returnCart.length === 0}
              onClick={handleProcessReturnSubmit}
            >
              <CheckCircle2 className="w-4 h-4" /> Issue Return Voucher & Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
