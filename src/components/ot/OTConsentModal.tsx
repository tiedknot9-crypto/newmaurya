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
  Download,
  Maximize2,
  Minimize2,
  User as UserIcon,
  Calendar,
  Sparkles
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
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        const cEdit = consentToEdit as any;
        // Edit mode
        setSelectedPatientId(cEdit.patientId || cEdit.patient_id || '');
        setActiveTab(cEdit.consentType || 'combined');
        setProcedureName(cEdit.procedureName || '');
        setDiagnosis(cEdit.diagnosis || '');
        setProposedDate(cEdit.proposedDate || cEdit.proposed_date || new Date().toISOString().split('T')[0]);
        setSurgeonId(cEdit.surgeonId || cEdit.surgeon_id || '');
        setSurgeonName(cEdit.surgeonName || cEdit.surgeon_name || '');
        setDepartment(cEdit.department || 'General Surgery');
        
        setAnesthesiaType((cEdit.anesthesiaType || cEdit.anesthesia_type || 'General Anesthesia') as any);
        setAnesthetistId(cEdit.anesthetistId || cEdit.anesthetist_id || '');
        setAnesthetistName(cEdit.anesthetistName || cEdit.anesthetist_name || '');
        setAsaGrade((cEdit.asaGrade || cEdit.asa_grade || 'ASA II') as any);
        setNpoStatus(cEdit.npoStatus || cEdit.npo_status || 'NPO 6-8 hrs prior to surgery');

        setRisksExplained(cEdit.risksExplained ?? true);
        setBloodTransfusionConsent(cEdit.bloodTransfusionConsent ?? true);
        setIcuCareConsent(cEdit.icuCareConsent ?? true);
        setConversionConsent(cEdit.conversionConsent ?? true);
        setEmergencyProcedureConsent(cEdit.emergencyProcedureConsent ?? true);

        setSignatoryType((cEdit.signatoryType || cEdit.signatory_type || 'Patient') as any);
        setSignatoryName(cEdit.signatoryName || cEdit.signatory_name || '');
        setSignatoryRelationship(cEdit.signatoryRelationship || cEdit.signatory_relationship || 'Self');
        setSignatoryPhone(cEdit.signatoryPhone || cEdit.signatory_phone || '');
        setSignatoryAddress(cEdit.signatoryAddress || cEdit.signatory_address || '');
        setIsSigned(cEdit.isSigned ?? true);
        setSignatureDate(cEdit.signatureDate || cEdit.signature_date || new Date().toISOString().split('T')[0]);
        setSignatureTime(cEdit.signatureTime || cEdit.signature_time || '10:00 AM');

        setWitnessName(cEdit.witnessName || cEdit.witness_name || 'Sister Anjali (OT Staff Nurse)');
        setWitnessRelationship(cEdit.witnessRelationship || cEdit.witness_relationship || 'Staff Nurse');
        setSpecialNotes(cEdit.specialNotes || cEdit.special_notes || '');
      } else {
        // New consent mode
        const otSched = otSchedule as any;
        const pId = patient?.id || otSched?.patientId || otSched?.patient_id || (patientsList[0]?.id || '');
        setSelectedPatientId(pId);
        const activePat = patient || patientsList.find(p => p.id === pId);

        setProcedureName(otSched?.operationName || otSched?.operation_name || otSched?.procedure_name || 'Laparoscopic Appendectomy');
        setDiagnosis((activePat as any)?.diagnosis || 'Acute Condition / Pre-Op Indication');
        setProposedDate(otSched?.date || otSched?.scheduled_date || otSched?.surgery_date || new Date().toISOString().split('T')[0]);
        
        const defaultSurgeon = surgeonsList.find(s => s.id === (otSched?.surgeonId || otSched?.surgeon_id)) || surgeonsList[0];
        if (defaultSurgeon) {
          setSurgeonId(defaultSurgeon.id);
          setSurgeonName(defaultSurgeon.name);
          setDepartment(defaultSurgeon.department || 'General Surgery');
        } else {
          setSurgeonName(otSched?.surgeonName || otSched?.surgeon_name || 'Dr. Operating Surgeon, MS');
          setDepartment(otSched?.department || 'General Surgery');
        }

        setAnesthesiaType((otSched?.anesthesiaType || otSched?.anesthesia_type || 'General Anesthesia') as any);
        setAnesthetistName(otSched?.anesthetistName || otSched?.anesthetist_name || 'Dr. Duty Anesthesiologist, MD');
        setAsaGrade('ASA II');
        setNpoStatus('NPO 6 hours for solids, 2 hours for clear fluids');

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
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setSignatureTime(timeStr);

        setWitnessName('Sister Anjali (OT Staff Nurse)');
        setWitnessRelationship('Staff Nurse');
        setSpecialNotes('');
      }
    }
  }, [isOpen, consentToEdit, patient, otSchedule, patientsList, surgeonsList]);

  const handlePatientSelect = (patId: string) => {
    setSelectedPatientId(patId);
    const pat = patientsList.find(p => p.id === patId);
    if (pat) {
      if (signatoryType === 'Patient') {
        setSignatoryName(pat.name);
        setSignatoryPhone(pat.phone || '');
        setSignatoryAddress(pat.address || '');
      }
      if ((pat as any).diagnosis && !diagnosis) {
        setDiagnosis((pat as any).diagnosis);
      }
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

  const buildConsentData = () => {
    return {
      id: consentToEdit?.id || `ot-consent-${Date.now()}`,
      patientId: selectedPatientId || currentPatient?.id || '',
      patient_id: selectedPatientId || currentPatient?.id || '',
      otScheduleId: otSchedule?.id,
      consentType: activeTab,
      procedureName: procedureName.trim(),
      diagnosis: diagnosis.trim(),
      proposedDate,
      surgeonId,
      surgeonName,
      department,
      anesthesiaType,
      anesthetistId,
      anesthetistName,
      asaGrade,
      npoStatus,
      risksExplained,
      bloodTransfusionConsent,
      icuCareConsent,
      conversionConsent,
      emergencyProcedureConsent,
      signatoryType,
      signatoryName: signatoryName.trim(),
      signatoryRelationship,
      signatoryPhone: signatoryPhone.trim(),
      signatoryAddress: signatoryAddress.trim(),
      isSigned,
      signatureDate,
      signatureTime,
      witnessName: witnessName.trim(),
      witnessRelationship: witnessRelationship.trim(),
      specialNotes: specialNotes.trim(),
      status: isSigned ? ('Signed' as const) : ('Pending' as const),
      createdAt: consentToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  const handleSave = async (andPrint: boolean = false) => {
    if (!procedureName.trim()) {
      toast.error('Please specify the Procedure / Operation Name.');
      return;
    }
    if (!signatoryName.trim()) {
      toast.error('Please specify the Signatory Name.');
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
      <DialogContent 
        className={`transition-all duration-200 flex flex-col p-0 overflow-hidden shadow-2xl border border-[#F4B2AF] ${
          isFullscreen 
            ? '!w-[100vw] !max-w-none !sm:max-w-none !h-[100vh] !max-h-none !rounded-none !top-0 !left-0 !translate-x-0 !translate-y-0 fixed'
            : '!w-[98vw] !max-w-7xl !sm:max-w-7xl !h-[95vh] !max-h-[96vh] rounded-2xl'
        }`}
        style={{ backgroundColor: '#F8C8C6' }}
      >
        {/* Header with Warm Blush Tone matching Image 2 */}
        <DialogHeader className="px-6 py-4 bg-[#F5B5B1] border-b border-[#EFA39E] flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#E88C88] border border-[#DC7A75] flex items-center justify-center text-white shadow-sm">
                <HeartHandshake className="w-6 h-6 text-white drop-shadow" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-[#4A1518] flex items-center gap-2 flex-wrap">
                  <span>{consentToEdit ? 'Edit OT Consent Form' : 'OT Consent Recording & Verification'}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E57373]/20 text-[#8B1E24] border border-[#E57373]/40 font-semibold flex items-center gap-1">
                    <Languages className="w-3.5 h-3.5 text-[#B93844]" /> Bilingual (हिंदी / English)
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-[#6E2C30] font-medium mt-0.5">
                  Standard Informed Consent for Surgical Procedure & Anesthesia with Medico-Legal NABH Compliance
                </DialogDescription>
              </div>
            </div>

            {/* Quick Actions & Full Dimension Controls */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrintBlank}
                className="hidden sm:flex items-center gap-1.5 bg-white/90 hover:bg-white text-[#782024] border-[#E89C98] font-semibold text-xs h-9 shadow-sm"
                title="Print blank form for physical signature"
              >
                <Download className="w-3.5 h-3.5 text-[#B93844]" />
                Print Blank Form
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="items-center gap-1 bg-white/80 hover:bg-white text-[#782024] border-[#E89C98] text-xs h-9 px-2.5 shadow-sm"
                title={isFullscreen ? "Restore standard view" : "Expand to Full Screen"}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-4 h-4 text-[#8B1E24]" />
                    <span className="hidden md:inline font-medium">Standard View</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 text-[#8B1E24]" />
                    <span className="hidden md:inline font-medium">Full Dimension</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Consent Type Tabs styled with soft rose & crisp active state */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-3 pt-2.5 border-t border-[#EFA39E]/80">
            <button
              type="button"
              onClick={() => setActiveTab('combined')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                activeTab === 'combined'
                  ? 'bg-[#B93844] text-white shadow-md shadow-[#B93844]/30 ring-2 ring-[#B93844]/20'
                  : 'bg-white/80 text-[#6E2C30] hover:bg-white hover:text-[#4A1518]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Combined Surgery & Anesthesia Consent
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('operation')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                activeTab === 'operation'
                  ? 'bg-[#B93844] text-white shadow-md shadow-[#B93844]/30 ring-2 ring-[#B93844]/20'
                  : 'bg-white/80 text-[#6E2C30] hover:bg-white hover:text-[#4A1518]'
              }`}
            >
              <Scissors className="w-4 h-4" />
              Operation Consent Only (शल्यक्रिया)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('anesthesia')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                activeTab === 'anesthesia'
                  ? 'bg-[#B93844] text-white shadow-md shadow-[#B93844]/30 ring-2 ring-[#B93844]/20'
                  : 'bg-white/80 text-[#6E2C30] hover:bg-white hover:text-[#4A1518]'
              }`}
            >
              <Syringe className="w-4 h-4" />
              Anesthesia Consent Only (निश्चेतना)
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body in Expansive Full Dimension Layout */}
        <div 
          className="flex-1 overflow-y-auto p-5 md:p-7 space-y-6"
          style={{ backgroundColor: '#F8C8C6' }}
        >
          {/* Top Patient Summary & Encounter Card across 4 spacious columns */}
          <div className="p-4 rounded-2xl bg-white/90 border border-[#F0B4B0] shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-bold text-[#6E2C30] flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-[#B93844]" /> Select Patient / मरीज *
              </Label>
              {patientsList.length > 0 && !patient ? (
                <Select value={selectedPatientId} onValueChange={handlePatientSelect}>
                  <SelectTrigger className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]">
                    <SelectValue placeholder="Select patient..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#EAAFA9] text-slate-900">
                    {patientsList.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} ({p.mrn || 'N/A'}) - {p.age}y/{p.gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-1.5 p-2 bg-[#FFF4F3] rounded-lg border border-[#F4BDBA] text-xs font-bold text-[#4A1518]">
                  {currentPatient?.name || 'Selected Patient'} ({currentPatient?.mrn || 'MRN'})
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs font-bold text-[#6E2C30]">Age / Gender / Contact</Label>
              <div className="mt-1.5 p-2 bg-[#FFF4F3] rounded-lg border border-[#F4BDBA] text-xs text-slate-800 flex justify-between items-center h-9 font-medium">
                <span>{currentPatient?.age ? `${currentPatient.age} Yrs` : 'N/A'} / {currentPatient?.gender || 'N/A'}</span>
                <span className="text-[#8B1E24] font-semibold text-[11px]">{currentPatient?.phone || 'No phone'}</span>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-[#6E2C30]">Ward / Bed / IPD Location</Label>
              <div className="mt-1.5 p-2 bg-[#FFF4F3] rounded-lg border border-[#F4BDBA] text-xs text-slate-800 flex justify-between items-center h-9 font-medium">
                <span>Bed: {(currentPatient as any)?.bedNumber || (currentPatient as any)?.bed_number || (currentPatient as any)?.ward || 'General / OT'}</span>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px] font-bold">{(currentPatient as any)?.status || 'Admitted'}</span>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-[#6E2C30]">Consent Status & Type</Label>
              <div className="mt-1.5 p-2 bg-[#FFF4F3] rounded-lg border border-[#F4BDBA] text-xs text-slate-800 flex justify-between items-center h-9 font-medium">
                <span className="text-[#8B1E24] font-bold capitalize">{activeTab} Consent</span>
                <span className="text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded text-[11px] font-bold">
                  {isSigned ? 'Signed & Verified' : 'Pending Signature'}
                </span>
              </div>
            </div>
          </div>

          {/* 2-Column Responsive Grid Layout for Clear Full-Dimension Visibility */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Surgical & Anesthesia Details */}
            <div className="space-y-6">
              {/* Section 1: Surgical Operation Details (if Combined or Operation) */}
              {(activeTab === 'combined' || activeTab === 'operation') && (
                <div className="p-5 rounded-2xl bg-white/90 border border-[#F0B4B0] shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-[#F4BDBA]">
                    <div className="w-7 h-7 rounded-lg bg-[#F8C8C6] flex items-center justify-center text-[#8B1E24]">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#4A1518]">
                        1. Surgical Procedure & Surgeon Details
                      </h3>
                      <p className="text-[11px] text-[#7A2B30] font-medium">शल्यक्रिया एवं मुख्य सर्जन का विवरण</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Label className="text-xs font-bold text-[#4A1518]">
                        Procedure / Operation Name (ऑपरेशन का नाम) *
                      </Label>
                      <Input
                        value={procedureName}
                        onChange={e => setProcedureName(e.target.value)}
                        placeholder="e.g., Laparoscopic Cholecystectomy, Total Knee Replacement"
                        className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-xs font-bold text-[#4A1518]">
                        Pre-Op Diagnosis / Indication (रोग निदान)
                      </Label>
                      <Input
                        value={diagnosis}
                        onChange={e => setDiagnosis(e.target.value)}
                        placeholder="e.g., Symptomatic Cholelithiasis with Chronic Cholecystitis"
                        className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#4A1518]">
                        Operating Surgeon (मुख्य सर्जन)
                      </Label>
                      {surgeonsList.length > 0 ? (
                        <Select value={surgeonId} onValueChange={handleSurgeonChange}>
                          <SelectTrigger className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]">
                            <SelectValue placeholder="Select surgeon..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#EAAFA9] text-slate-900">
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
                          className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]"
                        />
                      )}
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#4A1518]">Department (विभाग)</Label>
                      <Input
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                        placeholder="General Surgery / Orthopaedics"
                        className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#4A1518]">Proposed Surgery Date</Label>
                      <Input
                        type="date"
                        value={proposedDate}
                        onChange={e => setProposedDate(e.target.value)}
                        className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: Anesthesia Details (if Combined or Anesthesia) */}
              {(activeTab === 'combined' || activeTab === 'anesthesia') && (
                <div className="p-5 rounded-2xl bg-white/90 border border-[#F0B4B0] shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-[#F4BDBA]">
                    <div className="w-7 h-7 rounded-lg bg-[#F8C8C6] flex items-center justify-center text-[#8B1E24]">
                      <Syringe className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#4A1518]">
                        2. Anesthesia Details & Pre-Anesthetic PAC (निश्चेतना विवरण)
                      </h3>
                      <p className="text-[11px] text-[#7A2B30] font-medium">निश्चेतना तकनीक, ASA ग्रेड एवं उपवास स्थिति</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-[#4A1518]">Anesthesia Technique (प्रकार)</Label>
                      <Select value={anesthesiaType} onValueChange={(val: any) => setAnesthesiaType(val)}>
                        <SelectTrigger className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-[#EAAFA9] text-slate-900">
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
                      <Label className="text-xs font-bold text-[#4A1518]">ASA Physical Status Grade</Label>
                      <Select value={asaGrade} onValueChange={(val: any) => setAsaGrade(val)}>
                        <SelectTrigger className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-[#EAAFA9] text-slate-900">
                          <SelectItem value="ASA I" className="text-xs">ASA I - Normal Healthy Patient</SelectItem>
                          <SelectItem value="ASA II" className="text-xs">ASA II - Mild Systemic Disease</SelectItem>
                          <SelectItem value="ASA III" className="text-xs">ASA III - Severe Systemic Disease</SelectItem>
                          <SelectItem value="ASA IV" className="text-xs">ASA IV - Life Threatening Disease</SelectItem>
                          <SelectItem value="ASA-E (Emergency)" className="text-xs">ASA-E - Emergency Surgery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-xs font-bold text-[#4A1518]">Anesthesiologist (एनेस्थीसियोलॉजिस्ट)</Label>
                      <Input
                        value={anesthetistName}
                        onChange={e => setAnesthetistName(e.target.value)}
                        placeholder="Dr. Anesthesiologist Name, MD"
                        className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-xs font-bold text-[#4A1518]">Fasting / NPO Status (उपवास स्थिति)</Label>
                      <Input
                        value={npoStatus}
                        onChange={e => setNpoStatus(e.target.value)}
                        placeholder="e.g., NPO 6 hours for solids, 2 hours for clear fluids"
                        className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Declarations, Signatory & Witness Information */}
            <div className="space-y-6">
              {/* Section 3: Legal Clauses & Informed Consent Checkboxes */}
              <div className="p-5 rounded-2xl bg-white/90 border border-[#F0B4B0] shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-[#F4BDBA]">
                  <div className="w-7 h-7 rounded-lg bg-[#F8C8C6] flex items-center justify-center text-[#8B1E24]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#4A1518]">
                      3. Informed Declarations & Medico-Legal Approvals
                    </h3>
                    <p className="text-[11px] text-[#7A2B30] font-medium">सहमति घोषणाएं एवं आपातकालीन अधिकार</p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-[#FFF5F4] border border-[#F4BDBA] hover:bg-white cursor-pointer transition-all">
                    <Checkbox
                      checked={risksExplained}
                      onCheckedChange={(c) => setRisksExplained(!!c)}
                      className="mt-0.5 data-[state=checked]:bg-[#B93844] data-[state=checked]:border-[#B93844]"
                    />
                    <div className="text-xs text-slate-900">
                      <div className="font-bold text-[#4A1518]">Risks, Benefits & Alternatives Explained in Native Tongue</div>
                      <div className="text-[11px] text-[#7A2B30] mt-0.5 font-medium leading-relaxed">
                        मरीज/अभिभावक को ऑपरेशन एवं निश्चेतना के जोखिम, लाभ एवं विकल्पों की जानकारी उनकी समझ में आने वाली भाषा में दी गई है।
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl bg-[#FFF5F4] border border-[#F4BDBA] hover:bg-white cursor-pointer transition-all">
                    <Checkbox
                      checked={bloodTransfusionConsent}
                      onCheckedChange={(c) => setBloodTransfusionConsent(!!c)}
                      className="mt-0.5 data-[state=checked]:bg-[#B93844] data-[state=checked]:border-[#B93844]"
                    />
                    <div className="text-xs text-slate-900">
                      <div className="font-bold text-[#4A1518]">Consent for Blood & Blood Component Transfusion (रक्त आधान)</div>
                      <div className="text-[11px] text-[#7A2B30] mt-0.5 font-medium leading-relaxed">
                        ऑपरेशन के दौरान या पश्चात आवश्यकता पड़ने पर रक्त या रक्त घटक चढ़ाने हेतु सहमति प्रदान की गई है।
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl bg-[#FFF5F4] border border-[#F4BDBA] hover:bg-white cursor-pointer transition-all">
                    <Checkbox
                      checked={icuCareConsent}
                      onCheckedChange={(c) => setIcuCareConsent(!!c)}
                      className="mt-0.5 data-[state=checked]:bg-[#B93844] data-[state=checked]:border-[#B93844]"
                    />
                    <div className="text-xs text-slate-900">
                      <div className="font-bold text-[#4A1518]">Post-Op ICU / Critical Care & Ventilator Support (आईसीयू वेंटिलेटर सहायता)</div>
                      <div className="text-[11px] text-[#7A2B30] mt-0.5 font-medium leading-relaxed">
                        गंभीर स्थिति में गहन चिकित्सा कक्ष (ICU) में भर्ती एवं वेंटिलेटर सहायता हेतु सहमति।
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl bg-[#FFF5F4] border border-[#F4BDBA] hover:bg-white cursor-pointer transition-all">
                    <Checkbox
                      checked={conversionConsent}
                      onCheckedChange={(c) => setConversionConsent(!!c)}
                      className="mt-0.5 data-[state=checked]:bg-[#B93844] data-[state=checked]:border-[#B93844]"
                    />
                    <div className="text-xs text-slate-900">
                      <div className="font-bold text-[#4A1518]">Emergency Extension & Laparoscopic-to-Open Conversion Authorization</div>
                      <div className="text-[11px] text-[#7A2B30] mt-0.5 font-medium leading-relaxed">
                        जीवन रक्षा हेतु ऑपरेशन के दौरान आवश्यक आकस्मिक प्रक्रिया अथवा दूरबीन से खुले ऑपरेशन में परिवर्तन की स्वीकृति।
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Section 4: Signatory & Witness Details */}
              <div className="p-5 rounded-2xl bg-white/90 border border-[#F0B4B0] shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-[#F4BDBA]">
                  <div className="w-7 h-7 rounded-lg bg-[#F8C8C6] flex items-center justify-center text-[#8B1E24]">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#4A1518]">
                      4. Signatory & Witness Information (हस्ताक्षरकर्ता एवं गवाह)
                    </h3>
                    <p className="text-[11px] text-[#7A2B30] font-medium">सहमति देने वाले व्यक्ति एवं गवाह का सत्यापन</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-[#FFF5F4] rounded-xl border border-[#F4BDBA] flex items-center gap-4 flex-wrap">
                    <Label className="text-xs font-bold text-[#4A1518]">Signatory Is (सहमति कर्ता):</Label>
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
                      className="flex items-center gap-5"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Patient" id="sig-patient" className="text-[#B93844] border-[#B93844]" />
                        <Label htmlFor="sig-patient" className="text-xs font-bold text-[#4A1518] cursor-pointer">Patient (स्वयं मरीज)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Guardian / Relative" id="sig-guardian" className="text-[#B93844] border-[#B93844]" />
                        <Label htmlFor="sig-guardian" className="text-xs font-bold text-[#4A1518] cursor-pointer">Guardian / Relative (अभिभावक / रिश्तेदार)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-[#4A1518]">Signatory Name (हस्ताक्षरकर्ता का नाम) *</Label>
                      <Input
                        value={signatoryName}
                        onChange={e => setSignatoryName(e.target.value)}
                        placeholder="Full Name"
                        className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#4A1518]">Relationship with Patient (संबंध)</Label>
                      <Select value={signatoryRelationship} onValueChange={setSignatoryRelationship}>
                        <SelectTrigger className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-[#EAAFA9] text-slate-900">
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
                      <Label className="text-xs font-bold text-[#4A1518]">Contact Number (फोन नं.)</Label>
                      <Input
                        value={signatoryPhone}
                        onChange={e => setSignatoryPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#4A1518]">Witness Name (गवाह का नाम)</Label>
                      <Input
                        value={witnessName}
                        onChange={e => setWitnessName(e.target.value)}
                        placeholder="Sister Anjali (OT Staff Nurse)"
                        className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#4A1518]">Signature Date</Label>
                      <Input
                        type="date"
                        value={signatureDate}
                        onChange={e => setSignatureDate(e.target.value)}
                        className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#4A1518]">Signature Time</Label>
                      <Input
                        value={signatureTime}
                        onChange={e => setSignatureTime(e.target.value)}
                        placeholder="10:00 AM"
                        className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs h-9 font-medium focus:ring-[#B93844]"
                      />
                    </div>
                  </div>

                  {/* Verified Electronic Lock */}
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                      <span className="text-xs text-emerald-900 font-bold">
                        Electronic Verification & Medical Record Lock (इलेक्ट्रॉनिक सत्यापन)
                      </span>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-emerald-900 cursor-pointer font-bold">
                      <Checkbox
                        checked={isSigned}
                        onCheckedChange={(c) => setIsSigned(!!c)}
                        className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      Mark as Signed & Approved
                    </label>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-[#4A1518]">Special Clinical / High-Risk Notes (विशेष टिप्पणी)</Label>
                    <Textarea
                      value={specialNotes}
                      onChange={e => setSpecialNotes(e.target.value)}
                      placeholder="e.g. Known hypertensive, PAC clearance obtained, High risk explained to patient's son..."
                      rows={2}
                      className="mt-1.5 bg-white border-[#EAAFA9] text-slate-900 text-xs font-medium focus:ring-[#B93844]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions with Warm Blush Palette */}
        <DialogFooter className="px-6 py-3.5 bg-[#F5B5B1] border-t border-[#EFA39E] flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {consentToEdit?.id && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="text-[#8B1E24] hover:text-white hover:bg-[#B93844] text-xs gap-1.5 font-semibold"
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
              className="bg-white/90 hover:bg-white text-[#4A1518] border-[#E89C98] text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-[#B93844]" />
              Preview & Print Bilingual (हिंदी / Eng)
            </Button>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-[#6E2C30] hover:text-[#4A1518] hover:bg-white/50 text-xs font-semibold"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => handleSave(true)}
              disabled={isSubmitting}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-md px-4"
            >
              <Printer className="w-3.5 h-3.5" />
              Save & Print (Hindi/Eng)
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="bg-[#B93844] hover:bg-[#A32B36] text-white text-xs font-bold flex items-center gap-1.5 shadow-md px-4"
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
