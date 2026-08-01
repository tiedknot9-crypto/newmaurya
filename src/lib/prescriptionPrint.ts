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
}

export interface PrintDoctor {
  name?: string;
  degree?: string;
  specialization?: string;
  department?: string;
  id?: string;
}

export function getPrescriptionPrintHtml(
  patient: PrintPatient,
  prescription: PrintPrescription,
  doctor?: PrintDoctor,
  hospitalInfo?: { name: string; address: string; phone: string },
  templateImage?: string | null
): string {
  const actualTemplateImage = templateImage !== undefined ? templateImage : (typeof window !== 'undefined' ? localStorage.getItem('hms_template_image') : null);

  // Parse whether there is a valid custom preprinted background letterhead image (to overlay on)
  const isValidTemplateImage = !!(
    actualTemplateImage &&
    typeof actualTemplateImage === 'string' &&
    actualTemplateImage.trim() !== '' &&
    actualTemplateImage !== 'null' &&
    actualTemplateImage !== 'undefined' &&
    (actualTemplateImage.startsWith('http') || actualTemplateImage.startsWith('data:image') || actualTemplateImage.startsWith('/'))
  );

  const hospName = hospitalInfo?.name || 'GLOBAL HOSPITAL';
  const hospAddress = hospitalInfo?.address || '123 Healthcare Way, Medical City';
  const hospPhone = hospitalInfo?.phone || '+91 98765 43210';
  const hospEmail = `contact@${hospName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'globalhospital'}.com`;
  
  const patName = patient?.name || 'N/A';
  const patAgeGender = `${patient?.age || 'N/A'}Y / ${patient?.gender || 'N/A'}`;
  const presDate = prescription?.date || new Date().toISOString().split('T')[0];
  const patMRN = patient?.mrn || 'N/A';
  const patPhone = patient?.phone || '';
  const patFatherName = patient?.fatherName || (patient as any)?.father_name || '';

  // Extract vitals
  const vts = prescription?.vitals;
  const bpVal = vts?.bp || '';
  const pulseVal = vts?.pulse !== undefined && vts?.pulse !== 0 ? String(vts.pulse) : '';
  const tempVal = vts?.temp !== undefined ? String(vts.temp) : '';
  const spo2Val = vts?.spo2 !== undefined && vts?.spo2 !== 0 ? String(vts.spo2) : '';
  const weightVal = vts?.weight !== undefined ? String(vts.weight) : '';
  const rrVal = vts?.rr !== undefined && vts?.rr !== 0 ? String(vts.rr) : '';
  const rbsVal = vts?.rbs !== undefined && vts?.rbs !== 0 && vts?.rbs !== '' ? String(vts.rbs) : '';

  let rawDocName = '';
  let docDept = '';
  let docSpec = '';
  let docDegree = '';
  let docReg = '';

  if (typeof doctor === 'string') {
    rawDocName = doctor;
  } else if (doctor && typeof doctor === 'object') {
    rawDocName = doctor.name || '';
    docDept = doctor.department || '';
    docSpec = doctor.specialization || '';
    docDegree = doctor.degree || '';
    if (doctor.id) {
      docReg = `Reg No: MC-${doctor.id.toString().toUpperCase()}`;
    } else if (doctor.degree) {
      docReg = `Reg No: MC-1234567`;
    }
  }

  const docName = rawDocName ? (rawDocName.trim().startsWith('Dr.') ? rawDocName.trim() : `Dr. ${rawDocName.trim()}`) : 'Dr. Attending Doctor';

  if (!docDept && docSpec) {
    docDept = docSpec;
  }
  if (!docDept) {
    docDept = 'General OPD / Clinical Services';
  }
  if (!docSpec) {
    docSpec = docDept;
  }
  if (!docReg) {
    docReg = 'Reg No: MC1234567';
  }

  // Format Medicines content
  let medContent = '';
  if (prescription.medicines && prescription.medicines.length > 0) {
    medContent = prescription.medicines.map(m => `
      <tr style="border-bottom: 1.5px solid #e2e8f0; page-break-inside: avoid;">
        <td style="padding: 16px 14px; font-weight: 700; color: #0f172a; font-size: 14px;">${m.name}</td>
        <td style="padding: 16px 14px; font-weight: 600; color: #334155; font-size: 14px;">${m.dosage || '-'}</td>
        <td style="padding: 16px 14px; font-weight: 600; color: #334155; font-size: 14px;">${m.frequency || '-'}</td>
        <td style="padding: 16px 14px; font-weight: 600; color: #334155; font-size: 14px;">${m.duration || '-'}</td>
      </tr>
    `).join('');
  } else {
    // Return high-quality empty lines with dotted borders for the blank pad to look beautiful when printed
    for (let i = 0; i < 6; i++) {
      medContent += `
        <tr style="border-bottom: 1px dotted #cbd5e1; height: 52px; page-break-inside: avoid;">
          <td style="padding: 16px 14px;"></td>
          <td style="padding: 16px 14px;"></td>
          <td style="padding: 16px 14px;"></td>
          <td style="padding: 16px 14px;"></td>
        </tr>
      `;
    }
  }

  const adviceContent = (prescription.advice || prescription.notes || prescription.diagnosis) ? `
    <div style="margin-top: 30px; font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif; page-break-inside: avoid;">
      <div style="font-weight: 800; font-size: 10px; text-transform: uppercase; color: #475569; letter-spacing: 0.08em; margin-bottom: 8px;">Clinical Remarks & Advice:</div>
      <div style="font-size: 13.5px; color: #1e293b; font-weight: 500; line-height: 1.6; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; border-left: 4px solid #0284c7;">
        ${prescription.diagnosis ? `<div style="font-weight: 800; color: #0f172a; margin-bottom: 6px; font-size: 13.5px;">Diagnosis: ${prescription.diagnosis}</div>` : ''}
        ${prescription.advice || prescription.notes || ''}
      </div>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Prescription - ${patName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
          
          @page {
            size: A4;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-color: #fff;
            position: relative;
          }
          .template-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
          }
          .container {
            width: 100%;
            min-height: 262mm;
            position: relative;
            box-sizing: border-box;
            padding-top: ${isValidTemplateImage ? '240px' : '0px'};
            padding-bottom: 220px; /* Safe space to prevent table content overlap with footers */
          }
          
          /* Custom Premium Letterhead styling */
          .header {
            display: ${isValidTemplateImage ? 'none' : 'block'};
            margin-bottom: 22px;
          }
          
          /* Rx Symbol & Watermark */
          .rx-container {
            position: relative;
            margin-left: 2px;
          }
          .rx-symbol {
            font-size: 44px;
            font-style: italic;
            font-weight: 700;
            font-family: 'Playfair Display', Georgia, serif;
            margin: 0 0 12px 0;
            color: #1d4ed8;
            display: inline-block;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 320px;
            height: 320px;
            opacity: 0.03;
            z-index: -2;
            pointer-events: none;
          }
          
          /* Medicines Table Styling */
          .meds-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            z-index: 10;
          }
          .meds-table th {
            background-color: #1e3a8a;
            color: #ffffff;
            font-size: 10.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            padding: 11px 14px;
            text-align: left;
          }
          .meds-table th:first-child {
            border-top-left-radius: 8px;
            border-bottom-left-radius: 8px;
          }
          .meds-table th:last-child {
            border-top-right-radius: 8px;
            border-bottom-right-radius: 8px;
          }
          
          /* Footer & Authorizations */
          .footer-section {
            position: absolute;
            bottom: 110px; /* Positioned perfectly above bottom footer */
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            page-break-inside: avoid;
          }
          .footer-left {
            max-width: 360px;
            border-left: 3px solid #1d4ed8;
            padding-left: 12px;
          }
          .footer-right {
            text-align: right;
            min-width: 230px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }
          .sig-line {
            width: 180px;
            border-bottom: 1.5px solid #0f172a;
            margin-bottom: 10px;
          }
          .doc-name {
            font-size: 14.5px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 2px 0;
          }
          .doc-reg {
            font-size: 11.5px;
            color: #475569;
            margin: 0 0 2px 0;
            font-weight: 600;
          }
          .doc-spec {
            font-size: 10.5px;
            color: #64748b;
            margin: 0;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
        </style>
      </head>
      <body>
        <!-- Background Premium Watermark -->
        <div class="watermark">
          <svg viewBox="0 0 100 100" style="width: 100%; height: 100%;">
            <circle cx="50" cy="50" r="46" fill="none" stroke="#1d4ed8" stroke-width="3" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#ef4444" stroke-width="1.5" />
            <!-- Letters GH in bold blue -->
            <text x="50" y="55" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="24" fill="#1d4ed8" text-anchor="middle" style="letter-spacing: -0.5px;">GH</text>
          </svg>
        </div>

        <div class="container">
          ${isValidTemplateImage ? `<div class="template-bg"><img src="${actualTemplateImage}" style="width: 100%;" /></div>` : ''}
          
          <!-- Custom Header matching Image 1: Global Hospital & Maternity Center -->
          <div class="header" style="margin-bottom: 18px; page-break-inside: avoid;">
            <div style="position: relative; width: 100%; min-height: 110px; background: #ffffff; border-bottom: 2px solid #2563eb; overflow: hidden; display: flex; align-items: center; justify-content: space-between; padding: 10px 15px; box-sizing: border-box;">
              <!-- Top-Right Blue Curved Gradient Background Shape from Image 1 -->
              <svg viewBox="0 0 500 120" preserveAspectRatio="none" style="position: absolute; top: 0; right: 0; width: 45%; height: 100%; pointer-events: none; z-index: 1;">
                <defs>
                  <linearGradient id="headerBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.85" />
                    <stop offset="100%" stop-color="#1d4ed8" stop-opacity="1" />
                  </linearGradient>
                </defs>
                <path d="M 120 0 C 180 60, 240 120, 320 120 L 500 120 L 500 0 Z" fill="url(#headerBlueGrad)" />
              </svg>

              <!-- Left: Circular Hospital Emblem Logo from Image 1 -->
              <div style="position: relative; z-index: 2; flex-shrink: 0; display: flex; align-items: center; gap: 12px;">
                <svg viewBox="0 0 100 100" style="width: 86px; height: 86px;">
                  <!-- Outer Blue Band with white border -->
                  <circle cx="50" cy="50" r="48" fill="#1e40af" />
                  <circle cx="50" cy="50" r="41" fill="#ffffff" />
                  
                  <!-- Circular Text along arc: GLOBAL HOSPITAL & MATERNITY CENTRE -->
                  <path id="circleTextPath" d="M 18, 50 A 32,32 0 1,1 82, 50" fill="none" />
                  <text font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="6.5" fill="#1e40af" letter-spacing="1">
                    <textPath href="#circleTextPath" startOffset="50%" text-anchor="middle">GLOBAL HOSPITAL</textPath>
                  </text>
                  
                  <!-- Inner Red Dotted Ring -->
                  <circle cx="50" cy="50" r="33" fill="none" stroke="#dc2626" stroke-width="1.2" stroke-dasharray="3,1.5" />
                  
                  <!-- Red Cross Icon -->
                  <path d="M 46 22 H 54 V 78 H 46 Z" fill="#dc2626" opacity="0.85" />
                  <path d="M 22 46 H 78 V 54 H 22 Z" fill="#dc2626" opacity="0.85" />
                  
                  <!-- Orbital Blue Swoosh and Inner Circle -->
                  <ellipse cx="50" cy="50" rx="26" ry="12" fill="none" stroke="#2563eb" stroke-width="2" transform="rotate(-25 50 50)" />
                  <circle cx="50" cy="50" r="18" fill="#ffffff" stroke="#2563eb" stroke-width="1.5" />
                  
                  <!-- Center "GH" Bold Text -->
                  <text x="50" y="54" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="16" fill="#1d4ed8" text-anchor="middle" dominant-baseline="middle">GH</text>
                </svg>
              </div>

              <!-- Center: Bold Hindi Header Text from Image 1 -->
              <div style="position: relative; z-index: 2; flex-grow: 1; text-align: center; margin: 0 10px;">
                <div style="font-family: 'Noto Sans Devanagari', sans-serif; font-weight: 900; font-size: 38px; color: #dc2626; text-shadow: 2px 2px 0px #ffffff, -2px -2px 0px #ffffff, 2px -2px 0px #ffffff, -2px 2px 0px #ffffff, 3px 3px 4px rgba(0,0,0,0.18); line-height: 1.1; letter-spacing: 0.5px;">
                  ग्लोबल हॉस्पिटल
                </div>
                <div style="font-family: 'Noto Sans Devanagari', sans-serif; font-weight: 800; font-size: 22px; color: #dc2626; text-shadow: 1.5px 1.5px 0px #ffffff, -1.5px -1.5px 0px #ffffff; margin-top: 2px; line-height: 1.1; letter-spacing: 0.5px;">
                  एण्ड मैटरनिटी सेंटर
                </div>
              </div>

              <!-- Right Spacer for visual symmetry -->
              <div style="position: relative; z-index: 2; width: 80px; flex-shrink: 0;"></div>
            </div>
          </div>
          
          <!-- Dotted Line Patient Information Grid from Image 2 -->
          <div style="border-top: 1.5px solid #e2e8f0; border-bottom: 1.5px solid #e2e8f0; padding: 12px 10px; margin-bottom: 20px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 700; color: #1e293b; display: flex; flex-direction: column; gap: 12px;">
            <!-- Row 1 -->
            <div style="display: flex; gap: 20px; flex-wrap: wrap; width: 100%;">
              <div style="flex: 1.8; min-width: 240px; display: flex; align-items: flex-end;">
                <span>Patient Name:</span>
                <span style="flex-grow: 1; border-bottom: 1.5px dotted #94a3b8; margin-left: 8px; padding-bottom: 2px; font-weight: 800; color: #1d4ed8; padding-left: 5px;">${patName}</span>
              </div>
              <div style="flex: 1; min-width: 130px; display: flex; align-items: flex-end;">
                <span>Age / Sex:</span>
                <span style="flex-grow: 1; border-bottom: 1.5px dotted #94a3b8; margin-left: 8px; padding-bottom: 2px; font-weight: 800; color: #1d4ed8; padding-left: 5px;">${patAgeGender}</span>
              </div>
              <div style="flex: 1; min-width: 120px; display: flex; align-items: flex-end;">
                <span>Date:</span>
                <span style="flex-grow: 1; border-bottom: 1.5px dotted #94a3b8; margin-left: 8px; padding-bottom: 2px; font-weight: 800; color: #1d4ed8; padding-left: 5px;">${presDate}</span>
              </div>
            </div>
            <!-- Row 2 -->
            <div style="display: flex; gap: 20px; flex-wrap: wrap; width: 100%;">
              <div style="flex: 1.5; min-width: 250px; display: flex; align-items: flex-end;">
                <span>Father / Husband Name:</span>
                <span style="flex-grow: 1; border-bottom: 1.5px dotted #94a3b8; margin-left: 8px; padding-bottom: 2px; font-weight: 800; color: #1d4ed8; padding-left: 5px;">${patFatherName || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span>
              </div>
              <div style="flex: 1; min-width: 150px; display: flex; align-items: flex-end;">
                <span>Mobile No:</span>
                <span style="flex-grow: 1; border-bottom: 1.5px dotted #94a3b8; margin-left: 8px; padding-bottom: 2px; font-weight: 800; color: #1d4ed8; padding-left: 5px;">${patPhone || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span>
              </div>
              <div style="flex: 0.8; min-width: 110px; display: flex; align-items: flex-end;">
                <span>MRN:</span>
                <span style="flex-grow: 1; border-bottom: 1.5px dotted #94a3b8; margin-left: 8px; padding-bottom: 2px; font-weight: 800; color: #1d4ed8; padding-left: 5px;">${patMRN}</span>
              </div>
            </div>
            <!-- Row 3: Doctor Name & Department -->
            <div style="display: flex; gap: 20px; flex-wrap: wrap; width: 100%;">
              <div style="flex: 1.5; min-width: 250px; display: flex; align-items: flex-end;">
                <span>Doctor Name:</span>
                <span style="flex-grow: 1; border-bottom: 1.5px dotted #94a3b8; margin-left: 8px; padding-bottom: 2px; font-weight: 800; color: #1d4ed8; padding-left: 5px;">${docName}</span>
              </div>
              <div style="flex: 1; min-width: 200px; display: flex; align-items: flex-end;">
                <span>Department:</span>
                <span style="flex-grow: 1; border-bottom: 1.5px dotted #94a3b8; margin-left: 8px; padding-bottom: 2px; font-weight: 800; color: #1d4ed8; padding-left: 5px;">${docDept}</span>
              </div>
            </div>
          </div>

          <!-- Vitals / On Examination (O/E) Box -->
          <div style="display: flex; gap: 15px; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 20px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11.5px; font-weight: 700; color: #334155; background-color: #f8fafc; align-items: center; page-break-inside: avoid;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.05em; border-right: 1.5px solid #cbd5e1; padding-right: 10px; margin-right: 5px;">Vitals / O/E</span>
            <div style="flex: 1; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
              <div>BP: <span style="font-weight: 800; color: #1d4ed8; border-bottom: 1px dotted #94a3b8; min-width: 60px; display: inline-block; text-align: center; padding-bottom: 1px;">${bpVal || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span> mmHg</div>
              <div>Pulse: <span style="font-weight: 800; color: #1d4ed8; border-bottom: 1px dotted #94a3b8; min-width: 45px; display: inline-block; text-align: center; padding-bottom: 1px;">${pulseVal || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span> /min</div>
              <div>Temp: <span style="font-weight: 800; color: #1d4ed8; border-bottom: 1px dotted #94a3b8; min-width: 45px; display: inline-block; text-align: center; padding-bottom: 1px;">${tempVal || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span> °F</div>
              <div>SpO2: <span style="font-weight: 800; color: #1d4ed8; border-bottom: 1px dotted #94a3b8; min-width: 45px; display: inline-block; text-align: center; padding-bottom: 1px;">${spo2Val || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span> %</div>
              <div>Weight: <span style="font-weight: 800; color: #1d4ed8; border-bottom: 1px dotted #94a3b8; min-width: 45px; display: inline-block; text-align: center; padding-bottom: 1px;">${weightVal || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span> kg</div>
              <div>Resp Rate: <span style="font-weight: 800; color: #1d4ed8; border-bottom: 1px dotted #94a3b8; min-width: 45px; display: inline-block; text-align: center; padding-bottom: 1px;">${rrVal || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span> /min</div>
              <div>RBS: <span style="font-weight: 800; color: #1d4ed8; border-bottom: 1px dotted #94a3b8; min-width: 45px; display: inline-block; text-align: center; padding-bottom: 1px;">${rbsVal || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span> mg/dL</div>
            </div>
          </div>
          
          <div class="rx-container">
            <div class="rx-symbol">Rx</div>
          </div>
          
          <table class="meds-table">
            <thead>
              <tr>
                <th style="width: 44%;">MEDICINE & STRENGTH</th>
                <th style="width: 18%;">DOSAGE</th>
                <th style="width: 22%;">FREQUENCY</th>
                <th style="width: 16%;">DURATION</th>
              </tr>
            </thead>
            <tbody>
              ${medContent}
            </tbody>
          </table>
          
          ${adviceContent}
          
          <div class="footer-section">
            <div class="footer-left">
              <h3 style="font-size: 11px; font-weight: 800; color: #1d4ed8; margin: 0 0 3px 0; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Plus Jakarta Sans', sans-serif;">Digital Health Record</h3>
              <p style="font-size: 10px; color: #64748b; margin: 0; line-height: 1.5; font-weight: 500;">
                Not for Medicolegal purpose
              </p>
            </div>
            <div class="footer-right">
              <div class="sig-line"></div>
              <h3 class="doc-name">${docName}</h3>
              <p class="doc-reg">${docReg}</p>
              <p class="doc-spec">${docDegree ? `${docDegree} • ` : ''}${docDept ? `Dept. of ${docDept}` : docSpec}</p>
            </div>
          </div>

          <!-- Bottom Custom Footer matching Image 2 -->
          <div style="position: absolute; bottom: 0; left: 0; right: 0; page-break-inside: avoid; background-color: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px 4px 10px; border-top: 1px solid #e2e8f0; width: 100%; box-sizing: border-box;">
              
              <!-- 1. Left: 24/7 Services Logo Badge matching Image 2 -->
              <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                <!-- Red 3 Slashes -->
                <div style="display: flex; gap: 2px; transform: skewX(-15deg);">
                  <div style="width: 3px; height: 16px; background-color: #dc2626;"></div>
                  <div style="width: 3px; height: 16px; background-color: #dc2626;"></div>
                  <div style="width: 3px; height: 16px; background-color: #dc2626;"></div>
                </div>
                <!-- 24/7 Badge Ring -->
                <div style="position: relative; width: 48px; height: 48px;">
                  <svg viewBox="0 0 100 100" style="width: 100%; height: 100%;">
                    <!-- Outer Dark Blue Oval Ring -->
                    <circle cx="50" cy="50" r="46" fill="#1e3a8a" stroke="#ffffff" stroke-width="2" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#2563eb" stroke-width="3" />
                    <!-- Diagonal Slash Line -->
                    <line x1="25" y1="75" x2="75" y2="25" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
                    <!-- Text 24 -->
                    <text x="32" y="42" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="28" fill="#ffffff">24</text>
                    <!-- Text 7 -->
                    <text x="68" y="72" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="28" fill="#dc2626" text-anchor="end">7</text>
                    <!-- SERVICES Banner Pill -->
                    <rect x="10" y="70" width="80" height="22" rx="11" fill="#1d4ed8" stroke="#ffffff" stroke-width="2" />
                    <text x="50" y="85" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="12" fill="#ffffff" text-anchor="middle">SERVICES</text>
                  </svg>
                </div>
              </div>

              <!-- 2. Center-Left: Location Address in Crimson Red from Image 2 -->
              <div style="display: flex; align-items: flex-start; gap: 5px; color: #b91c1c; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 800; max-width: 310px; line-height: 1.35; padding: 0 8px;">
                <span style="font-size: 15px; color: #dc2626; flex-shrink: 0; margin-top: -1px;">📍</span>
                <span>Near-Aura In Hotel, Bargadwa Badeban, Bansi & Dumariyaganj Road-Basti 272001</span>
              </div>

              <!-- 3. Vertical Separator Line -->
              <div style="width: 1.5px; height: 38px; background-color: #cbd5e1; flex-shrink: 0; margin: 0 4px;"></div>

              <!-- 4. Center-Right: Telephone Numbers with Red Phone Circle Icon from Image 2 -->
              <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                <div style="display: flex; flex-direction: column; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12.5px; font-weight: 900; color: #1d4ed8; line-height: 1.35; letter-spacing: 0.2px;">
                  <span>+91- 8299713820</span>
                  <span>+91- 7007128144</span>
                </div>
                <div style="width: 32px; height: 32px; background-color: #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 16px; box-shadow: 0 2px 4px rgba(220,38,38,0.3); flex-shrink: 0;">
                  📞
                </div>
              </div>

              <!-- 5. Right: Vector Doctors Graphic from Image 2 -->
              <div style="flex-shrink: 0; width: 110px; height: 48px; display: flex; align-items: flex-end; justify-content: flex-end; overflow: hidden;">
                <svg viewBox="0 0 160 80" style="width: 100%; height: 100%;">
                  <defs>
                    <linearGradient id="docCoat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#ffffff" />
                      <stop offset="100%" stop-color="#f1f5f9" />
                    </linearGradient>
                  </defs>
                  
                  <!-- Female Doctor (Left) -->
                  <g transform="translate(10, 8)">
                    <circle cx="20" cy="20" r="12" fill="#fbcfe8" /> <!-- Hair -->
                    <circle cx="20" cy="18" r="10" fill="#fde047" /> <!-- Face -->
                    <path d="M 8 40 C 8 28, 32 28, 32 40 L 32 75 L 8 75 Z" fill="url(#docCoat)" stroke="#94a3b8" stroke-width="1" />
                    <path d="M 14 38 L 20 48 L 26 38" fill="none" stroke="#2563eb" stroke-width="1.5" />
                  </g>
                  
                  <!-- Lead Male Doctor with Clipboard (Center) -->
                  <g transform="translate(55, 0)">
                    <circle cx="25" cy="18" r="12" fill="#1e293b" /> <!-- Hair -->
                    <circle cx="25" cy="19" r="10" fill="#fed7aa" /> <!-- Face -->
                    <path d="M 8 38 C 8 25, 42 25, 42 38 L 42 80 L 8 80 Z" fill="url(#docCoat)" stroke="#64748b" stroke-width="1.2" />
                    <path d="M 18 36 L 25 48 L 32 36" fill="none" stroke="#dc2626" stroke-width="1.5" />
                    <!-- Stethoscope -->
                    <path d="M 15 36 C 15 50, 35 50, 35 36" fill="none" stroke="#334155" stroke-width="2" />
                    <!-- Clipboard -->
                    <rect x="28" y="42" width="14" height="20" rx="2" fill="#d97706" />
                    <rect x="30" y="45" width="10" height="14" fill="#ffffff" />
                  </g>
                  
                  <!-- Male Doctor (Right) -->
                  <g transform="translate(105, 10)">
                    <circle cx="20" cy="18" r="11" fill="#475569" /> <!-- Hair -->
                    <circle cx="20" cy="18" r="9" fill="#fde047" /> <!-- Face -->
                    <path d="M 6 36 C 6 26, 34 26, 34 36 L 34 70 L 6 70 Z" fill="url(#docCoat)" stroke="#94a3b8" stroke-width="1" />
                    <path d="M 14 34 L 20 44 L 26 34" fill="none" stroke="#2563eb" stroke-width="1.5" />
                  </g>
                </svg>
              </div>

            </div>
            
            <!-- Solid Navy Blue Horizontal Bar at the very bottom from Image 2 -->
            <div style="height: 16px; background-color: #0d3b75; width: 100%;"></div>
          </div>
        </div>
        
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.onafterprint = () => {
                window.close();
              };
            }, 150);
          }
        </script>
      </body>
    </html>
  `;
}
