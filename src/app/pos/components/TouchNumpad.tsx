'use client';

import React from 'react';
import { Delete, RotateCcw, Check } from 'lucide-react';

interface TouchNumpadProps {
  value: string;
  onChange: (val: string) => void;
  onEnter?: () => void;
  quickAmounts?: number[];
  exactAmount?: number;
  onQuickAmountAdd?: (amt: number) => void;
  className?: string;
}

export function TouchNumpad({
  value,
  onChange,
  onEnter,
  quickAmounts = [100, 500, 1000, 2000, 5000],
  exactAmount,
  onQuickAmountAdd,
  className = '',
}: TouchNumpadProps) {
  const handleDigit = (digit: string) => {
    if (digit === '.') {
      if (value.includes('.')) return;
      onChange(value ? `${value}.` : '0.');
    } else if (digit === '00') {
      if (!value || value === '0') return;
      onChange(`${value}00`);
    } else {
      if (value === '0') {
        onChange(digit);
      } else {
        onChange(`${value}${digit}`);
      }
    }
  };

  const handleBackspace = () => {
    if (!value || value.length <= 1) {
      onChange('');
    } else {
      onChange(value.slice(0, -1));
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const handleAddQuick = (amt: number) => {
    if (onQuickAmountAdd) {
      onQuickAmountAdd(amt);
    } else {
      const current = parseFloat(value) || 0;
      onChange((current + amt).toString());
    }
  };

  return (
    <div className={`flex flex-col space-y-2 select-none ${className}`}>
      {/* Quick Denomination Chips */}
      {(quickAmounts.length > 0 || exactAmount !== undefined) && (
        <div className="grid grid-cols-3 gap-1.5 mb-1">
          {exactAmount !== undefined && (
            <button
              type="button"
              onClick={() => onChange(exactAmount.toString())}
              className="py-2 px-2 bg-emerald-950 text-emerald-300 border border-emerald-800/80 rounded-lg text-xs font-bold hover:bg-emerald-900 transition flex items-center justify-center space-x-1"
            >
              <span>Exact ({exactAmount.toLocaleString()})</span>
            </button>
          )}
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => handleAddQuick(amt)}
              className="py-2 px-1 bg-slate-900 text-slate-200 border border-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-800 hover:text-white transition"
            >
              +{amt.toLocaleString()}
            </button>
          ))}
        </div>
      )}

      {/* 3x4 Number Pad Grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            className="h-12 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white font-bold text-lg rounded-xl border border-slate-800 transition shadow-sm flex items-center justify-center font-mono"
          >
            {digit}
          </button>
        ))}

        {/* Bottom row: Decimal point, 0, 00 */}
        <button
          type="button"
          onClick={() => handleDigit('.')}
          className="h-12 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white font-bold text-lg rounded-xl border border-slate-800 transition shadow-sm flex items-center justify-center font-mono"
        >
          .
        </button>

        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-12 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white font-bold text-lg rounded-xl border border-slate-800 transition shadow-sm flex items-center justify-center font-mono"
        >
          0
        </button>

        <button
          type="button"
          onClick={() => handleDigit('00')}
          className="h-12 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white font-bold text-lg rounded-xl border border-slate-800 transition shadow-sm flex items-center justify-center font-mono"
        >
          00
        </button>
      </div>

      {/* Control row: Clear, Backspace, Enter */}
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        <button
          type="button"
          onClick={handleClear}
          className="h-11 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-semibold text-xs rounded-xl border border-rose-900/60 transition flex items-center justify-center space-x-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>

        <button
          type="button"
          onClick={handleBackspace}
          className="h-11 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 transition flex items-center justify-center space-x-1"
        >
          <Delete className="w-4 h-4" />
          <span>Bksp</span>
        </button>

        {onEnter && (
          <button
            type="button"
            onClick={onEnter}
            className="h-11 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-xl border border-emerald-500 transition shadow-sm flex items-center justify-center space-x-1"
          >
            <Check className="w-4 h-4" />
            <span>Enter</span>
          </button>
        )}
      </div>
    </div>
  );
}
