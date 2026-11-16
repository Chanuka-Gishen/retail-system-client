'use client';

import React from 'react';

// Code 128 (Subset B) Encoding Table
// Each string is 6 widths of bars and spaces summing to 11 modules
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (106 is STOP pattern)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

function encodeCode128B(text: string): string[] {
  const codes: number[] = [START_CODE_B];
  let checkSum = START_CODE_B;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      codes.push(code);
      checkSum += code * (i + 1);
    } else {
      // Fallback for non-ASCII
      codes.push(0);
    }
  }

  const checkCode = checkSum % 103;
  codes.push(checkCode);
  codes.push(STOP_CODE);

  return codes.map((c) => CODE128_PATTERNS[c] || CODE128_PATTERNS[0]);
}

interface BarcodeSvgProps {
  value: string;
  width?: number | string;
  height?: number;
  className?: string;
  showText?: boolean;
}

export function BarcodeSvg({
  value,
  width = '100%',
  height = 50,
  className = '',
  showText = true,
}: BarcodeSvgProps) {
  const safeValue = (value || '00000000').trim().toUpperCase();
  const patterns = encodeCode128B(safeValue);

  // Convert width strings into modules
  // Each pattern has alternating bar (1) and space (0)
  const modules: boolean[] = [];

  for (const pattern of patterns) {
    let isBar = true;
    for (let i = 0; i < pattern.length; i++) {
      const widthCount = parseInt(pattern[i], 10);
      for (let w = 0; w < widthCount; w++) {
        modules.push(isBar);
      }
      isBar = !isBar;
    }
  }

  const totalWidth = modules.length;
  const barHeight = showText ? height - 14 : height;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        style={{ width, height: `${height}px` }}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {modules.map((isBar, idx) =>
          isBar ? (
            <rect
              key={idx}
              x={idx}
              y={0}
              width={1}
              height={barHeight}
              fill="currentColor"
            />
          ) : null,
        )}
      </svg>
      {showText && (
        <span className="font-mono text-[10px] tracking-widest text-slate-700 dark:text-slate-300 font-bold mt-1 select-none">
          {safeValue}
        </span>
      )}
    </div>
  );
}
