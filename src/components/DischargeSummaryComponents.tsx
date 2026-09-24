import React, { useState, useRef } from 'react';
import { 
  Pill, 
  Plus, 
  Trash2, 
  Paperclip, 
  Upload, 
  Image as ImageIcon, 
  File, 
  Eye, 
  Download, 
  Search, 
  Activity, 
  Check, 
  X, 
  ShieldCheck, 
  FileText, 
  ChevronDown, 
  Sparkles,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { COMMON_ICD_CODES, searchIcdCodes, IcdCodeItem } from '@/data/icdCodes';
import { toast } from 'sonner';

export interface DischargeMedicineItem {
  id?: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  route?: string;
}

export interface DischargeAttachmentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  uploadedAt: string;
}

export interface DischargeConsentData {
  consentType: string;
  signatoryType: 'Patient' | 'Attendant';
  attendantName: string;
  attendantRelation: string;
  attendantPhone: string;
  consentAgreed: boolean;
  consentNotes: string;
  consentTimestamp: string;
}

export const COMMON_MEDICINE_PRESETS: DischargeMedicineItem[] = [
  { name: 'Paracetamol', dosage: '650mg', frequency: '1-0-1', duration: '5 days', instructions: 'After food', route: 'Oral' },
  { name: 'Pantoprazole', dosage: '40mg', frequency: '1-0-0', duration: '5 days', instructions: 'Before breakfast', route: 'Oral' },
  { name: 'Augmentin (Amox-Clav)', dosage: '625mg', frequency: '1-0-1', duration: '5 days', instructions: 'After meals', route: 'Oral' },
  { name: 'Cetirizine', dosage: '10mg', frequency: '0-0-1', duration: '5 days', instructions: 'At bedtime', route: 'Oral' },
  { name: 'Azithromycin', dosage: '500mg', frequency: '1-0-0', duration: '3 days', instructions: '1 hr before meals', route: 'Oral' },
  { name: 'Metformin', dosage: '500mg', frequency: '1-0-1', duration: '30 days', instructions: 'With meals', route: 'Oral' },
  { name: 'Amlodipine', dosage: '5mg', frequency: '1-0-0', duration: '30 days', instructions: 'Morning after breakfast', route: 'Oral' },
  { name: 'Ondansetron', dosage: '4mg', frequency: 'SOS', duration: '3 days', instructions: 'If nausea / vomiting', route: 'Oral' },
  { name: 'Tramadol + Paracetamol', dosage: '37.5/325mg', frequency: 'SOS', duration: '3 days', instructions: 'For severe pain', route: 'Oral' },
  { name: 'Multivitamin & Zinc', dosage: '1 Tab', frequency: '0-1-0', duration: '15 days', instructions: 'After lunch', route: 'Oral' }
];

export function formatMedicinesToText(medicines: DischargeMedicineItem[]): string {
  if (!medicines || medicines.length === 0) return '';
  return medicines.map((m, idx) => {
    let line = `${idx + 1}. ${m.name || 'Medicine'}`;
    if (m.dosage) line += ` ${m.dosage}`;
    if (m.frequency) line += ` (${m.frequency})`;
    if (m.duration) line += ` - ${m.duration}`;
    if (m.instructions) line += ` [${m.instructions}]`;
    if (m.route && m.route !== 'Oral') line += ` [${m.route}]`;
    return line;
  }).join('\n');
}

export function convertPrescriptionToMedicines(prescription: any): DischargeMedicineItem[] {
  if (!prescription) return [];
  const list = prescription.medicines || prescription.medications || [];
  if (!Array.isArray(list)) return [];
  return list.map((m: any) => ({
    name: m.name || m.drug_name || m.drugName || '',
    dosage: m.dosage || m.strength || '',
    frequency: m.frequency || m.interval || '1-0-1',
    duration: m.duration || '5 days',
    instructions: m.instructions || m.timing || 'After food',
    route: m.route || 'Oral'
  }));
}

