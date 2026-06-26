import { labTestMaster, radiologyTestMaster, surgicalProcedureMaster } from '../medicalMaster';

const baseServiceCatalog = [
  { id: 'svc_consult_general', name: 'General Consultation', category: 'Consultation', charge: 500, description: 'Routine outpatient clinical review.' },
  { id: 'svc_consult_specialist', name: 'Specialist Consultation', category: 'Consultation', charge: 1500, description: 'Specialist clinical assessment and care planning.' },
  { id: 'svc_emergency', name: 'Emergency Care', category: 'Emergency', charge: 1000, description: 'Initial emergency assessment and stabilization.' },
  { id: 'svc_triage', name: 'Triage & Vitals Assessment', category: 'Consultation', charge: 100, description: 'Nursing triage, vitals, and priority assessment.' },
  { id: 'svc_anc', name: 'Antenatal Care Visit', category: 'ANC', charge: 500, description: 'Routine maternal antenatal care review.' },
  { id: 'svc_delivery', name: 'Normal Delivery Package', category: 'Maternity', charge: 8000, description: 'Standard maternity delivery care package.' },
  { id: 'svc_immunization', name: 'Child Immunization', category: 'MCH', charge: 0, description: 'Routine child welfare and immunization clinic service.' },
  { id: 'svc_family_planning', name: 'Family Planning Service', category: 'MCH', charge: 300, description: 'Family planning counselling and procedures.' },
  { id: 'svc_dental_review', name: 'Dental Consultation', category: 'Dental', charge: 800, description: 'Oral health assessment and treatment planning.' },
  { id: 'svc_minor_procedure', name: 'Minor Procedure', category: 'Procedure', charge: 2500, description: 'Minor outpatient procedures and dressing.' },
  { id: 'svc_dressing', name: 'Wound Dressing', category: 'Procedure', charge: 500, description: 'Wound cleaning, dressing, and review.' },
  { id: 'svc_ward_day', name: 'Inpatient Ward Bed Day', category: 'Ward', charge: 2500, description: 'General ward admission bed charge per day.' },
  { id: 'svc_icu_day', name: 'ICU Bed Day', category: 'Ward', charge: 15000, description: 'Intensive care bed charge per day.' },
  { id: 'svc_pharmacy', name: 'Pharmacy Dispensing', category: 'Pharmacy', charge: 0, description: 'Prescription fulfilment and medicine dispensing.' }
];

const toCatalogService = (item, category, idPrefix, fallbackDescription = '') => ({
  id: item.id || `${idPrefix}_${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
  name: item.name,
  category,
  charge: Number(item.price || item.charge || 0),
  description: item.description || fallbackDescription
});

export const facilityServiceCatalog = [
  ...baseServiceCatalog,
  ...labTestMaster.map((item) => toCatalogService(item, 'Lab', 'lab', item.testKind || 'Laboratory investigation')),
  ...radiologyTestMaster.map((item) => toCatalogService(item, 'Radiology', 'rad', item.modality || 'Radiology imaging')),
  ...surgicalProcedureMaster.map((item) => toCatalogService(item, 'Surgery', 'surg', item.department || 'Surgical procedure'))
];

export const serviceKey = (service) => `${service.name || ''}`.trim().toLowerCase();

export const normalizeFacilityServices = (services = []) => (
  services
    .filter((service) => service && service.name)
    .map((service) => ({
      name: service.name.trim(),
      category: service.category || 'Other',
      charge: Number(service.charge ?? service.price ?? 0),
      description: service.description || '',
      offered: service.offered !== false
    }))
);

export const visibleOfferedServices = (services = []) => (
  normalizeFacilityServices(services).filter((service) => service.offered)
);

export const mergeServiceIntoCatalog = (services, serviceToAdd) => {
  const normalized = normalizeFacilityServices(services);
  const nextService = {
    name: serviceToAdd.name.trim(),
    category: serviceToAdd.category || 'Other',
    charge: Number(serviceToAdd.charge ?? serviceToAdd.price ?? 0),
    description: serviceToAdd.description || '',
    offered: true
  };
  const existingIndex = normalized.findIndex((service) => serviceKey(service) === serviceKey(nextService));

  if (existingIndex >= 0) {
    return normalized.map((service, index) => (
      index === existingIndex
        ? { ...service, ...nextService }
        : service
    ));
  }

  return [...normalized, nextService];
};
