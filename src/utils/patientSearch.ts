import { storage, STORAGE_KEYS } from '@/lib/storage';
import { MOCK_PATIENTS } from '@/mockData';
import { isDummyPatient } from '@/services/supabaseService';

export function getPatientDisplayName(p: any): string {
  if (!p) return 'Unknown Patient';
  if (typeof p === 'string') return p;
  return (
    p.name ||
    p.patient_name ||
    p.patientName ||
    p.fullName ||
    p.full_name ||
    [p.first_name, p.last_name].filter(Boolean).join(' ').trim() ||
    'Unknown Patient'
  );
}

export function getPatientDisplayId(p: any): string {
  if (!p) return 'N/A';
  return (
    p.registration_number ||
    p.registration_id ||
    p.registrationId ||
    p.reg_no ||
    p.mrn ||
    p.uhid ||
    p.id ||
    'N/A'
  );
}

export function isWalkInPatient(p: any): boolean {
  if (!p) return false;
  const name = getPatientDisplayName(p).toLowerCase().trim();
  const regType = String(p.registration_type || p.registrationType || p.type || '').toLowerCase().trim();
  return name.startsWith('walk-in') || name.startsWith('walk in') || regType === 'walk-in' || regType === 'walk in';
}

export function matchPatient(p: any, searchTerm: string): boolean {
  if (!p || isDummyPatient(p)) return false;
  const rawTerm = (searchTerm || '').trim();
  if (!rawTerm) return true;

  const tokens = rawTerm.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const name = getPatientDisplayName(p).toLowerCase();
  const phone = String(p.phone || p.mobile || p.mobile_number || p.contact || p.contact_number || '').toLowerCase();
  const mrn = String(p.mrn || p.mrn_number || '').toLowerCase();
  const id = String(p.id || p.patient_id || p.patientId || p.supabase_id || '').toLowerCase();
  const regId = String(p.registration_number || p.registration_id || p.registrationId || p.reg_no || '').toLowerCase();
  const uhid = String(p.uhid || p.uhid_number || '').toLowerCase();
  const guardian = String(p.guardian_name || p.guardianName || p.father_name || p.fatherName || p.husband_name || p.mother_name || '').toLowerCase();
  const email = String(p.email || '').toLowerCase();
  const bloodGroup = String(p.blood_group || p.bloodGroup || '').toLowerCase();

  const searchable = `${name} ${phone} ${mrn} ${id} ${regId} ${uhid} ${guardian} ${email} ${bloodGroup}`;

  return tokens.every(token => searchable.includes(token));
}

export function getFilteredPatientsPool(
  localPatients: any[] = [],
  searchTerm: string = '',
  filterFn?: (p: any) => boolean
): any[] {
  const storedPats = storage.get(STORAGE_KEYS.PATIENTS, MOCK_PATIENTS) || [];
  const pool = [...(localPatients || []), ...storedPats];
  const seen = new Set<string>();
  const results: any[] = [];

  for (const p of pool) {
    if (!p || isDummyPatient(p)) continue;
    const key = p.id || p.mrn || p.name;
    if (!key || seen.has(key)) continue;
    seen.add(key);

    if (filterFn && !filterFn(p)) continue;

    if (matchPatient(p, searchTerm)) {
      results.push(p);
    }
  }

  return results;
}
