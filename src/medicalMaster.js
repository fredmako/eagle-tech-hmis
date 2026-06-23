// Shared Clinical Master Database for diseases, medicines, and laboratory investigations

export const diseaseMaster = [
  {
    code: "I10",
    name: "Essential hypertension",
    category: "Cardiovascular",
    symptoms: "Headache, dizziness, high BP, palpitations",
    suggestedDepartment: "Chronic Clinic",
    severityDefault: "Moderate",
    suggestedMedications: ["Enalapril", "Hydrochlorothiazide", "Amlodipine", "Atenolol"],
    suggestedLabs: ["Lipid Profile", "Kidney Function Test (KFT)", "Full Blood Count (FBC)"]
  },
  {
    code: "E11.9",
    name: "Type 2 diabetes mellitus without complications",
    category: "Endocrine",
    symptoms: "Polyuria, thirst, fatigue, unexplained weight loss",
    suggestedDepartment: "Chronic Clinic",
    severityDefault: "Moderate",
    suggestedMedications: ["Metformin", "Glibenclamide", "Insulin regular"],
    suggestedLabs: ["Blood Sugar (Fasting/Random)", "HbA1c", "Urinalysis Dipstick"]
  },
  {
    code: "J06.9",
    name: "Acute upper respiratory infection, unspecified",
    category: "Respiratory",
    symptoms: "Cough, sore throat, running nose, mild fever",
    suggestedDepartment: "OPD",
    severityDefault: "Mild",
    suggestedMedications: ["Paracetamol", "Chlorpheniramine", "Amoxicillin"],
    suggestedLabs: ["Full Blood Count (FBC)"]
  },
  {
    code: "J02.9",
    name: "Acute pharyngitis, unspecified",
    category: "Respiratory",
    symptoms: "Sore throat, difficulty swallowing, fever, cough",
    suggestedDepartment: "OPD",
    severityDefault: "Mild",
    suggestedMedications: ["Paracetamol", "Amoxicillin", "Ibuprofen"],
    suggestedLabs: ["Throat Swab Culture"]
  },
  {
    code: "J20.9",
    name: "Acute bronchitis, unspecified",
    category: "Respiratory",
    symptoms: "Cough, wheezing, chest discomfort, fever",
    suggestedDepartment: "OPD",
    severityDefault: "Mild",
    suggestedMedications: ["Salbutamol inhaler", "Amoxicillin", "Ibuprofen"],
    suggestedLabs: ["Full Blood Count (FBC)"]
  },
  {
    code: "J18.9",
    name: "Pneumonia, unspecified organism",
    category: "Respiratory",
    symptoms: "Fever, chills, productive cough, dyspnea, chest pain",
    suggestedDepartment: "Ward",
    severityDefault: "Severe",
    suggestedMedications: ["Ceftriaxone", "Amoxicillin", "Paracetamol"],
    suggestedLabs: ["Full Blood Count (FBC)", "Sputum Gram Stain", "Blood Culture"],
    suggestedRadiology: ["Chest X-Ray"]
  },
  {
    code: "J45.909",
    name: "Asthma, uncomplicated",
    category: "Respiratory",
    symptoms: "Wheeze, shortness of breath, chest tightness, dry cough",
    suggestedDepartment: "OPD",
    severityDefault: "Moderate",
    suggestedMedications: ["Salbutamol inhaler", "Beclomethasone inhaler"],
    suggestedLabs: ["Spirometry / Peak Flow Run"]
  },
  {
    code: "J30.9",
    name: "Allergic rhinitis, unspecified",
    category: "ENT / Respiratory",
    symptoms: "Sneezing, blocked nose, itchy eyes, clear rhinorrhea",
    suggestedDepartment: "OPD",
    severityDefault: "Mild",
    suggestedMedications: ["Cetirizine", "Chlorpheniramine"],
    suggestedLabs: []
  },
  {
    code: "A09",
    name: "Infectious gastroenteritis and colitis, unspecified",
    category: "Infectious / GI",
    symptoms: "Diarrhea, vomiting, abdominal pain, fever, dehydration",
    suggestedDepartment: "OPD",
    severityDefault: "Moderate",
    suggestedMedications: ["Oral rehydration salts", "Zinc sulfate", "Metronidazole"],
    suggestedLabs: ["Stool Routine Test", "Urinalysis Dipstick"]
  },
  {
    code: "K29.70",
    name: "Gastritis, unspecified, without bleeding",
    category: "GI",
    symptoms: "Epigastric pain, nausea, bloating, early satiety",
    suggestedDepartment: "OPD",
    severityDefault: "Mild",
    suggestedMedications: ["Omeprazole", "Antacid suspension"],
    suggestedLabs: ["H. pylori Stool Antigen"]
  },
  {
    code: "K21.9",
    name: "GERD without esophagitis",
    category: "GI",
    symptoms: "Heartburn, regurgitation, chest pain, sore throat",
    suggestedDepartment: "OPD",
    severityDefault: "Mild",
    suggestedMedications: ["Omeprazole", "Antacid suspension"],
    suggestedLabs: []
  },
  {
    code: "N39.0",
    name: "Urinary tract infection, site not specified",
    category: "Genitourinary",
    symptoms: "Dysuria, frequency, urgency, suprapubic pain, fever",
    suggestedDepartment: "OPD",
    severityDefault: "Moderate",
    suggestedMedications: ["Amoxicillin", "Ciprofloxacin 500mg", "Ibuprofen"],
    suggestedLabs: ["Urinalysis Dipstick", "Urine Culture & Sensitivity"]
  },
  {
    code: "M79.1",
    name: "Myalgia",
    category: "Musculoskeletal",
    symptoms: "Body pain, tenderness, muscle aches, fatigue",
    suggestedDepartment: "OPD",
    severityDefault: "Mild",
    suggestedMedications: ["Paracetamol", "Ibuprofen", "Diclofenac"],
    suggestedLabs: []
  },
  {
    code: "M54.5",
    name: "Low back pain",
    category: "Musculoskeletal",
    symptoms: "Back pain, stiffness, limited range of motion",
    suggestedDepartment: "OPD",
    severityDefault: "Mild",
    suggestedMedications: ["Ibuprofen", "Diclofenac", "Paracetamol"],
    suggestedLabs: []
  },
  {
    code: "B54",
    name: "Unspecified Malaria",
    category: "Infectious",
    symptoms: "Fever, chills, headache, sweating, joint pain",
    suggestedDepartment: "OPD",
    severityDefault: "Moderate",
    suggestedMedications: ["Artemether-Lumefantrine (AL)", "Paracetamol"],
    suggestedLabs: ["Malaria BS/RDT", "Full Blood Count (FBC)"]
  },
  {
    code: "H10.9",
    name: "Conjunctivitis, unspecified",
    category: "Eye",
    symptoms: "Red eye, discharge, itching, foreign body sensation",
    suggestedDepartment: "Eye Clinic",
    severityDefault: "Mild",
    suggestedMedications: ["Tetracycline eye ointment", "Chloramphenicol eye drops"],
    suggestedLabs: ["Eye Swab Smear"]
  },
  {
    code: "L20.9",
    name: "Atopic dermatitis, unspecified",
    category: "Skin",
    symptoms: "Itching, dry skin, red patches, rash",
    suggestedDepartment: "OPD",
    severityDefault: "Mild",
    suggestedMedications: ["Hydrocortisone cream", "Clotrimazole cream", "Cetirizine"],
    suggestedLabs: []
  },
  {
    code: "O80",
    name: "Single spontaneous delivery",
    category: "Maternal",
    symptoms: "Labor pains, contractions",
    suggestedDepartment: "Maternity",
    severityDefault: "Moderate",
    suggestedMedications: ["Oxytocin", "Iron supplement", "Folic acid"],
    suggestedLabs: ["Full Blood Count (FBC)", "Blood Grouping & Crossmatch"]
  },
  {
    code: "O14.9",
    name: "Pre-eclampsia, unspecified",
    category: "Maternal",
    symptoms: "High BP, proteinuria, severe headache, visual disturbance",
    suggestedDepartment: "Maternity",
    severityDefault: "Severe",
    suggestedMedications: ["Magnesium sulfate", "Hydrochlorothiazide"],
    suggestedLabs: ["Urinalysis Dipstick", "Kidney Function Test (KFT)", "Urine Protein 24h"],
    suggestedSurgeries: ["Caesarean Section"]
  },
  {
    code: "G40.9",
    name: "Epilepsy, unspecified",
    category: "Neurological",
    symptoms: "Seizures, loss of consciousness, motor convulsions",
    suggestedDepartment: "Chronic Clinic",
    severityDefault: "Severe",
    suggestedMedications: ["Carbamazepine", "Diazepam"],
    suggestedLabs: ["Drug Level Monitoring"]
  },
  {
    code: "F32.9",
    name: "Major depressive disorder, unspecified",
    category: "Mental Health",
    symptoms: "Low mood, loss of interest, sleep disturbance, fatigue",
    suggestedDepartment: "Mental Health Clinic",
    severityDefault: "Moderate",
    suggestedMedications: ["Fluoxetine", "Diazepam"],
    suggestedLabs: []
  }
];

