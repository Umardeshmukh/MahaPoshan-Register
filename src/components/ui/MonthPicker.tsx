import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { getMonthNames } from '../../lib/mdm-calculator';

export interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (monthKey: string) => void;
  className?: string;
  id?: string;
  showIcon?: boolean;
}

export const MonthPicker: React.FC<MonthPickerProps> = ({
  value,
  onChange,
  className = '',
  id = 'month-picker',
  showIcon = true,
}) => {
  const options = useMemo(() => {
    const list = [];
    const base = new Date();
    // 6 months in the past, current month, and 3 months into the future
    for (let i = -6; i <= 3; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const names = getMonthNames(key);
      list.push({
        key,
        label: `${names.mr} ${names.year} (${names.en})`,
      });
    }
    return list;
  }, []);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {showIcon && (
        <Calendar className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-slate-50 border border-slate-300 rounded-xl py-2 text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer ${
          showIcon ? 'pl-9 pr-8' : 'px-3'
        }`}
      >
        {options.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
