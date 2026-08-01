import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount)
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return 'N/A';
  try {
    let cleanDate = date;
    if (typeof cleanDate === 'string' && /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(cleanDate)) {
      cleanDate = cleanDate.replace(/\s+/, 'T');
    }
    const d = new Date(cleanDate);
    if (isNaN(d.getTime())) {
      // Fallback regex attempt for YYYY-MM-DD
      if (typeof date === 'string') {
        const match = date.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
        if (match) return `${match[3]}/${match[2]}/${match[1]}`;
      }
      return 'N/A';
    }
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'N/A';
  }
}

export function getLocalDateStr(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const clean = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }
    let isoCandidate = clean;
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(clean)) {
      isoCandidate = clean.replace(/\s+/, 'T');
    }
    const ymdMatch = isoCandidate.match(/^(\d{4})-(\d{2})-(\d{2})/);

    const d = new Date(isoCandidate);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else if (ymdMatch) {
      return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
    }
    return '';
  }

  if (val instanceof Date || typeof val === 'number') {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
}
