import React, { useState, useEffect } from 'react';
import { X, Building2, Search, ExternalLink, Check, AlertCircle, MapPin } from 'lucide-react';
import { Campus, CampusComparisonResult } from '../types';
import { fetchCampuses, compareCampuses } from '../api';

interface CampusComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCampusForChat: (campusName: string) => void;
}

export const CampusComparisonModal: React.FC<CampusComparisonModalProps> = ({
  isOpen,
  onClose,
  onSelectCampusForChat
}) => {
  const [allCampuses, setAllCampuses] = useState<Campus[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [comparisonResult, setComparisonResult] = useState<CampusComparisonResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchCampuses().then(data => {
        setAllCampuses(data);
        if (data.length >= 2 && selectedIds.length === 0) {
          // Pre-select 2 Hyderabad / prominent campuses
          const hyd = data.filter(c => c.city.toLowerCase().includes('hyderabad') || c.city.toLowerCase().includes('bengaluru'));
          if (hyd.length >= 2) {
            setSelectedIds([hyd[0].id, hyd[1].id]);
          } else {
            setSelectedIds([data[0].id, data[1].id]);
          }
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedIds.length >= 2) {
      setLoading(true);
      compareCampuses(selectedIds)
        .then(res => setComparisonResult(res))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setComparisonResult(null);
    }
  }, [selectedIds]);

  if (!isOpen) return null;

  const states = ['all', ...Array.from(new Set(allCampuses.map(c => c.state).filter(Boolean)))];

  const filteredCampuses = allCampuses.filter(c => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(query) ||
                          c.city.toLowerCase().includes(query) ||
                          c.state.toLowerCase().includes(query);
    const matchesState = selectedState === 'all' || c.state === selectedState;
    return matchesSearch && matchesState;
  });

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      if (selectedIds.length >= 3) {
        alert('You can compare up to 3 campuses simultaneously.');
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">41+ Collaborating Campuses Directory & Comparator</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select 2 or 3 institutions to evaluate degree-awarding bodies, locations, hostel policies & facilities
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

        {/* Selection Bar & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by university, city (e.g. Hyderabad, Bangalore, Pune)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All States / Regions ({allCampuses.length})</option>
              {states.filter(s => s !== 'all').map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex items-center justify-end text-xs text-slate-500 dark:text-slate-400">
            Selected: <strong className="text-blue-600 dark:text-blue-400 ml-1 font-mono">{selectedIds.length} / 3</strong>
          </div>
        </div>

        {/* Campus Chips Selection Scrollable */}
        <div className="flex flex-wrap gap-2 mt-3 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80">
          {filteredCampuses.map(c => {
            const isSelected = selectedIds.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleSelect(c.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <span>{c.name} ({c.city})</span>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>

        {/* Comparison Matrix Table */}
        <div className="mt-6">
          {selectedIds.length < 2 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
              Please select at least 2 campuses from the list above to compare.
            </div>
          ) : comparisonResult ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 w-1/4">Comparison Criteria</th>
                    {comparisonResult.campuses.map(c => (
                      <th key={c.id} className="p-3 font-bold text-slate-900 dark:text-white text-sm border-l border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span>{c.name}</span>
                          <button
                            onClick={() => {
                              onSelectCampusForChat(c.name);
                              onClose();
                            }}
                            className="text-[10px] text-blue-600 dark:text-cyan-400 hover:underline font-normal"
                          >
                            Ask AI
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-300">Location</td>
                    {comparisonResult.campuses.map(c => (
                      <td key={c.id} className="p-3 text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-800">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.city}, {c.state}</span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-300">Degree Conferring Entity</td>
                    {comparisonResult.campuses.map(c => (
                      <td key={c.id} className="p-3 text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-800">
                        {c.degree_awarded}
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-slate-900/30">
                    <td className="p-3 font-semibold text-slate-300">Hostel Accommodation</td>
                    {comparisonResult.campuses.map(c => (
                      <td key={c.id} className="p-3 border-l border-slate-800">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.hostel_availability.toLowerCase().includes('yes')
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {c.hostel_availability}
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-slate-900/30">
                    <td className="p-3 font-semibold text-slate-300">Campus Transport</td>
                    {comparisonResult.campuses.map(c => (
                      <td key={c.id} className="p-3 text-slate-300 border-l border-slate-800">
                        {c.transportation}
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-slate-900/30">
                    <td className="p-3 font-semibold text-slate-300">Tech Specialisation</td>
                    {comparisonResult.campuses.map(c => (
                      <td key={c.id} className="p-3 text-slate-300 border-l border-slate-800">
                        {c.specialisations}
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-slate-900/30">
                    <td className="p-3 font-semibold text-slate-300">Key Infrastructure</td>
                    {comparisonResult.campuses.map(c => (
                      <td key={c.id} className="p-3 text-slate-300 border-l border-slate-800">
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
                          {c.facilities.slice(0, 3).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="p-3 font-semibold text-slate-300">Official Campus Source</td>
                    {comparisonResult.campuses.map(c => (
                      <td key={c.id} className="p-3 border-l border-slate-800">
                        <a
                          href={c.official_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 text-xs font-semibold"
                        >
                          <span>Official Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
