import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  Camera, 
  Activity, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sliders, 
  Tv, 
  RefreshCw, 
  UserCheck, 
  ChevronRight, 
  Image as ImageIcon,
  CheckCircle,
  Eye,
  SlidersHorizontal,
  Move
} from 'lucide-react';
import { radiologyTestMaster } from '../../medicalMaster';

export default function Radiology({ user, onComplete }) {
  const [radiologyVisits, setRadiologyVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [facilityServices, setFacilityServices] = useState([]);
  const [selectedWalkinScan, setSelectedWalkinScan] = useState('');
  const [addingWalkin, setAddingWalkin] = useState(false);
  
  // Workflow states
  const [modality, setModality] = useState('X-Ray');
  const [bodyPart, setBodyPart] = useState('Chest');
  const [urgency, setUrgency] = useState('routine');
  const [examReason, setExamReason] = useState('');
  const [findings, setFindings] = useState('');
  const [comparison, setComparison] = useState('');
  const [reviewerName, setReviewerName] = useState(user?.full_name || 'Dr. Radiologist');
  const [nextRoutingDept, setNextRoutingDept] = useState('consultation');
  
  // Imaging Simulator states
  const [presetType, setPresetType] = useState('Chest X-Ray');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStepText, setScanStepText] = useState('');
  const [scanImageCaptured, setScanImageCaptured] = useState(false);
  const [contrast, setContrast] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [capturedImageData, setCapturedImageData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchRadiologyQueue();
    fetchFacilityServices();
  }, []);

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

  const handleAddWalkinScan = async (e) => {
    e.preventDefault();
    if (!selectedWalkinScan || !selectedVisit) return;
    setAddingWalkin(true);
    setMessage({ type: '', text: '' });
    
    try {
      const service = facilityServices.find(s => s.name === selectedWalkinScan);
      const charge = service ? service.charge : 1500;
      
      const newOrder = {
        visit_id: selectedVisit.id,
        type: 'radiology',
        item_name: selectedWalkinScan,
        status: 'ordered',
        price: charge
      };
      
      const { error } = await supabase.from('orders').insert(newOrder);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        facility_id: user.facility_id,
        user_id: user.id,
        action: 'Walk-in Radiology Order Created',
        details: `Created direct walk-in radiology scan order for ${selectedWalkinScan} for patient ${selectedVisit?.patient?.name}.`
      });

      setMessage({ type: 'success', text: `Walk-in scan '${selectedWalkinScan}' added successfully!` });
      setSelectedWalkinScan('');
      await handleSelectVisit(selectedVisit);
    } catch (err) {
      console.error('Error adding walkin scan:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to add walk-in scan.' });
    } finally {
      setAddingWalkin(false);
    }
  };

  const fetchRadiologyQueue = async () => {
    try {
      // Fetch visits currently in the 'radiology' department queue
      const { data: vsts, error: vstsErr } = await supabase
        .from('visits')
        .select('*')
        .eq('department', 'radiology')
        .eq('status', 'waiting');

      if (vstsErr) throw vstsErr;
      
      const { data: pts } = await supabase.from('patients').select('*');
      
      const enrichedVisits = vsts ? vsts.map(v => {
        const p = pts?.find(pt => pt.id === v.patient_id);
        return { ...v, patient: p };
      }) : [];

      setRadiologyVisits(enrichedVisits);
      
      // Auto-select first visit if available
      if (enrichedVisits.length > 0) {
        handleSelectVisit(enrichedVisits[0]);
      } else {
        setSelectedVisit(null);
        setPendingOrders([]);
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Error fetching radiology queue:', err);
      setMessage({ type: 'error', text: 'Failed to load radiology queue.' });
    }
  };

  const handleSelectVisit = async (visit) => {
    setSelectedVisit(visit);
    setMessage({ type: '', text: '' });
    setSelectedOrder(null);
    setScanImageCaptured(false);
    setCapturedImageData(null);
    setFindings('');
    setComparison('');
    
    try {
      // Fetch radiology orders for this visit
      const { data: ords } = await supabase
        .from('orders')
        .select('*')
        .eq('visit_id', visit.id)
        .eq('type', 'radiology');
        
      const radOrders = ords || [];
      setPendingOrders(radOrders);
      
      if (radOrders.length > 0) {
        handleSelectOrder(radOrders[0]);
      }
    } catch (err) {
      console.error('Error loading radiology orders:', err);
    }
  };

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setExamReason(order.instructions || '');
    
    // Auto detect modality and preset
    const itemName = order.item_name.toLowerCase();
    if (itemName.includes('x-ray') || itemName.includes('xray')) {
      setModality('X-Ray');
      setPresetType('Chest X-Ray');
      setBodyPart('Chest');
    } else if (itemName.includes('ct') || itemName.includes('computed')) {
      setModality('CT Scan');
      setPresetType('Brain CT Scan');
      setBodyPart('Brain');
    } else if (itemName.includes('mri') || itemName.includes('magnetic')) {
      setModality('MRI');
      setPresetType('Knee MRI');
      setBodyPart('Knee');
    } else if (itemName.includes('ultrasound') || itemName.includes('sonar') || itemName.includes('usg')) {
      setModality('Ultrasound');
      setPresetType('Pelvic Ultrasound');
      setBodyPart('Pelvis');
    } else {
      setModality('X-Ray');
      setPresetType('Chest X-Ray');
      setBodyPart('General');
    }

    // Load existing results if already completed
    if (order.status === 'released' || order.status === 'completed') {
      try {
        const meta = JSON.parse(order.results);
        setFindings(meta.findings || '');
        setComparison(meta.comparison || '');
        setReviewerName(meta.reviewer || '');
        setUrgency(meta.urgency || 'routine');
        setModality(meta.modality || 'X-Ray');
        setBodyPart(meta.body_part || 'Chest');
        setCapturedImageData(meta.captured_image || null);
        setScanImageCaptured(true);
      } catch (e) {
        setFindings(order.results || '');
      }
    } else {
      setFindings('');
      setComparison('');
      setScanImageCaptured(false);
      setCapturedImageData(null);
    }
  };

  // Run the PACS Scanning animation and draw medical graphics onto canvas
  const triggerScanAcquisition = () => {
    setScanning(true);
    setScanProgress(0);
    setScanImageCaptured(false);
    
    const steps = [
      { p: 15, text: 'PACS link open... Initializing Modality' },
      { p: 35, text: 'Aligning scan gantry... Calibrating field' },
      { p: 60, text: 'Acquiring RAW slices... Capturing DICOM streams' },
      { p: 85, text: 'Reconstructing volumetric projection' },
      { p: 100, text: 'Acquisition Complete. Syncing PACS node.' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      setScanProgress(prev => {
        const next = prev + 5;
        
        // Match step description texts
        if (currentStep < steps.length && next >= steps[currentStep].p) {
          setScanStepText(steps[currentStep].text);
          currentStep++;
        }

        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setScanning(false);
            setScanImageCaptured(true);
            renderCanvasGraphics();
          }, 400);
          return 100;
        }
        return next;
      });
    }, 100);
  };

  // Draw schematic clinical blueprints on HTML5 Canvas
  const renderCanvasGraphics = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // 1. Dark Blue-black digital background
    ctx.fillStyle = '#060c18';
    ctx.fillRect(0, 0, w, h);

    // 2. Neon grid matrix
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.04)';
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // 3. Scan crosshair circles
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.45, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.2, 0, 2 * Math.PI);
    ctx.stroke();

    // Cross lines
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
    ctx.beginPath(); ctx.moveTo(w / 2, 10); ctx.lineTo(w / 2, h - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, h / 2); ctx.lineTo(w - 10, h / 2); ctx.stroke();

    // Draw Anatomy based on preset selected
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';

    if (presetType === 'Chest X-Ray') {
      ctx.strokeStyle = '#e2e8f0'; // Bone white
      // Draw Central Spine
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.fillRect(w / 2 - 6, 40, 12, h - 80);
      
      // Spine segments
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      for (let sy = 50; sy < h - 50; sy += 15) {
        ctx.beginPath(); ctx.moveTo(w / 2 - 6, sy); ctx.lineTo(w / 2 + 6, sy); ctx.stroke();
      }

      ctx.lineWidth = 3;
      ctx.strokeStyle = '#e2e8f0';
      // Clavicles (collar bones)
      ctx.beginPath();
      ctx.moveTo(w / 2 - 5, 65);
      ctx.quadraticCurveTo(w / 2 - 50, 50, w / 2 - 90, 75);
      ctx.moveTo(w / 2 + 5, 65);
      ctx.quadraticCurveTo(w / 2 + 50, 50, w / 2 + 90, 75);
      ctx.stroke();

      // Rib cage curves
      for (let i = 0; i < 7; i++) {
        const offset = 80 + i * 22;
        const widthMod = 40 + i * 8;
        // Left ribs
        ctx.beginPath();
        ctx.moveTo(w / 2 - 5, offset);
        ctx.quadraticCurveTo(w / 2 - widthMod, offset - 10, w / 2 - widthMod, offset + 15);
        ctx.stroke();
        // Right ribs
        ctx.beginPath();
        ctx.moveTo(w / 2 + 5, offset);
        ctx.quadraticCurveTo(w / 2 + widthMod, offset - 10, w / 2 + widthMod, offset + 15);
        ctx.stroke();
      }

      // Heart Shadow (faint grey-blue solid)
      ctx.fillStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.beginPath();
      ctx.moveTo(w / 2 - 5, 120);
      ctx.bezierCurveTo(w / 2 - 45, 140, w / 2 - 55, 190, w / 2 - 10, 205);
      ctx.bezierCurveTo(w / 2 + 15, 200, w / 2 + 25, 170, w / 2 + 5, 120);
      ctx.fill();

    } else if (presetType === 'Brain CT Scan') {
      // Skull Contour
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 90, 0, 2 * Math.PI);
      ctx.stroke();

      // Brain Lobe Soft Textures
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.25)';
      ctx.lineWidth = 1.5;
      
      // Draw wavy brain folding contours (left hemisphere)
      ctx.beginPath();
      ctx.arc(w / 2 - 30, h / 2 - 20, 25, 0.2, Math.PI * 1.5);
      ctx.arc(w / 2 - 40, h / 2 + 15, 20, 0, Math.PI * 1.8);
      ctx.arc(w / 2 - 20, h / 2 + 40, 28, 1, Math.PI * 1.6);
      ctx.stroke();

      // Draw wavy brain folding contours (right hemisphere)
      ctx.beginPath();
      ctx.arc(w / 2 + 30, h / 2 - 20, 25, Math.PI * 1.5, Math.PI * 0.8);
      ctx.arc(w / 2 + 40, h / 2 + 15, 20, Math.PI * 1.2, Math.PI * 0.8);
      ctx.arc(w / 2 + 20, h / 2 + 40, 28, Math.PI * 1.4, Math.PI * 0.2);
      ctx.stroke();

      // Ventricles (dark central butterfly)
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.moveTo(w / 2 - 3, h / 2 - 15);
      ctx.bezierCurveTo(w / 2 - 25, h / 2 - 30, w / 2 - 25, h / 2, w / 2 - 3, h / 2 + 10);
      ctx.bezierCurveTo(w / 2 - 12, h / 2 - 2, w / 2 - 8, h / 2 - 10, w / 2 - 3, h / 2 - 15);
      ctx.moveTo(w / 2 + 3, h / 2 - 15);
      ctx.bezierCurveTo(w / 2 + 25, h / 2 - 30, w / 2 + 25, h / 2, w / 2 + 3, h / 2 + 10);
      ctx.bezierCurveTo(w / 2 + 12, h / 2 - 2, w / 2 + 8, h / 2 - 10, w / 2 + 3, h / 2 - 15);
      ctx.fill();

    } else if (presetType === 'Knee MRI') {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      
      // Upper bone (Femur)
      ctx.beginPath();
      ctx.moveTo(w / 2 - 40, 20);
      ctx.lineTo(w / 2 - 35, 105);
      ctx.quadraticCurveTo(w / 2 - 30, 130, w / 2 - 15, 130);
      ctx.quadraticCurveTo(w / 2, 125, w / 2 + 15, 130);
      ctx.quadraticCurveTo(w / 2 + 30, 130, w / 2 + 35, 105);
      ctx.lineTo(w / 2 + 40, 20);
      ctx.stroke();

      // Lower bone (Tibia)
      ctx.beginPath();
      ctx.moveTo(w / 2 - 35, h - 20);
      ctx.lineTo(w / 2 - 30, 175);
      ctx.quadraticCurveTo(w / 2 - 25, 155, w / 2, 155);
      ctx.quadraticCurveTo(w / 2 + 25, 155, w / 2 + 30, 175);
      ctx.lineTo(w / 2 + 35, h - 20);
      ctx.stroke();

      // Joint space meniscus (grey shade cartilage)
      ctx.fillStyle = 'rgba(100, 116, 139, 0.4)';
      ctx.beginPath();
      ctx.arc(w / 2 - 25, 142, 8, 0, Math.PI, true);
      ctx.arc(w / 2 + 25, 142, 8, 0, Math.PI, true);
      ctx.fill();

      // Patella (knee cap shadow)
      ctx.strokeStyle = '#94a3b8';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.beginPath();
      ctx.moveTo(w / 2 + 48, 110);
      ctx.quadraticCurveTo(w / 2 + 65, 135, w / 2 + 48, 150);
      ctx.quadraticCurveTo(w / 2 + 38, 130, w / 2 + 48, 110);
      ctx.stroke();
      ctx.fill();

    } else if (presetType === 'Pelvic Ultrasound') {
      // Fan shaped sonar scanning boundaries
      ctx.strokeStyle = '#0891b2';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w / 2, 35);
      ctx.lineTo(w / 2 - 100, h - 45);
      ctx.arc(w / 2, 35, h - 80, Math.PI * 0.73, Math.PI * 0.27, true);
      ctx.closePath();
      ctx.stroke();

      // Fetal shape silhouette inside ultrasound
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      
      // Fetus head
      ctx.beginPath();
      ctx.arc(w / 2 - 20, h / 2 - 10, 15, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Fetus spine/body curve
      ctx.beginPath();
      ctx.moveTo(w / 2 - 8, h / 2 - 5);
      ctx.quadraticCurveTo(w / 2 + 20, h / 2 + 10, w / 2 + 10, h / 2 + 35);
      ctx.quadraticCurveTo(w / 2 - 10, h / 2 + 38, w / 2 - 5, h / 2 + 20);
      ctx.quadraticCurveTo(w / 2 + 10, h / 2 + 10, w / 2 - 8, h / 2 - 5);
      ctx.fill();
      ctx.stroke();

      // Sonar grainy scan interference lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(w / 2, 35, 100 + i * 25, Math.PI * 0.73, Math.PI * 0.27, true);
        ctx.stroke();
      }
    }

    // 4. Clinical data overlays
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#06b6d4';
    ctx.font = '8px monospace';
    
    // Left upper quadrant metadata
    ctx.fillText(`PATIENT ID: ${selectedVisit?.patient?.facility_id_code || 'EMC-8921'}`, 12, 20);
    ctx.fillText(`NAME: ${selectedVisit?.patient?.name?.toUpperCase() || 'UNKNOWN'}`, 12, 30);
    ctx.fillText(`DOB: ${selectedVisit?.patient?.dob || 'N/A'}`, 12, 40);

    // Right upper quadrant metadata
    ctx.textAlign = 'right';
    ctx.fillText(`MODALITY: ${modality.toUpperCase()}`, w - 12, 20);
    ctx.fillText(`BODY PART: ${bodyPart.toUpperCase()}`, w - 12, 30);
    ctx.fillText(`DATE: ${new Date().toLocaleDateString()}`, w - 12, 40);

    // Right bottom quadrant metadata
    ctx.fillText(`PACS REF: RIS-709${selectedVisit?.id?.substring(0, 3)}`, w - 12, h - 25);
    ctx.fillText(`REVIEWER: ${reviewerName.toUpperCase()}`, w - 12, h - 15);

    // Left bottom quadrant status
    ctx.textAlign = 'left';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`● STATUS: ACQUIRED`, 12, h - 25);
    ctx.fillStyle = '#06b6d4';
    ctx.fillText(`EAGLE TECH RIS/PACS V2.1`, 12, h - 15);

    // Lateral direction annotations
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('L', 20, h / 2);
    ctx.fillText('R', w - 30, h / 2);

    // Save image to state
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImageData(dataUrl);
  };

  // Force redrawing the canvas when brightness/contrast slider changes
  useEffect(() => {
    if (scanImageCaptured && !scanning) {
      // Small timeout to allow canvas node mounting
      setTimeout(() => {
        renderCanvasGraphics();
      }, 50);
    }
  }, [presetType, contrast, brightness]);

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!selectedVisit || !selectedOrder) return;
    if (!findings.trim()) {
      setMessage({ type: 'error', text: 'Please input the Radiologist findings.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const resultsMeta = {
        exam_reason: examReason,
        modality,
        body_part: bodyPart,
        findings,
        comparison,
        reviewer: reviewerName,
        urgency,
        captured_image: capturedImageData,
        captured_at: new Date().toISOString()
      };

      // 1. Update order status to 'released' and store report results
      const { error: orderErr } = await supabase
        .from('orders')
        .update({
          status: 'released',
          results: JSON.stringify(resultsMeta)
        })
        .eq('id', selectedOrder.id);

      if (orderErr) throw orderErr;

      // 2. Add log entry
      await supabase.from('audit_logs').insert({
        action: 'Radiology Report Released',
        details: `Released ${selectedOrder.item_name} findings for patient ${selectedVisit.patient?.name}. Result: ${findings.substring(0, 100)}...`
      });

      // 3. Update visit routing
      // If there are other radiology orders pending, we don't route yet. Check remaining orders.
      const remaining = pendingOrders.filter(o => o.id !== selectedOrder.id && o.status !== 'released' && o.status !== 'completed');
      
      if (remaining.length === 0) {
        // All radiology orders complete, route the patient
        const { error: visitErr } = await supabase
          .from('visits')
          .update({
            department: nextRoutingDept,
            status: nextRoutingDept === 'completed' ? 'completed' : 'waiting'
          })
          .eq('id', selectedVisit.id);

        if (visitErr) throw visitErr;
      }

      setMessage({ type: 'success', text: `Diagnostic report for ${selectedOrder.item_name} released and patient routed to ${nextRoutingDept.toUpperCase()}!` });
      
      // Refresh local data
      fetchRadiologyQueue();
    } catch (err) {
      console.error('Error submitting radiology report:', err);
      setMessage({ type: 'error', text: err.message || 'Error releasing report.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex justify-between items-center shadow">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Camera className="text-teal-400" size={20} /> Radiology Information Desk & RIS/PACS
          </h2>
          <p className="text-xs text-slate-500">Manage imaging diagnostic worklists, mock-acquire scan slices, and submit radiologist reports.</p>
        </div>
        <button 
          onClick={fetchRadiologyQueue}
          className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 hover:border-teal-500/50 hover:bg-teal-500/5 transition text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-300"
        >
          <RefreshCw size={12} /> Refresh Queue
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Active Patients Queue (Left Panel, 1/4 width) */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col h-[650px] overflow-hidden">
          <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider border-b border-slate-800 pb-2.5 mb-3 flex justify-between items-center">
            <span>RIS Worklist</span>
            <span className="bg-teal-500/10 text-teal-400 font-mono px-2 py-0.5 rounded text-[10px] font-bold">{radiologyVisits.length} waiting</span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {radiologyVisits.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-20">No patients currently queued in Radiology.</div>
            ) : (
              radiologyVisits.map(visit => {
                const isSelected = selectedVisit?.id === visit.id;
                return (
                  <button
                    key={visit.id}
                    onClick={() => handleSelectVisit(visit)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition duration-150 ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500 text-slate-200'
                        : 'bg-slate-950 border-slate-850/70 hover:border-slate-800 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-200 block truncate max-w-[120px]">{visit.patient?.name}</span>
                      <span className={`text-[8px] font-mono px-1 rounded font-bold uppercase ${
                        visit.priority === 'emergency' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'
                      }`}>{visit.priority}</span>
                    </div>
                    <span className="text-[10px] text-teal-500 font-mono block mt-1">{visit.patient?.facility_id_code}</span>
                    <span className="text-[9px] text-slate-505 mt-2 block">{new Date(visit.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Imaging Processing Workspace (Right Panel, 3/4 width) */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm min-h-[650px] flex flex-col justify-between">
          {!selectedVisit ? (
            <div className="flex-1 flex flex-col justify-center items-center py-24 text-slate-500 text-sm gap-2">
              <Tv size={48} className="text-slate-800 stroke-[1.5]" />
              Please select a patient from the RIS worklist queue.
            </div>
          ) : (
            <div className="space-y-6 flex-1 flex flex-col">
              {/* Patient header info */}
              <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-slate-100 text-base">{selectedVisit.patient?.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-505 mt-1 font-mono">
                    <span>Code: <span className="text-teal-400 font-bold">{selectedVisit.patient_id_code || selectedVisit.patient?.facility_id_code}</span></span>
                    <span>Sex: <span className="text-slate-300 capitalize">{selectedVisit.patient?.gender}</span></span>
                    <span>DOB: <span className="text-slate-300">{selectedVisit.patient?.dob}</span></span>
                  </div>
                </div>
                {/* Orders chips */}
                <div className="flex flex-wrap gap-1.5">
                  {pendingOrders.map(order => {
                    const isSel = selectedOrder?.id === order.id;
                    return (
                      <button
                        key={order.id}
                        onClick={() => handleSelectOrder(order)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide border transition ${
                          isSel
                            ? 'bg-teal-500 border-teal-500 text-slate-955 shadow'
                            : 'bg-slate-955 border-slate-855 text-slate-400 hover:border-slate-800'
                        }`}
                      >
                        {order.item_name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!selectedOrder && pendingOrders.length === 0 && (
                <div className="flex-1 flex flex-col gap-6 justify-center items-center py-10 w-full">
                  <div className="flex flex-col items-center gap-2 text-slate-500 text-sm">
                    <Tv size={36} className="text-slate-850 animate-pulse" />
                    <span>No active radiology scan orders associated with this visit.</span>
                  </div>
                  
                  <div className="bg-slate-950 border border-slate-855 p-5 rounded-xl space-y-3 w-full max-w-lg shadow-md text-left">
                    <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <Camera size={14} className="text-teal-400" /> Issue Direct/Walk-in Radiology Scan
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                      This patient checked in directly without going through a clinician consultation. Select a custom radiology service from your facility's catalog to create a scan order.
                    </p>
                    
                    <form onSubmit={handleAddWalkinScan} className="flex flex-col sm:flex-row gap-3 pt-1">
                      <div className="flex-1">
                        <select
                          value={selectedWalkinScan}
                          onChange={(e) => setSelectedWalkinScan(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition"
                          required
                        >
                          <option value="">-- Select Radiology Scan --</option>
                          {facilityServices
                            .filter(s => s.category === 'Radiology' || s.category === 'Other')
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
                        disabled={addingWalkin || !selectedWalkinScan}
                        className="bg-teal-400 hover:bg-teal-500 disabled:opacity-40 text-slate-950 font-black text-xs py-2 px-6 rounded-lg shadow-lg active:scale-[0.98] transition cursor-pointer shrink-0"
                      >
                        {addingWalkin ? 'Adding...' : 'Add Scan Order'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {selectedOrder && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                  {/* PACS Scanner Screen Simulator */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5"><Tv size={14} className="text-teal-400" /> Modality PACS Monitor</span>
                      <div className="flex gap-2">
                        <select
                          value={presetType}
                          onChange={(e) => setPresetType(e.target.value)}
                          className="bg-slate-950 border border-slate-850 rounded text-[11px] px-2 py-1 focus:outline-none focus:border-teal-500"
                        >
                          <option value="Chest X-Ray">Chest X-Ray Preset</option>
                          <option value="Brain CT Scan">Brain CT Scan Preset</option>
                          <option value="Knee MRI">Knee MRI Preset</option>
                          <option value="Pelvic Ultrasound">Pelvic Ultrasound Preset</option>
                        </select>
                      </div>
                    </div>

                    {/* Canvas/Scan screen view */}
                    <div className="relative border border-slate-850 rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden aspect-[4/3] w-full">
                      {scanning && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10 flex flex-col justify-center items-center p-6 text-center">
                          <Loader2 size={36} className="text-teal-400 animate-spin mb-3" />
                          <span className="text-xs font-mono font-bold text-teal-400 tracking-wider">ACQUIRING DICOM SLICE: {scanProgress}%</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-1 animate-pulse">{scanStepText}</span>
                        </div>
                      )}

                      {!scanImageCaptured && !scanning && (
                        <div className="text-center p-8 space-y-3">
                          <div className="h-12 w-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400 mx-auto shadow shadow-teal-500/5 animate-pulse">
                            <Camera size={20} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-300 block">RIS Scanner Connected</span>
                            <span className="text-[10px] text-slate-505 block mt-0.5">Press button below to execute imaging capture.</span>
                          </div>
                          <button
                            type="button"
                            onClick={triggerScanAcquisition}
                            className="bg-teal-500 text-slate-950 hover:bg-teal-400 transition text-[11px] font-bold px-4 py-2 rounded-lg tracking-wide uppercase"
                          >
                            Execute Scan Acquisition
                          </button>
                        </div>
                      )}

                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={300}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${
                          scanImageCaptured ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
                        }`}
                        style={{
                          filter: `brightness(${brightness}%) contrast(${contrast}%)`
                        }}
                      />
                    </div>

                    {/* Interactive Brightness & Contrast adjustment sliders */}
                    {scanImageCaptured && (
                      <div className="bg-slate-950/40 border border-slate-855 p-3 rounded-lg text-xs space-y-3">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono border-b border-slate-855 pb-1.5">
                          <span className="flex items-center gap-1"><SlidersHorizontal size={10} /> Image Adjustments</span>
                          <button 
                            type="button"
                            onClick={() => { setContrast(100); setBrightness(100); }} 
                            className="text-teal-500 hover:underline"
                          >
                            Reset Parameters
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Contrast</span>
                              <span className="text-slate-200">{contrast}%</span>
                            </div>
                            <input
                              type="range"
                              min="50"
                              max="200"
                              value={contrast}
                              onChange={(e) => setContrast(parseInt(e.target.value))}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Brightness</span>
                              <span className="text-slate-200">{brightness}%</span>
                            </div>
                            <input
                              type="range"
                              min="50"
                              max="200"
                              value={brightness}
                              onChange={(e) => setBrightness(parseInt(e.target.value))}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Radiology Order details & Report */}
                  <form onSubmit={handleSubmitReport} className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5"><FileText size={14} className="text-teal-400" /> Diagnostic Report Entry</span>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 text-xs">
                          <label className="text-slate-400">Modality</label>
                          <input 
                            type="text"
                            value={modality}
                            onChange={(e) => setModality(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500"
                            placeholder="e.g. X-Ray"
                          />
                        </div>
                        <div className="space-y-1 text-xs">
                          <label className="text-slate-400">Body Part</label>
                          <input 
                            type="text"
                            value={bodyPart}
                            onChange={(e) => setBodyPart(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500"
                            placeholder="e.g. Chest"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 text-xs">
                          <label className="text-slate-400">Urgency Level</label>
                          <select
                            value={urgency}
                            onChange={(e) => setUrgency(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500"
                          >
                            <option value="routine">Routine</option>
                            <option value="urgent">Urgent</option>
                            <option value="stat">STAT (Emergency)</option>
                          </select>
                        </div>
                        <div className="space-y-1 text-xs">
                          <label className="text-slate-400">Reviewing Radiologist</label>
                          <input 
                            type="text"
                            value={reviewerName}
                            onChange={(e) => setReviewerName(e.target.value)}
                            className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 text-xs">
                        <label className="text-slate-400">Reason for Examination (Instructions)</label>
                        <textarea
                          value={examReason}
                          onChange={(e) => setExamReason(e.target.value)}
                          className="w-full h-12 bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500 text-xs resize-none"
                          placeholder="Clinical indications for ordering scan..."
                        />
                      </div>

                      <div className="space-y-1 text-xs">
                        <label className="text-slate-400 font-bold">Findings / Radiologist Report</label>
                        <textarea
                          required
                          value={findings}
                          onChange={(e) => setFindings(e.target.value)}
                          className="w-full h-24 bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500 text-xs"
                          placeholder="Describe tissue thickness, abnormalities, fractures, consolidations, anomalies..."
                        />
                      </div>

                      <div className="space-y-1 text-xs">
                        <label className="text-slate-400">Comparison (with prior scans)</label>
                        <textarea
                          value={comparison}
                          onChange={(e) => setComparison(e.target.value)}
                          className="w-full h-12 bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500 text-xs"
                          placeholder="e.g. No significant changes compared to CXR dated 12/04..."
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-850">
                      {/* Department Routing */}
                      <div className="space-y-1 text-xs">
                        <label className="text-slate-400">Check-out Routing Destination (After completion)</label>
                        <select
                          value={nextRoutingDept}
                          onChange={(e) => setNextRoutingDept(e.target.value)}
                          className="w-full bg-slate-955 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-teal-500"
                        >
                          <option value="consultation">OPD Consultation Review (Default)</option>
                          <option value="surgery">Surgery / Pre-op Desk</option>
                          <option value="ward">Inpatient Ward (Admission)</option>
                          <option value="billing">Billing Cashier (Payment)</option>
                          <option value="completed">Discharge Patient (Complete Lifecycle)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !scanImageCaptured}
                        className="w-full flex items-center justify-center gap-2 bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider transition shadow-lg shadow-teal-500/10"
                      >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                        {!scanImageCaptured ? 'Awaiting Scan Image Capture' : 'Release Report & Route Patient'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {message.text && (
            <div className={`mt-4 p-3.5 rounded-lg flex items-start gap-2.5 text-xs ${
              message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {message.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              <span>{message.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
