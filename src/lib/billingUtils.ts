import { getLocalDateStr, formatDate } from './utils';
import { storage } from './storage';

export function toDeterministicUuid(val: any): string {
  if (!val) return '';
  return String(val).trim().toLowerCase().replace(/[^0-9a-z]/g, '');
}

export function isDummyPatient(p: any): boolean {
  if (!p) return false;
  const id = String(p.id || p.patientId || p.patient_id || '').toLowerCase().trim();
  if (id.startsWith('dummy') || id.startsWith('mock')) {
    return true;
  }
  return false;
}

/**
 * Normalizes and reconciles hospital invoices with appointments.
 * This is the SINGLE SOURCE OF TRUTH used across Billing, OPD Summary, and Collections.
 */
export function reconcileInvoicesAndAppointments(
  invoicesData: any[] = [],
  appointmentsData: any[] = [],
  patientsData: any[] = [],
  staffData: any[] = []
): any[] {
  // 1. Enrich existing database invoices
  const enrichedInvoices = (invoicesData || []).map((inv: any) => {
    let pat = inv.patients;
    if (!pat || !pat.name || pat.name === 'Walk-in Patient') {
      const pId = inv.patient_id || inv.patientId;
      const matchedP = patientsData ? patientsData.find((p: any) => p.id === pId) : null;
      if (matchedP) {
        pat = {
          id: matchedP.id,
          name: matchedP.name,
          mrn: matchedP.mrn,
          phone: matchedP.phone,
          email: matchedP.email
        };
      }
    }

    const rawDate = inv.created_at || inv.date;
    const displayDate = rawDate ? formatDate(rawDate) : formatDate(new Date().toISOString());

    const grossAmt = Number(inv.total_amount) || 0;
    const discAmt = Number(inv.discount_amount) || 0;
    const taxAmt = Number(inv.tax_amount) || 0;
    const payAmt = inv.payable_amount !== undefined && inv.payable_amount !== null ? 
      Number(inv.payable_amount) : Math.max(0, grossAmt - discAmt + taxAmt);
    
    let paidAmt = Number(inv.paid_amount) || 0;
    const statusLower = String(inv.payment_status || inv.status || '').toLowerCase();
    if ((statusLower === 'paid' || statusLower === 'settled') && paidAmt === 0 && payAmt > 0) {
      paidAmt = payAmt;
    }

    let pMode = inv.payment_method || inv.payment_mode || inv.paymentMode || 'Cash';
    if (pMode === 'Cash' && inv.payment_reference) {
      const refLower = String(inv.payment_reference).toLowerCase();
      if (refLower.includes('upi') || refLower.includes('qr') || refLower.includes('gpay') || refLower.includes('phonepe') || refLower.includes('paytm')) {
        pMode = 'UPI / QR';
      }
    }

    return {
      ...inv,
      patientName: pat?.name || inv.patient_name || inv.patientName || 'Unknown Patient',
      patientMrn: pat?.mrn || inv.patient_mrn || inv.patientMrn || 'N/A',
      patientPhone: pat?.phone || inv.patient_phone || inv.patientPhone || 'N/A',
      patient: pat,
      patients: pat,
      date: displayDate,
      total_amount: grossAmt,
      discount_amount: discAmt,
      payable_amount: payAmt,
      paid_amount: paidAmt,
      status: inv.payment_status || inv.status || 'Pending',
      payment_status: inv.payment_status || inv.status || 'Pending',
      payment_method: pMode,
      payment_mode: pMode
    };
  }).filter((inv: any) => {
    const pat = inv.patients || { id: inv.patient_id || inv.patientId, name: inv.patient_name || inv.patientName };
    return !isDummyPatient(pat);
  });

  // 2. Synthesize virtual invoices for any OPD appointments that do not have a database invoice
  const missingAptInvoices: any[] = [];
  const clearedVirtuals = storage.get<string[]>('hms_cleared_virtual_invoices', []) || [];
  const billingClearedAt = storage.get<string | null>('hms_billing_cleared_at', null);
  const clearedTimestamp = billingClearedAt ? new Date(billingClearedAt).getTime() : 0;

  if (appointmentsData && appointmentsData.length > 0) {
    const matchedInvoiceIds = new Set<string>();

    // Sort appointments chronologically so token 1, 2, ... claim matching invoices in sequence
    const sortedApts = [...appointmentsData].sort((a: any, b: any) => {
      const aTime = new Date(a.appointment_date || a.created_at || 0).getTime();
      const bTime = new Date(b.appointment_date || b.created_at || 0).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return (Number(a.token_number || a.tokenNumber) || 0) - (Number(b.token_number || b.tokenNumber) || 0);
    });

    sortedApts.forEach((apt: any) => {
      const virtId = `virtual-inv-opd-${apt.id}`;
      if (clearedVirtuals.includes(virtId)) return;

      if (clearedTimestamp > 0) {
        const aptTime = new Date(apt.created_at || apt.appointment_date || 0).getTime();
        if (aptTime <= clearedTimestamp) return;
      }

      const aptPaymentStatus = apt.payment_status || apt.paymentStatus || 'Pending';
      if (aptPaymentStatus === 'Cancelled') return;

      const pId = apt.patient_id || apt.patientId;
      const aptDateStr = getLocalDateStr(apt.appointment_date || apt.created_at);
      const aptDoc = apt.doctor || apt.doctorName || (staffData ? staffData.find((s: any) => s.id === apt.doctorId || s.id === apt.doctor_id)?.name : null) || '';

      // 1. Direct ID or reference linkage
      let existingInvoice = enrichedInvoices.find((inv: any) => {
        if (matchedInvoiceIds.has(inv.id)) return false;
        if (inv.id === apt.id || inv.id === `virtual-inv-opd-${apt.id}`) return true;
        if (inv.appointment_id && inv.appointment_id === apt.id) return true;
        if (inv.invoice_number && apt.id && String(inv.invoice_number).includes(String(apt.id))) return true;
        return false;
      });

      // 2. Patient match with specific OPD consultation invoice on the same date with matching doctor
      if (!existingInvoice) {
        existingInvoice = enrichedInvoices.find((inv: any) => {
          if (matchedInvoiceIds.has(inv.id)) return false;
          const invPid = inv.patient_id || inv.patientId;
          const cleanInvPid = toDeterministicUuid(invPid);
          const cleanAptPid = toDeterministicUuid(pId);
          if (cleanInvPid !== cleanAptPid) return false;

          const isOpdType = (inv.type || '').toUpperCase() === 'OPD' ||
            String(inv.invoice_number || '').startsWith('INV-OPD') ||
            (inv.invoice_items || []).some((it: any) => 
              ['OPD', 'CONSULTATION', 'OPD/CONSULTANCY'].includes((it.category || it.item_type || '').toUpperCase())
            );
          if (!isOpdType) return false;

          const invDateStr = getLocalDateStr(inv.created_at || inv.date);
          if (invDateStr !== aptDateStr) return false;

          const itemDesc = inv.invoice_items?.[0]?.description || inv.invoice_items?.[0]?.item_name || '';
          if (aptDoc && itemDesc.toLowerCase().includes(aptDoc.toLowerCase().trim())) {
            return true;
          }
          return false;
        });
      }

      // 3. Fallback: Patient match with any OPD consultation invoice on the same date
      if (!existingInvoice) {
        existingInvoice = enrichedInvoices.find((inv: any) => {
          if (matchedInvoiceIds.has(inv.id)) return false;
          const invPid = inv.patient_id || inv.patientId;
          const cleanInvPid = toDeterministicUuid(invPid);
          const cleanAptPid = toDeterministicUuid(pId);
          if (cleanInvPid !== cleanAptPid) return false;

          const isOpdType = (inv.type || '').toUpperCase() === 'OPD' ||
            String(inv.invoice_number || '').startsWith('INV-OPD') ||
            (inv.invoice_items || []).some((it: any) => 
              ['OPD', 'CONSULTATION', 'OPD/CONSULTANCY'].includes((it.category || it.item_type || '').toUpperCase())
            );
          if (!isOpdType) return false;

          const invDateStr = getLocalDateStr(inv.created_at || inv.date);
          return invDateStr === aptDateStr;
        });
      }

      if (existingInvoice) {
        matchedInvoiceIds.add(existingInvoice.id);
      } else {
        const baseFee = Number(apt.fee || apt.appointmentFee || 500);
        const discount = Number(apt.discount_amount || apt.discountAmount || 0);
        const feeToCollect = Math.max(0, baseFee - discount);
        const matchedPatient = patientsData ? patientsData.find((p: any) => p.id === pId) : null;
        const isPaid = aptPaymentStatus === 'Paid' || aptPaymentStatus === 'Settled';

        const docName = aptDoc || 'General Physician';
        const opdDesc = `OPD Doctor Consultation Fee (${docName})`;

        const virtualInv = {
          id: `virtual-inv-opd-${apt.id}`,
          appointment_id: apt.id,
          patient_id: pId,
          invoice_number: `INV-OPD-V-${apt.id}`,
          status: isPaid ? 'Paid' : aptPaymentStatus === 'Refunded' ? 'Refunded' : 'Unpaid',
          payment_status: isPaid ? 'Paid' : aptPaymentStatus === 'Refunded' ? 'Refunded' : 'Unpaid',
          total_amount: baseFee,
          discount_amount: discount,
          payable_amount: feeToCollect,
          paid_amount: isPaid ? feeToCollect : 0,
          payment_method: apt.payment_method || apt.paymentMethod || apt.payment_mode || apt.paymentMode || 'Cash',
          payment_mode: apt.payment_mode || apt.paymentMode || apt.payment_method || apt.paymentMethod || 'Cash',
          payment_remarks: apt.paymentRemarks || '',
          type: 'OPD',
          description: opdDesc,
          items: [{
            item_name: opdDesc,
            description: opdDesc,
            quantity: 1,
            unit_price: baseFee,
            total_price: baseFee,
            category: 'OPD'
          }],
          invoice_items: [{
            item_name: opdDesc,
            description: opdDesc,
            quantity: 1,
            unit_price: baseFee,
            total_price: baseFee,
            category: 'OPD'
          }],
          created_at: apt.created_at || apt.appointment_date || new Date().toISOString(),
          patients: matchedPatient ? {
            id: matchedPatient.id,
            name: matchedPatient.name,
            mrn: matchedPatient.mrn,
            phone: matchedPatient.phone,
            email: matchedPatient.email
          } : {
            id: pId,
            name: apt.patientName || 'Unknown',
            phone: apt.patientPhone || 'N/A',
            mrn: apt.patientMrn || 'N/A'
          }
        };
        missingAptInvoices.push(virtualInv);
      }
    });
  }

  return [...enrichedInvoices, ...missingAptInvoices];
}

