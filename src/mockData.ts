import { Patient, Appointment, User, Bed, BillingRecord, LabTest, InventoryItem, OperationTheatre, OperationRecord, NursingTask, NurseShift, PatientVitals, Prescription } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u2', name: 'Admin', email: 'admin@hospital.com', role: 'SUPER_ADMIN', department: 'Cardiology', specialization: 'Interventional Cardiology', degree: 'MD, DM (Cardiology)', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali' }
];

export const MOCK_PATIENTS: Patient[] = [];

export const MOCK_BEDS: Bed[] = [
  { id: 'b1', number: '101', ward: 'General Ward A', type: 'General', status: 'Available' },
  { id: 'b2', number: '102', ward: 'General Ward A', type: 'General', status: 'Available' },
  { id: 'b3', number: '201', ward: 'ICU', type: 'ICU', status: 'Available' },
  { id: 'b4', number: 'M1', ward: 'Maternity', type: 'Maternity', status: 'Available' },
];

export const MOCK_APPOINTMENTS: Appointment[] = [];

export const MOCK_BILLING: any[] = [];

export const MOCK_INVENTORY: InventoryItem[] = [
  { 
    id: 'i1', 
    name: 'Paracetamol 500mg', 
    category: 'Medicine', 
    stock: 500, 
    unit: 'Tablets', 
    minStockLevel: 100, 
    expiryDate: '2025-12-31',
    mrp: 15.50,
    sellingPrice: 12.00,
    purchasePrice: 8.00,
    taxPercentage: 12,
    hsnCode: '3004',
    rackNumber: 'A-101'
  },
  { 
    id: 'i2', 
    name: 'Amoxicillin 250mg', 
    category: 'Medicine', 
    stock: 50, 
    unit: 'Capsules', 
    minStockLevel: 100, 
    expiryDate: '2024-08-15',
    mrp: 45.00,
    sellingPrice: 40.00,
    purchasePrice: 30.00,
    taxPercentage: 12,
    hsnCode: '3004',
    rackNumber: 'B-202'
  },
  { 
    id: 'i3', 
    name: 'Moxikind-CV 625', 
    category: 'Medicine', 
    stock: 90, 
    unit: 'Strips', 
    minStockLevel: 10, 
    expiryDate: '2025-08-31',
    mrp: 150.00,
    sellingPrice: 120.00,
    purchasePrice: 80.00,
    taxPercentage: 12,
    hsnCode: '3004',
    rackNumber: 'B-902',
    batchNumber: 'B-902',
    composition: 'Amoxicillin + Clavulanic Acid',
    units_per_strip: 10,
    loose_selling_price: 12.00,
    loose_stock: 0,
    is_loose_sale_enabled: true
  },
  {
    id: 'i4',
    name: 'crocin',
    category: 'Medicine',
    stock: 20,
    unit: 'Strips',
    minStockLevel: 10,
    expiryDate: '2030-01-01',
    mrp: 55.00,
    sellingPrice: 52.00,
    purchasePrice: 26.00,
    taxPercentage: 12,
    hsnCode: '3004',
    rackNumber: 'N/A',
    batchNumber: '26',
    composition: 'Amoxicillin + Clavulanic Acid',
    units_per_strip: 10,
    loose_selling_price: 9.00,
    loose_stock: 80,
    is_loose_sale_enabled: true
  },
];

export const MOCK_THEATRES: OperationTheatre[] = [
  { id: 'ot1', name: 'OT-01 (Major)', status: 'Available', type: 'Major' },
  { id: 'ot2', name: 'OT-02 (Cardiac)', status: 'Occupied', type: 'Cardiac' },
  { id: 'ot3', name: 'OT-03 (Minor)', status: 'Maintenance', type: 'Minor' },
];

export const MOCK_OPERATION_RECORDS: OperationRecord[] = [];

export const MOCK_NURSING_TASKS: NursingTask[] = [];

export const MOCK_NURSE_SHIFTS: NurseShift[] = [];

export const MOCK_PATIENT_VITALS: PatientVitals[] = [];

export const MOCK_PRESCRIPTIONS: Prescription[] = [];

export const MOCK_PHARMACY_BILLING: BillingRecord[] = [];

export const MOCK_LAB_TESTS = [
  { id: 'lt1', name: 'Complete Blood Count (CBC)', category: 'Pathology', price: 450 },
  { id: 'lt2', name: 'Liver Function Test (LFT)', category: 'Pathology', price: 1200 },
  { id: 'lt3', name: 'Kidney Function Test (KFT)', category: 'Pathology', price: 1100 },
  { id: 'lt4', name: 'Blood Sugar (F/PP)', category: 'Pathology', price: 200 },
  { id: 'lt5', name: 'Lipid Profile', category: 'Pathology', price: 850 },
  { id: 'lt6', name: 'Thyroid Profile (T3, T4, TSH)', category: 'Pathology', price: 950 },
  { id: 'lt7', name: 'Chest X-Ray', category: 'Radiology', price: 600 },
  { id: 'lt8', name: 'USG Whole Abdomen', category: 'Radiology', price: 1500 },
  { id: 'lt9', name: 'CT Scan Brain', category: 'Radiology', price: 4500 },
  { id: 'lt10', name: 'MRI Spine', category: 'Radiology', price: 8500 },
];

export const MOCK_BED_RATES = [
  { type: 'General', rate: 1500 },
  { type: 'Semi-Private', rate: 3000 },
  { type: 'Private', rate: 5000 },
  { type: 'ICU', rate: 8000 },
  { type: 'Maternity', rate: 4000 },
];

export const MOCK_OT_RATES = [
  { type: 'Minor', rate: 5000 },
  { type: 'Major', rate: 15000 },
  { type: 'Cardiac', rate: 45000 },
  { type: 'Neuro', rate: 55000 },
];

