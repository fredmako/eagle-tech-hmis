import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Calendar as CalIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus, 
  Search, 
  User, 
  Check, 
  X, 
  AlertCircle, 
  UserCheck,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';

const doctorsList = [
  { id: 'gp-1', name: 'Dr. Arthur Conan', specialty: 'General Practitioner', role: 'clinician' },
  { id: 'gp-2', name: 'Dr. Fredrick Makori', specialty: 'Chief Clinician', role: 'admin' },
  { id: 'gp-3', name: 'Dr. Elizabeth Mwangi', specialty: 'Pediatrician', role: 'clinician' }
];

export default function Appointments({ user, showNotification }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctorsList[0].id);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Patient search for booking modal
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  
  // Quick status update state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState(null);

  // Hardcoded mock appointments in case DB queries fail or are empty
  const [mockAppointments, setMockAppointments] = useState([
    {
      id: 'mock-1',
      patient_name: 'John Mwangi',
      patient_phone: '0712345678',
      doctor_id: 'gp-1',
      appointment_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      status: 'booked',
      notes: 'Routine hypertension checkup'
    },
    {
      id: 'mock-2',
      patient_name: 'Mary Atieno',
      patient_phone: '0787654321',
      doctor_id: 'gp-1',
      appointment_date: new Date().toISOString().split('T')[0],
      start_time: '11:00',
      status: 'checked_in',
      notes: 'High fever and dry cough'
    },
    {
      id: 'mock-3',
      patient_name: 'David Kiprop',
      patient_phone: '0722334455',
      doctor_id: 'gp-2',
      appointment_date: new Date().toISOString().split('T')[0],
      start_time: '14:00',
      status: 'completed',
      notes: 'Lab report review'
    }
  ]);

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, selectedDoctorId]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('appointment_date', selectedDate)
        .eq('doctor_id', selectedDoctorId);

      if (user?.facility_id) {
        query = query.eq('facility_id', user.facility_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        setAppointments(data);
      } else {
        // Fallback to local mock data filtered by date and doctor
        const filteredMock = mockAppointments.filter(
          app => app.appointment_date === selectedDate && app.doctor_id === selectedDoctorId
        );
        setAppointments(filteredMock);
      }
    } catch (err) {
      console.warn("Appointments DB query failed, using local mock fallback:", err.message);
      const filteredMock = mockAppointments.filter(
        app => app.appointment_date === selectedDate && app.doctor_id === selectedDoctorId
      );
      setAppointments(filteredMock);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPatient = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, phone, dob')
        .ilike('name', `%${q}%`);
      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      // Mock patient search fallback
      const mockPatients = [
        { id: 'pt-1', name: 'John Mwangi', phone: '0712345678', dob: '1988-05-12' },
        { id: 'pt-2', name: 'Mary Atieno', phone: '0787654321', dob: '1995-10-22' },
        { id: 'pt-3', name: 'David Kiprop', phone: '0722334455', dob: '1974-03-01' }
      ];
      setSearchResults(mockPatients.filter(p => p.name.toLowerCase().includes(q.toLowerCase())));
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      if (showNotification) showNotification('error', 'Booking Failed', 'Please select a registered patient.');
      return;
    }

    const newApp = {
      facility_id: user?.facility_id || null,
      patient_id: selectedPatient.id,
      patient_name: selectedPatient.name,
      patient_phone: selectedPatient.phone,
      doctor_id: selectedDoctorId,
      appointment_date: selectedDate,
      start_time: selectedTimeSlot,
      notes: bookingNotes,
      status: 'booked'
    };

    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([newApp])
        .select();
      if (error) throw error;

      if (showNotification) showNotification('success', 'Appointment Scheduled', `Booked ${selectedPatient.name} at ${selectedTimeSlot}`);
      fetchAppointments();
    } catch (err) {
      // Fallback: update local mock state
      const localId = `local-${Date.now()}`;
      const appWithId = { ...newApp, id: localId };
      const updatedMock = [...mockAppointments, appWithId];
      setMockAppointments(updatedMock);
      setAppointments(updatedMock.filter(app => app.appointment_date === selectedDate && app.doctor_id === selectedDoctorId));
      if (showNotification) showNotification('success', 'Appointment Scheduled (Simulated)', `Scheduled ${selectedPatient.name} at ${selectedTimeSlot}`);
    } finally {
      setShowBookingModal(false);
      setSelectedPatient(null);
      setSearchQuery('');
      setSearchResults([]);
      setBookingNotes('');
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!activeAppointment) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: status })
        .eq('id', activeAppointment.id);
      if (error) throw error;

      if (showNotification) showNotification('success', 'Status Updated', `Appointment marked as ${status}`);
      fetchAppointments();
    } catch (err) {
      // Fallback local update
      const updatedMock = mockAppointments.map(app => {
        if (app.id === activeAppointment.id) {
          return { ...app, status: status };
        }
        return app;
      });
      setMockAppointments(updatedMock);
      setAppointments(updatedMock.filter(app => app.appointment_date === selectedDate && app.doctor_id === selectedDoctorId));
      if (showNotification) showNotification('success', 'Status Updated (Simulated)', `Marked as ${status}`);
    } finally {
      setShowStatusModal(false);
      setActiveAppointment(null);
    }
  };

  // Navigating Dates
  const shiftDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'checked_in':
        return <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Checked In</span>;
      case 'completed':
        return <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Completed</span>;
      case 'cancelled':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Cancelled</span>;
      default:
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Scheduled</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl font-sans pb-8 animate-fadeIn">
      {/* Upper Header Control panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
            <CalIcon size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Appointments Scheduler</h2>
            <p className="text-[10.5px] text-slate-500 font-medium">Manage clinical slots availability and check-in workflows</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Doctor selector */}
          <div className="flex items-center bg-slate-900 border border-slate-850 rounded-lg px-2 py-1">
            <User size={13} className="text-teal-400 mr-2" />
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 border-none outline-none pr-6 cursor-pointer focus:ring-0"
            >
              {doctorsList.map(doc => (
                <option key={doc.id} value={doc.id} className="bg-slate-900 text-slate-200">
                  {doc.name} ({doc.specialty})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker Controls */}
          <div className="flex items-center bg-slate-900 border border-slate-850 rounded-lg overflow-hidden">
            <button 
              onClick={() => shiftDate(-1)}
              className="px-2.5 py-1.5 hover:bg-slate-850 text-slate-400 hover:text-slate-100 border-r border-slate-850 transition"
              title="Previous Day"
            >
              <ChevronLeft size={14} />
            </button>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-slate-200 py-1 px-2.5 outline-none border-none focus:ring-0 font-semibold cursor-pointer"
            />
            <button 
              onClick={() => shiftDate(1)}
              className="px-2.5 py-1.5 hover:bg-slate-850 text-slate-400 hover:text-slate-100 border-l border-slate-850 transition"
              title="Next Day"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Slots Grid Layout */}
      <div className="bg-slate-900/40 border border-slate-850 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500" />
            <span>Loading scheduled slots...</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-850/60">
            {timeSlots.map(time => {
              const slotAppointments = appointments.filter(app => app.start_time.startsWith(time));
              return (
                <div key={time} className="flex items-stretch hover:bg-slate-900/20 transition min-h-[70px]">
                  {/* Left Time label */}
                  <div className="w-20 shrink-0 px-4 py-4 bg-slate-900/30 border-r border-slate-850 flex items-center justify-center text-slate-400 font-mono text-xs font-bold">
                    <Clock size={12} className="mr-1 text-teal-500/60" /> {time}
                  </div>

                  {/* Right Content area */}
                  <div className="flex-1 p-3 flex flex-wrap gap-2.5 items-center">
                    {slotAppointments.length > 0 ? (
                      slotAppointments.map(app => (
                        <div 
                          key={app.id}
                          onClick={() => {
                            setActiveAppointment(app);
                            setShowStatusModal(true);
                          }}
                          className={`flex items-center justify-between gap-4 p-3 bg-slate-950 border rounded-xl cursor-pointer hover:scale-[1.01] hover:border-teal-500/20 transition-all w-full sm:max-w-md ${
                            app.status === 'checked_in' ? 'border-l-4 border-l-teal-500 border-slate-800' :
                            app.status === 'completed' ? 'border-l-4 border-l-green-500 border-slate-800' :
                            app.status === 'cancelled' ? 'border-l-4 border-l-rose-500 border-slate-800' :
                            'border-l-4 border-l-amber-500 border-slate-800'
                          }`}
                        >
                          <div className="truncate">
                            <span className="text-xs font-bold text-slate-100 block truncate">{app.patient_name}</span>
                            <span className="text-[10px] text-slate-550 block truncate font-medium mt-0.5">{app.patient_phone} • {app.notes || 'No description notes'}</span>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            {getStatusBadge(app.status)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedTimeSlot(time);
                          setShowBookingModal(true);
                        }}
                        className="border border-dashed border-slate-800 hover:border-teal-500/30 hover:bg-teal-500/[0.02] text-slate-500 hover:text-teal-400 py-1.5 px-3 rounded-lg text-[10.5px] font-bold tracking-wide flex items-center gap-1 transition cursor-pointer"
                      >
                        <Plus size={11} /> Book Available Slot
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button 
              onClick={() => {
                setShowBookingModal(false);
                setSelectedPatient(null);
                setSearchQuery('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X size={16} />
            </button>

            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Plus size={16} className="text-teal-400" /> Book Clinical Appointment
            </h3>

            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div>
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Selected Slot</label>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center gap-2 text-slate-300 font-mono text-xs">
                  <CalIcon size={12} className="text-teal-400" /> {selectedDate}
                  <Clock size={12} className="text-teal-400 ml-2" /> {selectedTimeSlot}
                </div>
              </div>

              <div>
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Search Registered Patient</label>
                <div className="flex bg-slate-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-teal-500 transition">
                  <span className="bg-slate-900 px-3 py-2 text-slate-550 border-r border-slate-800 flex items-center">
                    <Search size={12} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchPatient(e.target.value)}
                    placeholder="Search by name or number..."
                    className="flex-1 bg-transparent py-2 px-3 text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                {/* Autocomplete list */}
                {searchResults.length > 0 && (
                  <div className="mt-1 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                    {searchResults.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setSearchQuery(p.name);
                          setSearchResults([]);
                        }}
                        className="px-3 py-2 text-xs hover:bg-slate-850 cursor-pointer flex justify-between items-center text-slate-300"
                      >
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-[10px] text-slate-550">{p.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedPatient && (
                <div className="bg-teal-500/5 border border-teal-500/10 rounded-lg p-3 text-xs text-slate-350 flex items-start gap-2.5">
                  <UserCheck size={14} className="text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-200 block">{selectedPatient.name}</span>
                    <span className="text-[10px] text-slate-550 font-medium">Contact: {selectedPatient.phone}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Consultation Notes / Reason</label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="e.g. Chronic asthma review follow-up"
                  rows="3"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setSelectedPatient(null);
                    setSearchQuery('');
                  }}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-600 text-slate-955 font-black text-xs py-2 px-5 rounded-lg transition active:scale-[0.98]"
                >
                  Book Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Update / Action Modal */}
      {showStatusModal && activeAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button 
              onClick={() => {
                setShowStatusModal(false);
                setActiveAppointment(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X size={16} />
            </button>

            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <CalIcon size={15} className="text-teal-400" /> Manage Appointment
            </h3>
            <span className="text-[10px] text-slate-500 block mb-4 border-b border-slate-850 pb-2.5">
              Patient: <strong className="text-slate-300">{activeAppointment.patient_name}</strong> at {activeAppointment.start_time}
            </span>

            <div className="space-y-2">
              <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-2">Update Scheduling Status</label>
              
              <button
                onClick={() => handleUpdateStatus('booked')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-800 hover:border-amber-500/30 bg-slate-950/45 hover:bg-amber-500/[0.02] text-xs font-semibold text-slate-300 transition"
              >
                <span className="flex items-center gap-2"><Clock size={13} className="text-amber-500" /> Reset to Scheduled</span>
                {activeAppointment.status === 'booked' && <Check size={12} className="text-teal-400" />}
              </button>

              <button
                onClick={() => handleUpdateStatus('checked_in')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-800 hover:border-teal-500/30 bg-slate-950/45 hover:bg-teal-500/[0.02] text-xs font-semibold text-slate-300 transition"
              >
                <span className="flex items-center gap-2"><UserCheck size={13} className="text-teal-400" /> Check-in Patient (Send to Queue)</span>
                {activeAppointment.status === 'checked_in' && <Check size={12} className="text-teal-400" />}
              </button>

              <button
                onClick={() => handleUpdateStatus('completed')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-800 hover:border-green-500/30 bg-slate-950/45 hover:bg-green-500/[0.02] text-xs font-semibold text-slate-300 transition"
              >
                <span className="flex items-center gap-2"><CheckCircle size={13} className="text-green-500" /> Complete Consultation</span>
                {activeAppointment.status === 'completed' && <Check size={12} className="text-teal-400" />}
              </button>

              <button
                onClick={() => handleUpdateStatus('cancelled')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-800 hover:border-rose-500/30 bg-slate-950/45 hover:bg-rose-500/[0.02] text-xs font-semibold text-slate-300 transition"
              >
                <span className="flex items-center gap-2"><XCircle size={13} className="text-rose-500" /> Cancel Appointment</span>
                {activeAppointment.status === 'cancelled' && <Check size={12} className="text-teal-400" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