export const medicineMaster = [
  {
    id: "med_1",
    genericName: "Paracetamol",
    brandName: "Panadol",
    dosageForm: "Tablet",
    strength: "500 mg",
    route: "Oral",
    linkedIcdCodes: ["R50.9", "R05", "M79.1", "R10.9", "J06.9", "J02.9", "J18.9", "B54"],
    indication: "Fever, mild pain, body aches.",
    prescriptionRequired: false,
    controlledDrugFlag: false,
    reorderLevel: 100,
    packSize: 100,
    storageCondition: "Room Temp (<30°C)",
    therapeuticClass: "Analgesic / Antipyretic",
    childSafeFlag: true,
    pregnancySafeFlag: true,
    lactationSafeFlag: true,
    substitutionAllowed: true,
    price: 5, // Per unit (e.g. tablet)
    unit: "tabs"
  },
  {
    id: "med_2",
    genericName: "Ibuprofen",
    brandName: "Brufen",
    dosageForm: "Tablet",
    strength: "400 mg",
    route: "Oral",
    linkedIcdCodes: ["M54.5", "M79.1", "R10.9", "J02.9", "J20.9", "N39.0"],
    indication: "Moderate pain, swelling, and fever.",
    prescriptionRequired: true,
    controlledDrugFlag: false,
    reorderLevel: 80,
    packSize: 50,
    storageCondition: "Room Temp (<25°C)",
    therapeuticClass: "NSAID (Non-steroidal Anti-inflammatory)",
    childSafeFlag: false, // Not recommended for infants
    pregnancySafeFlag: false, // Avoid in 3rd trimester
    lactationSafeFlag: true,
    substitutionAllowed: true,
    price: 8,
    unit: "tabs"
  },
  {
    id: "med_3",
    genericName: "Amoxicillin",
    brandName: "Amoxil",
    dosageForm: "Capsule",
    strength: "500 mg",
    route: "Oral",
    linkedIcdCodes: ["J06.9", "J02.9", "J20.9", "J18.9", "N39.0"],
    indication: "Common respiratory and urinary tract bacterial infections.",
    prescriptionRequired: true,
    controlledDrugFlag: false,
    reorderLevel: 100,
    packSize: 100,
    storageCondition: "Dry place (<25°C)",
    therapeuticClass: "Beta-lactam Antibiotic",
    childSafeFlag: true,
    pregnancySafeFlag: true,
    lactationSafeFlag: true,
    substitutionAllowed: true,
    price: 15,
    unit: "caps"
  },
  {
    id: "med_4",
    genericName: "Artemether-Lumefantrine (AL)",
    brandName: "Coartem",
    dosageForm: "Tablet",
    strength: "20 mg / 120 mg",
    route: "Oral",
    linkedIcdCodes: ["B54"],
    indication: "Uncomplicated malaria treatment.",
    prescriptionRequired: true,
    controlledDrugFlag: false,
    reorderLevel: 50,
    packSize: 24,
    storageCondition: "Room Temp (<30°C)",
    therapeuticClass: "Antimalarial",
    childSafeFlag: true,
    pregnancySafeFlag: true, // Guided in 2nd/3rd trimester
    lactationSafeFlag: true,
    substitutionAllowed: false,
    price: 120, // Per dose (24 tabs)
    unit: "doses"
  },
  {
    id: "med_5",
    genericName: "Metronidazole",
    brandName: "Flagyl",
    dosageForm: "Tablet",
    strength: "400 mg",
    route: "Oral",
    linkedIcdCodes: ["A09"],
    indication: "Amoebiasis, giardiasis, and anaerobic GI infections.",
    prescriptionRequired: true,
    controlledDrugFlag: false,
    reorderLevel: 60,
    packSize: 100,
    storageCondition: "Protect from light",
    therapeuticClass: "Antiprotozoal / Antibacterial",
    childSafeFlag: true,
    pregnancySafeFlag: false, // Avoid in 1st trimester
    lactationSafeFlag: false, // Enters breastmilk
    substitutionAllowed: true,
    price: 10,
    unit: "tabs"
  },
  {
    id: "med_6",
    genericName: "Oral rehydration salts",
    brandName: "ORS Sachet",
    dosageForm: "Powder",
    strength: "20.5 g sachet",
    route: "Oral (Reconstituted)",
    linkedIcdCodes: ["A09"],
    indication: "Dehydration from acute watery diarrhea.",
    prescriptionRequired: false,
    controlledDrugFlag: false,
    reorderLevel: 150,
    packSize: 50,
    storageCondition: "Dry place",
    therapeuticClass: "Oral Electrolyte Rehydrator",
    childSafeFlag: true,
    pregnancySafeFlag: true,
    lactationSafeFlag: true,
    substitutionAllowed: true,
    price: 20,
    unit: "sachets"
  },
  {
    id: "med_7",
    genericName: "Zinc sulfate",
    brandName: "Zinc-20",
    dosageForm: "Tablet",
    strength: "20 mg",
    route: "Oral",
    linkedIcdCodes: ["A09"],
    indication: "Adjuvant treatment for childhood diarrhea.",
    prescriptionRequired: false,
    controlledDrugFlag: false,
    reorderLevel: 100,
    packSize: 30,
    storageCondition: "Room Temp",
    therapeuticClass: "Mineral Supplement",
    childSafeFlag: true,
    pregnancySafeFlag: true,
    lactationSafeFlag: true,
    substitutionAllowed: true,
    price: 5,
    unit: "tabs"
  },
  {
    id: "med_8",
    genericName: "Omeprazole",
    brandName: "Losec",
    dosageForm: "Capsule",
    strength: "20 mg",
    route: "Oral",
    linkedIcdCodes: ["K29.70", "K21.9"],
    indication: "Gastric ulcers, GERD, acid indigestion.",
    prescriptionRequired: true,
    controlledDrugFlag: false,
    reorderLevel: 80,
    packSize: 28,
    storageCondition: "Moisture protected",
    therapeuticClass: "Proton Pump Inhibitor (PPI)",
    childSafeFlag: false,
    pregnancySafeFlag: true,
    lactationSafeFlag: true,
    substitutionAllowed: true,
    price: 15,
    unit: "caps"
  },
  {
    id: "med_9",
    genericName: "Antacid suspension",
    brandName: "Actal / Mucogel",
    dosageForm: "Suspension",
    strength: "250 mg / 5 ml",
    route: "Oral",
    linkedIcdCodes: ["K29.70", "K21.9"],
    indication: "Hyperacidity, heartburn, dyspepsia.",
    prescriptionRequired: false,
    controlledDrugFlag: false,
    reorderLevel: 40,
    packSize: 1, // Bottle
    storageCondition: "Do not freeze",
    therapeuticClass: "Antacid",
    childSafeFlag: true,
    pregnancySafeFlag: true,
    lactationSafeFlag: true,
    substitutionAllowed: true,
    price: 150, // Per bottle
    unit: "bottles"
  },
  {
    id: "med_10",
    genericName: "Salbutamol inhaler",
    brandName: "Ventolin",
    dosageForm: "Inhaler",
    strength: "100 mcg/dose",
    route: "Inhaled",
    linkedIcdCodes: ["J45.909", "J20.9"],
    indication: "Quick relief of asthma wheezing and bronchospasm.",
    prescriptionRequired: true,
    controlledDrugFlag: false,
    reorderLevel: 30,
    packSize: 1,
    storageCondition: "Store below 30°C",
    therapeuticClass: "Beta-2 Agonist Bronchodilator",
    childSafeFlag: true,
    pregnancySafeFlag: true,
    lactationSafeFlag: true,
    substitutionAllowed: true,
    price: 350,
    unit: "inhalers"
  },
  {
    id: "med_11",
    genericName: "Beclomethasone inhaler",
    brandName: "Clenil",
    dosageForm: "Inhaler",
    strength: "250 mcg/dose",
    route: "Inhaled",
    linkedIcdCodes: ["J45.909"],
    indication: "Asthma controller therapy (preventative).",
    prescriptionRequired: true,
    controlledDrugFlag: false,
    reorderLevel: 20,
    packSize: 1,
    storageCondition: "Cool place",
    therapeuticClass: "Corticosteroid Inhaler",
    childSafeFlag: false, // Requires specialist pediatrician view
    pregnancySafeFlag: true,
    lactationSafeFlag: true,
    substitutionAllowed: true,
    price: 800,
    unit: "inhalers"
  },
  {
    id: "med_12",
    genericName: "Enalapril",
    brandName: "Vasotec",
    dosageForm: "Tablet",
    strength: "5 mg",
    route: "Oral",
    linkedIcdCodes: ["I10"],
    indication: "Hypertension, congestive heart failure.",
    prescriptionRequired: true,
    controlledDrugFlag: false,
    reorderLevel: 50,
    packSize: 30,
    storageCondition: "Room Temp",
    therapeuticClass: "ACE Inhibitor Antihypertensive",
    childSafeFlag: false,
    pregnancySafeFlag: false, // Category D: Contraindicated
    lactationSafeFlag: true,
    substitutionAllowed: true,
    price: 20,
    unit: "tabs"
  },
  {
    id: "med_13",
    genericName: "Amlodipine",
    brandName: "Norvasc",
    dosageForm: "Tablet",
    strength: "5 mg",
    route: "Oral",
    linkedIcdCodes: ["I10"],
    indication: "Hypertension and chronic stable angina.",
    prescriptionRequired: true,
    controlledDrugFlag: false,
    reorderLevel: 60,
    packSize: 100,
    storageCondition: "Room Temp",
    therapeuticClass: "Calcium Channel Blocker",
    childSafeFlag: false,
    pregnancySafeFlag: false, // Use only if clearly needed
    lactationSafeFlag: true,
    substitutionAllowed: true,
    price: 15,
    unit: "tabs"
  },
  {
    id: "med_14",
    genericName: "Ceftriaxone",
    brandName: "Rocephin",
    dosageForm: "Injection",
    strength: "1 g vial",
    route: "IV / IM",
    linkedIcdCodes: ["J18.9"],
    indication: "Severe systemic and respiratory bacterial infections.",
    prescriptionRequired: true,
    controlledDrugFlag: false,
    reorderLevel: 25,
    packSize: 10,
    storageCondition: "Cool dry place",
    therapeuticClass: "3rd Generation Cephalosporin",
    childSafeFlag: true,
    pregnancySafeFlag: true,
    lactationSafeFlag: true,
    substitutionAllowed: true,
    price: 300,
    unit: "vials"
  },
  {
    id: "med_15",
    genericName: "Diazepam",
    brandName: "Valium",
    dosageForm: "Tablet",
    strength: "5 mg",
    route: "Oral",
    linkedIcdCodes: ["G40.9", "F32.9"],
    indication: "Anxiety disorders, acute seizures, muscle spasms.",
    prescriptionRequired: true,
    controlledDrugFlag: true, // Restriced controlled drug!
    reorderLevel: 20,
    packSize: 100,
    storageCondition: "Lockable safe required",
    therapeuticClass: "Benzodiazepine Anxiolytic / Anticonvulsant",
    childSafeFlag: false,
    pregnancySafeFlag: false, // Avoid (causes floppy infant syndrome)
    lactationSafeFlag: false, // Enters breastmilk, causes sedation
    substitutionAllowed: false,
    price: 30,
    unit: "tabs"
  },
  {
    id: "med_16",
    genericName: "Magnesium sulfate",
    brandName: "MagSulf Injection",
    dosageForm: "Injection",
    strength: "50% w/v (5g/10ml)",
    route: "IM / IV",
    linkedIcdCodes: ["O14.9"],
    indication: "Prevention and control of eclamptic seizures.",
    prescriptionRequired: true,
    controlledDrugFlag: false,
    reorderLevel: 15,
    packSize: 10,
    storageCondition: "Store below 25°C",
    therapeuticClass: "Anticonvulsant",
    childSafeFlag: false,
    pregnancySafeFlag: true, // Life-saving in eclampsia
    lactationSafeFlag: true,
    substitutionAllowed: false,
    price: 250,
    unit: "vials"
  }
];

