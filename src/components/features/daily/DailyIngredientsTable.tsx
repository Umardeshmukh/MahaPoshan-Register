import React from 'react';
import { ItemConsumption } from '../../../types';
import { isSpice } from '../../../lib/constants';

export interface DailyIngredientsTableProps {
  items: ItemConsumption[];
}

export const DailyIngredientsTable: React.FC<DailyIngredientsTableProps> = ({ items }) => {
  return (
    <div className="space-y-4 pt-2 animate-in fade-in">
      {/* Mobile Card List (Phones: sm:hidden) */}
      <div className="block sm:hidden space-y-2">
        {items.map((item) => {
          const isSpiceItem = isSpice(item.ingredientId);
          const unit = item.ingredientId === 'purak_aahar' ? 'नग' : item.ingredientId === 'oil' ? 'ml' : 'g';

          return (
            <div
              key={item.ingredientId}
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0">
                <span className="font-bold text-slate-900 block truncate">
                  {item.nameMr}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  प्रति वि.: {item.gramsPerStudent} {unit}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-bold text-amber-950 block font-mono text-sm">
                  {item.ingredientId === 'purak_aahar'
                    ? `${item.totalGrams} नग`
                    : isSpiceItem
                    ? `${item.totalGrams.toFixed(1)} g`
                    : `${item.totalKg.toFixed(3)} kg`}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  ({item.totalGrams.toLocaleString('en-IN')} {item.ingredientId === 'oil' ? 'ml' : 'g'})
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table (Tablets and Desktops: hidden sm:block) */}
      <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-2xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
            <tr>
              <th className="py-3 px-4">साहित्य नाव</th>
              <th className="py-3 px-4">प्रवर्ग</th>
              <th className="py-3 px-4 text-right">प्रति विद्यार्थी प्रमाण</th>
              <th className="py-3 px-4 text-right">एकूण प्रमाण</th>
              <th className="py-3 px-4 text-right font-bold text-amber-950 bg-amber-50/70">
                आवश्यक प्रमाण (kg / g / नग)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {items.map((item) => {
              const isSpiceItem = isSpice(item.ingredientId);
              const unit = item.ingredientId === 'purak_aahar' ? 'नग' : item.ingredientId === 'oil' ? 'ml' : 'g';

              return (
                <tr
                  key={item.ingredientId}
                  className="hover:bg-amber-50/30 transition-colors"
                >
                  <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                    {item.nameMr}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-500 text-[11px]">
                    {item.category}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {item.gramsPerStudent} {unit}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold">
                    {item.totalGrams.toLocaleString('en-IN')} {item.ingredientId === 'oil' ? 'ml' : 'g'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-amber-950 bg-amber-50/50">
                    {item.ingredientId === 'purak_aahar'
                      ? `${item.totalGrams} नग`
                      : isSpiceItem
                      ? `${item.totalGrams.toFixed(1)} g`
                      : `${item.totalKg.toFixed(3)} kg`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
