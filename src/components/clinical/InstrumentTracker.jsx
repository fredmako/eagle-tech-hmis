import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Compass, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';

export default function InstrumentTracker({ 
  category = null, 
  selectedId, 
  onSelect, 
  measurementType = null
}) {
  const { authFetch } = useAuth();
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInst, setSelectedInst] = useState(null);

  useEffect(() => {
    fetchInstruments();
  }, [category]);

  useEffect(() => {
    if (selectedId && instruments.length > 0) {
      const match = instruments.find(i => i.id === selectedId);
      setSelectedInst(match || null);
    } else {
      setSelectedInst(null);
    }
  }, [selectedId, instruments]);

  const fetchInstruments = async () => {
    setLoading(true);
    try {
      let url = '/workflows/instruments';
      if (category) {
        url += `?category=${category}`;
      }
      const res = await authFetch(url);
      if (res.ok) {
        const resData = await res.json();
        if (resData.success) {
          setInstruments(resData.data || []);
        }
      }
    } catch (err) {
      console.error("Failed to load medical instruments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (e) => {
    const instId = e.target.value;
    const match = instruments.find(i => i.id === instId);
    onSelect(instId, match || null);
  };

  const isCalibrationValid = (nextCalDate) => {
    if (!nextCalDate) return false;
    return new Date(nextCalDate) > new Date();
  };

  return (
    <div className="bg-slate-950/40 border border-slate-850/60 rounded-xl p-3.5 space-y-3.5">
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Compass size={12} className="text-teal-400 animate-pulse" /> Bind Medical Instrument
        </label>
        
        <select
          value={selectedId || ''}
          onChange={handleSelect}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition"
          disabled={loading}
        >
          <option value="">-- No Instrument Bound --</option>
          {instruments.map((inst) => {
            const valid = isCalibrationValid(inst.next_calibration_date);
            return (
              <option key={inst.id} value={inst.id}>
                {inst.name} ({inst.model}) {!valid ? '⚠️ EXPIRED CALIBRATION' : ''}
              </option>
            );
          })}
        </select>
      </div>

      {selectedInst && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] bg-slate-950/70 border border-slate-900 rounded-lg p-2.5">
          <div>
            <span className="text-slate-500 block">Manufacturer / Model:</span>
            <span className="font-semibold text-slate-350">{selectedInst.manufacturer || 'N/A'} - {selectedInst.model || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Serial Number:</span>
            <span className="font-semibold font-mono text-slate-350">{selectedInst.serial_number || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Location Ward/Clinic:</span>
            <span className="font-semibold text-slate-350">{selectedInst.location_ward || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs">Calibration Status:</span>
            {isCalibrationValid(selectedInst.next_calibration_date) ? (
              <span className="text-green-400 font-bold flex items-center gap-1 mt-0.5">
                <CheckCircle size={10} /> Calibrated (Expires: {selectedInst.next_calibration_date})
              </span>
            ) : (
              <span className="text-red-400 font-bold flex items-center gap-1 mt-0.5">
                <ShieldAlert size={10} className="animate-bounce" /> EXPIRED (Calibration Required!)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable utility to log instrument usage on the client
export const logInstrumentUsageHelper = async (authFetch, {
  instrumentId,
  workflowType,
  patientId,
  encounterId,
  measurementType,
  resultValue = null,
  resultUnit = null
}) => {
  if (!instrumentId) return null;
  try {
    const res = await authFetch('/workflows/instruments/log-usage', {
      method: 'POST',
      body: JSON.stringify({
        instrument_id: instrumentId,
        workflow_type: workflowType,
        patient_id: patientId,
        encounter_id: encounterId,
        measurement_type: measurementType,
        result_value: resultValue ? parseFloat(resultValue) : null,
        result_unit: resultUnit
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Failed to log instrument usage details:", err);
  }
  return null;
};