export const labTestMaster = [
  {
    id: "lab_1",
    name: "Malaria BS/RDT",
    description: "Blood Smear or Rapid Diagnostic Test for Plasmodium parasites.",
    price: 150,
    parameters: [
      { name: "Rapid Test (RDT)", unit: "", range: "Negative" },
      { name: "Blood Smear (BS)", unit: "/µL", range: "No parasites seen" }
    ],
    sampleType: "Whole Blood (EDTA / Capillary)",
    precedingWorkflow: "Capillary finger prick or Phlebotomy",
    testKind: "Parasitology"
  },
  {
    id: "lab_2",
    name: "Full Blood Count (FBC)",
    description: "Detailed evaluation of red cells, white cells, and platelets.",
    price: 400,
    parameters: [
      { name: "Hemoglobin (Hb)", unit: "g/dL", range: "12.0 - 16.0" },
      { name: "White Blood Cells (WBC)", unit: "x10^9/L", range: "4.0 - 11.0" },
      { name: "Platelets", unit: "x10^9/L", range: "150 - 450" }
    ],
    sampleType: "Whole Blood (EDTA)",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Hematology"
  },
  {
    id: "lab_3",
    name: "Urinalysis Dipstick",
    description: "Chemical examination of urine sample for infection/metabolic flags.",
    price: 200,
    parameters: [
      { name: "Protein", unit: "", range: "Negative / Trace" },
      { name: "Glucose", unit: "", range: "Negative" },
      { name: "Leukocytes", unit: "", range: "Negative" },
      { name: "Nitrites", unit: "", range: "Negative" }
    ],
    sampleType: "Urine (Mid-stream)",
    precedingWorkflow: "Urine sample container collection",
    testKind: "Urinalysis"
  },
  {
    id: "lab_4",
    name: "Widal Agglutination Test",
    description: "Agglutination test for Salmonella typhi (Typhoid fever).",
    price: 300,
    parameters: [
      { name: "Salmonella typhi 'O' Antigen", unit: "Titre", range: "< 1:80" },
      { name: "Salmonella typhi 'H' Antigen", unit: "Titre", range: "< 1:80" }
    ],
    sampleType: "Serum",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Serology"
  },
  {
    id: "lab_5",
    name: "Blood Sugar (Fasting/Random)",
    description: "Fasting Blood Glucose (FBG) or Random Blood Glucose (RBG).",
    price: 150,
    parameters: [
      { name: "Glucose Concentration", unit: "mmol/L", range: "4.0 - 7.0 (Fasting)" }
    ],
    sampleType: "Whole Blood (Fluoride Oxalate)",
    precedingWorkflow: "Capillary finger prick or Phlebotomy",
    testKind: "Biochemistry"
  },
  {
    id: "lab_6",
    name: "Lipid Profile",
    description: "Measures Cholesterol, Triglycerides, HDL, and LDL levels.",
    price: 800,
    parameters: [
      { name: "Total Cholesterol", unit: "mmol/L", range: "< 5.2" },
      { name: "Triglycerides", unit: "mmol/L", range: "< 1.7" },
      { name: "HDL Cholesterol", unit: "mmol/L", range: "> 1.0" },
      { name: "LDL Cholesterol", unit: "mmol/L", range: "< 3.0" }
    ],
    sampleType: "Serum",
    precedingWorkflow: "Phlebotomy / Venous blood draw (12-hour Fasting)",
    testKind: "Biochemistry"
  },
  {
    id: "lab_7",
    name: "H. pylori Stool Antigen",
    description: "Fecal antigen test for Helicobacter pylori detection.",
    price: 500,
    parameters: [
      { name: "H. pylori Antigen", unit: "", range: "Negative" }
    ],
    sampleType: "Stool",
    precedingWorkflow: "Stool specimen container collection",
    testKind: "Serology"
  },
  {
    id: "lab_8",
    name: "Liver Function Tests (LFT)",
    description: "Evaluates enzymes and proteins produced by the liver.",
    price: 1200,
    parameters: [
      { name: "Total Bilirubin", unit: "µmol/L", range: "3.4 - 20.5" },
      { name: "ALT (SGPT)", unit: "U/L", range: "7 - 56" },
      { name: "AST (SGOT)", unit: "U/L", range: "10 - 40" },
      { name: "Alkaline Phosphatase (ALP)", unit: "U/L", range: "44 - 147" },
      { name: "Total Protein", unit: "g/L", range: "60 - 80" },
      { name: "Albumin", unit: "g/L", range: "35 - 50" }
    ],
    sampleType: "Serum",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Biochemistry"
  },
  {
    id: "lab_9",
    name: "Renal Function Tests (RFT)",
    description: "Measures urea, creatinine, and electrolytes to assess kidney health.",
    price: 1200,
    parameters: [
      { name: "Urea", unit: "mmol/L", range: "2.5 - 7.8" },
      { name: "Creatinine", unit: "µmol/L", range: "53 - 115" },
      { name: "Sodium (Na+)", unit: "mmol/L", range: "135 - 145" },
      { name: "Potassium (K+)", unit: "mmol/L", range: "3.5 - 5.0" },
      { name: "Chloride (Cl-)", unit: "mmol/L", range: "98 - 107" }
    ],
    sampleType: "Serum",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Biochemistry"
  },
  {
    id: "lab_10",
    name: "Blood Grouping & Rh",
    description: "Determines ABO blood group and Rhesus factor type.",
    price: 250,
    parameters: [
      { name: "ABO Group", unit: "", range: "A, B, AB, or O" },
      { name: "Rhesus Factor", unit: "", range: "Positive or Negative" }
    ],
    sampleType: "Whole Blood (EDTA)",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Hematology"
  },
  {
    id: "lab_11",
    name: "HIV 1/2 Screening Test",
    description: "Rapid immunochromatographic screening for HIV 1 and HIV 2 antibodies.",
    price: 200,
    parameters: [
      { name: "HIV 1/2 Antibody", unit: "", range: "Negative" }
    ],
    sampleType: "Whole Blood / Serum",
    precedingWorkflow: "Phlebotomy / Capillary finger prick",
    testKind: "Serology"
  },
  {
    id: "lab_12",
    name: "Syphilis VDRL / RPR",
    description: "Nonspecific screening test for Syphilis antibodies.",
    price: 250,
    parameters: [
      { name: "VDRL Titre", unit: "Ratio", range: "Non-reactive" }
    ],
    sampleType: "Serum",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Serology"
  },
  {
    id: "lab_13",
    name: "HBsAg (Hepatitis B)",
    description: "Rapid screening for Hepatitis B Virus Surface Antigen.",
    price: 350,
    parameters: [
      { name: "HBsAg", unit: "", range: "Negative" }
    ],
    sampleType: "Serum",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Serology"
  },
  {
    id: "lab_14",
    name: "HCV Ab (Hepatitis C)",
    description: "Screening for Hepatitis C Virus Antibodies.",
    price: 400,
    parameters: [
      { name: "HCV Antibody", unit: "", range: "Negative" }
    ],
    sampleType: "Serum",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Serology"
  },
  {
    id: "lab_15",
    name: "Serum Pregnancy (hCG)",
    description: "Quantitative beta-hCG test for pregnancy confirmation.",
    price: 450,
    parameters: [
      { name: "Beta-hCG", unit: "mIU/mL", range: "< 5.0 (Negative)" }
    ],
    sampleType: "Serum",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Serology"
  },
  {
    id: "lab_16",
    name: "Thyroid Profile (TSH Only)",
    description: "Measures Thyroid Stimulating Hormone level in blood.",
    price: 1000,
    parameters: [
      { name: "TSH Level", unit: "µIU/mL", range: "0.4 - 4.5" }
    ],
    sampleType: "Serum",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Biochemistry"
  },
  {
    id: "lab_17",
    name: "PSA (Prostate Specific Antigen)",
    description: "Screening for prostate health and marker evaluation.",
    price: 1500,
    parameters: [
      { name: "Total PSA", unit: "ng/mL", range: "< 4.0" }
    ],
    sampleType: "Serum",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Biochemistry"
  },
  {
    id: "lab_18",
    name: "Glycated Hemoglobin (HbA1c)",
    description: "Measures average blood sugar levels over the past 3 months.",
    price: 1200,
    parameters: [
      { name: "HbA1c", unit: "%", range: "4.0 - 5.6" }
    ],
    sampleType: "Whole Blood (EDTA)",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Biochemistry"
  },
  {
    id: "lab_19",
    name: "Serum Uric Acid",
    description: "Measures uric acid to evaluate for gout or kidney stones.",
    price: 400,
    parameters: [
      { name: "Uric Acid", unit: "µmol/L", range: "140 - 430" }
    ],
    sampleType: "Serum",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Biochemistry"
  },
  {
    id: "lab_20",
    name: "ESR (Erythrocyte Sedimentation Rate)",
    description: "Measures red blood cell sedimentation rate to evaluate systemic inflammation.",
    price: 300,
    parameters: [
      { name: "ESR Rate", unit: "mm/hr", range: "0 - 15" }
    ],
    sampleType: "Whole Blood (Sodium Citrate)",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Hematology"
  },
  {
    id: "lab_21",
    name: "Stool Microscopy",
    description: "Wet mount analysis of stool specimen for ova, cysts, and cells.",
    price: 250,
    parameters: [
      { name: "Ova & Parasites", unit: "", range: "None seen" },
      { name: "Protozoa Cysts", unit: "", range: "None seen" },
      { name: "Red Blood Cells", unit: "/HPF", range: "0 - 2" },
      { name: "Pus Cells", unit: "/HPF", range: "0 - 5" }
    ],
    sampleType: "Stool",
    precedingWorkflow: "Stool specimen container collection",
    testKind: "Parasitology"
  },
  {
    id: "lab_22",
    name: "Sputum GeneXpert (TB PCR)",
    description: "PCR amplification test to detect Mycobacterium tuberculosis and Rifampicin resistance.",
    price: 2500,
    parameters: [
      { name: "TB DNA Detection", unit: "", range: "Negative" },
      { name: "Rifampicin Resistance", unit: "", range: "Not detected" }
    ],
    sampleType: "Sputum",
    precedingWorkflow: "Sputum specimen container collection",
    testKind: "Microbiology"
  },
  {
    id: "lab_23",
    name: "Brucella Slide Antigen",
    description: "Serological slide test for Brucellosis abortus and melitensis.",
    price: 350,
    parameters: [
      { name: "Brucella abortus Titre", unit: "Titre", range: "< 1:80" },
      { name: "Brucella melitensis Titre", unit: "Titre", range: "< 1:80" }
    ],
    sampleType: "Serum",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Serology"
  },
  {
    id: "lab_24",
    name: "Typhoid Antigen Test",
    description: "Serological evaluation of Salmonella typhi antibodies.",
    price: 400,
    parameters: [
      { name: "Typhoid IgM", unit: "", range: "Negative" },
      { name: "Typhoid IgG", unit: "", range: "Negative" }
    ],
    sampleType: "Serum / Stool",
    precedingWorkflow: "Phlebotomy / Venous blood draw",
    testKind: "Serology"
  },
  {
    id: "lab_25",
    name: "High Vaginal Swab (HVS) Wet Mount",
    description: "Microscopic analysis of vaginal fluid swab.",
    price: 300,
    parameters: [
      { name: "Trichomonas vaginalis", unit: "", range: "Negative" },
      { name: "Candida albicans (Yeast)", unit: "", range: "Negative" },
      { name: "Clue Cells (BV Flag)", unit: "", range: "Negative" }
    ],
    sampleType: "High Vaginal Swab",
    precedingWorkflow: "HVS swab collection via speculum",
    testKind: "Microbiology"
  }
];