// -----------------------------------------------------------------------------
// 1. OPD-STYLE MEDICATION SEGMENT
// -----------------------------------------------------------------------------
interface DischargeMedicationTableProps {
  medicines: DischargeMedicineItem[];
  onChange: (medicines: DischargeMedicineItem[]) => void;
  onImportFromPrescriptions?: () => void;
  hasPrescriptionsToImport?: boolean;
}

export function DischargeMedicationTable({
  medicines,
  onChange,
  onImportFromPrescriptions,
  hasPrescriptionsToImport
}: DischargeMedicationTableProps) {
  const [showRawText, setShowRawText] = useState(false);

  const handleAddMedicine = () => {
    const newMed: DischargeMedicineItem = {
      name: '',
      dosage: '',
      frequency: '1-0-1',
      duration: '5 days',
      instructions: 'After food',
      route: 'Oral'
    };
    onChange([...medicines, newMed]);
  };

  const handleUpdateMedicine = (index: number, field: keyof DischargeMedicineItem, value: string) => {
    const updated = medicines.map((m, idx) => idx === index ? { ...m, [field]: value } : m);
    onChange(updated);
  };

  const handleRemoveMedicine = (index: number) => {
    onChange(medicines.filter((_, idx) => idx !== index));
  };

  const handleAddPreset = (preset: DischargeMedicineItem) => {
    onChange([...medicines, { ...preset }]);
    toast.success(`Added ${preset.name}`);
  };

  return (
    <div className="space-y-2.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-800">
              Discharge Take-Home Medications ({medicines.length})
            </Label>
            <p className="text-[10px] text-slate-500">
              Prescribe discharge medicines with dosage, frequency, and instructions (as in OPD).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPrescriptionsToImport && onImportFromPrescriptions && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onImportFromPrescriptions}
              className="h-7 text-[10px] font-bold text-indigo-600 border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Import Active IPD Rx
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={handleAddMedicine}
            className="h-7 text-[10px] font-bold bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Medicine
          </Button>
        </div>
      </div>

      {/* Quick Add Preset Pills */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mr-1">
          Quick Add:
        </span>
        {COMMON_MEDICINE_PRESETS.slice(0, 7).map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => handleAddPreset(preset)}
            className="px-2 py-0.5 text-[10px] font-medium bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 hover:border-teal-300 rounded-md transition-colors"
          >
            + {preset.name} {preset.dosage}
          </button>
        ))}
      </div>

      {/* Medicine Items List / Table */}
      {medicines.length === 0 ? (
        <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center bg-white/60">
          <Pill className="w-6 h-6 mx-auto mb-1 text-slate-300" />
          <p className="text-xs font-semibold text-slate-500">No take-home medicines added yet</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Click "+ Add Medicine" or select a Quick Add preset above to add medicines.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase px-2 py-1 bg-slate-100/70 rounded-md">
            <div className="col-span-4">Medicine Name & Strength</div>
            <div className="col-span-2">Dosage</div>
            <div className="col-span-2">Frequency</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-2">Instructions / Route</div>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {medicines.map((med, index) => (
              <div 
                key={med.id || index} 
                className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center"
              >
                {/* Medicine Name */}
                <div className="sm:col-span-4">
                  <span className="sm:hidden text-[10px] font-bold text-slate-500 block mb-0.5">Medicine Name</span>
                  <Input
                    placeholder="e.g. Tab Augmentin 625mg"
                    value={med.name}
                    onChange={(e) => handleUpdateMedicine(index, 'name', e.target.value)}
                    className="h-8 text-xs font-medium"
                  />
                </div>

                {/* Dosage */}
                <div className="sm:col-span-2">
                  <span className="sm:hidden text-[10px] font-bold text-slate-500 block mb-0.5">Dosage</span>
                  <Input
                    placeholder="e.g. 1 Tab / 5ml"
                    value={med.dosage}
                    onChange={(e) => handleUpdateMedicine(index, 'dosage', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                {/* Frequency */}
                <div className="sm:col-span-2">
                  <span className="sm:hidden text-[10px] font-bold text-slate-500 block mb-0.5">Frequency</span>
                  <Select
                    value={med.frequency || '1-0-1'}
                    onValueChange={(val) => handleUpdateMedicine(index, 'frequency', val)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-0-1">1-0-1 (Twice daily)</SelectItem>
                      <SelectItem value="1-0-0">1-0-0 (Morning only)</SelectItem>
                      <SelectItem value="0-0-1">0-0-1 (Night only)</SelectItem>
                      <SelectItem value="1-1-1">1-1-1 (Thrice daily)</SelectItem>
                      <SelectItem value="1-1-1-1">1-1-1-1 (4 times)</SelectItem>
                      <SelectItem value="SOS">SOS (As needed)</SelectItem>
                      <SelectItem value="OD">OD (Once daily)</SelectItem>
                      <SelectItem value="BD">BD (Twice daily)</SelectItem>
                      <SelectItem value="TDS">TDS (Thrice daily)</SelectItem>
                      <SelectItem value="QID">QID (4 times daily)</SelectItem>
                      <SelectItem value="Stat">Stat (Immediate)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration */}
                <div className="sm:col-span-2">
                  <span className="sm:hidden text-[10px] font-bold text-slate-500 block mb-0.5">Duration</span>
                  <Input
                    placeholder="e.g. 5 days"
                    value={med.duration}
                    onChange={(e) => handleUpdateMedicine(index, 'duration', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                {/* Instructions, Route & Delete */}
                <div className="sm:col-span-2 flex items-center gap-1.5">
                  <div className="flex-1">
                    <span className="sm:hidden text-[10px] font-bold text-slate-500 block mb-0.5">Instructions</span>
                    <Input
                      placeholder="e.g. After food"
                      value={med.instructions}
                      onChange={(e) => handleUpdateMedicine(index, 'instructions', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveMedicine(index)}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 2. CLINICAL ATTACHMENTS & IMAGES SEGMENT
// -----------------------------------------------------------------------------
interface DischargeAttachmentsProps {
  attachments: DischargeAttachmentItem[];
  onChange: (attachments: DischargeAttachmentItem[]) => void;
  onPreview: (attachment: DischargeAttachmentItem) => void;
}

export function DischargeAttachmentsManager({
  attachments,
  onChange,
  onPreview
}: DischargeAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`File ${file.name} is larger than 8MB. Please select a smaller file.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const item: DischargeAttachmentItem = {
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString()
        };
        onChange([...attachments, item]);
        toast.success(`Attached ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (id: string) => {
    onChange(attachments.filter(a => a.id !== id));
    toast.info('Attachment removed');
  };

  const downloadAttachment = (att: DischargeAttachmentItem) => {
    const link = document.createElement('a');
    link.href = att.dataUrl;
    link.download = att.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-2.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
            <Paperclip className="w-4 h-4" />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-800">
              Clinical Attachments & Diagnostic Images ({attachments.length})
            </Label>
            <p className="text-[10px] text-slate-500">
              Attach lab reports, radiology scans, ECG, discharge photos, or discharge orders.
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="h-7 text-[10px] font-bold text-indigo-600 border-indigo-200 bg-white hover:bg-indigo-50"
        >
          <Upload className="w-3 h-3 mr-1" />
          Upload Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-indigo-200/80 hover:border-indigo-400 bg-white/70 hover:bg-indigo-50/30 rounded-lg p-3 text-center cursor-pointer transition-colors"
      >
        <Upload className="w-5 h-5 mx-auto text-indigo-400 mb-1" />
        <p className="text-xs font-semibold text-slate-700">
          Drag & drop files here, or <span className="text-indigo-600 underline">browse</span>
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Supports PNG, JPG, WEBP images, and PDF, DOC reports (Max 8MB)
        </p>
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {attachments.map((att) => {
            const isImage = att.type.startsWith('image/') || att.dataUrl.startsWith('data:image/');
            return (
              <div
                key={att.id}
                className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2 shadow-xs group"
              >
                <div 
                  className="flex items-center gap-2 overflow-hidden cursor-pointer flex-1"
                  onClick={() => onPreview(att)}
                >
                  {isImage ? (
                    <div className="w-9 h-9 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <File className="w-4 h-4" />
                    </div>
                  )}
                  <div className="truncate text-left">
                    <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600">
                      {att.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {(att.size / 1024).toFixed(1)} KB • {new Date(att.uploadedAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onPreview(att)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600"
                    title="Preview file"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadAttachment(att)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(att.id)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    title="Delete attachment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 3. ICD-10 DIAGNOSTIC CODING SEGMENT
// -----------------------------------------------------------------------------
interface IcdCodeSelectorProps {
  icdCode: string;
  icdDescription: string;
  diagnosis: string;
  onChange: (data: { icdCode: string; icdDescription: string; diagnosis?: string }) => void;
}

export function IcdCodeSelector({
  icdCode,
  icdDescription,
  diagnosis,
  onChange
}: IcdCodeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const searchResults = searchIcdCodes(searchTerm);

  const POPULAR_ICD = [
    { code: 'I10', desc: 'Essential hypertension' },
    { code: 'E11.9', desc: 'Type 2 diabetes' },
    { code: 'J18.9', desc: 'Pneumonia' },
    { code: 'K35.80', desc: 'Acute appendicitis' },
    { code: 'O80', desc: 'Normal delivery' },
    { code: 'A09', desc: 'Gastroenteritis' },
    { code: 'N39.0', desc: 'Urinary tract infection' }
  ];

  const handleSelectCode = (item: IcdCodeItem) => {
    onChange({
      icdCode: item.code,
      icdDescription: item.description,
      diagnosis: diagnosis || item.description
    });
    setSearchTerm('');
    setIsDropdownOpen(false);
    toast.success(`Selected ICD-10: [${item.code}] ${item.description}`);
  };

  return (
    <div className="space-y-2.5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            ICD-10 Diagnostic Classification
            {icdCode && (
              <Badge className="bg-sky-600 text-white font-mono text-[10px] px-1.5 py-0.2">
                {icdCode}
              </Badge>
            )}
          </Label>
          <p className="text-[10px] text-slate-500">
            Provision of standard ICD-10 diagnosis code for health records, medical billing, and insurance claims.
          </p>
        </div>
      </div>

      {/* Quick Search Dropdown */}
      <div className="relative">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <Input
            placeholder="Search ICD-10 by code or disease name (e.g. I10, Pneumonia, Appendicitis)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            className="h-8 pl-8 text-xs bg-white"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setIsDropdownOpen(false);
              }}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isDropdownOpen && searchTerm.trim().length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[200px] overflow-y-auto divide-y divide-slate-100 text-left">
            {searchResults.length > 0 ? (
              searchResults.map((item) => (
                <div
                  key={item.code}
                  onClick={() => handleSelectCode(item)}
                  className="p-2 hover:bg-sky-50 cursor-pointer flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded text-[11px]">
                        {item.code}
                      </span>
                      <span className="font-medium text-slate-800">{item.description}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 ml-1">{item.category}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-sky-700 font-bold">
                    Select
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                No matching standard ICD-10 code found. You can type custom code below.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Popular Inpatient ICD Quick Chips */}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mr-0.5">
          Common:
        </span>
        {POPULAR_ICD.map((p) => (
          <button
            key={p.code}
            type="button"
            onClick={() => onChange({ icdCode: p.code, icdDescription: p.desc, diagnosis: diagnosis || p.desc })}
            className={`px-2 py-0.5 text-[10px] font-medium rounded-md border transition-colors ${
              icdCode === p.code 
                ? 'bg-sky-100 text-sky-800 border-sky-300 font-bold' 
                : 'bg-white hover:bg-sky-50 text-slate-700 border-slate-200'
            }`}
          >
            <span className="font-mono font-bold mr-1">{p.code}</span>
            {p.desc}
          </button>
        ))}
      </div>

      {/* Editable Inputs for ICD Code & Description */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60">
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-slate-600">ICD-10 Code</Label>
          <Input
            placeholder="e.g. I10"
            value={icdCode}
            onChange={(e) => onChange({ icdCode: e.target.value.toUpperCase(), icdDescription })}
            className="h-8 text-xs font-mono font-bold uppercase bg-white"
          />
        </div>

        <div className="sm:col-span-2 space-y-1">
          <Label className="text-[11px] font-bold text-slate-600">Official Diagnostic Term / Description</Label>
          <Input
            placeholder="e.g. Essential (primary) hypertension"
            value={icdDescription}
            onChange={(e) => onChange({ icdCode, icdDescription: e.target.value })}
            className="h-8 text-xs bg-white font-medium"
          />
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 4. DISCHARGE CONSENT SEGMENT
// -----------------------------------------------------------------------------
interface DischargeConsentProps {
  consent: DischargeConsentData;
  dischargeType: string;
  patientName: string;
  patientPhone: string;
  onChange: (consent: DischargeConsentData) => void;
}

export function DischargeConsentSection({
  consent,
  dischargeType,
  patientName,
  patientPhone,
  onChange
}: DischargeConsentProps) {
  const isLama = dischargeType?.includes('LAMA') || consent.consentType === 'LAMA (Left Against Medical Advice)';

  return (
    <div className={`space-y-2.5 p-3.5 rounded-xl border ${
      isLama 
        ? 'bg-rose-50/50 border-rose-200' 
        : 'bg-emerald-50/40 border-emerald-200/80'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isLama ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              Discharge Consent & Legal Undertaking
              {isLama && (
                <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-200 text-[9px] font-bold">
                  HIGH RISK - LAMA
                </Badge>
              )}
            </Label>
            <p className="text-[10px] text-slate-500">
              Mandatory legal acknowledgement signed by patient or designated attendant.
            </p>
          </div>
        </div>

        <Badge className={`text-[10px] font-bold uppercase ${
          consent.consentAgreed 
            ? 'bg-emerald-100 text-emerald-800 border-none' 
            : 'bg-amber-100 text-amber-800 border-none'
        }`}>
          {consent.consentAgreed ? '✓ Acknowledged' : 'Pending Sign'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Consent Category */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-slate-700">Consent Category</Label>
          <Select
            value={consent.consentType || dischargeType || 'Routine / Improved'}
            onValueChange={(val) => onChange({ ...consent, consentType: val })}
          >
            <SelectTrigger className="h-8 text-xs bg-white">
              <SelectValue placeholder="Consent Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Routine / Improved">Routine / Improved Discharge</SelectItem>
              <SelectItem value="LAMA (Left Against Medical Advice)">LAMA (Against Advice)</SelectItem>
              <SelectItem value="DOR (Discharge on Request)">DOR (Discharge on Request)</SelectItem>
              <SelectItem value="Referral to Higher Center">Referral / Transfer to Higher Facility</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Signatory Type */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-slate-700">Signatory Person</Label>
          <Select
            value={consent.signatoryType || 'Patient'}
            onValueChange={(val: 'Patient' | 'Attendant') => onChange({ 
              ...consent, 
              signatoryType: val,
              attendantName: val === 'Patient' ? patientName : consent.attendantName,
              attendantPhone: val === 'Patient' ? patientPhone : consent.attendantPhone,
              attendantRelation: val === 'Patient' ? 'Self' : consent.attendantRelation
            })}
          >
            <SelectTrigger className="h-8 text-xs bg-white">
              <SelectValue placeholder="Signatory" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Patient">Patient (Self)</SelectItem>
              <SelectItem value="Attendant">Attendant / Next of Kin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Relationship */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-slate-700">Relationship to Patient</Label>
          <Select
            value={consent.attendantRelation || (consent.signatoryType === 'Patient' ? 'Self' : 'Spouse')}
            onValueChange={(val) => onChange({ ...consent, attendantRelation: val })}
          >
            <SelectTrigger className="h-8 text-xs bg-white">
              <SelectValue placeholder="Relationship" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Self">Self (Patient)</SelectItem>
              <SelectItem value="Spouse">Spouse</SelectItem>
              <SelectItem value="Father">Father</SelectItem>
              <SelectItem value="Mother">Mother</SelectItem>
              <SelectItem value="Son">Son</SelectItem>
              <SelectItem value="Daughter">Daughter</SelectItem>
              <SelectItem value="Brother">Brother</SelectItem>
              <SelectItem value="Sister">Sister</SelectItem>
              <SelectItem value="Guardian">Legal Guardian</SelectItem>
              <SelectItem value="Other">Other Relative</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-slate-700">Attendant / Signatory Name</Label>
          <Input
            placeholder="Full Name"
            value={consent.attendantName || patientName}
            onChange={(e) => onChange({ ...consent, attendantName: e.target.value })}
            className="h-8 text-xs bg-white"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-slate-700">Attendant Phone / Contact</Label>
          <Input
            placeholder="Phone number"
            value={consent.attendantPhone || patientPhone}
            onChange={(e) => onChange({ ...consent, attendantPhone: e.target.value })}
            className="h-8 text-xs bg-white"
          />
        </div>
      </div>

      {/* Consent Legal Checkbox */}
      <div className="p-2.5 bg-white/90 border border-slate-200/80 rounded-lg space-y-1.5">
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={consent.consentAgreed}
            onChange={(e) => onChange({ ...consent, consentAgreed: e.target.checked })}
            className="mt-0.5 w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500"
          />
          <div className="text-[11px] leading-snug text-slate-700">
            <span className="font-bold block text-slate-800">
              Discharge Instructions & Clinical Briefing Acknowledged:
            </span>
            {isLama ? (
              <span className="text-rose-700 font-medium">
                "I / We are demanding discharge against medical advice despite doctor's warning about clinical risks and consequences. Hospital staff or treating doctors are not liable for any deterioration or untoward incident post-discharge."
              </span>
            ) : (
              <span className="text-slate-600">
                "I / We have been briefed about diagnosis, treatment given, discharge medications, dietary precautions, emergency warning signs, and follow-up plan. We agree and acknowledge the discharge."
              </span>
            )}
          </div>
        </label>

        <Input
          placeholder="Special consent notes or specific instructions explained (optional)..."
          value={consent.consentNotes || ''}
          onChange={(e) => onChange({ ...consent, consentNotes: e.target.value })}
          className="h-7 text-[11px] bg-slate-50 border-slate-200 mt-1"
        />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 5. ATTACHMENT PREVIEW MODAL
// -----------------------------------------------------------------------------
interface AttachmentPreviewModalProps {
  attachment: DischargeAttachmentItem | null;
  onClose: () => void;
}

export function AttachmentPreviewModal({
  attachment,
  onClose
}: AttachmentPreviewModalProps) {
  if (!attachment) return null;

  const isImage = attachment.type.startsWith('image/') || attachment.dataUrl.startsWith('data:image/');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = attachment.dataUrl;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={!!attachment} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] p-0 overflow-hidden bg-white">
        <DialogHeader className="p-4 pb-2 border-b bg-slate-50">
          <DialogTitle className="text-sm font-bold flex items-center justify-between pr-6 text-slate-900">
            <span className="truncate">{attachment.name}</span>
            <Badge variant="outline" className="text-[10px] font-mono shrink-0 ml-2">
              {(attachment.size / 1024).toFixed(1)} KB
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-500">
            Uploaded on {new Date(attachment.uploadedAt).toLocaleString('en-IN')}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 flex items-center justify-center max-h-[60vh] overflow-auto bg-slate-100/50">
          {isImage ? (
            <img
              src={attachment.dataUrl}
              alt={attachment.name}
              className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-sm"
            />
          ) : (
            <div className="p-8 text-center space-y-3 bg-white rounded-xl border border-slate-200 shadow-sm max-w-sm">
              <div className="w-14 h-14 mx-auto rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <File className="w-7 h-7" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 break-all">{attachment.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Document Type: {attachment.type || 'Clinical Document'}
                </p>
              </div>
              <Button
                onClick={handleDownload}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2 font-bold text-xs"
              >
                <Download className="w-4 h-4" />
                Download Document
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="p-3 border-t bg-slate-50 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Close
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            Download File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