export const MOCK_MATERIAL_RATES = [
  { name: 'Surgical Gloves', price: 150, category: 'Disposable' },
  { name: 'Syringes (Pack of 10)', price: 100, category: 'Disposable' },
  { name: 'IV Fluid Set', price: 450, category: 'Disposable' },
  { name: 'Cotton / Bandage Kit', price: 200, category: 'Material' },
  { name: 'Disinfectant Solution', price: 350, category: 'Material' },
  { name: 'Catheter Set', price: 850, category: 'Disposable' },
];

export const MOCK_LAB_TEST_REQUESTS = [
  {
    id: 'req-lab-01',
    patient_id: 'p-default-1',
    test_id: 'lt1',
    test_name: 'Complete Blood Count (CBC)',
    status: 'Received',
    sample_id: 'SMP-54201',
    urgency: 'routine',
    reference_range: '12.0 - 17.0 g/dL',
    unit: 'g/dL',
    requested_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    clinical_notes: 'Fever with weakness, routine hemogram check',
    patients: {
      name: 'Anupama Verma',
      mrn: 'MRN35976',
      age: 32,
      gender: 'Female',
      phone: '8601816951'
    }
  },
  {
    id: 'req-lab-02',
    patient_id: 'p-default-2',
    test_id: 'lt2',
    test_name: 'Liver Function Test (LFT)',
    status: 'Processing',
    sample_id: 'SMP-89104',
    urgency: 'urgent',
    reference_range: '5 - 40 IU/L',
    unit: 'IU/L',
    requested_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    clinical_notes: 'Jaundice evaluation, elevated bilirubin suspicion',
    patients: {
      name: 'Punam Kumari',
      mrn: 'MRN82401',
      age: 45,
      gender: 'Female',
      phone: '9621364505'
    }
  },
  {
    id: 'req-lab-03',
    patient_id: 'p-default-3',
    test_id: 'lt1',
    test_name: 'Complete Blood Count (CBC)',
    status: 'Completed',
    sample_id: 'SMP-10928',
    urgency: 'routine',
    result_value: '13.8',
    unit: 'g/dL',
    reference_range: '12.0 - 17.0 g/dL',
    findings: 'All hematology cell counts within normal physiological baseline ranges.',
    verified_by: 'Dr. Ramesh Chandra (MD, Pathology) - Reg No: 8192A',
    verified_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    completed_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    requested_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    results: JSON.stringify({
      'P-HB': { parameterId: 'P-HB', parameterName: 'Hemoglobin', value: '13.8', unit: 'g/dL', referenceRangeStr: '12.0 - 17.0 g/dL', status: 'Normal', interpretation: 'Normal Baseline' },
      'P-RBC': { parameterId: 'P-RBC', parameterName: 'Total RBC Count', value: '4.75', unit: 'million/cumm', referenceRangeStr: '4.00 - 5.90 million/cumm', status: 'Normal', interpretation: 'Normal Baseline' },
      'P-WBC': { parameterId: 'P-WBC', parameterName: 'Total Leukocyte Count (TLC)', value: '7200', unit: 'cells/cumm', referenceRangeStr: '4000 - 11000 cells/cumm', status: 'Normal', interpretation: 'Normal Baseline' },
      'P-PLT': { parameterId: 'P-PLT', parameterName: 'Platelet Count', value: '2.80', unit: 'lakh/cumm', referenceRangeStr: '1.50 - 4.50 lakh/cumm', status: 'Normal', interpretation: 'Normal Baseline' },
      'P-MCV': { parameterId: 'P-MCV', parameterName: 'Mean Corpuscular Volume (MCV)', value: '88.5', unit: 'fL', referenceRangeStr: '80.0 - 100.0 fL', status: 'Normal', interpretation: 'Normal Baseline', isFormulaBased: true }
    }),
    patients: {
      name: 'Brijesh Sharma',
      mrn: 'MRN30041',
      age: 41,
      gender: 'Male',
      phone: '8052655852'
    }
  },
  {
    id: 'req-lab-04',
    patient_id: 'p-default-4',
    test_id: 'lt6',
    test_name: 'Thyroid Profile (T3, T4, TSH)',
    status: 'Completed',
    sample_id: 'SMP-39210',
    urgency: 'routine',
    result_value: '2.14',
    unit: 'mIU/L',
    reference_range: '0.4 - 4.5 mIU/L',
    findings: 'Euthyroid status. TSH, Free T3, and Free T4 in target clinical range.',
    verified_by: 'Dr. Pradeep Mishra (MD, Pathology)',
    verified_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    completed_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    requested_at: new Date(Date.now() - 50 * 3600000).toISOString(),
    results: JSON.stringify({
      'P-TSH': { parameterId: 'P-TSH', parameterName: 'Thyroid Stimulating Hormone (TSH)', value: '2.14', unit: 'mIU/L', referenceRangeStr: '0.4 - 4.5 mIU/L', status: 'Normal', interpretation: 'Normal Baseline' },
      'P-T3': { parameterId: 'P-T3', parameterName: 'Free Triiodothyronine (FT3)', value: '3.10', unit: 'pg/mL', referenceRangeStr: '2.0 - 4.4 pg/mL', status: 'Normal', interpretation: 'Normal Baseline' },
      'P-T4': { parameterId: 'P-T4', parameterName: 'Free Thyroxine (FT4)', value: '1.25', unit: 'ng/dL', referenceRangeStr: '0.8 - 2.0 ng/dL', status: 'Normal', interpretation: 'Normal Baseline' }
    }),
    patients: {
      name: 'Ankita Singh',
      mrn: 'MRN67711',
      age: 29,
      gender: 'Female',
      phone: '8874598584'
    }
  }
];