export const radiologyTestMaster = [
  {
    id: "rad_1",
    name: "Chest X-Ray",
    price: 600,
    modality: "X-RAY",
    bodyPart: "Chest",
    description: "Standard posteroanterior view of chest to evaluate lungs and heart."
  },
  {
    id: "rad_2",
    name: "Abdominal Ultrasound",
    price: 1000,
    modality: "US",
    bodyPart: "Abdomen",
    description: "Ultrasound of abdomen to examine organs like liver, kidneys, gallbladder."
  },
  {
    id: "rad_3",
    name: "Brain CT Scan",
    price: 4500,
    modality: "CT",
    bodyPart: "Head",
    description: "Computed Tomography scan of brain to evaluate for hemorrhage, masses, or stroke."
  },
  {
    id: "rad_4",
    name: "Knee MRI",
    price: 8000,
    modality: "MRI",
    bodyPart: "Extremities",
    description: "Magnetic Resonance Imaging of knee joint to evaluate ligaments and cartilage."
  },
  {
    id: "rad_5",
    name: "Pelvic Ultrasound",
    price: 1000,
    modality: "US",
    bodyPart: "Pelvis",
    description: "Pelvic ultrasound to examine reproductive organs."
  }
];

export const surgicalProcedureMaster = [
  {
    id: "surg_1",
    name: "Hernia Repair",
    price: 25000,
    department: "General Surgery",
    description: "Surgical correction of inguinal or abdominal wall hernia."
  },
  {
    id: "surg_2",
    name: "Caesarean Section",
    price: 35000,
    department: "Obstetrics / Gynecology",
    description: "Surgical delivery of a baby through abdominal and uterine incisions."
  },
  {
    id: "surg_3",
    name: "Appendectomy",
    price: 20000,
    department: "General Surgery",
    description: "Emergency surgical removal of inflamed appendix."
  },
  {
    id: "surg_4",
    name: "Cholecystectomy",
    price: 30000,
    department: "General Surgery",
    description: "Surgical removal of gallbladder due to gallstones."
  }
];
