export interface PrintPatient {
  name: string;
  age?: number | string;
  gender?: string;
  mrn?: string;
  phone?: string;
  fatherName?: string;
}

export interface PrintMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  time?: string;
  startTime?: string;
}

export interface PrintVitals {
  temp?: string | number;
  bp?: string;
  pulse?: string | number;
  spo2?: string | number;
  weight?: string | number;
  rr?: string | number;
  rbs?: string | number;
}

export interface PrintPrescription {
  date?: string;
  medicines: PrintMedicine[];
  advice?: string;
  diagnosis?: string;
  notes?: string;
  vitals?: PrintVitals;
  isBlank?: boolean;
}

export interface PrintDoctor {
  name?: string;
  degree?: string;
  specialization?: string;
  department?: string;
  id?: string;
}

export function parseStoredImage(val: string | null | undefined): string | null {
  if (!val || typeof val !== 'string') return null;
  let clean = val.trim();
  while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    try {
      clean = JSON.parse(clean);
    } catch {
      clean = clean.slice(1, -1).trim();
    }
  }
  if (!clean || clean === 'null' || clean === 'undefined') return null;
  if (clean.startsWith('http') || clean.startsWith('data:image') || clean.startsWith('/') || clean.startsWith('blob:')) {
    return clean;
  }
  return null;
}

