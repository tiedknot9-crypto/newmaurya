import { storage, STORAGE_KEYS } from '@/lib/storage';

export const isOldPharmacyTestData = (bill: any): boolean => {
  if (!bill) return false;
  
  // Match patient names and identifiers from the user's screenshot
  const patientName = (bill.patient_name || bill.patientName || bill.patient || '').toLowerCase();
  const mrn = (bill.mrn || bill.patient_mrn || '').toUpperCase();
  const billDate = String(bill.date || bill.created_at || bill.issued_at || '');
  const seqNum = String(bill.sequenceNumber || bill.invoice_number || bill.id || '').toUpperCase();
  const amount = Number(bill.payable_amount ?? bill.payableAmount ?? bill.total_amount ?? bill.totalAmount ?? 0);

  // Check 1: Exact matches from user's screenshot (August 2026 test bills: Risha Pandey, Sanjay, Alfaaz Ali)
  const isOldRisha = (patientName.includes('risha pandey') || mrn === 'MRN97462') && 
                     (Math.abs(amount - 516) < 1 || billDate.includes('2026-08-15') || billDate.includes('15 Aug 2026'));

  const isOldSanjay = (patientName === 'sanjay' || mrn === 'MRN80595' || mrn === 'MRN80535') && 
                      (Math.abs(amount - 490.20) < 1 || billDate.includes('2026-08-25') || billDate.includes('25 Aug 2026'));

  const isOldAlfaaz = (patientName.includes('alfaaz ali') || mrn === 'MRN66327' || mrn === 'MRN68327') && 
                      (Math.abs(amount - 1205.43) < 1 || billDate.includes('2026-08-29') || billDate.includes('29 Aug 2026'));

  if (isOldRisha || isOldSanjay || isOldAlfaaz) return true;

  // Check 2: Specific sequence numbers PHA-1001 to PHA-1007 if dated August 2026
  if (['PHA-1001', 'PHA-1002', 'PHA-1003', 'PHA-1004', 'PHA-1005', 'PHA-1006', 'PHA-1007'].includes(seqNum)) {
    if (billDate.includes('2026-08') || billDate.includes('Aug 2026') || !billDate) {
      return true;
    }
  }

  return false;
};

export const purgeOldPharmacyData = () => {
  try {
    // 1. Clean from localStorage: STORAGE_KEYS.BILLING ('hms_billing')
    const billingList = storage.get<any[]>(STORAGE_KEYS.BILLING, []);
    if (Array.isArray(billingList) && billingList.length > 0) {
      const filtered = billingList.filter(b => {
        const isPharma = b.type === 'Pharmacy' || b.invoice_items?.some((item: any) => item.category?.toUpperCase() === 'PHARMACY');
        if (isPharma && isOldPharmacyTestData(b)) {
          return false; // Remove old test data
        }
        return true;
      });
      if (filtered.length !== billingList.length) {
        storage.set(STORAGE_KEYS.BILLING, filtered);
      }
    }

    // 2. Clean from localStorage: STORAGE_KEYS.PHARMACY_BILLS ('hms_pharmacy_billing')
    const pharmaBills = storage.get<any[]>(STORAGE_KEYS.PHARMACY_BILLS, []);
    if (Array.isArray(pharmaBills) && pharmaBills.length > 0) {
      const filteredPharma = pharmaBills.filter(b => !isOldPharmacyTestData(b));
      if (filteredPharma.length !== pharmaBills.length) {
        storage.set(STORAGE_KEYS.PHARMACY_BILLS, filteredPharma);
      }
    }

    // 3. Mark purged in localStorage so it's clean across sessions
    localStorage.setItem('hms_pharmacy_old_data_purged_aug2026', 'true');
  } catch (err) {
    console.error('Error purging old pharmacy test data:', err);
  }
};