/**
 * Reconciles appointments with bills into processed OPD rows.
 * Handles 1-to-1 linkage, doctor extraction, and inclusion of any direct OPD invoices.
 */
export function reconcileOPDAppointments(
  appointments: any[] = [],
  bills: any[] = [],
  users: any[] = []
): any[] {
  const invoiceList = Array.isArray(bills) ? bills : [];
  const matchedInvoiceIds = new Set<string>();

  // Sort appointments chronologically so token 1, 2, ... claim matching invoices in sequence
  const sortedAppointments = [...appointments].sort((a: any, b: any) => {
    const aTime = new Date(a.appointment_date || a.created_at || 0).getTime();
    const bTime = new Date(b.appointment_date || b.created_at || 0).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return (Number(a.token_number || a.tokenNumber) || 0) - (Number(b.token_number || b.tokenNumber) || 0);
  });

  const aptRows = sortedAppointments.map((apt: any) => {
    const aptId = apt.id;
    const pId = apt.patient_id || apt.patientId;
    const aptDateStr = getLocalDateStr(apt.appointment_date || apt.date || apt.created_at);
    const docName = apt.doctor || apt.doctorName || (users.find((u: any) => u.id === apt.doctor_id || u.id === apt.doctorId)?.name) || 'General Consultation';
    const docObj = users.find((u: any) => u.name === docName || u.id === apt.doctor_id);

    // 1. Direct linkage
    let matchedInv = invoiceList.find((inv: any) => {
      if (matchedInvoiceIds.has(inv.id)) return false;
      if (inv.appointment_id && inv.appointment_id === aptId) return true;
      if (inv.id === aptId || inv.id === `virtual-inv-opd-${aptId}`) return true;
      if (aptId && inv.invoice_number && String(inv.invoice_number).includes(String(aptId))) return true;
      return false;
    });

    // 2. Patient match with specific OPD consultation invoice on same date with matching doctor
    if (!matchedInv) {
      matchedInv = invoiceList.find((inv: any) => {
        if (matchedInvoiceIds.has(inv.id)) return false;
        const invPid = inv.patient_id || inv.patientId;
        const cleanInvPid = toDeterministicUuid(invPid);
        const cleanAptPid = toDeterministicUuid(pId);
        if (cleanInvPid !== cleanAptPid) return false;

        const isOpd = (inv.type || '').toUpperCase() === 'OPD' ||
          String(inv.invoice_number || '').startsWith('INV-OPD') ||
          (inv.invoice_items || []).some((it: any) =>
            ['OPD', 'CONSULTATION', 'OPD/CONSULTANCY'].includes((it.category || it.item_type || '').toUpperCase())
          );
        if (!isOpd) return false;

        const invDateStr = getLocalDateStr(inv.created_at || inv.date);
        if (invDateStr !== aptDateStr) return false;

        const itemDesc = inv.invoice_items?.[0]?.description || inv.invoice_items?.[0]?.item_name || '';
        if (docName && itemDesc.toLowerCase().includes(docName.toLowerCase().trim())) {
          return true;
        }
        return false;
      });
    }

    // 3. Patient match on same date
    if (!matchedInv) {
      matchedInv = invoiceList.find((inv: any) => {
        if (matchedInvoiceIds.has(inv.id)) return false;
        const invPid = inv.patient_id || inv.patientId;
        const cleanInvPid = toDeterministicUuid(invPid);
        const cleanAptPid = toDeterministicUuid(pId);
        if (cleanInvPid !== cleanAptPid) return false;

        const isOpd = (inv.type || '').toUpperCase() === 'OPD' ||
          String(inv.invoice_number || '').startsWith('INV-OPD') ||
          (inv.invoice_items || []).some((it: any) =>
            ['OPD', 'CONSULTATION', 'OPD/CONSULTANCY'].includes((it.category || it.item_type || '').toUpperCase())
          );
        if (!isOpd) return false;

        const invDateStr = getLocalDateStr(inv.created_at || inv.date);
        return invDateStr === aptDateStr;
      });
    }

    if (matchedInv) {
      matchedInvoiceIds.add(matchedInv.id);
    }

    const isCancelled = (apt.status || '').toLowerCase() === 'cancelled' ||
                        (apt.payment_status || '').toLowerCase() === 'cancelled' ||
                        (matchedInv?.payment_status || '').toLowerCase() === 'cancelled';

    // Base consultation fee determination
    let grossFee = Number(matchedInv?.total_amount ?? apt.fee);
    if ((!grossFee || isNaN(grossFee)) && !isCancelled) {
      grossFee = docObj?.consultationFee ? Number(docObj.consultationFee) : 500;
    }
    grossFee = Math.max(0, grossFee || 0);

    const discountAmount = Number(matchedInv?.discount_amount ?? apt.discount_amount ?? apt.discountAmount ?? 0);
    const billedAmount = isCancelled ? 0 : (matchedInv?.payable_amount !== undefined ? Number(matchedInv.payable_amount) : Math.max(0, grossFee - discountAmount));

    const rawPaymentStatus = String(matchedInv?.status || matchedInv?.payment_status || apt.payment_status || apt.paymentStatus || 'Pending').toLowerCase();
    const isPaid = !isCancelled && (
      rawPaymentStatus === 'paid' || 
      rawPaymentStatus === 'settled' ||
      (matchedInv?.paid_amount && Number(matchedInv.paid_amount) >= billedAmount && billedAmount > 0)
    );
    const isRefunded = !isCancelled && (
      rawPaymentStatus === 'refunded' || 
      apt.payment_status === 'Refunded'
    );

    const paidAmount = isCancelled ? 0 : (isPaid ? (matchedInv?.paid_amount !== undefined ? Number(matchedInv.paid_amount) : billedAmount) : (isRefunded ? 0 : Number(matchedInv?.paid_amount || 0)));
    const pendingDue = isCancelled || isRefunded ? 0 : Math.max(0, billedAmount - paidAmount);

    const paymentStatus = isCancelled ? 'Cancelled' : isRefunded ? 'Refunded' : isPaid ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending');
    const paymentMode = matchedInv?.payment_method || matchedInv?.payment_mode || apt.payment_method || apt.payment_mode || 'Cash';

    // Extract doctor name from invoice particulars if present
    let cleanDoctor = docName;
    if (matchedInv?.invoice_items && matchedInv.invoice_items.length > 0) {
      const itemDesc = matchedInv.invoice_items[0].description || matchedInv.invoice_items[0].item_name || '';
      const docMatch = itemDesc.match(/(?:Appointment|Consultation) Fee - (.+)/i);
      if (docMatch && docMatch[1] && docMatch[1].trim()) {
        cleanDoctor = docMatch[1].trim();
      }
    }

    const dateParts = aptDateStr.split('-');
    const year = dateParts[0] || new Date().getFullYear().toString();
    const monthNum = dateParts[1] || '01';
    const monthNames = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[parseInt(monthNum, 10) - 1] || "January";

    return {
      ...apt,
      invoiceId: matchedInv?.id,
      invoiceNumber: matchedInv?.invoice_number,
      cleanDate: aptDateStr,
      cleanDoctor,
      doctorDepartment: docObj?.department || apt.doctorDepartment || 'General Medicine',
      grossFee,
      discountAmount,
      billedAmount,
      paidAmount,
      pendingDue,
      isPaid,
      isRefunded,
      isCancelled,
      paymentStatus,
      paymentMode,
      monthYear: `${monthName} ${year}`,
      monthNum,
      year
    };
  });

  // 4. Also include any OPD invoices that were created directly in Billing (not linked to an appointment)
  const unmatchedOpdInvoices = invoiceList.filter((inv: any) => {
    if (matchedInvoiceIds.has(inv.id)) return false;
    const isOpd = (inv.type || '').toUpperCase() === 'OPD' ||
      String(inv.invoice_number || '').startsWith('INV-OPD') ||
      (inv.invoice_items || []).some((it: any) =>
        ['OPD', 'CONSULTATION', 'OPD/CONSULTANCY'].includes((it.category || it.item_type || '').toUpperCase())
      );
    return isOpd;
  });

  const extraRows = unmatchedOpdInvoices.map((inv: any) => {
    const invDateStr = getLocalDateStr(inv.created_at || inv.date);
    const grossFee = Number(inv.total_amount || 0);
    const discountAmount = Number(inv.discount_amount || 0);
    const billedAmount = inv.payable_amount !== undefined ? Number(inv.payable_amount) : Math.max(0, grossFee - discountAmount);
    const rawStatus = String(inv.status || inv.payment_status || '').toLowerCase();
    const isPaid = rawStatus === 'paid' || rawStatus === 'settled';
    const isRefunded = rawStatus === 'refunded';
    const isCancelled = rawStatus === 'cancelled';
    const paidAmount = isCancelled ? 0 : (isPaid ? (inv.paid_amount !== undefined ? Number(inv.paid_amount) : billedAmount) : (isRefunded ? 0 : Number(inv.paid_amount || 0)));
    const pendingDue = isCancelled || isRefunded ? 0 : Math.max(0, billedAmount - paidAmount);
    
    let cleanDoctor = 'General Consultation';
    if (inv.invoice_items && inv.invoice_items.length > 0) {
      const itemDesc = inv.invoice_items[0].description || inv.invoice_items[0].item_name || '';
      const docMatch = itemDesc.match(/(?:Appointment|Consultation) Fee - (.+)/i);
      if (docMatch && docMatch[1] && docMatch[1].trim()) {
        cleanDoctor = docMatch[1].trim();
      }
    }

    const docObj = users.find((u: any) => u.name === cleanDoctor);
    const dateParts = invDateStr.split('-');
    const year = dateParts[0] || new Date().getFullYear().toString();
    const monthNum = dateParts[1] || '01';
    const monthNames = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[parseInt(monthNum, 10) - 1] || "January";

    return {
      id: inv.id,
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      patientName: inv.patientName || inv.patients?.name || 'Walk-in Patient',
      patientMrn: inv.patientMrn || inv.patients?.mrn || 'N/A',
      patientPhone: inv.patientPhone || inv.patients?.phone || 'N/A',
      cleanDate: invDateStr,
      cleanDoctor,
      doctorDepartment: docObj?.department || 'General Medicine',
      grossFee,
      discountAmount,
      billedAmount,
      paidAmount,
      pendingDue,
      isPaid,
      isRefunded,
      isCancelled,
      paymentStatus: isCancelled ? 'Cancelled' : isRefunded ? 'Refunded' : isPaid ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending'),
      paymentMode: inv.payment_method || inv.payment_mode || 'Cash',
      monthYear: `${monthName} ${year}`,
      monthNum,
      year
    };
  });

  return [...aptRows, ...extraRows];
}
