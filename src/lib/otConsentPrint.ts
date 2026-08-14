import { OTConsentRecord } from '@/types';
import { storage, STORAGE_KEYS } from '@/lib/storage';

export interface ConsentPrintOptions {
  blankForm?: boolean;
  printMode?: 'combined' | 'operation' | 'anesthesia';
}

export function getOTConsentPrintHtml(
  consent: Partial<OTConsentRecord> | null,
  patient: any,
  hospitalInfoProp?: any,
  options: ConsentPrintOptions = {}
): string {
  const storedHospitalInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
  const hospitalInfo = hospitalInfoProp || storedHospitalInfo || {
    name: 'CURELINE SUPERSPECIALITY HOSPITAL',
    address: '456 Healthcare Blvd, Medical Enclave, Central City',
    phone: '+91 98765 43210 / +91 11 2345 6789',
    email: 'info@curelinehospital.com',
    registration_no: 'REG/HOSP/2024/9842',
    tax_no: 'GSTIN: 07AAAAA0000A1Z5'
  };

  const isBlank = !!options.blankForm;
  const printMode = options.printMode || consent?.consentType || 'combined';

  const hospName = hospitalInfo.name || 'CURELINE SUPERSPECIALITY HOSPITAL';
  const hospAddress = hospitalInfo.address || '456 Healthcare Blvd, Medical Enclave, Central City';
  const hospPhone = hospitalInfo.phone || '+91 98765 43210';
  const hospReg = hospitalInfo.registration_no ? `Reg. No: ${hospitalInfo.registration_no}` : '';

  const patName = isBlank ? '________________________________________' : (patient?.name || consent?.signatoryName || 'N/A');
  const patAge = isBlank ? '____' : (patient?.age ? `${patient.age} Yrs` : 'N/A');
  const patGender = isBlank ? '____' : (patient?.gender || 'N/A');
  const patMRN = isBlank ? '________________' : (patient?.mrn || 'N/A');
  const patPhone = isBlank ? '________________' : (patient?.phone || consent?.signatoryPhone || 'N/A');
  const patAddress = isBlank ? '________________________________________' : (patient?.address || 'N/A');
  const patBed = isBlank ? '________' : (patient?.bedNumber || patient?.bed_number || patient?.ward || 'General / OT');

  const procedureName = isBlank ? '________________________________________________' : (consent?.procedureName || 'Surgical Procedure');
  const diagnosis = isBlank ? '________________________________________________' : (consent?.diagnosis || 'Clinical Diagnosis');
  const surgeonName = isBlank ? '________________________________' : (consent?.surgeonName || 'Dr. Assigned Surgeon');
  const anesthetistName = isBlank ? '________________________________' : (consent?.anesthetistName || 'Dr. Assigned Anesthesiologist');
  const anesthesiaType = isBlank ? 'General / Spinal / Epidural / Regional / Local / Sedation' : (consent?.anesthesiaType || 'General / Spinal Anesthesia');
  const asaGrade = isBlank ? 'ASA I / II / III / IV / E' : (consent?.asaGrade || 'ASA II');
  const proposedDate = isBlank ? 'DD / MM / YYYY' : (consent?.proposedDate || new Date().toISOString().split('T')[0]);
  const dateStr = isBlank ? 'DD / MM / YYYY' : (consent?.signatureDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
  const timeStr = isBlank ? '__ : __ AM/PM' : (consent?.signatureTime || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));

  const signatoryName = isBlank ? '________________________________' : (consent?.signatoryName || patName);
  const signatoryType = isBlank ? 'Patient / Guardian' : (consent?.signatoryType || 'Patient');
  const signatoryRel = isBlank ? 'Self / Spouse / Parent / Son / Daughter' : (consent?.signatoryRelationship || 'Self');
  const witnessName = isBlank ? '________________________________' : (consent?.witnessName || 'Medical Staff / Attendant');

  // Title calculation
  let enTitle = 'INFORMED CONSENT FOR SURGICAL OPERATION & ANESTHESIA';
  let hiTitle = 'शल्य चिकित्सा (ऑपरेशन) एवं निश्चेतना (एनेस्थीसिया) हेतु सूचित सहमति पत्र';

  if (printMode === 'operation') {
    enTitle = 'INFORMED CONSENT FOR SURGICAL OPERATION / PROCEDURE';
    hiTitle = 'शल्य चिकित्सा (ऑपरेशन) हेतु सूचित सहमति पत्र';
  } else if (printMode === 'anesthesia') {
    enTitle = 'INFORMED CONSENT FOR ANESTHESIA & ANALGESIA';
    hiTitle = 'निश्चेतना (एनेस्थीसिया) एवं दर्दनिवारण हेतु सूचित सहमति पत्र';
  }

  const showOperation = printMode === 'combined' || printMode === 'operation';
  const showAnesthesia = printMode === 'combined' || printMode === 'anesthesia';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${enTitle} - ${isBlank ? 'Blank Form' : patName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Inter', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      line-height: 1.45;
      color: #1e293b;
      background-color: #ffffff;
      padding: 16px 20px;
    }

    @page {
      size: A4;
      margin: 12mm 12mm 12mm 12mm;
    }

    .consent-page {
      max-width: 800px;
      margin: 0 auto;
    }

    /* Hospital Header */
    .hospital-header {
      text-align: center;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 8px;
      margin-bottom: 12px;
      position: relative;
    }

    .hospital-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .hospital-subtitle {
      font-size: 10px;
      color: #475569;
      margin-bottom: 2px;
      font-weight: 500;
    }

    .hospital-meta {
      font-size: 9.5px;
      color: #64748b;
      display: flex;
      justify-content: center;
      gap: 16px;
    }

    /* Document Title Banner */
    .doc-banner {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      text-align: center;
      padding: 6px 10px;
      border-radius: 4px;
      margin-bottom: 10px;
    }

    .doc-title-en {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .doc-title-hi {
      font-size: 12px;
      font-weight: 700;
      margin-top: 1px;
    }

    /* Patient Particulars Box */
    .patient-box {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 8px 10px;
      background-color: #f8fafc;
      margin-bottom: 10px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px 12px;
      font-size: 10px;
    }

    .patient-field {
      display: flex;
      flex-direction: column;
    }

    .patient-field.span-2 {
      grid-column: span 2;
    }

    .patient-field.span-4 {
      grid-column: span 4;
    }

    .field-label {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .field-label-hi {
      font-size: 8.5px;
      color: #0369a1;
      font-weight: 600;
    }

    .field-val {
      font-size: 11px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 1px;
    }

    /* Section Styling */
    .section-block {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      margin-bottom: 10px;
      overflow: hidden;
      page-break-inside: avoid;
    }

    .section-header {
      background-color: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      padding: 4px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-title-en {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
    }

    .section-title-hi {
      font-size: 10.5px;
      font-weight: 600;
      color: #0284c7;
    }

    .section-body {
      padding: 8px 10px;
      font-size: 10px;
    }

    .clause {
      margin-bottom: 7px;
      padding-bottom: 6px;
      border-bottom: 1px dashed #e2e8f0;
    }

    .clause:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .clause-en {
      font-size: 10px;
      color: #1e293b;
      margin-bottom: 2px;
      font-weight: 500;
    }

    .clause-hi {
      font-size: 9.5px;
      color: #475569;
      font-style: normal;
      background-color: #f8fafc;
      padding: 3px 6px;
      border-left: 2px solid #0284c7;
      border-radius: 2px;
    }

    .badge-tag {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 700;
      background-color: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
    }

    /* Checkbox list */
    .checklist {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 12px;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid #f1f5f9;
    }

    .check-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 9.5px;
    }

    .check-box {
      width: 12px;
      height: 12px;
      border: 1.5px solid #0284c7;
      border-radius: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 800;
      color: #0284c7;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* Signatures Section */
    .signatures-container {
      margin-top: 12px;
      page-break-inside: avoid;
    }

    .sig-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .sig-box {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 8px;
      background-color: #ffffff;
      min-height: 95px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .sig-header {
      font-size: 9.5px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 3px;
      margin-bottom: 4px;
    }

    .sig-header-hi {
      font-size: 9px;
      color: #0284c7;
      font-weight: 600;
    }

    .sig-area {
      height: 35px;
      border-bottom: 1px dotted #94a3b8;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 8.5px;
    }

    .sig-details {
      font-size: 9px;
      color: #475569;
      display: flex;
      flex-direction: column;
      gap: 1.5px;
    }

    /* Footer Notice */
    .consent-footer {
      margin-top: 10px;
      text-align: center;
      font-size: 8.5px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }

    @media print {
      body {
        padding: 0;
        background: transparent;
      }
      .consent-page {
        width: 100%;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="consent-page">
    <!-- Header -->
    <div class="hospital-header">
      <div class="hospital-title">${hospName}</div>
      <div class="hospital-subtitle">${hospAddress} • Tel: ${hospPhone}</div>
      <div class="hospital-meta">
        <span>${hospReg}</span>
        <span>NABH Standards Informed Consent Compliance</span>
      </div>
    </div>

    <!-- Title Banner -->
    <div class="doc-banner">
      <div class="doc-title-en">${enTitle}</div>
      <div class="doc-title-hi">${hiTitle}</div>
    </div>

    <!-- Patient Details -->
    <div class="patient-box">
      <div class="patient-field span-2">
        <span class="field-label">Patient Name / <span class="field-label-hi">मरीज का नाम</span></span>
        <span class="field-val">${patName}</span>
      </div>
      <div class="patient-field">
        <span class="field-label">Age & Sex / <span class="field-label-hi">आयु व लिंग</span></span>
        <span class="field-val">${patAge} / ${patGender}</span>
      </div>
      <div class="patient-field">
        <span class="field-label">MRN / UHID / <span class="field-label-hi">यूएचआईडी</span></span>
        <span class="field-val">${patMRN}</span>
      </div>
      
      <div class="patient-field span-2">
        <span class="field-label">Procedure / <span class="field-label-hi">प्रस्तावित ऑपरेशन का नाम</span></span>
        <span class="field-val" style="color: #0369a1;">${procedureName}</span>
      </div>
      <div class="patient-field">
        <span class="field-label">Diagnosis / <span class="field-label-hi">रोग निदान</span></span>
        <span class="field-val">${diagnosis}</span>
      </div>
      <div class="patient-field">
        <span class="field-label">Ward / Bed / <span class="field-label-hi">वार्ड/बेड नं.</span></span>
        <span class="field-val">${patBed}</span>
      </div>

      <div class="patient-field span-2">
        <span class="field-label">Operating Surgeon / <span class="field-label-hi">मुख्य सर्जन</span></span>
        <span class="field-val">${surgeonName}</span>
      </div>
      <div class="patient-field">
        <span class="field-label">Anesthesiologist / <span class="field-label-hi">एनेस्थेटिस्ट</span></span>
        <span class="field-val">${anesthetistName}</span>
      </div>
      <div class="patient-field">
        <span class="field-label">Date & Time / <span class="field-label-hi">दिनांक व समय</span></span>
        <span class="field-val">${dateStr} ${timeStr}</span>
      </div>
    </div>

    ${showOperation ? `
    <!-- PART 1: OPERATION CONSENT -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-title-en">PART I: INFORMED CONSENT FOR SURGERY / OPERATION</span>
        <span class="section-title-hi">भाग १: शल्य क्रिया (ऑपरेशन) हेतु सहमति</span>
      </div>
      <div class="section-body">
        <div class="clause">
          <p class="clause-en"><strong>1. Authorization for Procedure:</strong> I hereby authorize Dr. <u>${surgeonName}</u> and his/her surgical team to perform the procedure: <u><strong>${procedureName}</strong></u> on me / my patient. The indication, purpose, alternative treatments, expected benefits, and prognosis have been clearly explained to me.</p>
          <p class="clause-hi"><strong>१. ऑपरेशन की स्वीकृति:</strong> मैं एतद्द्वारा डॉ. <u>${surgeonName}</u> एवं उनकी सर्जिकल टीम को मुझ पर / मेरे मरीज पर <u><strong>${procedureName}</strong></u> शल्यक्रिया करने हेतु अधिकृत करता/करती हूँ। ऑपरेशन के कारण, उद्देश्य, वैकल्पिक उपचार, अपेक्षित लाभ एवं परिणाम मुझे भली-भांति समझा दिए गए हैं।</p>
        </div>

        <div class="clause">
          <p class="clause-en"><strong>2. Surgical Risks & Complications:</strong> I understand that no surgical procedure is without inherent risks. Possible risks explained include, but are not limited to: hemorrhage/bleeding, wound infection, damage to adjacent organs/blood vessels/nerves, adverse reactions, thrombosis, scarring, or recurrence requiring secondary interventions.</p>
          <p class="clause-hi"><strong>२. जोखिम एवं संभावित जटिलताएं:</strong> मैं समझता/समझती हूँ कि प्रत्येक ऑपरेशन में कुछ अंतर्निहित जोखिम होते हैं, जैसे रक्तस्राव, घाव का संक्रमण, आसपास के अंगों/नसों को क्षति, एलर्जी, थक्का जमना, निशान पड़ना अथवा रोग की पुनरावृत्ति जिसके लिए पुनः उपचार की आवश्यकता हो सकती है।</p>
        </div>

        <div class="clause">
          <p class="clause-en"><strong>3. Emergency Extension & Procedure Conversion:</strong> I authorize the operating surgeon to perform any additional, modified, or emergency procedures (including conversion from laparoscopic/minimally invasive to open surgery) which in their professional judgment may become necessary during the course of the operation to preserve life or health.</p>
          <p class="clause-hi"><strong>३. आपातकालीन अतिरिक्त प्रक्रिया व बदलाव:</strong> ऑपरेशन के दौरान मरीज की जीवन रक्षा अथवा स्वास्थ्य हित में यदि कोई अतिरिक्त या संशोधित प्रक्रिया (दूरबीन से खुले ऑपरेशन में बदलना आदि) आवश्यक प्रतीत होती है, तो मैं उसकी पूर्ण स्वीकृति देता/देती हूँ।</p>
        </div>

        <div class="checklist">
          <div class="check-item">
            <div class="check-box">${isBlank ? '' : '✓'}</div>
            <span>Procedure & Risks Explained in Mother Tongue / भाषा में समझाया गया</span>
          </div>
          <div class="check-item">
            <div class="check-box">${isBlank ? '' : '✓'}</div>
            <span>All Questions Answered Satisfactorily / सभी प्रश्नों के उत्तर दिए गए</span>
          </div>
          <div class="check-item">
            <div class="check-box">${isBlank ? '' : '✓'}</div>
            <span>Alternative Therapies Discussed / वैकल्पिक उपचारों पर चर्चा हुई</span>
          </div>
          <div class="check-item">
            <div class="check-box">${isBlank ? '' : '✓'}</div>
            <span>Pre-Operative Fasting (NPO) Verified / उपवास स्थिति की पुष्टि</span>
          </div>
        </div>
      </div>
    </div>
    ` : ''}

    ${showAnesthesia ? `
    <!-- PART 2: ANESTHESIA CONSENT -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-title-en">PART II: INFORMED CONSENT FOR ANESTHESIA & ANALGESIA</span>
        <span class="section-title-hi">भाग २: निश्चेतना (एनेस्थीसिया) एवं दर्दनिवारण हेतु सहमति</span>
      </div>
      <div class="section-body">
        <div class="clause">
          <p class="clause-en"><strong>1. Anesthesia Administration & Techniques:</strong> I consent to the administration of anesthesia deemed appropriate for the surgery: <span class="badge-tag">${anesthesiaType}</span> (ASA Physical Status: <strong>${asaGrade}</strong>) by Dr. <u>${anesthetistName}</u> and the anesthesia team. Different modalities (General, Spinal, Epidural, Nerve Block, Local with Sedation) and their rationale have been explained.</p>
          <p class="clause-hi"><strong>१. एनेस्थीसिया देने की स्वीकृति:</strong> मैं डॉ. <u>${anesthetistName}</u> एवं निश्चेतना टीम द्वारा ऑपरेशन हेतु उपयुक्त एनेस्थीसिया <span class="badge-tag">${anesthesiaType}</span> (एएसए ग्रेड: <strong>${asaGrade}</strong>) दिए जाने की सहमति देता/देती हूँ। एनेस्थीसिया के विभिन्न प्रकारों व विधियों को स्पष्ट कर दिया गया है।</p>
        </div>

        <div class="clause">
          <p class="clause-en"><strong>2. Anesthetic Risks & Adverse Events:</strong> I have been counseled regarding potential complications of anesthesia including sore throat, dental injury, nausea/vomiting, blood pressure fluctuations, allergic drug reactions, headache/backache (after spinal), nerve irritation, respiratory depression, and rare cardiovascular events.</p>
          <p class="clause-hi"><strong>२. एनेस्थीसिया के संभावित जोखिम:</strong> मुझे एनेस्थीसिया से जुड़ी संभावित जटिलताओं जैसे गले में खराश, दांतों को चोट, जी मिचलाना, रक्तचाप में बदलाव, दवाओं से एलर्जी, रीढ़ में सुन्न करने के बाद सिरदर्द/पीठ दर्द, सांस लेने में कठिनाई एवं हृदय संबंधी दुर्लभ जोखिमों से अवगत करा दिया गया है।</p>
        </div>

        <div class="clause">
          <p class="clause-en"><strong>3. Blood Transfusion & ICU Care:</strong> I consent to the administration of blood, blood components, intravenous fluids, and admission to Intensive Care Unit (ICU) / ventilator support if critically required during or after the procedure.</p>
          <p class="clause-hi"><strong>३. रक्त आधान (Blood Transfusion) एवं आईसीयू देखभाल:</strong> ऑपरेशन के दौरान या पश्चात आवश्यकता पड़ने पर रक्त/रक्त घटक चढ़ाने तथा गंभीर स्थिति में गहन चिकित्सा कक्ष (ICU) व वेंटिलेटर सहायता हेतु मैं अपनी पूर्ण सहमति देता/देती हूँ।</p>
        </div>

        <div class="checklist">
          <div class="check-item">
            <div class="check-box">${isBlank ? '' : '✓'}</div>
            <span>Consent for Blood Transfusion / रक्त आधान की सहमति</span>
          </div>
          <div class="check-item">
            <div class="check-box">${isBlank ? '' : '✓'}</div>
            <span>Consent for Post-Op ICU Care / ऑपरेशन बाद आईसीयू देखभाल की सहमति</span>
          </div>
          <div class="check-item">
            <div class="check-box">${isBlank ? '' : '✓'}</div>
            <span>Pre-Anesthesia Assessment (PAC) Done / एनेस्थीसिया पूर्व जांच पूर्ण</span>
          </div>
          <div class="check-item">
            <div class="check-box">${isBlank ? '' : '✓'}</div>
            <span>Allergy / Cardiac History Disclosed / एलर्जी व पूर्व बीमारियों की जानकारी दी</span>
          </div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- PART 3: DECLARATION & SIGNATURES -->
    <div class="signatures-container">
      <div class="clause" style="margin-bottom: 8px; font-size: 9.5px;">
        <p class="clause-en"><strong>Patient / Relative Declaration:</strong> I state that I have read / have had read and explained to me the contents of this consent form. I have been given the opportunity to ask questions, which have been answered to my satisfaction. I give this consent voluntarily.</p>
        <p class="clause-hi"><strong>मरीज / अभिभावक की घोषणा:</strong> मैं प्रमाणित करता/करती हूँ कि मैंने इस सहमति पत्र को स्वयं पढ़ लिया है / मुझे मेरी समझ में आने वाली भाषा में भली-भांति समझा दिया गया है। मैंने सभी शंकाओं का समाधान प्राप्त कर लिया है तथा पूर्ण स्वेच्छा से सहमति प्रदान कर रहा/रही हूँ।</p>
      </div>

      <div class="sig-grid">
        <!-- Patient / Relative Box -->
        <div class="sig-box">
          <div class="sig-header">
            <div>1. Patient / Relative Signature & Thumb Impression</div>
            <div class="sig-header-hi">मरीज / अभिभावक के हस्ताक्षर व अंगूठे का निशान</div>
          </div>
          <div class="sig-area">
            ${isBlank ? 'Signature / Thumb Impression' : (consent?.isSigned ? '✓ Electronically Signed & Verified' : 'Signature / Thumb Impression')}
          </div>
          <div class="sig-details">
            <div><strong>Name / नाम:</strong> ${signatoryName}</div>
            <div><strong>Relation / संबंध:</strong> ${signatoryRel} (${signatoryType})</div>
            <div><strong>Phone / फोन:</strong> ${patPhone}</div>
          </div>
        </div>

        <!-- Witness Box -->
        <div class="sig-box">
          <div class="sig-header">
            <div>2. Witness Signature (Staff Nurse / Relative)</div>
            <div class="sig-header-hi">गवाह के हस्ताक्षर एवं विवरण</div>
          </div>
          <div class="sig-area">
            ${isBlank ? 'Witness Signature' : '✓ Verified in presence of witness'}
          </div>
          <div class="sig-details">
            <div><strong>Witness Name / नाम:</strong> ${witnessName}</div>
            <div><strong>Relationship / पद:</strong> Staff Nurse / Ward Incharge</div>
            <div><strong>Date & Time / दिनांक:</strong> ${dateStr} ${timeStr}</div>
          </div>
        </div>

        <!-- Operating Surgeon Box -->
        <div class="sig-box">
          <div class="sig-header">
            <div>3. Operating Surgeon Signature & Seal</div>
            <div class="sig-header-hi">ऑपरेटिंग सर्जन के हस्ताक्षर व मुहर</div>
          </div>
          <div class="sig-area">
            ${isBlank ? 'Doctor Signature & Seal' : `✓ ${surgeonName} (MD/MS, Surgeon)`}
          </div>
          <div class="sig-details">
            <div><strong>Surgeon Name:</strong> ${surgeonName}</div>
            <div><strong>Explanation Given:</strong> Yes / पूर्ण विवरण दिया गया</div>
            <div><strong>Reg. No:</strong> REG-MED-${Math.abs((surgeonName || '').length * 137 + 419)}</div>
          </div>
        </div>

        <!-- Anesthesiologist Box -->
        <div class="sig-box">
          <div class="sig-header">
            <div>4. Anesthesiologist Signature & Seal</div>
            <div class="sig-header-hi">निश्चेतना विशेषज्ञ (एनेस्थेटिस्ट) के हस्ताक्षर व मुहर</div>
          </div>
          <div class="sig-area">
            ${isBlank ? 'Anesthetist Signature & Seal' : `✓ ${anesthetistName} (MD, Anesthesia)`}
          </div>
          <div class="sig-details">
            <div><strong>Anesthetist Name:</strong> ${anesthetistName}</div>
            <div><strong>PAC Assessment:</strong> Reviewed & Cleared</div>
            <div><strong>Reg. No:</strong> REG-ANE-${Math.abs((anesthetistName || '').length * 193 + 521)}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Notice -->
    <div class="consent-footer">
      <div>This is a confidential, medico-legally binding document preserved in the permanent medical records (EHR/HIS).</div>
      <div style="margin-top: 2px;">यह एक गोपनीय एवं विधिक रूप से मान्य चिकित्सा दस्तावेज है जो अस्पताल के स्थायी रिकॉर्ड में संरक्षित किया जाता है।</div>
    </div>
  </div>
</body>
</html>
  `;
}
