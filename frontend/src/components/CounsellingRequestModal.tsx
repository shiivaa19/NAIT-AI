import React, { useState, useEffect } from 'react';
import { X, PhoneCall, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Campus } from '../types';
import { submitCounsellingLead, fetchCampuses } from '../api';

interface CounsellingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export const CounsellingRequestModal: React.FC<CounsellingRequestModalProps> = ({
  isOpen,
  onClose,
  sessionId
}) => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [studentName, setStudentName] = useState<string>('');
  const [parentName, setParentName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [state, setState] = useState<string>('Telangana');
  const [city, setCity] = useState<string>('');
  const [intakeYear, setIntakeYear] = useState<number>(2026);
  const [preferredCampus, setPreferredCampus] = useState<string>('');
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([
    'Degree recognition & university affiliation',
    'Complete 4-year transparent fee structure'
  ]);
  const [consentGiven, setConsentGiven] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successLeadId, setSuccessLeadId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchCampuses().then(data => {
        setCampuses(data);
        if (data.length > 0 && !preferredCampus) {
          setPreferredCampus(data[0].name);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const concernOptions = [
    'Degree recognition & university affiliation',
    'Complete 4-year transparent fee structure',
    'Hostel security & campus facilities',
    'Placement support vs job guarantees',
    'NAT preparation & test syllabus',
    'Scholarship eligibility and waiver rules'
  ];

  const toggleConcern = (c: string) => {
    if (selectedConcerns.includes(c)) {
      setSelectedConcerns(selectedConcerns.filter(x => x !== c));
    } else {
      setSelectedConcerns([...selectedConcerns, c]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!studentName || !phone || !email || !state) {
      setErrorMessage('Please fill in all mandatory fields.');
      return;
    }
    if (!consentGiven) {
      setErrorMessage('Explicit consent is required to submit contact details.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitCounsellingLead({
        session_id: sessionId,
        student_name: studentName,
        parent_name: parentName,
        phone,
        email,
        state,
        city,
        target_intake_year: intakeYear,
        preferred_campus: preferredCampus,
        main_concerns: selectedConcerns,
        consent_given: consentGiven,
        notes: 'Inquiry submitted via NIAT Admission Copilot'
      });
      setSuccessLeadId(res.lead_id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">1-on-1 Academic Counselling Request</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official discussion with certified NIAT education advisors
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successLeadId ? (
          <div className="py-10 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Counselling Session Requested!</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
              Your inquiry reference is <strong className="text-blue-600 dark:text-cyan-400 font-mono">#LEAD-{successLeadId}</strong>.
              An official NIAT academic advisor will reach out to you via call or WhatsApp within 24 business hours to address your selected concerns.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500"
            >
              Return to Conversation
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-5">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Parent / Guardian Name (Optional)
                </label>
                <input
                  type="text"
                  value={parentName}
                  onChange={e => setParentName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Phone (+91) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">State *</label>
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Telangana">Telangana</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Delhi NCR">Delhi NCR</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Intake</label>
                <select
                  value={intakeYear}
                  onChange={e => setIntakeYear(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={2026}>2026 Cohort</option>
                  <option value={2025}>2025 Cohort</option>
                  <option value={2027}>2027 Cohort</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Preferred Campus</label>
                <select
                  value={preferredCampus}
                  onChange={e => setPreferredCampus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Any / Still Deciding</option>
                  {campuses.map(c => (
                    <option key={c.id} value={c.name}>{c.name} ({c.city})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Concerns Checkboxes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Main Topics You Wish to Clarify in Counselling
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {concernOptions.map((c, i) => {
                  const isChecked = selectedConcerns.includes(c);
                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => toggleConcern(c)}
                      className={`flex items-center space-x-2 p-2 rounded-xl text-left text-[11px] transition-all border ${
                        isChecked
                          ? 'bg-blue-600/10 border-blue-500/40 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        isChecked ? 'bg-blue-600 border-blue-500' : 'border-slate-300 dark:border-slate-700'
                      }`}>
                        {isChecked && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                      </div>
                      <span className="truncate">{c}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Explicit Consent Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-start space-x-2.5">
              <input
                type="checkbox"
                id="consentCheck"
                checked={consentGiven}
                onChange={e => setConsentGiven(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900 cursor-pointer"
              />
              <label htmlFor="consentCheck" className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed cursor-pointer">
                <strong>Privacy & Communication Consent</strong>: I explicitly consent to NIAT contacting me via phone or WhatsApp for academic counselling and admission updates. My data will not be sold or shared with unauthorized third parties.
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {submitting ? 'Confirming Request...' : 'Confirm Counselling Session'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
