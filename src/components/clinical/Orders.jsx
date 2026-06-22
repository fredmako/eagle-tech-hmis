import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { sendNotification } from '../../notificationService';
import { 
  FlaskConical, 
  AlertCircle, 
  CheckCircle, 
  Barcode, 
  Clock, 
  RefreshCw, 
  CheckSquare, 
  XCircle, 
  TrendingUp, 
  ShieldAlert, 
  Send, 
  UserCheck,
  Printer
} from 'lucide-react';
import { labTestMaster } from '../../medicalMaster';

export default function Orders({ user, onComplete }) {
  const [labVisits, setLabVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'completed', 'rejected'
  const [facilityServices, setFacilityServices] = useState([]);
  const [selectedWalkinTest, setSelectedWalkinTest] = useState('');
  const [addingWalkin, setAddingWalkin] = useState(false);
  
  // Results inputs
  const [resultsInputs, setResultsInputs] = useState({});
  const [rejectionReason, setRejectionReason] = useState({});
  const [showRejectForm, setShowRejectForm] = useState({});
  const [collectionChecklist, setCollectionChecklist] = useState({});
  const [facilityDetails, setFacilityDetails] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [timeTicker, setTimeTicker] = useState(0);

  const isCriticalResult = (ord, meta) => {
    if (!meta || !meta.parameters || typeof meta.parameters !== 'object') return false;
    const testObj = labTestMaster.find(t => t.name === ord.item_name);
    if (!testObj) return false;
    return Object.keys(meta.parameters).some(pName => {
      const val = meta.parameters[pName];
      const pSchema = testObj.parameters.find(p => p.name === pName);
      if (!pSchema) return false;
      const status = checkRangeStatus(pSchema, val);
      return status === 'low' || status === 'high';
    });
  };

  useEffect(() => {
    fetchLabQueue();
    fetchFacilityDetails();
    // Refresh turnaround timers every 30 seconds
    const interval = setInterval(() => {
      setTimeTicker(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchFacilityDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', user.facility_id)
        .single();
      if (!error && data) {
        setFacilityDetails(data);
        setFacilityServices(data.services_list || []);
      }
    } catch (err) {
      console.error('Error fetching facility details:', err);
    }
  };

  const handlePrintLabReport = (singleOrder = null) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker is active. Please allow popups to print reports.');
      return;
    }

    const facility = facilityDetails || {
      name: user.facility_name || 'Eagle Tech Medical Clinic',
      code: 'N/A',
      logo_url: user.facility_logo
    };

    const patient = selectedVisit?.patient || {};
    const ageYrs = patient.dob ? Math.floor((new Date() - new Date(patient.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A';

    // Filter orders to print
    const ordersToPrint = singleOrder 
      ? [singleOrder] 
      : pendingOrders.filter(o => ['completed', 'verified', 'released'].includes(o.status));

    if (ordersToPrint.length === 0) {
      alert('No completed or released lab results available to print.');
      printWindow.close();
      return;
    }

    // Logo resolution
    let logoHtml = '';
    const logoUrl = facility.logo_url;
    if (logoUrl) {
      if (logoUrl.startsWith('preset:')) {
        const presetKey = logoUrl.split(':')[1];
        let color = '#0d9488';
        if (presetKey === 'shield') color = '#3b82f6';
        if (presetKey === 'cross') color = '#ef4444';
        logoHtml = `
          <div style="width: 50px; height: 50px; border-radius: 8px; background: rgba(13, 148, 136, 0.1); border: 1px solid rgba(13, 148, 136, 0.3); display: flex; align-items: center; justify-content: center; float: left; margin-right: 15px;">
            <span style="font-size: 24px; color: ${color}; font-weight: bold;">✚</span>
          </div>
        `;
      } else {
        logoHtml = `
          <img src="${logoUrl}" style="width: 55px; height: 55px; border-radius: 8px; object-fit: cover; border: 1px solid #cbd5e1; float: left; margin-right: 15px;" onerror="this.style.display='none'" />
        `;
      }
    } else {
      logoHtml = `
        <div style="width: 50px; height: 50px; border-radius: 8px; background: rgba(13, 148, 136, 0.1); border: 1px solid rgba(13, 148, 136, 0.3); display: flex; align-items: center; justify-content: center; float: left; margin-right: 15px; font-weight: bold; color: #0d9488; font-size: 20px;">
          ${(facility.name || 'EM').substring(0, 2).toUpperCase()}
        </div>
      `;
    }

    let reportRowsHtml = '';
    ordersToPrint.forEach(ord => {
      const meta = parseOrderMeta(ord.results);
      const isStructured = meta.parameters && typeof meta.parameters === 'object';
      const testObj = labTestMaster.find(t => t.name === ord.item_name);

      reportRowsHtml += `
        <div style="margin-bottom: 25px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #f8fafc; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 13px; color: #1e293b; text-transform: uppercase; font-weight: bold;">
              Test Name: ${ord.item_name}
            </h3>
            <span style="font-size: 10px; font-family: monospace; color: #64748b;">
              Specimen: ${testObj?.sampleType || 'Blood / Serum'}
            </span>
          </div>
          <div style="padding: 15px;">
      `;

      if (isStructured) {
        reportRowsHtml += `
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 11px;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: bold;">
                <th style="padding: 8px 4px;">Parameter</th>
                <th style="padding: 8px 4px;">Observed Value</th>
                <th style="padding: 8px 4px;">Unit</th>
                <th style="padding: 8px 4px;">Reference Range</th>
                <th style="padding: 8px 4px; text-align: right;">Flag / Status</th>
              </tr>
            </thead>
            <tbody>
        `;

        Object.keys(meta.parameters).forEach(pName => {
          const val = meta.parameters[pName];
          const pSchema = testObj?.parameters?.find(p => p.name === pName);
          const status = pSchema ? checkRangeStatus(pSchema, val) : 'normal';

          let statusLabel = 'Normal';
          let statusColor = '#0f766e';
          let statusBg = '#f0fdfa';

          if (status === 'low' || status === 'high') {
            statusLabel = status.toUpperCase();
            statusColor = '#b91c1c';
            statusBg = '#fef2f2';
          } else if (status === 'abnormal') {
            statusLabel = 'ABNORMAL';
            statusColor = '#b45309';
            statusBg = '#fffbeb';
          }

          reportRowsHtml += `
            <tr style="border-bottom: 1px solid #f1f5f9; color: #334155;">
              <td style="padding: 8px 4px; font-weight: bold;">${pName}</td>
              <td style="padding: 8px 4px; font-family: monospace; font-size: 12px; font-weight: bold; color: ${status === 'normal' ? '#0f172a' : statusColor}">${val}</td>
              <td style="padding: 8px 4px; color: #64748b;">${pSchema?.unit || '-'}</td>
              <td style="padding: 8px 4px; font-family: monospace; color: #475569;">${pSchema?.range || '-'}</td>
              <td style="padding: 8px 4px; text-align: right;">
                <span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; color: ${statusColor}; background-color: ${statusBg}; border: 1px solid ${statusColor}30;">
                  ${statusLabel}
                </span>
              </td>
            </tr>
          `;
        });

        reportRowsHtml += `
            </tbody>
          </table>
        `;
      } else {
        reportRowsHtml += `
          <div style="font-size: 12px; color: #334155; line-height: 1.5; background-color: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #f1f5f9;">
            <strong style="color: #475569; display: block; margin-bottom: 4px; font-size: 10px; text-transform: uppercase;">Diagnostic Findings:</strong>
            ${meta.values || 'No findings recorded.'}
          </div>
        `;
      }

      // Add technician & release metadata at bottom of each test
      const verifierStr = meta.verifier ? `Verified by: <strong>${meta.verifier}</strong>` : 'Verification: pending';
      const releasedStr = meta.released_by ? `Released by: <strong>${meta.released_by}</strong>` : `Released by: <strong>${ord.status === 'released' ? 'Phlebotomist/Technician' : 'Pending'}</strong>`;
      
      reportRowsHtml += `
            <div style="margin-top: 15px; border-top: 1px dashed #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #64748b;">
              <div>Collected at: ${meta.collected_at ? new Date(meta.collected_at).toLocaleString() : 'N/A'}</div>
              <div>${verifierStr}</div>
              <div>${releasedStr}</div>
            </div>
          </div>
        </div>
      `;
    });

    const isVerifiedOrReleased = ordersToPrint.some(o => o.status === 'verified' || o.status === 'released');    printWindow.document.write(`
      <html>
        <head>
          <title>Laboratory Report - ${patient.name || 'Patient'}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 20px;
              font-size: 12px;
              line-height: 1.5;
            }
            .header-table {
              width: 100%;
              border-bottom: 3px double #0d9488;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            .info-table td {
              padding: 5px 8px;
              border: 1px solid #e2e8f0;
            }
            .info-label {
              font-weight: bold;
              color: #475569;
              background-color: #f8fafc;
              width: 20%;
            }
            .info-value {
              width: 30%;
            }
            .footer-section {
              margin-top: 40px;
              border-top: 1px solid #cbd5e1;
              padding-top: 15px;
            }
            .signature-block {
              display: flex;
              justify-content: space-between;
              margin-top: 40px;
            }
            .signature-line {
              width: 200px;
              border-top: 1px solid #000;
              text-align: center;
              padding-top: 5px;
              font-size: 10px;
              font-weight: bold;
            }
            @media print {
              body { padding: 0; }
              .print-hidden { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="max-width: 800px; margin: 0 auto;">
            
            <!-- Letterhead -->
            <table class="header-table">
              <tr>
                <td style="width: 60px; vertical-align: top;">
                  ${logoHtml}
                </td>
                <td style="vertical-align: top;">
                  <h1 style="margin: 0; font-size: 18px; color: #0f172a; text-transform: uppercase; font-weight: 800; letter-spacing: -0.5px;">
                    ${facility.name}
                  </h1>
                  <p style="margin: 3px 0 0 0; font-size: 10px; color: #64748b;">
                    Lic No: ${facility.kmpdc_reg_number || 'KMPDC/PENDING'} | MFL Code: ${facility.mfl_code || 'N/A'} | Category: ${facility.regulatory_category || 'Medical Clinic'}
                  </p>
                  <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">
                    Address: ${facility.address || 'Kenya'} | County: ${facility.county || 'Kenya'}
                  </p>
                </td>
                <td style="text-align: right; vertical-align: top; font-size: 9px; color: #64748b; line-height: 1.3;">
                  <div style="font-weight: bold; color: #0d9488; font-size: 11px;">OFFICIAL LABORATORY REPORT</div>
                  <div>Printed: ${new Date().toLocaleString()}</div>
                  <div>Report ID: LAB-REP-${Math.floor(100000 + Math.random() * 900000)}</div>
                </td>
              </tr>
            </table>

            <!-- Patient Meta Info -->
            <h2 style="font-size: 12px; font-weight: bold; margin: 0 0 10px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
              Patient & Specimen Identification
            </h2>
            <table class="info-table">
              <tr>
                <td class="info-label">Patient Name</td>
                <td class="info-value" style="font-weight: bold; color: #0f172a;">${patient.name || 'N/A'}</td>
                <td class="info-label">Visit ID</td>
                <td class="info-value" style="font-family: monospace;">${selectedVisit?.id || 'N/A'}</td>
              </tr>
              <tr>
                <td class="info-label">Patient ID Code</td>
                <td class="info-value" style="font-family: monospace; font-weight: bold; color: #0d9488;">${patient.facility_id_code || 'N/A'}</td>
                <td class="info-label">Request Date</td>
                <td class="info-value">${selectedVisit?.created_at ? new Date(selectedVisit.created_at).toLocaleString() : 'N/A'}</td>
              </tr>
              <tr>
                <td class="info-label">Age / Gender</td>
                <td class="info-value">${ageYrs} Years / <span style="text-transform: capitalize;">${patient.gender || 'N/A'}</span></td>
                <td class="info-label">Attending Clinician</td>
                <td class="info-value">${selectedVisit?.created_by || 'Attending Physician'}</td>
              </tr>
            </table>

            <!-- Diagnostic Results -->
            <h2 style="font-size: 12px; font-weight: bold; margin: 0 0 10px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
              Diagnostic Investigation Results
            </h2>
            
            ${reportRowsHtml}

            <!-- Sign-offs and Certification -->
            <div class="footer-section">
              <div style="font-size: 9px; color: #64748b; font-style: italic; line-height: 1.4; text-align: justify; margin-bottom: 20px;">
                <strong>Disclaimer:</strong> This laboratory diagnostic report represents the analytical findings of the specimens provided. Results must be interpreted in conjunction with clinical signs, symptoms, and other diagnostic examinations. For any critical panic values, the clinician has been notified immediately in accordance with institutional guidelines.
              </div>

              <div class="signature-block">
                <div>
                  <div style="height: 40px;"></div>
                  <div class="signature-line">
                    TESTING TECHNOLOGIST
                  </div>
                  <div style="font-size: 8px; text-align: center; color: #64748b; margin-top: 2px;">
                    Released: ${ordersToPrint[0]?.status === 'released' ? 'Electronically Signed' : 'Pending'}
                  </div>
                </div>
                <div>
                  <div style="height: 40px; text-align: center; font-family: monospace; font-size: 9px; color: #3b82f6; font-weight: bold; display: flex; align-items: center; justify-content: center; border: 1px dashed #3b82f630; border-radius: 4px; padding: 2px 10px;">
                    ${isVerifiedOrReleased ? '✓ VERIFIED SIGN-OFF<br/><span style="font-size:7px;color:#64748b;">KMPDC Registry Check</span>' : 'PENDING SIGN-OFF'}
                  </div>
                  <div class="signature-line">
                    LABORATORY SUPERVISOR
                  </div>
                  <div style="font-size: 8px; text-align: center; color: #64748b; margin-top: 2px;">
                    ${isVerifiedOrReleased ? 'Verified by: ' + (ordersToPrint.find(o => o.status === 'verified' || o.status === 'released')?.results ? parseOrderMeta(ordersToPrint.find(o => o.status === 'verified' || o.status === 'released').results).verifier : user.full_name) : 'Pending Verification'}
                  </div>
                </div>
              </div>
            </div>

            <!-- Print Controls -->
            <div style="margin-top: 30px; text-align: center;" class="print-hidden">
              <button onclick="window.print();" style="background-color: #0d9488; color: #fff; border: none; padding: 8px 20px; font-size: 12px; font-weight: bold; border-radius: 5px; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.2);">
                Print Laboratory Report
              </button>
              <button onclick="window.close();" style="background-color: #64748b; color: #fff; border: none; padding: 8px 20px; font-size: 12px; font-weight: bold; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                Close Window
              </button>
            </div>

          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const fetchFacilityServices = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('services_list')
        .eq('id', user.facility_id)
        .single();
      if (!error && data) {
        setFacilityServices(data.services_list || []);
      }
    } catch (err) {
      console.error('Error fetching facility services:', err);
    }
  };

  const handleAddWalkinTest = async (e) => {
    e.preventDefault();
    if (!selectedWalkinTest || !selectedVisit) return;
    setAddingWalkin(true);
    setMessage({ type: '', text: '' });
    
    try {
      const service = facilityServices.find(s => s.name === selectedWalkinTest);
      const charge = service ? service.charge : 1000;
      
      const newOrder = {
        visit_id: selectedVisit.id,
        type: 'lab',
        item_name: selectedWalkinTest,
        status: 'ordered',
        price: charge
      };
      
      const { error } = await supabase.from('orders').insert(newOrder);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Walk-in Lab Order Created',
        details: `Created direct walk-in lab order for ${selectedWalkinTest} for patient ${selectedVisit?.patient?.name}.`
      });

      setMessage({ type: 'success', text: `Walk-in test '${selectedWalkinTest}' added successfully!` });
      setSelectedWalkinTest('');
      await handleSelectVisit(selectedVisit);
    } catch (err) {
      console.error('Error adding walkin test:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to add walk-in test.' });
    } finally {
      setAddingWalkin(false);
    }
  };

  // Recalculate turnaround timers whenever tab changes or queue updates
  const fetchLabQueue = async () => {
    try {
      // Fetch visits currently waiting in lab
      const { data: vsts } = await supabase.from('visits').select('*').eq('department', 'lab');
      const { data: pts } = await supabase.from('patients').select('*');
      
      const enrichedVisits = vsts ? vsts.map(v => {
        const p = pts?.find(pt => pt.id === v.patient_id);
        return { ...v, patient: p };
      }) : [];

      setLabVisits(enrichedVisits);
      
      // Select the first active visit if none is selected
      if (enrichedVisits.length > 0) {
        // Find if selectedVisit is still in the queue
        const savedVisitId = sessionStorage.getItem('egesa_selected_visit_id_orders');
        const matchedVisit = enrichedVisits.find(v => v.id === savedVisitId);
        const stillExists = enrichedVisits.find(v => v.id === selectedVisit?.id);
        if (matchedVisit) {
          handleSelectVisit(matchedVisit);
        } else if (!stillExists) {
          handleSelectVisit(enrichedVisits[0]);
        } else {
          // Refresh details
          handleSelectVisit(stillExists);
        }
      } else {
        setSelectedVisit(null);
        setPendingOrders([]);
      }
    } catch (err) {
      console.error('Error fetching lab queue:', err);
    }
  };

  const handleSelectVisit = async (visit) => {
    setSelectedVisit(visit);
    setMessage({ type: '', text: '' });
    if (visit) {
      sessionStorage.setItem('egesa_selected_visit_id_orders', visit.id);
    } else {
      sessionStorage.removeItem('egesa_selected_visit_id_orders');
    }
    
    try {
      // Fetch all lab orders for this visit
      const { data: ords } = await supabase.from('orders')
        .select('*')
        .eq('visit_id', visit.id)
        .eq('type', 'lab');
        
      setPendingOrders(ords || []);
      
      // Initialize inputs for processing tests
      const initialResults = {};
      const initialRejections = {};
      ords?.forEach(o => {
        const meta = parseOrderMeta(o.results);
        initialResults[o.id] = meta.parameters || meta.values || '';
        initialRejections[o.id] = '';
      });
      setResultsInputs(initialResults);
      setRejectionReason(initialRejections);
    } catch (err) {
      console.error('Error loading orders:', err);
    }
  };

  const parseOrderMeta = (resultsStr) => {
    if (!resultsStr) return {};
    if (resultsStr.startsWith('{')) {
      try {
        return JSON.parse(resultsStr);
      } catch (e) {
        return { values: resultsStr };
      }
    }
    return { values: resultsStr };
  };

  const updateOrderStatus = async (orderId, newStatus, extraData = {}) => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // Get current order to preserve existing metadata in JSON
      const activeOrder = pendingOrders.find(o => o.id === orderId);
      let existingMeta = parseOrderMeta(activeOrder?.results);
      
      const updatedMeta = {
        ...existingMeta,
        ...extraData
      };

      const { error } = await supabase.from('orders').update({
        status: newStatus,
        results: JSON.stringify(updatedMeta)
      }).eq('id', orderId);

      if (error) throw error;

      // Log action to audit trail
      await supabase.from('audit_logs').insert({
        action: `Lab Order Status: ${newStatus.toUpperCase()}`,
        details: `Updated test ${activeOrder?.item_name} status to ${newStatus.toUpperCase()} for patient ${selectedVisit?.patient?.name}.`
      });

      setMessage({ type: 'success', text: `Order updated to ${newStatus.toUpperCase()} successfully!` });
      await handleSelectVisit(selectedVisit);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error updating order status.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCollectSample = (orderId) => {
    const randomBarcode = 'BAR-' + Math.floor(100000 + Math.random() * 900000);
    updateOrderStatus(orderId, 'collected', { 
      barcode: randomBarcode,
      collected_at: new Date().toISOString(),
      collected_by: user.full_name
    });
  };

  const handleReceiveSample = (orderId) => {
    updateOrderStatus(orderId, 'received', { 
      received_at: new Date().toISOString(),
      received_by: user.full_name
    });
  };

  const handleAcceptSample = (orderId) => {
    updateOrderStatus(orderId, 'accepted', { 
      accepted_at: new Date().toISOString(),
      accepted_by: user.full_name
    });
  };

  const handleRejectSample = async (orderId, reason) => {
    if (!reason.trim()) return;
    await updateOrderStatus(orderId, 'rejected', { 
      rejection_reason: reason,
      rejected_at: new Date().toISOString(),
      rejected_by: user.full_name
    });
    // Hide reject dropdown
    setShowRejectForm({ ...showRejectForm, [orderId]: false });

    // Trigger Notification
    try {
      const activeOrder = pendingOrders.find(o => o.id === orderId);
      await sendNotification('LAB_SAMPLE_REJECTED', {
        patientName: selectedVisit?.patient?.name || 'N/A',
        testName: activeOrder?.item_name || 'Lab Test',
        reason: reason,
        recipientEmail: 'clinician@eagletechsolutions.tech'
      }, user.facility_id);
    } catch (e) {
      console.error('Rejection email trigger failed:', e);
    }
  };

  const handleRecollect = (orderId) => {
    // Reset status back to ordered to handle sample resubmission
    updateOrderStatus(orderId, 'ordered', {
      barcode: null,
      collected_at: null,
      collected_by: null,
      rejection_reason: null
    });
  };

  const handleStartProcess = (orderId) => {
    updateOrderStatus(orderId, 'in_process', { 
      processing_started_at: new Date().toISOString(),
      processed_by: user.full_name
    });
  };

  const handleResultChange = (orderId, val) => {
    setResultsInputs({
      ...resultsInputs,
      [orderId]: val
    });
  };

  const handleStructuredResultChange = (orderId, paramName, val) => {
    const current = resultsInputs[orderId];
    const currentObj = (current && typeof current === 'object') ? current : {};
    setResultsInputs({
      ...resultsInputs,
      [orderId]: {
        ...currentObj,
        [paramName]: val
      }
    });
  };

  const checkRangeStatus = (param, val) => {
    if (!val || !param.range) return 'normal';
    
    // If range is like "12.0 - 16.0"
    if (param.range.includes('-')) {
      const parts = param.range.split('-').map(p => parseFloat(p.trim()));
      const numVal = parseFloat(val);
      if (isNaN(numVal)) return 'normal';
      if (numVal < parts[0]) return 'low';
      if (numVal > parts[1]) return 'high';
    }
    
    // If range is like "< 1:80"
    if (param.range.startsWith('<')) {
      const normalLimit = param.range.replace('<', '').trim();
      if (val.trim() !== normalLimit && val.trim().toLowerCase() !== 'negative' && val.trim().toLowerCase() !== 'normal') {
        return 'abnormal';
      }
    }
    
    // If range is like "Negative"
    if (param.range.toLowerCase() === 'negative') {
      if (val.trim().toLowerCase() !== 'negative' && val.trim().toLowerCase() !== 'trace' && val.trim() !== '') {
        return 'abnormal';
      }
    }
    
    return 'normal';
  };

  const renderFindingsTable = (ord, meta) => {
    if (!meta || !meta.parameters || typeof meta.parameters !== 'object') {
      return (
        <p className="text-slate-200 font-bold">Findings: {meta.values || 'No findings recorded.'}</p>
      );
    }

    const testObj = labTestMaster.find(t => t.name === ord.item_name);
    const params = Object.keys(meta.parameters);

    return (
      <div className="overflow-x-auto mt-1.5 border border-slate-800/60 rounded-lg bg-slate-950/60 max-w-xl">
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
              <th className="p-2">Parameter</th>
              <th className="p-2">Result</th>
              <th className="p-2">Unit</th>
              <th className="p-2">Reference Range</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {params.map((pName, idx) => {
              const val = meta.parameters[pName];
              const pSchema = testObj?.parameters?.find(p => p.name === pName);
              const status = pSchema ? checkRangeStatus(pSchema, val) : 'normal';
              
              let statusText = 'Normal';
              let statusClass = 'text-slate-350 font-semibold';
              let rowBg = 'border-slate-900/50';

              if (status === 'low') {
                statusText = 'Low';
                statusClass = 'text-red-400 font-bold';
                rowBg = 'bg-red-500/[0.02] border-slate-900/50';
              } else if (status === 'high') {
                statusText = 'High';
                statusClass = 'text-red-400 font-bold';
                rowBg = 'bg-red-500/[0.02] border-slate-900/50';
              } else if (status === 'abnormal') {
                statusText = 'Abnormal';
                statusClass = 'text-yellow-400 font-bold';
                rowBg = 'bg-yellow-500/[0.02] border-slate-900/50';
              }

              return (
                <tr key={idx} className={`border-b ${rowBg} hover:bg-slate-900/40`}>
                  <td className="p-2 font-semibold text-slate-350">{pName}</td>
                  <td className={`p-2 font-mono ${statusClass}`}>{val}</td>
                  <td className="p-2 text-slate-550">{pSchema?.unit || '-'}</td>
                  <td className="p-2 text-slate-400 font-mono">{pSchema?.range || '-'}</td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                      status === 'normal' ? 'bg-green-500/10 text-green-400 border border-green-500/10' :
                      status === 'abnormal' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/10' :
                      'bg-red-500/10 text-red-400 border border-red-500/10'
                    }`}>
                      {statusText}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const handleSaveResults = async (orderId) => {
    const activeOrder = pendingOrders.find(o => o.id === orderId);
    const findings = resultsInputs[orderId];
    if (!findings) {
      setMessage({ type: 'error', text: 'Please enter result values before saving.' });
      return;
    }

    const testObj = labTestMaster.find(t => t.name === activeOrder?.item_name);
    let valuesStr = '';
    let isStructured = testObj && testObj.parameters && testObj.parameters.length > 0;

    if (isStructured) {
      // Check if all parameters have been filled
      const missing = testObj.parameters.filter(p => !findings[p.name]);
      if (missing.length > 0) {
        setMessage({ type: 'error', text: `Please fill in all test parameters: ${missing.map(m => m.name).join(', ')}` });
        return;
      }

      // Validate numeric vs qualitative parameter values
      for (const p of testObj.parameters) {
        const valStr = String(findings[p.name]).trim();
        const isRangeNumeric = /^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?$/.test(p.range.trim());
        if (isRangeNumeric) {
          const numVal = parseFloat(valStr);
          if (isNaN(numVal)) {
            setMessage({ type: 'error', text: `Validation Error: Parameter "${p.name}" must be a numeric value.` });
            return;
          }
          if (numVal < 0 || numVal > 10000) {
            setMessage({ type: 'error', text: `Validation Error: Parameter "${p.name}" value (${numVal}) is out of realistic physiological limits (0 to 10000).` });
            return;
          }
        } else {
          // Qualitative / text limit
          if (valStr.length > 100) {
            setMessage({ type: 'error', text: `Validation Error: Parameter "${p.name}" findings must be under 100 characters.` });
            return;
          }
        }
      }

      valuesStr = testObj.parameters.map(p => `${p.name}: ${findings[p.name]} ${p.unit}`).join(', ');
    } else {
      if (typeof findings === 'string' && !findings.trim()) {
        setMessage({ type: 'error', text: 'Please enter result values before saving.' });
        return;
      }
      valuesStr = findings;
    }

    updateOrderStatus(orderId, 'completed', { 
      values: valuesStr,
      parameters: isStructured ? findings : null,
      completed_at: new Date().toISOString()
    });
  };

  const handleVerifyResults = (orderId) => {
    updateOrderStatus(orderId, 'verified', { 
      verified_at: new Date().toISOString(),
      verifier: user.full_name
    });
  };

  const handleReleaseResults = async (orderId) => {
    setLoading(true);
    try {
      const activeOrder = pendingOrders.find(o => o.id === orderId);
      const meta = parseOrderMeta(activeOrder?.results);

      // 1. Release the order findings
      const { error } = await supabase.from('orders').update({
        status: 'released'
      }).eq('id', orderId);
      if (error) throw error;

      // 2. Log release
      await supabase.from('audit_logs').insert({
        action: 'Lab Results Released',
        details: `Released finalized results for ${activeOrder?.item_name} (${meta.values}) for patient ${selectedVisit?.patient?.name}.`
      });

      // Trigger Notification
      try {
        await sendNotification('LAB_RESULT_READY', {
          patientName: selectedVisit?.patient?.name || 'N/A',
          testName: activeOrder?.item_name || 'Lab Test',
          findings: meta.values,
          verifier: meta.verifier || user.full_name,
          recipientEmail: 'clinician@eagletechsolutions.tech'
        }, user.facility_id);
      } catch (e) {
        console.error('Lab result email trigger failed:', e);
      }

      // 3. Check if all lab tests for this visit are completed/released
      const updatedOrders = pendingOrders.map(o => o.id === orderId ? { ...o, status: 'released' } : o);
      const allReleased = updatedOrders.every(o => o.status === 'released' || o.status === 'cancelled');

      if (allReleased) {
        // Move visit to Billing
        const { error: visitErr } = await supabase.from('visits').update({
          department: 'billing',
          status: 'waiting'
        }).eq('id', selectedVisit.id);
        if (visitErr) throw visitErr;

        setMessage({ type: 'success', text: 'All results released! Patient redirected to Billing Desk.' });
        setTimeout(() => {
          sessionStorage.removeItem('egesa_selected_visit_id_orders');
          fetchLabQueue();
          if (onComplete) onComplete();
        }, 1500);
      } else {
        setMessage({ type: 'success', text: 'Results released to patient profile.' });
        await handleSelectVisit(selectedVisit);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error releasing results.' });
    } finally {
      setLoading(false);
    }
  };

  const getElapsedTime = (createdAt) => {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    return Math.floor(elapsedMs / 60000);
  };

  const renderTAT = (visit) => {
    const mins = getElapsedTime(visit.created_at);
    let color = 'text-green-400 bg-green-500/10 border-green-500/20';
    if (mins >= 30) {
      color = 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse';
    } else if (mins >= 15) {
      color = 'text-yellow-450 bg-yellow-500/10 border-yellow-500/20';
    }
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-semibold flex items-center gap-1 ${color}`}>
        <Clock size={10} /> {mins}m
      </span>
    );
  };

  // Filter visits list based on filter tab
  const getFilteredVisits = () => {
    if (activeTab === 'completed') {
      return labVisits.filter(v => v.status === 'completed');
    }
    // Waiting queue
    return labVisits.filter(v => v.status === 'waiting');
  };

  const filteredVisits = getFilteredVisits();

  // Rejection Options
  const rejectionReasons = [
    'Hemolyzed Sample',
    'Insufficient Sample Volume',
    'Clotted / Blocked Tube',
    'Contaminated Sample',
    'Incorrect Container Type'
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar: Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-1">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <FlaskConical size={14} className="text-teal-400" /> Laboratory Queue
          </h2>
          <button 
            onClick={fetchLabQueue} 
            className="text-slate-500 hover:text-white transition"
          >
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Tab filters */}
        <div className="flex border-b border-slate-800 text-[10px] uppercase font-bold tracking-wide">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 pb-2 text-center border-b-2 transition ${
              activeTab === 'active' 
                ? 'border-teal-500 text-teal-400' 
                : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Pending ({labVisits.filter(v => v.status === 'waiting').length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 pb-2 text-center border-b-2 transition ${
              activeTab === 'completed' 
                ? 'border-teal-500 text-teal-400' 
                : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Completed ({labVisits.filter(v => v.status === 'completed').length})
          </button>
        </div>

        {/* Queue Items */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {filteredVisits.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectVisit(item)}
              className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 ${
                selectedVisit?.id === item.id
                  ? 'border-teal-500/60 bg-teal-500/5'
                  : 'border-slate-800/80 bg-slate-950 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="font-semibold text-slate-200 text-xs truncate max-w-[65%]">{item.patient?.name}</span>
                {renderTAT(item)}
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 w-full font-mono">
                <div className="flex items-center gap-1.5">
                  <span>{item.patient?.facility_id_code}</span>
                  {item.service_type === 'laboratory-only' && (
                    <span className="text-[8px] bg-purple-500/10 text-purple-400 font-extrabold uppercase border border-purple-500/15 px-1 py-0.2 rounded">Lab-Only</span>
                  )}
                </div>
                <span className={`px-1 rounded text-[8px] uppercase ${
                  item.priority === 'emergency' ? 'bg-red-500/10 text-red-400 border border-red-500/25' : 'bg-slate-800 text-slate-400'
                }`}>{item.priority}</span>
              </div>
            </button>
          ))}

          {filteredVisits.length === 0 && (
            <div className="text-xs text-slate-650 text-center py-16 border border-dashed border-slate-800 rounded-xl">
              No patients in this queue.
            </div>
          )}
        </div>
      </div>

      {/* Main Panel: Interactive Workflow Engine */}
      <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
        {!selectedVisit ? (
          <div className="flex flex-col items-center justify-center py-32 text-center my-auto">
            <FlaskConical size={54} className="text-slate-700 mb-2 animate-bounce" />
            <h3 className="text-slate-400 font-bold text-sm uppercase tracking-wide">No Active Worklist Selected</h3>
            <p className="text-slate-600 text-xs max-w-xs mt-1">Select a waitlisted patient from the queue to access sample accessioning, result entries, and senior reviews.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header info card */}
            <div className="flex flex-col md:flex-row justify-between md:items-center pb-4 border-b border-slate-800 gap-4">
              <div>
                <span className="text-xs text-teal-400 font-bold uppercase tracking-wider">Lab Accessioning & Diagnostic Workspace</span>
                <h3 className="text-base font-bold text-slate-100 mt-0.5">{selectedVisit.patient?.name}</h3>
                <p className="text-xs text-slate-505">{selectedVisit.patient?.facility_id_code} | Age: {new Date().getFullYear() - new Date(selectedVisit.patient?.dob).getFullYear()} yrs | Gender: <span className="capitalize">{selectedVisit.patient?.gender}</span></p>
              </div>
              <div className="flex gap-2">
                {pendingOrders.some(o => ['completed', 'verified', 'released'].includes(o.status)) && (
                  <button
                    onClick={() => handlePrintLabReport(null)}
                    className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-350 text-[10px] font-bold py-1 px-2.5 rounded transition active:scale-[0.98] cursor-pointer"
                  >
                    <Printer size={12} className="text-teal-400" /> Print Full Lab Report
                  </button>
                )}
                <span className="text-[10px] text-yellow-500 bg-yellow-500/5 border border-yellow-500/15 font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  Urgency: {selectedVisit.priority.toUpperCase()}
                </span>
                {renderTAT(selectedVisit)}
              </div>
            </div>

            {message.text && (
              <div className={`p-3.5 rounded-xl border text-xs flex gap-2.5 ${
                message.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'
              }`}>
                {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{message.text}</span>
              </div>
            )}

            {/* Test Worklist */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-850">
                <CheckSquare size={14} className="text-teal-400" /> Diagnostic Test Parameters & Lifecycle States
              </h4>

              <div className="space-y-4">
                {pendingOrders.map((ord) => {
                  const meta = parseOrderMeta(ord.results);
                  
                  return (
                    <div key={ord.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4">
                      {/* Top Info Banner */}
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="font-bold text-slate-200 text-xs block">{ord.item_name}</span>
                          <span className="text-[10px] text-slate-500 font-medium">Price: {ord.price || 0}/-</span>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          {/* Colored State Pill */}
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                            ord.status === 'released' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            ord.status === 'verified' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                            ord.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            ord.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-yellow-500/10 text-yellow-450 border-yellow-500/20'
                          }`}>
                            {ord.status || 'ordered'}
                          </span>
                          {meta.barcode && (
                            <span className="text-[9px] font-mono text-slate-500 flex items-center gap-1">
                              <Barcode size={12} /> {meta.barcode}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Workflow Timeline Status Tracker */}
                      <div className="grid grid-cols-5 text-[9px] text-slate-500 uppercase tracking-wider text-center border-t border-b border-slate-900 py-2.5 font-semibold">
                        <div className={!['ordered', 'pending'].includes(ord.status || 'ordered') ? 'text-teal-400' : 'text-slate-650'}>
                          ● Collected
                        </div>
                        <div className={['received', 'accepted', 'in_process', 'completed', 'verified', 'released'].includes(ord.status) ? 'text-teal-400' : 'text-slate-650'}>
                          ● Received
                        </div>
                        <div className={['accepted', 'in_process', 'completed', 'verified', 'released'].includes(ord.status) ? 'text-teal-400' : 'text-slate-650'}>
                          ● Accepted
                        </div>
                        <div className={['completed', 'verified', 'released'].includes(ord.status) ? 'text-teal-400' : 'text-slate-650'}>
                          ● Results Entry
                        </div>
                        <div className={['verified', 'released'].includes(ord.status) ? 'text-teal-400' : 'text-slate-650'}>
                          ● Released
                        </div>
                      </div>

                      {/* Dynamic Workflow Actions */}
                      <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850/50 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                        <div className="text-[10px] text-slate-400">
                          {/* Collected state info */}
                          {ord.status === 'collected' && (
                            <p>Sample collected by <span className="text-white font-bold">{meta.collected_by}</span>. Accessioning clerk check-in pending.</p>
                          )}
                          {/* Received info */}
                          {ord.status === 'received' && (
                            <p>Sample received. Run integrity review to check for hemolyzation, clotting, or volume issues.</p>
                          )}
                          {/* Rejected details */}
                          {ord.status === 'rejected' && (
                            <p className="text-red-400 font-semibold">Rejected by {meta.rejected_by} (Reason: {meta.rejection_reason}). Phlebotomist recollecting required.</p>
                          )}
                          {/* Accepted info */}
                          {ord.status === 'accepted' && (
                            <p>Sample accepted and labeled. Ready for analyzer processing run.</p>
                          )}
                          {/* Processing info */}
                          {ord.status === 'in_process' && (
                            <p>Sample in process. Analyzer running. Diagnostic findings input required.</p>
                          )}
                          {/* Completed results info */}
                          {ord.status === 'completed' && (
                            <div className="space-y-2">
                              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Lab Diagnostic Findings</span>
                              {renderFindingsTable(ord, meta)}
                              <p className="text-slate-500 text-[9px]">Awaiting supervisor/senior verifier sign-off.</p>
                            </div>
                          )}
                          {/* Verified info */}
                          {ord.status === 'verified' && (
                            <div className="space-y-2">
                              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Verified Lab Findings</span>
                              {renderFindingsTable(ord, meta)}
                              <p className="text-teal-400 text-[9px] font-bold">Verified by {meta.verifier}. Ready for medical release.</p>
                            </div>
                          )}
                          {/* Released state */}
                          {ord.status === 'released' && (
                            <div className="space-y-2">
                              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Released Findings</span>
                              {renderFindingsTable(ord, meta)}
                              <p className="text-slate-500 text-[9px]">Released by {meta.released_by || 'Technician'} | Verified: {meta.verifier}</p>
                            </div>
                          )}
                          {/* Pending / Ordered */}
                          {(!ord.status || ord.status === 'ordered' || ord.status === 'pending') && (
                            <p>Test ordered. Phlebotomist collection of blood/urine/stool specimen pending.</p>
                          )}
                        </div>

                        {/* Control buttons */}
                        <div className="flex flex-wrap gap-2 shrink-0 justify-end">
                          {/* Print single test report */}
                          {['completed', 'verified', 'released'].includes(ord.status) && (
                            <button
                              onClick={() => handlePrintLabReport(ord)}
                              className="bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-300 font-bold text-[10px] py-1.5 px-3 rounded shadow transition active:scale-[0.97] flex items-center gap-1 cursor-pointer"
                            >
                              <Printer size={11} className="text-teal-400" /> Print Test
                            </button>
                          )}

                          {/* Phlebotomy: Collect */}
                          {(!ord.status || ord.status === 'ordered' || ord.status === 'pending') && (
                            <div className="flex flex-col gap-2 bg-slate-950/80 p-3.5 rounded-xl border border-slate-850 w-full max-w-sm">
                              <span className="text-[10px] font-bold text-slate-350 uppercase tracking-wide block mb-1">Specimen Collection Checklist</span>
                              <label className="flex items-center gap-2 text-[10px] text-slate-305 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!collectionChecklist[ord.id]?.volume}
                                  onChange={(e) => setCollectionChecklist({
                                    ...collectionChecklist,
                                    [ord.id]: { ...(collectionChecklist[ord.id] || {}), volume: e.target.checked }
                                  })}
                                  className="accent-teal-500 rounded bg-slate-900 border-slate-800"
                                />
                                Volume Adequate (at least 3-5mL)
                              </label>
                              <label className="flex items-center gap-2 text-[10px] text-slate-305 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!collectionChecklist[ord.id]?.labeled}
                                  onChange={(e) => setCollectionChecklist({
                                    ...collectionChecklist,
                                    [ord.id]: { ...(collectionChecklist[ord.id] || {}), labeled: e.target.checked }
                                  })}
                                  className="accent-teal-500 rounded bg-slate-900 border-slate-800"
                                />
                                Labeled correctly with patient ID / barcode
                              </label>
                              <div className="flex gap-2.5 mt-1">
                                <div className="flex-1">
                                  <span className="text-[8px] text-slate-500 uppercase block font-bold mb-1">Transport Temp</span>
                                  <select
                                    value={collectionChecklist[ord.id]?.temp || 'room_temp'}
                                    onChange={(e) => setCollectionChecklist({
                                      ...collectionChecklist,
                                      [ord.id]: { ...(collectionChecklist[ord.id] || {}), temp: e.target.value }
                                    })}
                                    className="bg-slate-900 border border-slate-800 text-[10px] text-white py-1 px-2 rounded w-full focus:outline-none focus:border-teal-500"
                                  >
                                    <option value="room_temp">Room Temp (20-25°C)</option>
                                    <option value="iced">Iced / Chilled (2-4°C)</option>
                                    <option value="frozen">Frozen (&lt; 0°C)</option>
                                  </select>
                                </div>
                                <div className="flex-1">
                                  <span className="text-[8px] text-slate-500 uppercase block font-bold mb-1">Fasting State</span>
                                  <select
                                    value={collectionChecklist[ord.id]?.fasting || 'na'}
                                    onChange={(e) => setCollectionChecklist({
                                      ...collectionChecklist,
                                      [ord.id]: { ...(collectionChecklist[ord.id] || {}), fasting: e.target.value }
                                    })}
                                    className="bg-slate-900 border border-slate-800 text-[10px] text-white py-1 px-2 rounded w-full focus:outline-none focus:border-teal-500"
                                  >
                                    <option value="na">N/A</option>
                                    <option value="fasting">Fasting</option>
                                    <option value="fed">Non-fasting</option>
                                  </select>
                                </div>
                              </div>
                              <button
                                disabled={loading || !collectionChecklist[ord.id]?.volume || !collectionChecklist[ord.id]?.labeled}
                                onClick={() => handleCollectSample(ord.id)}
                                className="bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-slate-950 font-bold text-[10px] py-2 px-3 rounded shadow transition mt-2.5 w-full flex items-center justify-center gap-1 active:scale-[0.98]"
                              >
                                <Barcode size={12} /> Confirm & Generate Barcode
                              </button>
                            </div>
                          )}

                          {/* Accession: Receive */}
                          {ord.status === 'collected' && (
                            <button
                              disabled={loading}
                              onClick={() => handleReceiveSample(ord.id)}
                              className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-[10px] py-1.5 px-3 rounded shadow transition active:scale-[0.97]"
                            >
                              Accession / Receive Sample
                            </button>
                          )}

                          {/* Integrity Review: Accept / Reject */}
                          {ord.status === 'received' && !showRejectForm[ord.id] && (
                            <>
                              <button
                                disabled={loading}
                                onClick={() => handleAcceptSample(ord.id)}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold text-[10px] py-1.5 px-3 rounded shadow transition active:scale-[0.97]"
                              >
                                Accept Sample
                              </button>
                              <button
                                disabled={loading}
                                onClick={() => setShowRejectForm({ ...showRejectForm, [ord.id]: true })}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-bold text-[10px] py-1.5 px-3 rounded transition"
                              >
                                Reject Sample
                              </button>
                            </>
                          )}

                          {/* Rejection input */}
                          {showRejectForm[ord.id] && (
                            <div className="flex flex-col gap-1.5 bg-slate-950 p-2 rounded border border-slate-800">
                              <span className="text-[8px] font-bold text-slate-500 block uppercase">Select Rejection Reason</span>
                              <div className="flex gap-2">
                                <select
                                  id={`reject-select-${ord.id}`}
                                  className="bg-slate-900 border border-slate-800 text-[10px] text-white p-1 rounded focus:outline-none"
                                >
                                  {rejectionReasons.map((r, i) => (
                                    <option key={i} value={r}>{r}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => {
                                    const reason = document.getElementById(`reject-select-${ord.id}`).value;
                                    handleRejectSample(ord.id, reason);
                                  }}
                                  className="bg-red-500 hover:bg-red-600 text-white text-[9px] py-1 px-2.5 rounded font-bold transition"
                                >
                                  Confirm Rejection
                                </button>
                                <button
                                  onClick={() => setShowRejectForm({ ...showRejectForm, [ord.id]: false })}
                                  className="text-slate-400 text-[9px] hover:text-white"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Recollect if rejected */}
                          {ord.status === 'rejected' && (
                            <button
                              disabled={loading}
                              onClick={() => handleRecollect(ord.id)}
                              className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold text-[10px] py-1.5 px-3 rounded shadow transition active:scale-[0.97] flex items-center gap-1"
                            >
                              <RefreshCw size={11} /> Recollect Sample
                            </button>
                          )}

                          {/* Process sample */}
                          {ord.status === 'accepted' && (
                            <button
                              disabled={loading}
                              onClick={() => handleStartProcess(ord.id)}
                              className="bg-purple-500 hover:bg-purple-600 text-white font-bold text-[10px] py-1.5 px-3 rounded shadow transition active:scale-[0.97]"
                            >
                              Process / Load Analyzer
                            </button>
                          )}
                          {/* Input Results form */}
                          {ord.status === 'in_process' && (() => {
                            const testObj = labTestMaster.find(t => t.name === ord.item_name);
                            const isStructured = testObj && testObj.parameters && testObj.parameters.length > 0;
                            
                            if (isStructured) {
                              return (
                                <div className="w-full flex flex-col gap-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {testObj.parameters.map((p, pIdx) => {
                                      const currentVal = (resultsInputs[ord.id] && typeof resultsInputs[ord.id] === 'object') 
                                        ? (resultsInputs[ord.id][p.name] || '') 
                                        : '';
                                      const rangeStatus = checkRangeStatus(p, currentVal);
                                      let statusColor = 'text-slate-200 border-slate-800 focus:border-teal-500';
                                      let badge = null;
                                      
                                      if (rangeStatus === 'low') {
                                        statusColor = 'text-red-400 border-red-500/50 focus:border-red-500';
                                        badge = <span className="text-[8px] bg-red-500/10 text-red-400 px-1 py-0.5 rounded font-bold uppercase border border-red-500/10">Low</span>;
                                      } else if (rangeStatus === 'high') {
                                        statusColor = 'text-red-400 border-red-500/50 focus:border-red-500';
                                        badge = <span className="text-[8px] bg-red-500/10 text-red-400 px-1 py-0.5 rounded font-bold uppercase border border-red-500/10">High</span>;
                                      } else if (rangeStatus === 'abnormal') {
                                        statusColor = 'text-yellow-400 border-yellow-500/50 focus:border-yellow-500';
                                        badge = <span className="text-[8px] bg-yellow-500/10 text-yellow-400 px-1 py-0.5 rounded font-bold uppercase border border-yellow-500/10">Abnormal</span>;
                                      }
                                      
                                      return (
                                        <div key={pIdx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 flex flex-col gap-1 w-full">
                                          <div className="flex justify-between items-center gap-2">
                                            <span className="text-[10px] text-slate-350 font-bold">{p.name}</span>
                                            <div className="flex items-center gap-1.5">
                                              {badge}
                                              <span className="text-[8px] text-slate-500">Ref: {p.range} {p.unit}</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <input
                                              type="text"
                                              value={currentVal}
                                              onChange={(e) => handleStructuredResultChange(ord.id, p.name, e.target.value)}
                                              placeholder={`Value...`}
                                              className={`bg-slate-900 border rounded text-[10px] py-1 px-2 w-full focus:outline-none ${statusColor}`}
                                              required
                                            />
                                            {p.unit && <span className="text-[9px] text-slate-500 shrink-0 font-medium">{p.unit}</span>}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="flex justify-end">
                                    <button
                                      disabled={loading}
                                      onClick={() => handleSaveResults(ord.id)}
                                      className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-[10px] py-1.5 px-4 rounded transition active:scale-[0.97]"
                                    >
                                      Submit Structured Results
                                    </button>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div className="flex items-center gap-2 w-full max-w-md">
                                  <input
                                    type="text"
                                    value={typeof resultsInputs[ord.id] === 'string' ? resultsInputs[ord.id] : ''}
                                    onChange={(e) => handleResultChange(ord.id, e.target.value)}
                                    placeholder="Enter diagnostic findings..."
                                    className="bg-slate-950 border border-slate-850 rounded text-[10px] py-1.5 px-2 text-white placeholder:text-slate-700 w-full focus:outline-none focus:border-teal-500"
                                    required
                                  />
                                  <button
                                    disabled={loading}
                                    onClick={() => handleSaveResults(ord.id)}
                                    className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-[10px] py-1.5 px-3 rounded shrink-0 transition"
                                  >
                                    Submit Results
                                  </button>
                                </div>
                              );
                            }
                          })()}

                          {/* Verify double-check (no senior role required) */}
                          {ord.status === 'completed' && (() => {
                            const isCritical = isCriticalResult(ord, meta);
                            
                            return (
                              <div className="flex flex-col gap-1.5 w-full bg-slate-950/65 p-3 rounded-lg border border-slate-900 mt-2">
                                {isCritical && (
                                  <span className="text-[10px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-2 py-1 rounded flex items-center gap-1">
                                    <ShieldAlert size={12} className="shrink-0 animate-bounce" /> Warning: Critical Value Detected! Please double-check and verify findings.
                                  </span>
                                )}
                                <div className="flex justify-between items-center gap-2 mt-1 w-full">
                                  <span className="text-[9px] text-slate-500 italic">
                                    {isCritical ? 'Verification: Required (Critical Value)' : 'Verification: Pending'}
                                  </span>
                                  <button
                                    disabled={loading}
                                    onClick={() => handleVerifyResults(ord.id)}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-[10px] py-1.5 px-3 rounded shadow transition active:scale-[0.97] flex items-center gap-1 shrink-0"
                                  >
                                    <UserCheck size={12} /> Verify Findings
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Release to Patient Record */}
                          {ord.status === 'verified' && (
                            <button
                              disabled={loading}
                              onClick={() => handleReleaseResults(ord.id)}
                              className="bg-green-500 hover:bg-green-600 text-white font-bold text-[10px] py-1.5 px-4 rounded shadow transition active:scale-[0.97] flex items-center gap-1"
                            >
                              <Send size={11} /> Release Results
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {pendingOrders.length === 0 && (
                  <div className="space-y-4">
                    <div className="text-xs text-yellow-500 bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-lg text-center font-semibold">
                      No active laboratory orders found for this outpatient visit.
                    </div>
                    
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3 shadow-md">
                      <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        <FlaskConical size={14} className="text-teal-400" /> Issue Direct/Walk-in Laboratory Test
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                        This patient checked in directly without going through a clinician consultation. Select a custom lab service from your facility's catalog to create a test order.
                      </p>
                      
                      <form onSubmit={handleAddWalkinTest} className="flex flex-col sm:flex-row gap-3 pt-1">
                        <div className="flex-1">
                          <select
                            value={selectedWalkinTest}
                            onChange={(e) => setSelectedWalkinTest(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition"
                            required
                          >
                            <option value="">-- Select Lab Service / Specialty --</option>
                            {facilityServices
                              .filter(s => s.category === 'Lab' || s.category === 'Laboratory' || s.category === 'Other')
                              .map((svc, i) => (
                                <option key={i} value={svc.name}>
                                  {svc.name} - KES {svc.charge}/-
                                </option>
                              ))
                            }
                          </select>
                        </div>
                        <button
                          type="submit"
                          disabled={addingWalkin || !selectedWalkinTest}
                          className="bg-teal-400 hover:bg-teal-500 disabled:opacity-40 text-slate-950 font-black text-xs py-2 px-6 rounded-lg shadow-lg active:scale-[0.98] transition cursor-pointer shrink-0"
                        >
                          {addingWalkin ? 'Adding...' : 'Add Test Order'}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
