import React, { useState, useEffect } from 'react';
import { X, Calculator, IndianRupee, HelpCircle, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Campus, CostCalculatorResult } from '../types';
import { calculateCost, fetchCampuses } from '../api';

interface CostCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCounselling: () => void;
}

export const CostCalculatorModal: React.FC<CostCalculatorModalProps> = ({
  isOpen,
  onClose,
  onOpenCounselling
}) => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');
  const [tuition, setTuition] = useState<number>(175000);
  const [niatFee, setNiatFee] = useState<number>(75000);
  const [hostel, setHostel] = useState<number>(90000);
  const [mess, setMess] = useState<number>(35000);
  const [transport, setTransport] = useState<number>(15000);
  const [otherFees, setOtherFees] = useState<number>(10000);
  const [scholarship, setScholarship] = useState<number>(25000);

  const [result, setResult] = useState<CostCalculatorResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchCampuses().then(data => {
        setCampuses(data);
        if (data.length > 0 && !selectedCampusId) {
          setSelectedCampusId(data[0].id);
        }
      });
    }
  }, [isOpen]);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const selectedCampus = campuses.find(c => c.id === selectedCampusId);
      const res = await calculateCost({
        annual_university_tuition: tuition,
        annual_niat_program_fee: niatFee,
        annual_hostel_fee: hostel,
        annual_mess_fee: mess,
        annual_transport_fee: transport,
        annual_other_fees: otherFees,
        annual_scholarship_discount: scholarship,
        campus_name: selectedCampus ? selectedCampus.name : 'Selected Collaborating University',
        campus_id: selectedCampusId
      });
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleCalculate();
    }
  }, [tuition, niatFee, hostel, mess, transport, otherFees, scholarship, selectedCampusId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Dynamic 4-Year Cost Calculator</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deterministic calculation combining University degree tuition, NIAT program fees, and living costs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
          {/* Input Controls */}
          <div className="md:col-span-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Collaborating Campus
              </label>
              <select
                value={selectedCampusId}
                onChange={e => setSelectedCampusId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Annual University Degree Tuition (₹)
              </label>
              <input
                type="number"
                value={tuition}
                onChange={e => setTuition(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="e.g. 175000"
              />
              <span className="text-[10px] text-slate-500">Paid to university for B.Tech credits</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Annual NIAT Upskilling Program Fee (₹)
              </label>
              <input
                type="number"
                value={niatFee}
                onChange={e => setNiatFee(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="e.g. 75000"
              />
              <span className="text-[10px] text-slate-500">Practical AI labs, 50+ projects & IRC credential</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hostel / Living (₹/yr)
                </label>
                <input
                  type="number"
                  value={hostel}
                  onChange={e => setHostel(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mess / Meals (₹/yr)
                </label>
                <input
                  type="number"
                  value={mess}
                  onChange={e => setMess(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transport (₹/yr)
                </label>
                <input
                  type="number"
                  value={transport}
                  onChange={e => setTransport(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Exams/Lab (₹/yr)
                </label>
                <input
                  type="number"
                  value={otherFees}
                  onChange={e => setOtherFees(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                Annual Merit Scholarship / Fee Waiver (₹/yr)
              </label>
              <input
                type="number"
                value={scholarship}
                onChange={e => setScholarship(Number(e.target.value))}
                className="w-full bg-emerald-50/50 dark:bg-slate-900 border border-emerald-400/50 dark:border-emerald-500/40 rounded-xl px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Results Summary & Breakdown */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            {result ? (
              <div className="space-y-4">
                {/* Highlights Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Campus: <strong className="text-slate-900 dark:text-slate-200">{result.campus_name}</strong></span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[11px]">
                      Deterministic Arithmetic
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Annual Net Expense</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        ₹{result.annual_net_total.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-slate-500">Per Academic Year</p>
                    </div>

                    <div>
                      <p className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">Total 4-Year Net Outlay</p>
                      <p className="text-2xl font-black text-cyan-600 dark:text-cyan-300 tracking-tight">
                        ₹{result.four_year_net_total.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        ₹{result.total_four_year_scholarship_savings.toLocaleString('en-IN')} total scholarship savings
                      </p>
                    </div>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Item Category</th>
                        <th className="py-2.5 px-3">Annual (₹)</th>
                        <th className="py-2.5 px-3">4-Year Total (₹)</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40">
                      {result.items.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-300">{item.label}</td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">₹{item.annual_amount.toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-200">₹{item.four_year_amount.toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Important Advisory */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Official Policy Note</strong>: Total educational outlay is typically between ₹8 Lakhs - ₹18 Lakhs. Always verify university-specific hostel and semester payment schedules with the official admissions office before committing.
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export / Print</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenCounselling();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 transition-all shadow-md shadow-blue-500/20"
              >
                Request Official Fee Quotation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
