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
    suggestedLabs: ["Full Blood Count (FBC)", "Sputum Gram Stain", "Blood Culture"]
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
    suggestedLabs: ["Urinalysis Dipstick", "Kidney Function Test (KFT)", "Urine Protein 24h"]
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
    sampleType: "Whole Blood (EDTA / Capillary)"
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
    sampleType: "Whole Blood (EDTA)"
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
    sampleType: "Urine (Mid-stream)"
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
    sampleType: "Serum"
  },
  {
    id: "lab_5",
    name: "Blood Sugar (Fasting/Random)",
    description: "Fasting Blood Glucose (FBG) or Random Blood Glucose (RBG).",
    price: 150,
    parameters: [
      { name: "Glucose Concentration", unit: "mmol/L", range: "4.0 - 7.0 (Fasting)" }
    ],
    sampleType: "Whole Blood (Fluoride Oxalate)"
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
    sampleType: "Serum"
  },
  {
    id: "lab_7",
    name: "H. pylori Stool Antigen",
    description: "Fecal antigen test for Helicobacter pylori detection.",
    price: 500,
    parameters: [
      { name: "H. pylori Antigen", unit: "", range: "Negative" }
    ],
    sampleType: "Stool"
  }
];
