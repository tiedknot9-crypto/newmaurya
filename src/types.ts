export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'HOSPITAL_ADMIN' 
  | 'RECEPTION' 
  | 'DOCTOR' 
  | 'NURSE' 
  | 'LAB_STAFF' 
  | 'PHARMACIST' 
  | 'ACCOUNTANT'
  | 'SURGEON'
  | 'RADIOLOGIST';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  specialization?: string;
  degree?: string;
  regNo?: string;
  reg_no?: string;
  avatar?: string;
}

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email?: string;
  address: string;
  bloodGroup?: string;
  lastVisit?: string;
  status: string;
  motherName?: string;
  motherPhone?: string;
  husbandName?: string;
  husbandPhone?: string;
  fatherName?: string;
  fatherPhone?: string;
  dob?: string;
  tpaId?: string;
  tpaValidity?: string;
  guardianName?: string;
  attendingDoctorId?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: 'OPD' | 'Follow-up' | 'Emergency';
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'In-Progress';
  reason?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  diagnosis?: string;
  medicines: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string;
  }[];
  tests?: string[];
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface BillingRecord {
  id: string;
  patientId: string;
  date: string;
  type?: string;
  items: {
    description: string;
    amount: number;
    category: 'OPD' | 'IPD' | 'Lab' | 'Radiology' | 'Pharmacy' | 'Other' | 'PHARMACY' | 'path' | 'radio';
  }[];
  totalAmount: number;
  discount?: number;
  paidAmount: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
  paymentMode?: 'Cash' | 'UPI' | 'Card';
  patientName?: string; // For walk-in customers
  patientPhone?: string; // For walk-in customers
  prescribingDoctor?: string; // For pharmacy/lab walk-ins
}

export interface Bed {
  id: string;
  number: string;
  ward: string;
  type: 'General' | 'Semi-Private' | 'Private' | 'ICU' | 'Maternity';
  status: 'Available' | 'Occupied' | 'Maintenance';
  patientId?: string;
}

export interface LabTest {
  id: string;
  patientId: string;
  testName: string;
  category: 'Pathology' | 'Radiology';
  orderedBy: string;
  date: string;
  status: 'Ordered' | 'Sample Collected' | 'Processing' | 'Completed';
  result?: string;
  reportUrl?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Medicine' | 'Surgical' | 'Consumable' | 'General' | 'Injectables & Critical Care' | 'Supplements & Nutrition' | 'Sanitizers & Disinfectants' | 'Life-Saving (Exempt)' | string;
  stock: number;
  unit: string;
  expiryDate?: string;
  expiry_date?: string;
  batchNumber?: string;
  batch_number?: string;
  minStockLevel: number;
  min_stock_level?: number;
  mrp: number;
  sellingPrice: number;
  selling_price?: number;
  purchasePrice: number;
  purchase_price?: number;
  taxPercentage: number;
  tax_percentage?: number;
  hsnCode?: string;
  hsn_code?: string;
  rackNumber?: string;
  rack_number?: string;
  composition?: string;
  units_per_strip?: number;
  loose_selling_price?: number;
  loose_stock?: number;
  is_loose_sale_enabled?: boolean;
  vendorName?: string;
  vendor_name?: string;
  vendorPhone?: string;
  vendor_phone?: string;
  purchaseDate?: string;
  purchase_date?: string;
  purchaseBillNo?: string;
  purchase_bill_no?: string;
  mfgDate?: string;
  mfg_date?: string;
}

export interface PharmacyPurchaseReturn {
  id: string;
  returnNo: string;
  date: string;
  vendorName: string;
  vendorPhone?: string;
  itemId: string;
  itemName: string;
  batchNumber?: string;
  quantity: number;
  unitType?: 'strip' | 'loose' | 'unit';
  unitPrice: number;
  totalAmount: number;
  reason: string;
  debitNoteNo?: string;
  performedBy?: string;
  notes?: string;
}

export interface PharmacyPatientReturn {
  id: string;
  returnNo: string;
  date: string;
  patientId?: string | null;
  patientName: string;
  patientPhone?: string;
  mrn?: string;
  patientType: 'OPD' | 'IPD' | 'Walk-in';
  ipdNo?: string;
  bedNo?: string;
  originalBillNo?: string;
  prescribingDoctor?: string;
  items: Array<{
    itemId?: string;
    name: string;
    quantity: number;
    isLoose?: boolean;
    unitType?: string;
    price: number;
    total: number;
    reason?: string;
  }>;
  totalRefundAmount: number;
  refundMode: string;
  notes?: string;
  restocked?: boolean;
  performedBy?: string;
}

export interface OperationTheatre {
  id: string;
  name: string;
  status: 'Available' | 'Occupied' | 'Maintenance' | 'Cleaning';
  type: 'Major' | 'Minor' | 'Cardiac' | 'Orthopedic' | 'Emergency';
}

export interface OperationRecord {
  id: string;
  patientId: string;
  theatreId: string;
  surgeonId: string;
  assistantSurgeons?: string[];
  anesthetistId?: string;
  nurses?: string[];
  operationName: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: 'Scheduled' | 'In-Progress' | 'Completed' | 'Cancelled';
  notes?: string;
  documents: {
    id: string;
    name: string;
    url: string;
    type: 'Document' | 'Photo' | 'Video';
    uploadedAt: string;
    uploadedBy: string;
  }[];
}

export interface NursingTask {
  id: string;
  patientId: string;
  description: string;
  dueTime: string;
  status: 'Pending' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
}

export interface NurseShift {
  id: string;
  nurseId: string;
  shiftType: 'Morning' | 'Evening' | 'Night';
  ward: string;
  status: 'Active' | 'Completed';
}

export interface PatientVitals {
  patientId: string;
  bp: string;
  pulse: number;
  temp: string;
  spo2: number;
  weight?: number | string;
  rr?: number | string;
  respiration?: number | string;
  rbs?: number | string;
  lastUpdated: string;
}
