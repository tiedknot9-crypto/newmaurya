import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { OTConsentRecord, Patient, User, OperationRecord } from '@/types';
import { supabaseService } from '@/services/supabaseService';
import { printHtmlWithPreview } from '@/components/PrintPreviewModal';
import { getOTConsentPrintHtml } from '@/lib/otConsentPrint';
import { toast } from 'sonner';
import { 
  FileText, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  HeartHandshake, 
  Syringe, 
  Scissors, 
  ShieldCheck, 
  UserCheck, 
  Languages, 
  Trash2,
  Download
} from 'lucide-react';

interface OTConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  consentToEdit?: OTConsentRecord | null;
  patient?: Patient | null;
  otSchedule?: OperationRecord | null;
  patientsList?: Patient[];
  surgeonsList?: User[];
  onSuccess?: () => void;
}

export function OTConsentModal({
  isOpen,
  onClose,
  consentToEdit,
  patient,
  otSchedule,
  patientsList = [],
  surgeonsList = [],
  onSuccess
}: OTConsentModalProps) {
  const [activeTab, setActiveTab] = useState<'combined' | 'operation' | 'anesthesia'>('combined');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [procedureName, setProcedureName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [proposedDate, setProposedDate] = useState(new Date().toISOString().split('T')[0]);
  const [surgeonId, setSurgeonId] = useState('');
  const [surgeonName, setSurgeonName] = useState('');
  const [department, setDepartment] = useState('General Surgery');

  const [anesthesiaType, setAnesthesiaType] = useState<'General Anesthesia' | 'Spinal Anesthesia' | 'Epidural Anesthesia' | 'Regional Nerve Block' | 'Local Anesthesia with Sedation' | 'Local Anesthesia'>('General Anesthesia');
  const [anesthetistId, setAnesthetistId] = useState('');
  const [anesthetistName, setAnesthetistName] = useState('');
  const [asaGrade, setAsaGrade] = useState<'ASA I' | 'ASA II' | 'ASA III' | 'ASA IV' | 'ASA V' | 'ASA-E (Emergency)'>('ASA II');
  const [npoStatus, setNpoStatus] = useState('NPO 6-8 hrs prior to surgery');

  // Clauses / Checkboxes
  const [risksExplained, setRisksExplained] = useState(true);
  const [bloodTransfusionConsent, setBloodTransfusionConsent] = useState(true);
  const [icuCareConsent, setIcuCareConsent] = useState(true);
  const [conversionConsent, setConversionConsent] = useState(true);
  const [emergencyProcedureConsent, setEmergencyProcedureConsent] = useState(true);

  // Signatory
  const [signatoryType, setSignatoryType] = useState<'Patient' | 'Guardian / Relative'>('Patient');
  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryRelationship, setSignatoryRelationship] = useState('Self');
  const [signatoryPhone, setSignatoryPhone] = useState('');
  const [signatoryAddress, setSignatoryAddress] = useState('');
  const [isSigned, setIsSigned] = useState(true);
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split('T')[0]);
  const [signatureTime, setSignatureTime] = useState('10:00 AM');

  // Witness
  const [witnessName, setWitnessName] = useState('Sister Anjali (OT Staff Nurse)');
  const [witnessRelationship, setWitnessRelationship] = useState('Staff Nurse');
  const [specialNotes, setSpecialNotes] = useState('');

  // Selected current patient object
  const currentPatient = patientsList.find(p => p.id === selectedPatientId) || patient;

  useEffect(() => {
    if (isOpen) {
      if (consentToEdit) {
        // Edit mode
        setSelectedPatientId(consentToEdit.patientId || consentToEdit.patient_id || '');
        setActiveTab(consentToEdit.consentType || 'combined');
        setProcedureName(consentToEdit.procedureName || '');
        setDiagnosis(consentToEdit.diagnosis || '');
        setProposedDate(consentToEdit.proposedDate || new Date().toISOString().split('T')[0]);
        setSurgeonId(consentToEdit.surgeonId || '');
        setSurgeonName(consentToEdit.surgeonName || '');
        setDepartment(consentToEdit.department || 'General Surgery');
        setAnesthesiaType(consentToEdit.anesthesiaType || 'General Anesthesia');
        setAnesthetistId(consentToEdit.anesthetistId || '');
        setAnesthetistName(consentToEdit.anesthetistName || '');
        setAsaGrade(consentToEdit.asaGrade || 'ASA II');
        setNpoStatus(consentToEdit.npoStatus || 'NPO 6-8 hrs prior to surgery');
        setRisksExplained(consentToEdit.risksExplained ?? true);
        setBloodTransfusionConsent(consentToEdit.bloodTransfusionConsent ?? true);
        setIcuCareConsent(consentToEdit.icuCareConsent ?? true);
        setConversionConsent(consentToEdit.conversionConsent ?? true);
        setEmergencyProcedureConsent(consentToEdit.emergencyProcedureConsent ?? true);
        setSignatoryType(consentToEdit.signatoryType || 'Patient');
        setSignatoryName(consentToEdit.signatoryName || '');
        setSignatoryRelationship(consentToEdit.signatoryRelationship || 'Self');
        setSignatoryPhone(consentToEdit.signatoryPhone || '');
        setSignatoryAddress(consentToEdit.signatoryAddress || '');
        setIsSigned(consentToEdit.isSigned ?? true);
        setSignatureDate(consentToEdit.signatureDate || new Date().toISOString().split('T')[0]);
        setSignatureTime(consentToEdit.signatureTime || '10:00 AM');
        setWitnessName(consentToEdit.witnessName || 'Sister Anjali (OT Staff Nurse)');
        setWitnessRelationship(consentToEdit.witnessRelationship || 'Staff Nurse');
        setSpecialNotes(consentToEdit.specialNotes || '');
      } else {
        // New mode
        const pId = patient?.id || otSchedule?.patientId || otSchedule?.patient_id || (patientsList[0]?.id || '');
        setSelectedPatientId(pId);
        const activePat = patient || patientsList.find(p => p.id === pId);

        setProcedureName(otSchedule?.operationName || otSchedule?.operation_name || otSchedule?.procedure_name || 'Laparoscopic Appendectomy');
        setDiagnosis((activePat as any)?.diagnosis || 'Acute Condition / Pre-Op Indication');
        setProposedDate(otSchedule?.date || otSchedule?.scheduled_date || otSchedule?.surgery_date || new Date().toISOString().split('T')[0]);
        
        const defaultSurgeon = surgeonsList.find(s => s.id === (otSchedule?.surgeonId || otSchedule?.surgeon_id)) || surgeonsList[0];
        setSurgeonId(defaultSurgeon?.id || '');
        setSurgeonName(defaultSurgeon?.name || 'Dr. Rajesh Sharma');
        setDepartment(defaultSurgeon?.department || 'General Surgery');

        setAnesthesiaType('General Anesthesia');
        setAnesthetistId('');
        setAnesthetistName('Dr. Suresh Verma');
        setAsaGrade('ASA II');
        setNpoStatus('NPO 6-8 hrs prior to surgery');

        setRisksExplained(true);
        setBloodTransfusionConsent(true);
        setIcuCareConsent(true);
        setConversionConsent(true);
        setEmergencyProcedureConsent(true);

        setSignatoryType('Patient');
        setSignatoryName(activePat?.name || '');
        setSignatoryRelationship('Self');
        setSignatoryPhone(activePat?.phone || '');
        setSignatoryAddress(activePat?.address || '');
        setIsSigned(true);
        setSignatureDate(new Date().toISOString().split('T')[0]);
        setSignatureTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        setWitnessName('Sister Anjali (OT Staff Nurse)');
        setWitnessRelationship('Staff Nurse');
        setSpecialNotes('');
      }
    }
  }, [isOpen, consentToEdit, patient, otSchedule, patientsList, surgeonsList]);

  // Handle patient change
  const handlePatientSelect = (pId: string) => {
    setSelectedPatientId(pId);
    const p = patientsList.find(item => item.id === pId);
    if (p && signatoryType === 'Patient') {
      setSignatoryName(p.name);
      setSignatoryPhone(p.phone || '');
      setSignatoryAddress(p.address || '');
    }
  };

  const handleSurgeonChange = (sId: string) => {
    setSurgeonId(sId);
    const s = surgeonsList.find(item => item.id === sId);
    if (s) {
      setSurgeonName(s.name);
      if (s.department) setDepartment(s.department);
    }
  };

  const buildConsentData = (): Partial<OTConsentRecord> => {
    return {
      patientId: selectedPatientId || currentPatient?.id || 'p-default-1',
      otScheduleId: otSchedule?.id || undefined,
      consentType: activeTab,
      procedureName: procedureName || 'Surgical Procedure',
      diagnosis: diagnosis || 'Clinical Diagnosis',
      proposedDate,
      surgeonId,
      surgeonName: surgeonName || 'Dr. Assigned Surgeon',
      department,
      anesthesiaType,
      anesthetistId,
      anesthetistName: anesthetistName || 'Dr. Assigned Anesthesiologist',
      asaGrade,
      npoStatus,
      risksExplained,
      bloodTransfusionConsent,
      icuCareConsent,
      conversionConsent,
      emergencyProcedureConsent,
      signatoryType,
      signatoryName: signatoryName || currentPatient?.name || 'Patient',
      signatoryRelationship,
      signatoryPhone,
      signatoryAddress,
      isSigned,
      signatureDate,
      signatureTime,
      witnessName,
      witnessRelationship,
      language: 'Bilingual (Hindi/English)',
      specialNotes,
      status: isSigned ? 'Signed' : 'Pending Signature'
    };
  };

  const handleSave = async (andPrint: boolean = false) => {
    if (!procedureName.trim()) {
      toast.error('Please enter the procedure name');
      return;
    }
    if (!signatoryName.trim()) {
      toast.error('Please enter the signatory name');
      return;
    }

    try {
      setIsSubmitting(true);
      const consentData = buildConsentData();

      let savedRecord: any = null;
      if (consentToEdit?.id) {
        savedRecord = await supabaseService.updateOTConsent(consentToEdit.id, consentData);
        toast.success('OT Consent updated successfully!');
      } else {
        savedRecord = await supabaseService.createOTConsent(consentData);
        toast.success('OT Consent recorded and signed successfully!');
      }

      if (andPrint) {
        handlePrintBilingual(savedRecord || consentData);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(`Error saving OT consent: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintBilingual = (dataOverride?: any) => {
    const data = dataOverride || buildConsentData();
    const html = getOTConsentPrintHtml(data, currentPatient, null, {
      blankForm: false,
      printMode: activeTab
    });
    printHtmlWithPreview(html, `OT Consent (Hindi/English) - ${currentPatient?.name || 'Patient'}`);
  };

  const handlePrintBlank = () => {
    const html = getOTConsentPrintHtml(null, null, null, {
      blankForm: true,
      printMode: activeTab
    });
    printHtmlWithPreview(html, `Blank OT Consent Form (Bilingual Hindi/English)`);
  };

  const handleDelete = async () => {
    if (!consentToEdit?.id) return;
    if (!window.confirm('Are you sure you want to delete this OT Consent record?')) return;
    try {
      setIsSubmitting(true);
      await supabaseService.deleteOTConsent(consentToEdit.id);
      toast.success('OT Consent deleted successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(`Error deleting consent: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-900 text-slate-100 border-slate-700 shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 py-4 bg-slate-800/90 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{consentToEdit ? 'Edit OT Consent Form' : 'OT Consent Recording & Verification'}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
                    <Languages className="w-3 h-3" /> Bilingual (हिंदी / English)
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Standard Informed Consent for Surgical Procedure & Anesthesia with Medico-Legal Compliance
                </DialogDescription>
              </div>
            </div>

            {/* Print Blank Quick Action */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintBlank}
              className="hidden sm:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600 text-xs"
              title="Print blank form for physical signature"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              Print Blank Form
            </Button>
          </div>

          {/* Consent Type Tabs */}
          <div className="flex gap-2 mt-3 pt-2 border-t border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveTab('combined')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'combined'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Combined Surgery & Anesthesia Consent
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('operation')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'operation'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              Operation Consent Only (शल्यक्रिया)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('anesthesia')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'anesthesia'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
              }`}
            >
              <Syringe className="w-3.5 h-3.5" />
              Anesthesia Consent Only (निश्चेतना)
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Patient Selection & Summary */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-slate-300 font-medium">Select Patient / मरीज</Label>
              {patientsList.length > 0 && !patient ? (
                <Select value={selectedPatientId} onValueChange={handlePatientSelect}>
                  <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9">
                    <SelectValue placeholder="Select patient..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    {patientsList.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} ({p.mrn || 'N/A'}) - {p.age}y/{p.gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-1 p-2 bg-slate-900 rounded-lg border border-slate-700 text-xs font-medium text-white">
                  {currentPatient?.name || 'Selected Patient'} ({currentPatient?.mrn || 'MRN'})
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs text-slate-300 font-medium">Age / Gender / Contact</Label>
              <div className="mt-1 p-2 bg-slate-900 rounded-lg border border-slate-700 text-xs text-slate-300 flex justify-between items-center h-9">
                <span>{currentPatient?.age ? `${currentPatient.age} Yrs` : 'N/A'} / {currentPatient?.gender || 'N/A'}</span>
                <span className="text-blue-400 font-mono text-[11px]">{currentPatient?.phone || 'No phone'}</span>
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-300 font-medium">Ward / Bed / IPD</Label>
              <div className="mt-1 p-2 bg-slate-900 rounded-lg border border-slate-700 text-xs text-slate-300 flex justify-between items-center h-9">
                <span>Bed: {(currentPatient as any)?.bedNumber || (currentPatient as any)?.bed_number || (currentPatient as any)?.ward || 'General / OT'}</span>
                <span className="text-emerald-400 text-[11px] font-semibold">{(currentPatient as any)?.status || 'Admitted'}</span>
              </div>
            </div>
          </div>

          {/* Section 1: Surgical Operation Details (if Combined or Operation) */}
          {(activeTab === 'combined' || activeTab === 'operation') && (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/70 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
                <Scissors className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">
                  1. Surgical Procedure & Surgeon Details (शल्यक्रिया विवरण)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-300">Procedure / Operation Name (ऑपरेशन का नाम) *</Label>
                  <Input
                    value={procedureName}
                    onChange={e => setProcedureName(e.target.value)}
                    placeholder="e.g., Laparoscopic Cholecystectomy, Total Knee Replacement"
                    className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-300">Pre-Op Diagnosis / Indication (रोग निदान)</Label>
                  <Input
                    value={diagnosis}
                    onChange={e => setDiagnosis(e.target.value)}
                    placeholder="e.g., Symptomatic Cholelithiasis"
                    className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-300">Operating Surgeon (मुख्य सर्जन)</Label>
                  {surgeonsList.length > 0 ? (
                    <Select value={surgeonId} onValueChange={handleSurgeonChange}>
                      <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9">
                        <SelectValue placeholder="Select surgeon..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-white">
                        {surgeonsList.map(s => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            {s.name} ({s.department || s.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={surgeonName}
                      onChange={e => setSurgeonName(e.target.value)}
                      placeholder="Dr. Operating Surgeon"
                      className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-300">Department</Label>
                    <Input
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      placeholder="General Surgery / Ortho"
                      className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300">Proposed Date</Label>
                    <Input
                      type="date"
                      value={proposedDate}
                      onChange={e => setProposedDate(e.target.value)}
                      className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Anesthesia Details (if Combined or Anesthesia) */}
          {(activeTab === 'combined' || activeTab === 'anesthesia') && (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/70 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
                <Syringe className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">
                  2. Anesthesia Details & Assessment (निश्चेतना विवरण)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-slate-300">Anesthesia Technique (प्रकार)</Label>
                  <Select value={anesthesiaType} onValueChange={(val: any) => setAnesthesiaType(val)}>
                    <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="General Anesthesia" className="text-xs">General Anesthesia (सामान्य निश्चेतना)</SelectItem>
                      <SelectItem value="Spinal Anesthesia" className="text-xs">Spinal Anesthesia (स्पाइनल निश्चेतना)</SelectItem>
                      <SelectItem value="Epidural Anesthesia" className="text-xs">Epidural Anesthesia (एपिड्यूरल)</SelectItem>
                      <SelectItem value="Regional Nerve Block" className="text-xs">Regional Nerve Block (नर्व ब्लॉक)</SelectItem>
                      <SelectItem value="Local Anesthesia with Sedation" className="text-xs">Local with MAC / Sedation (लोकल व सेडेशन)</SelectItem>
                      <SelectItem value="Local Anesthesia" className="text-xs">Local Anesthesia (स्थानीय सुन्निकरण)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-300">ASA Physical Status Grade</Label>
                  <Select value={asaGrade} onValueChange={(val: any) => setAsaGrade(val)}>
                    <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="ASA I" className="text-xs">ASA I - Normal Healthy Patient</SelectItem>
                      <SelectItem value="ASA II" className="text-xs">ASA II - Mild Systemic Disease</SelectItem>
                      <SelectItem value="ASA III" className="text-xs">ASA III - Severe Systemic Disease</SelectItem>
                      <SelectItem value="ASA IV" className="text-xs">ASA IV - Life Threatening Disease</SelectItem>
                      <SelectItem value="ASA-E (Emergency)" className="text-xs">ASA-E - Emergency Surgery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-300">Anesthesiologist (एनेस्थीसियोलॉजिस्ट)</Label>
                  <Input
                    value={anesthetistName}
                    onChange={e => setAnesthetistName(e.target.value)}
                    placeholder="Dr. Anesthesiologist Name"
                    className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9"
                  />
                </div>

                <div className="md:col-span-3">
                  <Label className="text-xs text-slate-300">Fasting / NPO Status (उपवास स्थिति)</Label>
                  <Input
                    value={npoStatus}
                    onChange={e => setNpoStatus(e.target.value)}
                    placeholder="e.g., NPO 6 hours for solids, 2 hours for clear fluids"
                    className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Legal Clauses & Informed Consent Checkboxes */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/70 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">
                3. Informed Declarations & Medico-Legal Approvals (सहमति घोषणाएं)
              </h3>
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50 hover:bg-slate-900 cursor-pointer">
                <Checkbox
                  checked={risksExplained}
                  onCheckedChange={(c) => setRisksExplained(!!c)}
                  className="mt-0.5"
                />
                <div className="text-xs text-slate-300">
                  <div className="font-medium text-white">Risks, Benefits & Alternatives Explained in Native Tongue</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    मरीज/अभिभावक को ऑपरेशन एवं निश्चेतना के जोखिम, लाभ एवं विकल्पों की जानकारी उनकी समझ में आने वाली भाषा में दी गई है।
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50 hover:bg-slate-900 cursor-pointer">
                <Checkbox
                  checked={bloodTransfusionConsent}
                  onCheckedChange={(c) => setBloodTransfusionConsent(!!c)}
                  className="mt-0.5"
                />
                <div className="text-xs text-slate-300">
                  <div className="font-medium text-white">Consent for Blood & Blood Component Transfusion (रक्त आधान)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    ऑपरेशन के दौरान या पश्चात आवश्यकता पड़ने पर रक्त या रक्त घटक चढ़ाने हेतु सहमति प्रदान की गई है।
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50 hover:bg-slate-900 cursor-pointer">
                <Checkbox
                  checked={icuCareConsent}
                  onCheckedChange={(c) => setIcuCareConsent(!!c)}
                  className="mt-0.5"
                />
                <div className="text-xs text-slate-300">
                  <div className="font-medium text-white">Post-Op ICU / Critical Care & Ventilator Support (आईसीयू वेंटिलेटर सहायता)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    गंभीर स्थिति में गहन चिकित्सा कक्ष (ICU) में भर्ती एवं वेंटिलेटर सहायता हेतु सहमति।
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50 hover:bg-slate-900 cursor-pointer">
                <Checkbox
                  checked={conversionConsent}
                  onCheckedChange={(c) => setConversionConsent(!!c)}
                  className="mt-0.5"
                />
                <div className="text-xs text-slate-300">
                  <div className="font-medium text-white">Emergency Extension & Laparoscopic-to-Open Conversion Authorization</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    जीवन रक्षा हेतु ऑपरेशन के दौरान आवश्यक आकस्मिक प्रक्रिया अथवा दूरबीन से खुले ऑपरेशन में परिवर्तन की स्वीकृति।
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Section 4: Signatory & Witness Details */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/70 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
              <UserCheck className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">
                4. Signatory & Witness Information (हस्ताक्षरकर्ता एवं गवाह)
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-6">
                <Label className="text-xs text-slate-300 font-medium">Signatory Is:</Label>
                <RadioGroup 
                  value={signatoryType} 
                  onValueChange={(val: any) => {
                    setSignatoryType(val);
                    if (val === 'Patient' && currentPatient) {
                      setSignatoryName(currentPatient.name);
                      setSignatoryRelationship('Self');
                      setSignatoryPhone(currentPatient.phone || '');
                    }
                  }}
                  className="flex items-center gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Patient" id="sig-patient" />
                    <Label htmlFor="sig-patient" className="text-xs text-slate-200 cursor-pointer">Patient (स्वयं मरीज)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Guardian / Relative" id="sig-guardian" />
                    <Label htmlFor="sig-guardian" className="text-xs text-slate-200 cursor-pointer">Guardian / Relative (अभिभावक / रिश्तेदार)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-slate-300">Signatory Name (हस्ताक्षरकर्ता का नाम) *</Label>
                  <Input
                    value={signatoryName}
                    onChange={e => setSignatoryName(e.target.value)}
                    placeholder="Full Name"
                    className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-300">Relationship with Patient (संबंध)</Label>
                  <Select value={signatoryRelationship} onValueChange={setSignatoryRelationship}>
                    <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="Self" className="text-xs">Self (स्वयं)</SelectItem>
                      <SelectItem value="Spouse (Husband/Wife)" className="text-xs">Spouse (पति / पत्नी)</SelectItem>
                      <SelectItem value="Father" className="text-xs">Father (पिता)</SelectItem>
                      <SelectItem value="Mother" className="text-xs">Mother (माता)</SelectItem>
                      <SelectItem value="Son" className="text-xs">Son (पुत्र)</SelectItem>
                      <SelectItem value="Daughter" className="text-xs">Daughter (पुत्री)</SelectItem>
                      <SelectItem value="Brother/Sister" className="text-xs">Brother / Sister (भाई / बहन)</SelectItem>
                      <SelectItem value="Legal Guardian" className="text-xs">Legal Guardian (कानूनी अभिभावक)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-300">Contact Number (फोन नं.)</Label>
                  <Input
                    value={signatoryPhone}
                    onChange={e => setSignatoryPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-300">Witness Name (गवाह का नाम)</Label>
                  <Input
                    value={witnessName}
                    onChange={e => setWitnessName(e.target.value)}
                    placeholder="Sister Anjali (OT Staff Nurse)"
                    className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-300">Signature Date</Label>
                  <Input
                    type="date"
                    value={signatureDate}
                    onChange={e => setSignatureDate(e.target.value)}
                    className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-300">Signature Time</Label>
                  <Input
                    value={signatureTime}
                    onChange={e => setSignatureTime(e.target.value)}
                    placeholder="10:00 AM"
                    className="mt-1 bg-slate-900 border-slate-700 text-white text-xs h-9"
                  />
                </div>
              </div>

              {/* Verified Badge Checkbox */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-emerald-200 font-medium">
                    Electronic Verification & Medical Record Lock (इलेक्ट्रॉनिक सत्यापन)
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs text-emerald-300 cursor-pointer font-semibold">
                  <Checkbox
                    checked={isSigned}
                    onCheckedChange={(c) => setIsSigned(!!c)}
                  />
                  Mark as Signed & Approved
                </label>
              </div>

              <div>
                <Label className="text-xs text-slate-300">Special Clinical / High-Risk Notes (विशेष टिप्पणी)</Label>
                <Textarea
                  value={specialNotes}
                  onChange={e => setSpecialNotes(e.target.value)}
                  placeholder="e.g. Known hypertensive, PAC clearance obtained, High risk explained to patient's son..."
                  rows={2}
                  className="mt-1 bg-slate-900 border-slate-700 text-white text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-3.5 bg-slate-800/95 border-t border-slate-700 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {consentToEdit?.id && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePrintBilingual()}
              className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 text-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              Preview & Print Bilingual (हिंदी / Eng)
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => handleSave(true)}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              Save & Print (Hindi/Eng)
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Save Consent
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
