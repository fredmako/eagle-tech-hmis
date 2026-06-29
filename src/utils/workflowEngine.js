export function getInitialDepartment(serviceType) {
  switch (serviceType) {
    case 'LAB': return 'lab';
    case 'PHA': return 'pharmacy';
    case 'IPD': return 'ward';
    case 'EMR': return 'triage';
    case 'ANC': return 'triage';
    case 'FP':
    case 'IMM':
      return 'consultation';
    default:
      return 'triage';
  }
}

export function getNextDepartment(visit, currentDept, options = {}) {
  const serviceType = visit?.service_type || 'OPD';
  const priority = visit?.priority || 'routine';
  const hasPrescriptions = options.hasPrescriptions || false;
  const hasLabs = options.hasLabs || false;
  const hasRadiology = options.hasRadiology || false;
  const hasSurgery = options.hasSurgery || false;
  const routeTarget = options.routeTarget || null;

  // Emergency / EMR Workflow
  if (serviceType === 'EMR') {
    if (currentDept === 'triage') {
      return 'surgery'; // Emergency bypasses consultation to Surgery/Theatre/ER
    }
    if (currentDept === 'surgery') {
      return hasPrescriptions ? 'billing' : 'completed';
    }
    if (currentDept === 'billing') {
      return hasPrescriptions ? 'pharmacy' : 'completed';
    }
    if (currentDept === 'pharmacy') {
      return 'completed';
    }
  }

  // Inpatient (IPD) Workflow
  if (serviceType === 'IPD') {
    if (currentDept === 'triage') {
      return 'ward'; // IPD goes straight to Inpatient Ward
    }
    if (currentDept === 'consultation') {
      return 'ward'; // If evaluated in OPD, admit to IPD Ward
    }
    if (currentDept === 'ward') {
      if (hasSurgery) return 'surgery';
      if (hasRadiology) return 'radiology';
      if (hasLabs) return 'lab';
      return 'billing'; // Discharge/Billing
    }
    if (currentDept === 'surgery') {
      return 'ward'; // Surgery returns to inpatient ward
    }
    if (currentDept === 'lab' || currentDept === 'radiology') {
      return 'ward'; // Lab/Radiology returns to inpatient ward
    }
    if (currentDept === 'billing') {
      return hasPrescriptions ? 'pharmacy' : 'completed';
    }
    if (currentDept === 'pharmacy') {
      return 'completed';
    }
  }

  // Maternal & Child Health (MCH/ANC/FP/IMM) Workflow
  if (['ANC', 'FP', 'IMM'].includes(serviceType)) {
    if (currentDept === 'triage') {
      return 'mch'; // Route to MCH Clinic
    }
    if (currentDept === 'mch' || currentDept === 'maternity') {
      if (hasLabs) return 'lab';
      if (hasRadiology) return 'radiology';
      return 'billing';
    }
    if (currentDept === 'lab' || currentDept === 'radiology') {
      return 'mch'; // Return to MCH
    }
    if (currentDept === 'billing') {
      return hasPrescriptions ? 'pharmacy' : 'completed';
    }
    if (currentDept === 'pharmacy') {
      return 'completed';
    }
  }

  // Lab-Only Workflow
  if (serviceType === 'LAB') {
    if (currentDept === 'registration') {
      return 'billing'; // Lab-only must pay first
    }
    if (currentDept === 'billing') {
      return 'lab';
    }
    if (currentDept === 'lab') {
      return 'completed';
    }
  }

  // Pharmacy-Only Workflow
  if (serviceType === 'PHA') {
    if (currentDept === 'registration') {
      return 'billing'; // Pharmacy-only must pay first
    }
    if (currentDept === 'billing') {
      return 'pharmacy';
    }
    if (currentDept === 'pharmacy') {
      return 'completed';
    }
  }

  // Default Standard OPD Workflow
  if (currentDept === 'triage') {
    return options.priority === 'red' ? 'surgery' : 'consultation';
  }
  if (currentDept === 'consultation') {
    if (hasSurgery) return 'surgery';
    if (hasRadiology) return 'radiology';
    if (hasLabs) return 'lab';
    if (hasPrescriptions) return 'billing';
    return 'completed';
  }
  if (currentDept === 'lab' || currentDept === 'radiology' || currentDept === 'surgery') {
    if (routeTarget) return routeTarget;
    return 'consultation';
  }
  if (currentDept === 'billing') {
    return hasPrescriptions ? 'pharmacy' : 'completed';
  }
  if (currentDept === 'pharmacy') {
    return 'completed';
  }

  return 'completed';
}