export function getPrescriptionPrintHtml(
  patient: PrintPatient,
  prescription: PrintPrescription,
  doctor?: PrintDoctor | string,
  hospitalInfo?: { name: string; address: string; phone: string },
  templateImage?: string | null | { isBlank?: boolean },
  headerImage?: string | null,
  footerImage?: string | null,
  options?: { isBlank?: boolean }
): string {
  const isBlank = !!(
    (options && options.isBlank) ||
    (typeof templateImage === 'object' && templateImage !== null && (templateImage as any).isBlank) ||
    (prescription as any)?.isBlank
  );

  const rawTemplate = (templateImage !== undefined && templateImage !== null && typeof templateImage === 'string')
    ? templateImage
    : ((hospitalInfo as any)?.template_image
      ? (hospitalInfo as any).template_image
      : (typeof window !== 'undefined' ? (localStorage.getItem('hms_template_image')) : null));

  const rawHeader = (headerImage !== undefined && headerImage !== null)
    ? headerImage
    : ((hospitalInfo as any)?.header_image
      ? (hospitalInfo as any).header_image
      : (typeof window !== 'undefined' ? (localStorage.getItem('hms_prescription_header_image')) : null));

  const rawFooter = (footerImage !== undefined && footerImage !== null)
    ? footerImage
    : ((hospitalInfo as any)?.footer_image
      ? (hospitalInfo as any).footer_image
      : (typeof window !== 'undefined' ? (localStorage.getItem('hms_prescription_footer_image')) : null));

  const actualTemplateImage = parseStoredImage(rawTemplate);
  const actualHeaderImage = parseStoredImage(rawHeader);
  const actualFooterImage = parseStoredImage(rawFooter);

  // Parse whether there is a valid custom preprinted background letterhead image (to overlay on)
  const isValidTemplateImage = !!actualTemplateImage;
  const isValidHeaderImage = !!actualHeaderImage;
  const isValidFooterImage = !!actualFooterImage;

  const defaultAddress = 'Near-Aura Inn Hotel, Bargadwa Badeban, Bansi & Dumariyaganj Road-Basti 272001';
  const defaultPhone = '+91- 8299713820 / +91- 7007128144';

  const hospName = hospitalInfo?.name || 'GLOBAL HOSPITAL';
  const rawHospAddress = hospitalInfo?.address || '';
  const hospAddress = (rawHospAddress && rawHospAddress.trim() && !rawHospAddress.toLowerCase().includes('123 healthcare way'))
    ? rawHospAddress
    : defaultAddress;

  const rawHospPhone = hospitalInfo?.phone || '';
  const hospPhone = (rawHospPhone && rawHospPhone.trim() && !rawHospPhone.includes('98765 43210'))
    ? rawHospPhone
    : defaultPhone;

  const phoneList = hospPhone.split(/[,/\n]/).map(p => p.trim()).filter(Boolean);
  const hospEmail = `contact@${hospName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'globalhospital'}.com`;
  
  const patName = patient?.name || '-';
  const ageStr = patient?.age ? `${patient.age}Y` : '';
  const genderStr = patient?.gender || '';
  const patAgeGender = [ageStr, genderStr].filter(Boolean).join(' / ') || '-';
  const presDate = prescription?.date || new Date().toISOString().split('T')[0];
  const rawMrn = patient?.mrn || (patient as any)?.id || '';
  const patMRN = rawMrn ? (rawMrn.startsWith('MRN') ? rawMrn : `MRN-${rawMrn}`) : '-';
  const patPhone = patient?.phone || (patient as any)?.mobile || '-';
  const patFatherName = patient?.fatherName || (patient as any)?.father_name || '-';

  // Extract vitals
  const vts = prescription?.vitals;
  const bpVal = vts?.bp || '';
  const pulseVal = vts?.pulse !== undefined && vts?.pulse !== 0 && vts?.pulse !== '' ? String(vts.pulse) : '';
  const tempVal = vts?.temp !== undefined && vts?.temp !== 0 && vts?.temp !== '' ? String(vts.temp) : '';
  const spo2Val = vts?.spo2 !== undefined && vts?.spo2 !== 0 && vts?.spo2 !== '' ? String(vts.spo2) : '';
  const weightVal = vts?.weight !== undefined && vts?.weight !== 0 && vts?.weight !== '' ? String(vts.weight) : '';
  const rrVal = vts?.rr !== undefined && vts?.rr !== 0 && vts?.rr !== '' ? String(vts.rr) : '';
  const rbsVal = vts?.rbs !== undefined && vts?.rbs !== 0 && vts?.rbs !== '' ? String(vts.rbs) : '';

  let rawDocName = '';
  let docDept = '';
  let docSpec = '';
  let docDegree = '';
  let docReg = '';

  if (typeof doctor === 'string') {
    rawDocName = doctor;
  } else if (doctor && typeof doctor === 'object') {
    rawDocName = doctor.name || (doctor as any).doctor_name || (doctor as any).doctorName || '';
    docDept = doctor.department || '';
    docSpec = doctor.specialization || '';
    docDegree = doctor.degree || '';
    docReg = (doctor as any).regNo || (doctor as any).reg_no || (doctor as any).registrationNo || '';
    if (!docReg && doctor.id) {
      docReg = `Reg No: MC-${doctor.id.toString().toUpperCase()}`;
    }
  }

  // Fall back to prescription doctor fields
  if (!rawDocName && prescription) {
    rawDocName = (prescription as any).doctor || (prescription as any).doctor_name || (prescription as any).doctorName || (prescription as any).consultingDoctor || '';
    if (!docDept) docDept = (prescription as any).department || (prescription as any).doctorDepartment || '';
    if (!docDegree) docDegree = (prescription as any).doctorDegree || (prescription as any).degree || '';
    if (!docReg) docReg = (prescription as any).doctorRegNo || (prescription as any).regNo || '';
  }

  // Fall back to patient attending doctor fields
  if (!rawDocName && patient) {
    rawDocName = (patient as any).attending_doctor_name || (patient as any).doctor || (patient as any).doctor_name || '';
  }

  // Try matching against stored staff/users in localStorage
  let storedUsers: any[] = [];
  try {
    const rawUsers = typeof window !== 'undefined' ? localStorage.getItem('hms_users') : null;
    if (rawUsers) storedUsers = JSON.parse(rawUsers);
  } catch {}

  const cleanDocStr = (s: any) => String(s || '').replace(/^dr\.?\s+/i, '').trim().toLowerCase();
  const targetClean = cleanDocStr(rawDocName);
  const targetId = String((doctor && typeof doctor === 'object' && doctor.id) || (prescription as any)?.doctorId || (prescription as any)?.doctor_id || '').trim().toLowerCase();

  let matchedUser = storedUsers.find((u: any) => {
    if (!u) return false;
    const uNameClean = cleanDocStr(u.name);
    const uId = String(u.id || '').trim().toLowerCase();

    if (targetId && uId === targetId) return true;
    if (targetClean && uNameClean === targetClean) return true;
    if (targetClean && targetClean.length > 3 && (uNameClean.includes(targetClean) || targetClean.includes(uNameClean))) return true;
    return false;
  });

  // If no doctor name yet, try logged in user or first doctor from storage
  if (!matchedUser && !rawDocName) {
    try {
      const curRaw = typeof window !== 'undefined' ? (localStorage.getItem('hms_current_user') || localStorage.getItem('currentUser') || localStorage.getItem('user')) : null;
      if (curRaw) {
        const cur = JSON.parse(curRaw);
        if (cur && cur.name) {
          matchedUser = cur;
        }
      }
    } catch {}

    if (!matchedUser && storedUsers.length > 0) {
      matchedUser = storedUsers.find((u: any) => 
        u.role?.toUpperCase() === 'DOCTOR' || 
        u.role?.toUpperCase() === 'SUPER_ADMIN' || 
        u.role?.toUpperCase() === 'SURGEON'
      ) || storedUsers[0];
    }
  }

  if (matchedUser) {
    if (!rawDocName) rawDocName = matchedUser.name || '';
    if (!docDept) docDept = matchedUser.department || matchedUser.specialization || '';
    if (!docSpec) docSpec = matchedUser.specialization || matchedUser.department || '';
    if (!docDegree) docDegree = matchedUser.degree || '';
    if (!docReg) {
      docReg = matchedUser.regNo || matchedUser.reg_no || matchedUser.registrationNo || (matchedUser.id ? `MC-${matchedUser.id.toString().toUpperCase()}` : '');
    }
  }

  const docName = rawDocName 
    ? (rawDocName.trim().startsWith('Dr.') ? rawDocName.trim() : `Dr. ${rawDocName.trim()}`) 
    : 'Dr. Attending Doctor';

  if (!docDept && docSpec) docDept = docSpec;
  if (!docDept) docDept = 'General Medicine';
  if (!docSpec) docSpec = docDept;

  if (docReg && !docReg.toLowerCase().startsWith('reg') && !docReg.toLowerCase().startsWith('mc')) {
    docReg = `Reg No: ${docReg}`;
  } else if (docReg && !docReg.toLowerCase().startsWith('reg')) {
    docReg = `Reg No: ${docReg}`;
  }

  // Format Medicines content with icons
  let medContent = '';
  if (prescription.medicines && prescription.medicines.length > 0) {
    medContent = prescription.medicines.map(m => {
      const isSyrup = (m.name || '').toLowerCase().includes('syr') || (m.name || '').toLowerCase().includes('syrup') || (m.name || '').toLowerCase().includes('susp');
      const iconSvg = isSyrup 
        ? `<div style="width: 28px; height: 28px; background: #eff6ff; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; color: #0284c7; flex-shrink: 0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2h8v4H8z"/><path d="M6 6h12v15a1 1 0 01-1 1H7a1 1 0 01-1-1V6z"/><path d="M10 12h4"/><path d="M12 10v4"/></svg></div>`
        : `<div style="width: 28px; height: 28px; background: #eff6ff; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; color: #0284c7; flex-shrink: 0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.5 20.4l-6.9-6.9c-2-2-2-5.1 0-7.1l.7-.7c2-2 5.1-2 7.1 0l6.9 6.9c2 2 2 5.1 0 7.1l-.7.7c-2 2-5.1 2-7.1 0z"/><path d="M8.5 8.5l7 7"/></svg></div>`;

      return `
        <tr style="border-bottom: 1px solid #cbd5e1; page-break-inside: avoid;">
          <td style="padding: 12px 14px; font-weight: 900; color: #000000; font-size: 14.5px; vertical-align: middle;">
            <div style="display: flex; align-items: center;">
              ${iconSvg}
              <span>${m.name}</span>
            </div>
          </td>
          <td style="padding: 12px 14px; font-weight: 800; color: #000000; font-size: 14px; text-align: center; vertical-align: middle;">${m.dosage || '-'}</td>
          <td style="padding: 12px 14px; font-weight: 800; color: #000000; font-size: 14px; text-align: center; vertical-align: middle;">${m.frequency || '-'}</td>
          <td style="padding: 12px 14px; font-weight: 800; color: #000000; font-size: 14px; text-align: center; vertical-align: middle;">${m.duration || '-'}</td>
        </tr>
      `;
    }).join('');
  } else {
    for (let i = 0; i < 5; i++) {
      medContent += `
        <tr style="border-bottom: 1px dotted #cbd5e1; height: 48px; page-break-inside: avoid;">
          <td style="padding: 12px 16px;"></td>
          <td style="padding: 12px 16px;"></td>
          <td style="padding: 12px 16px;"></td>
          <td style="padding: 12px 16px;"></td>
        </tr>
      `;
    }
  }

  // Parse Advice into bullets if string with lines
  let adviceItems: string[] = [];
  if (prescription.advice) {
    adviceItems = prescription.advice.split(/\n+/).map(s => s.trim().replace(/^[•\-\*]\s*/, '')).filter(Boolean);
  } else if (prescription.notes) {
    adviceItems = prescription.notes.split(/\n+/).map(s => s.trim().replace(/^[•\-\*]\s*/, '')).filter(Boolean);
  }

  const adviceContent = `
    <div style="margin-top: 24px; font-family: 'Plus Jakarta Sans', sans-serif; page-break-inside: avoid;">
      <div style="background: #ffffff; border: 1.5px solid #0052cc; border-radius: 12px; padding: 14px 18px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="width: 24px; height: 24px; background: #e0edff; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #0052cc;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>
          </div>
          <span style="font-weight: 800; font-size: 12px; text-transform: uppercase; color: #0052cc; letter-spacing: 0.05em;">CLINICAL REMARKS & ADVICE:</span>
        </div>
        ${prescription.diagnosis ? `<div style="font-weight: 800; color: #000000; margin-left: 32px; margin-bottom: 6px; font-size: 14px;">Diagnosis: ${prescription.diagnosis}</div>` : ''}
        ${adviceItems.length > 0 ? `
          <ul style="margin: 0 0 0 32px; padding: 0; list-style-type: disc; color: #000000; font-size: 14px; font-weight: 700; line-height: 1.6;">
            ${adviceItems.map(item => `<li style="margin-bottom: 4px;">${item}</li>`).join('')}
          </ul>
        ` : `<div style="margin-left: 32px; color: #000000; font-size: 14px; font-weight: 700;">-</div>`}
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prescription - ${patName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 6mm 8mm 6mm 8mm;
          }

          * {
            box-sizing: border-box;
          }

          html, body {
            margin: 0;
            padding: 0;
            font-family: 'Plus Jakarta Sans', sans-serif;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-color: #fff;
          }

          @media screen {
            body {
              background-color: #f1f5f9;
              padding: 12px;
              min-width: 720px;
              box-sizing: border-box;
            }
            .container {
              background: #ffffff;
              box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
              border-radius: 8px;
              width: 100%;
              max-width: 820px;
              margin: 0 auto;
              padding: 18px;
              min-height: auto;
              box-sizing: border-box;
            }
          }

          @media print {
            html, body {
              height: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              overflow: visible !important;
            }
            .container {
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              page-break-inside: avoid !important;
            }
          }

          .container {
            width: 100%;
            position: relative;
            padding-top: ${isValidTemplateImage ? '220px' : '0px'};
            display: flex;
            flex-direction: column;
            page-break-inside: avoid;
          }
          
          .header-wrapper {
            position: relative;
            width: 100%;
            margin-bottom: 16px;
            display: ${isValidTemplateImage ? 'none' : 'block'};
          }

          /* Top right red arch curve */
          .top-right-swoop {
            position: absolute;
            top: -10px;
            right: -12px;
            width: 300px;
            height: 120px;
            pointer-events: none;
            z-index: 1;
          }
          
          .header-content {
            position: relative;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 6px;
            padding-right: 16px;
          }

          /* Rx Symbol */
          .rx-symbol {
            font-size: 38px;
            font-style: italic;
            font-weight: 800;
            font-family: 'Playfair Display', Georgia, serif;
            margin: 12px 0 8px 0;
            color: #0052cc;
            display: inline-block;
          }

          /* Medicines Table */
          .meds-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-bottom: 16px;
            border: 1.5px solid #0052cc;
            border-radius: 12px;
            overflow: hidden;
            page-break-inside: auto;
          }
          .meds-table th {
            background-color: #0052cc;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            padding: 10px 14px;
            text-align: center;
          }
          .meds-table th:first-child {
            text-align: left;
          }
          
          /* Footer Signatures */
          .footer-signatures {
            margin-top: 20px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            page-break-inside: avoid;
          }

          /* Bottom Footer Box */
          .static-bottom-bar {
            position: relative;
            margin-top: 16px;
            border: 1.5px solid #0052cc;
            border-radius: 12px;
            padding: 10px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #ffffff;
            page-break-inside: avoid;
            width: 100%;
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${isValidTemplateImage ? `<div class="template-bg" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;"><img src="${actualTemplateImage}" style="width:100%;" /></div>` : ''}
          
          ${isValidHeaderImage ? `
            <div style="margin-bottom: 16px; width: 100%; text-align: center; page-break-inside: avoid;">
              <img src="${actualHeaderImage}" style="width: 100%; height: auto; max-height: 200px; object-fit: fill; display: block; border-radius: 6px;" />
            </div>
          ` : `
            <!-- STATIC HEADER (Matches Template Image Exactly) -->
            <div class="header-wrapper">
              <!-- Top Right Red Gradient Arch -->
              <svg class="top-right-swoop" viewBox="0 0 320 130" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#b91c1c" />
                    <stop offset="60%" stop-color="#dc2626" />
                    <stop offset="100%" stop-color="#800000" />
                  </linearGradient>
                  <pattern id="dotGrid" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="#ffffff" opacity="0.35" />
                  </pattern>
                </defs>
                <path d="M 320,0 L 320,130 Q 180,120 80,0 Z" fill="url(#redGrad)" />
                <path d="M 320,0 L 320,130 Q 180,120 80,0 Z" fill="url(#dotGrid)" />
                <path d="M 320,0 L 320,130 Q 195,105 100,0 Z" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.7" />
              </svg>

              <div class="header-content">
                <!-- Left: Circular Double-Ring GH Logo -->
                <div style="display: flex; align-items: center;">
                  <svg viewBox="0 0 100 100" style="width: 82px; height: 82px; flex-shrink: 0;">
                    <circle cx="50" cy="50" r="47" fill="none" stroke="#003b7a" stroke-width="3.5" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#dc2626" stroke-width="1.5" />
                    <circle cx="50" cy="50" r="41" fill="#ffffff" />
                    
                    <circle cx="50" cy="50" r="33" fill="none" stroke="#dc2626" stroke-width="1" stroke-dasharray="2.5,2" />
                    <text x="50" y="54" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="26" fill="#003b7a" text-anchor="middle" dominant-baseline="middle" style="letter-spacing: -1px;">GH</text>
                    
                    <path id="txtArcTop" d="M 17,50 A 33,33 0 1,1 83,50" fill="none" />
                    <text font-size="5.8" font-weight="900" fill="#003b7a" font-family="'Plus Jakarta Sans', sans-serif">
                      <textPath href="#txtArcTop" startOffset="50%" text-anchor="middle">GLOBAL HOSPITAL</textPath>
                    </text>
                    
                    <path id="txtArcBtm" d="M 83,50 A 33,33 0 0,1 17,50" fill="none" />
                    <text font-size="5" font-weight="800" fill="#dc2626" font-family="'Plus Jakarta Sans', sans-serif">
                      <textPath href="#txtArcBtm" startOffset="50%" text-anchor="middle">& MATERNITY CENTER</textPath>
                    </text>
                  </svg>
                </div>

                <!-- Center: Bold Red Hindi Title -->
                <div style="flex-grow: 1; text-align: center; margin-left: -20px;">
                  <div style="font-family: 'Noto Sans Devanagari', sans-serif; font-weight: 900; font-size: 38px; color: #cc0000; letter-spacing: 0.5px; line-height: 1; margin: 0;">
                    ग्लोबल हॉस्पिटल
                  </div>
                  <div style="font-family: 'Noto Sans Devanagari', sans-serif; font-weight: 800; font-size: 20px; color: #cc0000; letter-spacing: 0.5px; margin-top: 3px;">
                    एंड मैटरनिटी सेंटर
                  </div>
                  <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 6px;">
                    <div style="height: 1.5px; width: 80px; background: linear-gradient(90deg, transparent, #003b7a);"></div>
                    <div style="width: 5px; height: 5px; background-color: #003b7a; border-radius: 50%;"></div>
                    <div style="height: 1.5px; width: 80px; background: linear-gradient(90deg, #003b7a, transparent);"></div>
                  </div>
                </div>
              </div>
            </div>
          `}

          <!-- DYNAMIC PATIENT INFORMATION CARD -->
          <div style="border: 1.5px solid #0052cc; border-radius: 12px; padding: 12px 16px; background: #ffffff; margin-bottom: 14px; page-break-inside: avoid;">
            <!-- Row 1 -->
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; align-items: center;">
              <!-- Patient Name -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; background: #e0edff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0052cc; flex-shrink: 0;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div>
                  <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0052cc; letter-spacing: 0.05em;">PATIENT NAME</div>
                  <div style="font-size: 14.5px; font-weight: 900; color: #000000;">${patName}</div>
                </div>
              </div>

              <!-- Age / Gender -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; background: #e0edff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0052cc; flex-shrink: 0;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0052cc; letter-spacing: 0.05em;">AGE / GENDER</div>
                  <div style="font-size: 14px; font-weight: 900; color: #000000;">${patAgeGender}</div>
                </div>
              </div>

              <!-- Date -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; background: #e0edff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0052cc; flex-shrink: 0;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div>
                  <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0052cc; letter-spacing: 0.05em;">DATE</div>
                  <div style="font-size: 14px; font-weight: 900; color: #000000;">${presDate}</div>
                </div>
              </div>
            </div>

            <div style="height: 1px; background: #cbd5e1; margin: 10px 0;"></div>

            <!-- Row 2 -->
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; align-items: center;">
              <!-- Father / Husband Name -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; background: #e0edff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0052cc; flex-shrink: 0;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div>
                  <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0052cc; letter-spacing: 0.05em;">FATHER / HUSBAND NAME</div>
                  <div style="font-size: 14px; font-weight: 800; color: #000000;">${patFatherName}</div>
                </div>
              </div>

              <!-- Mobile No. -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; background: #e0edff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0052cc; flex-shrink: 0;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <div>
                  <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0052cc; letter-spacing: 0.05em;">MOBILE NO.</div>
                  <div style="font-size: 14px; font-weight: 800; color: #000000;">${patPhone}</div>
                </div>
              </div>

              <!-- MRN / Reg. No -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; background: #e0edff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0052cc; flex-shrink: 0;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="13" y2="12"/><line x1="7" y1="16" x2="10" y2="16"/></svg>
                </div>
                <div>
                  <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0052cc; letter-spacing: 0.05em;">MRN / REG. NO.</div>
                  <div style="font-size: 14px; font-weight: 900; color: #0040a8;">${patMRN}</div>
                </div>
              </div>
            </div>

            <div style="height: 1px; background: #cbd5e1; margin: 10px 0;"></div>

            <!-- Row 3 -->
            <div style="display: grid; grid-template-columns: 2fr 2fr; gap: 12px; align-items: center;">
              <!-- Consulting Doctor -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; background: #e0edff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0052cc; flex-shrink: 0;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.8 2.3A.3.3 0 0 0 4.5 2h-1a.3.3 0 0 0-.3.3V5a7 7 0 0 0 14 0V2.3a.3.3 0 0 0-.3-.3h-1a.3.3 0 0 0-.3.3V5a5 5 0 0 1-10 0V2.3z"/><path d="M8 17a5 5 0 0 0 10 0v-2a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v2z"/><circle cx="13" cy="19" r="2"/></svg>
                </div>
                <div>
                  <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0052cc; letter-spacing: 0.05em;">CONSULTING DOCTOR</div>
                  <div style="font-size: 14px; font-weight: 900; color: #000000;">${docName}</div>
                </div>
              </div>

              <!-- Department -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; background: #e0edff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0052cc; flex-shrink: 0;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div>
                  <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0052cc; letter-spacing: 0.05em;">DEPARTMENT</div>
                  <div style="font-size: 14px; font-weight: 800; color: #000000;">${docDept}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- DYNAMIC VITALS / O/E BOX -->
          <div style="border: 1.5px solid #0052cc; border-radius: 12px; padding: 10px 14px; margin-bottom: 14px; background: #ffffff; display: flex; align-items: center; gap: 12px; page-break-inside: avoid;">
            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0; border-right: 1.5px solid #cbd5e1; padding-right: 12px;">
              <div style="width: 26px; height: 26px; background: #0052cc; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </div>
              <span style="font-weight: 900; font-size: 11px; text-transform: uppercase; color: #0052cc; letter-spacing: 0.05em;">VITALS / O/E</span>
            </div>
            
            <div style="flex: 1; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 12.5px; font-weight: 800; color: #000000;">
              <div><span style="color: #334155; font-size: 11px; font-weight: 800;">BP:</span> <span style="font-weight: 900; color: #000000;">${bpVal ? `${bpVal} mmHg` : '-'}</span></div>
              <div style="color: #cbd5e1;">|</div>
              <div><span style="color: #334155; font-size: 11px; font-weight: 800;">Pulse:</span> <span style="font-weight: 900; color: #000000;">${pulseVal ? `${pulseVal} /min` : '-'}</span></div>
              <div style="color: #cbd5e1;">|</div>
              <div><span style="color: #334155; font-size: 11px; font-weight: 800;">Temp:</span> <span style="font-weight: 900; color: #000000;">${tempVal ? `${tempVal} °F` : '-'}</span></div>
              <div style="color: #cbd5e1;">|</div>
              <div><span style="color: #334155; font-size: 11px; font-weight: 800;">SpO2:</span> <span style="font-weight: 900; color: #000000;">${spo2Val ? `${spo2Val} %` : '-'}</span></div>
              <div style="color: #cbd5e1;">|</div>
              <div><span style="color: #334155; font-size: 11px; font-weight: 800;">Weight:</span> <span style="font-weight: 900; color: #000000;">${weightVal ? `${weightVal} kg` : '-'}</span></div>
              <div style="color: #cbd5e1;">|</div>
              <div><span style="color: #334155; font-size: 11px; font-weight: 800;">Resp Rate:</span> <span style="font-weight: 900; color: #000000;">${rrVal ? `${rrVal} /min` : '-'}</span></div>
              <div style="color: #cbd5e1;">|</div>
              <div><span style="color: #334155; font-size: 11px; font-weight: 800;">RBS:</span> <span style="font-weight: 900; color: #000000;">${rbsVal ? `${rbsVal} mg/dL` : '-'}</span></div>
            </div>
          </div>

          ${isBlank ? `
            <!-- Rx Symbol -->
            <div class="rx-symbol" style="margin-top: 8px; margin-bottom: 8px;">Rx</div>

            <!-- BLANK PRESCRIPTION CONTENT AREA FOR MANUAL HANDWRITING -->
            <div style="min-height: 500px; width: 100%; border: 1.5px solid #0052cc; border-radius: 12px; background: #ffffff; margin-bottom: 20px; padding: 16px; box-sizing: border-box; position: relative;">
              <div style="position: absolute; top: 12px; right: 16px; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">
                Manual Prescription / Notes
              </div>
            </div>
          ` : `
            <!-- Rx Symbol -->
            <div class="rx-symbol">Rx</div>

            <!-- DYNAMIC MEDICINE TABLE -->
            <table class="meds-table">
              <thead>
                <tr>
                  <th style="width: 44%;">MEDICINE & STRENGTH</th>
                  <th style="width: 18%;">DOSAGE</th>
                  <th style="width: 20%;">FREQUENCY</th>
                  <th style="width: 18%;">DURATION</th>
                </tr>
              </thead>
              <tbody>
                ${medContent}
              </tbody>
            </table>

            <!-- DYNAMIC CLINICAL REMARKS & ADVICE -->
            ${adviceContent}
          `}

          <!-- FOOTER SIGNATURE SECTION -->
          <div class="footer-signatures" style="margin-top: 20px; margin-bottom: 16px; display: flex; justify-content: flex-end; align-items: flex-end; page-break-inside: avoid;">
            <div style="text-align: right; min-width: 200px;">
              <div style="height: 30px; display: flex; align-items: flex-end; justify-content: flex-end; margin-bottom: 2px;">
                <svg width="110" height="26" viewBox="0 0 120 30" fill="none" stroke="#003b7a" stroke-width="2.5" stroke-linecap="round">
                  <path d="M10 25 C 20 5, 30 5, 40 20 C 45 10, 50 10, 60 25 M 55 18 L 90 8" />
                </svg>
              </div>
              <div style="width: 100%; height: 2px; background: #003b7a; margin-bottom: 4px;"></div>
              <div style="font-size: 14px; font-weight: 900; color: #000000;">${docName}</div>
              ${docReg ? `<div style="font-size: 11px; font-weight: 800; color: #1e293b;">${docReg}</div>` : ''}
              ${docDegree ? `<div style="font-size: 11px; font-weight: 800; color: #1e293b;">${docDegree}</div>` : ''}
              <div style="font-size: 10px; font-weight: 900; color: #0052cc; text-transform: uppercase; letter-spacing: 0.05em;">DEPT. OF ${docDept.toUpperCase()}</div>
            </div>
          </div>

          ${isValidFooterImage ? `
            <div style="position: relative; margin-top: 16px; page-break-inside: avoid; text-align: center; background-color: #ffffff; width: 100%;">
              <img src="${actualFooterImage}" style="width: 100%; height: auto; max-height: 160px; object-fit: fill; display: block; border-radius: 4px;" />
            </div>
          ` : `
            <!-- STATIC BOTTOM FOOTER BAR -->
            <div class="static-bottom-bar">
              <!-- Address Left -->
              <div style="display: flex; align-items: center; gap: 8px; max-width: 440px;">
                <div style="width: 26px; height: 26px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #dc2626; flex-shrink: 0;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div style="font-size: 10.5px; font-weight: 700; color: #dc2626; line-height: 1.3;">
                  ${hospAddress}
                </div>
              </div>

              <div style="height: 28px; width: 1px; background: #cbd5e1;"></div>

              <!-- Phone & WhatsApp Center -->
              <div style="display: flex; flex-direction: column; gap: 3px;">
                <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: #003b7a;">
                  <div style="width: 18px; height: 18px; background: #e0edff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0052cc;">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <span>+91- 8299713820</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: #003b7a;">
                  <div style="width: 18px; height: 18px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #16a34a;">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                  </div>
                  <span>+91- 7007128144</span>
                </div>
              </div>

              <div style="height: 28px; width: 1px; background: #cbd5e1;"></div>

              <!-- QR Code Right -->
              <div style="width: 40px; height: 40px; border: 1px solid #0052cc; border-radius: 6px; padding: 2px; background: #ffffff; flex-shrink: 0;">
                <svg viewBox="0 0 24 24" style="width: 100%; height: 100%; fill: #003b7a;">
                  <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h3v2h-3v-2zm-5 0h3v4h-3v-4zm2 4h3v3h-3v-3zm3-2h3v5h-3v-5zm-5 3h2v2h-2v-2z"/>
                </svg>
              </div>
            </div>
          `}
        </div>
        
        <script>
          function triggerPrint() {
            const images = Array.from(document.images);
            if (images.length === 0) {
              setTimeout(() => { window.print(); }, 200);
              return;
            }
            let loaded = 0;
            const checkAllLoaded = () => {
              loaded++;
              if (loaded >= images.length) {
                setTimeout(() => { window.print(); }, 250);
              }
            };
            images.forEach(img => {
              if (img.complete) {
                checkAllLoaded();
              } else {
                img.onload = checkAllLoaded;
                img.onerror = checkAllLoaded;
              }
            });
          }

          if (document.readyState === 'complete') {
            triggerPrint();
          } else {
            window.addEventListener('load', triggerPrint);
            setTimeout(triggerPrint, 500);
          }

          window.onafterprint = () => {
            setTimeout(() => { window.close(); }, 300);
          };
        </script>
      </body>
    </html>
  `;
}

