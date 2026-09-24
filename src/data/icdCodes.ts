export interface IcdCodeItem {
  code: string;
  description: string;
  category: string;
}

export const COMMON_ICD_CODES: IcdCodeItem[] = [
  // General & Infectious
  { code: 'A09', description: 'Infectious gastroenteritis and colitis, unspecified', category: 'Infectious' },
  { code: 'A01.0', description: 'Typhoid fever', category: 'Infectious' },
  { code: 'A90', description: 'Dengue fever [classical dengue]', category: 'Infectious' },
  { code: 'B54', description: 'Unspecified malaria', category: 'Infectious' },
  { code: 'A15.0', description: 'Tuberculosis of lung', category: 'Infectious' },
  { code: 'B34.9', description: 'Viral infection, unspecified', category: 'Infectious' },
  { code: 'R50.9', description: 'Fever, unspecified (Pyrexia of unknown origin)', category: 'General' },
  { code: 'R53.83', description: 'Other fatigue and generalized weakness', category: 'General' },
  { code: 'R07.9', description: 'Chest pain, unspecified', category: 'General' },
  { code: 'R10.9', description: 'Unspecified abdominal pain', category: 'General' },
  { code: 'R11.2', description: 'Nausea with vomiting, unspecified', category: 'General' },

  // Cardiology & Circulatory
  { code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiology' },
  { code: 'I20.9', description: 'Angina pectoris, unspecified', category: 'Cardiology' },
  { code: 'I21.9', description: 'Acute myocardial infarction, unspecified', category: 'Cardiology' },
  { code: 'I50.9', description: 'Heart failure, unspecified (Congestive Heart Failure)', category: 'Cardiology' },
  { code: 'I48.91', description: 'Unspecified atrial fibrillation', category: 'Cardiology' },
  { code: 'I49.9', description: 'Cardiac arrhythmia, unspecified', category: 'Cardiology' },
  { code: 'I63.9', description: 'Cerebral infarction, unspecified (Ischemic Stroke)', category: 'Neurology' },

  // Respiratory
  { code: 'J18.9', description: 'Pneumonia, unspecified organism', category: 'Pulmonology' },
  { code: 'J44.9', description: 'Chronic obstructive pulmonary disease, unspecified', category: 'Pulmonology' },
  { code: 'J45.909', description: 'Unspecified asthma, uncomplicated', category: 'Pulmonology' },
  { code: 'J20.9', description: 'Acute bronchitis, unspecified', category: 'Pulmonology' },
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Pulmonology' },
  { code: 'J96.00', description: 'Acute respiratory failure, unspecified with hypoxia', category: 'Pulmonology' },

  // Gastrointestinal & Hepato-Biliary
  { code: 'K21.9', description: 'Gastro-esophageal reflux disease without esophagitis', category: 'Gastroenterology' },
  { code: 'K29.70', description: 'Gastritis, unspecified, without bleeding', category: 'Gastroenterology' },
  { code: 'K25.9', description: 'Gastric ulcer, unspecified as acute or chronic, without hemorrhage or perforation', category: 'Gastroenterology' },
  { code: 'K35.80', description: 'Unspecified acute appendicitis', category: 'Surgery' },
  { code: 'K40.90', description: 'Unilateral inguinal hernia, without obstruction or gangrene', category: 'Surgery' },
  { code: 'K80.20', description: 'Calculus of gallbladder without cholecystitis (Cholelithiasis)', category: 'Surgery' },
  { code: 'K81.0', description: 'Acute cholecystitis', category: 'Surgery' },
  { code: 'K85.90', description: 'Acute pancreatitis without necrosis or infection', category: 'Gastroenterology' },
  { code: 'K70.30', description: 'Alcoholic cirrhosis of liver without ascites', category: 'Gastroenterology' },
  { code: 'K56.60', description: 'Unspecified intestinal obstruction', category: 'Surgery' },

  // Endocrine & Metabolic
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrinology' },
  { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia', category: 'Endocrinology' },
  { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications', category: 'Endocrinology' },
  { code: 'E03.9', description: 'Hypothyroidism, unspecified', category: 'Endocrinology' },
  { code: 'E78.5', description: 'Hyperlipidemia, unspecified', category: 'Endocrinology' },
  { code: 'E87.1', description: 'Hypo-osmolality and hyponatremia', category: 'Metabolic' },

  // Renal & Urinary
  { code: 'N39.0', description: 'Urinary tract infection, site not specified', category: 'Nephrology' },
  { code: 'N17.9', description: 'Acute kidney failure, unspecified', category: 'Nephrology' },
  { code: 'N18.9', description: 'Chronic kidney disease, unspecified', category: 'Nephrology' },
  { code: 'N20.1', description: 'Calculus of ureter (Ureteric Stone)', category: 'Urology' },
  { code: 'N20.0', description: 'Calculus of kidney (Renal Calculus)', category: 'Urology' },
  { code: 'N40.0', description: 'Benign prostatic hyperplasia without lower urinary tract symptoms', category: 'Urology' },

  // Obstetrics & Gynecology
  { code: 'O80', description: 'Encounter for full-term uncomplicated delivery (Normal Vaginal Delivery)', category: 'Obstetrics' },
  { code: 'O82', description: 'Encounter for cesarean delivery without indication (LSCS)', category: 'Obstetrics' },
  { code: 'O14.90', description: 'Unspecified pre-eclampsia', category: 'Obstetrics' },
  { code: 'O24.419', description: 'Gestational diabetes mellitus in pregnancy', category: 'Obstetrics' },
  { code: 'Z38.00', description: 'Single liveborn infant, delivered vaginally', category: 'Neonatal' },
  { code: 'N92.0', description: 'Excessive and frequent menstruation with regular cycle', category: 'Gynecology' },
  { code: 'N73.9', description: 'Female pelvic inflammatory disease, unspecified', category: 'Gynecology' },

  // Orthopedics & Trauma
  { code: 'M54.50', description: 'Low back pain, unspecified', category: 'Orthopedics' },
  { code: 'M17.9', description: 'Osteoarthritis of knee, unspecified', category: 'Orthopedics' },
  { code: 'S06.0X0A', description: 'Concussion without loss of consciousness', category: 'Trauma' },
  { code: 'S72.001A', description: 'Fracture of unspecified part of neck of right femur', category: 'Orthopedics' },
  { code: 'S82.201A', description: 'Unspecified fracture of shaft of right tibia', category: 'Orthopedics' },
  { code: 'T14.90', description: 'Injury, unspecified', category: 'Trauma' },

  // Dermatology & Soft Tissue
  { code: 'L03.90', description: 'Cellulitis, unspecified', category: 'Dermatology' },
  { code: 'L02.91', description: 'Cutaneous abscess, unspecified', category: 'Surgery' },
  { code: 'L50.9', description: 'Urticaria, unspecified', category: 'Dermatology' },

  // Neurology & Psychiatry
  { code: 'G40.909', description: 'Epilepsy, unspecified, not intractable', category: 'Neurology' },
  { code: 'G43.909', description: 'Migraine, unspecified, not intractable', category: 'Neurology' },
  { code: 'G44.209', description: 'Tension-type headache, unspecified', category: 'Neurology' },
  { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified', category: 'Psychiatry' },
  { code: 'F41.9', description: 'Anxiety disorder, unspecified', category: 'Psychiatry' },
];

export function searchIcdCodes(query: string): IcdCodeItem[] {
  if (!query || !query.trim()) return COMMON_ICD_CODES.slice(0, 20);
  const q = query.toLowerCase().trim();
  return COMMON_ICD_CODES.filter(item => 
    item.code.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    item.category.toLowerCase().includes(q)
  );
}
