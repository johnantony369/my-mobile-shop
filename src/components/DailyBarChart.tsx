import React, { useState } from 'react';
import { formatINR } from '../i18n';

interface DailyBarChartProps {
  year: number;
  month: number; // 1-12
  dailyTotals: { [day: number]: { in: number; out: number } };
}

export const DailyBarChart: React.FC<DailyBarChartProps> = ({
  year,
  month,
  dailyTotals,
}) => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Number of days in month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Find max daily In
  let maxAmount = 1000; // minimum scale
  for (let d = 1; d <= daysInMonth; d++) {
    const val = dailyTotals[d]?.in || 0;
    if (val > maxAmount) {
      maxAmount = val;
    }
  }

  // SVG dimensions
  const svgWidth = 340;
  const svgHeight = 150;
  const paddingBottom = 24;
  const paddingTop = 16;
  const chartHeight = svgHeight - paddingBottom - paddingTop;
  const colWidth = svgWidth / daysInMonth;
  const barWidth = Math.max(3, colWidth * 0.65);

  return (
    <div className="w-full bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
      {/* Selected Day Tooltip Header */}
      <div className="flex items-center justify-between mb-2 h-6">
        <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
          {selectedDay
            ? `${selectedDay}/${month}/${year}`
            : 'Tap bar for details'}
        </span>
        {selectedDay && (
          <span className="text-xs font-bold text-iosGreen">
            {formatINR(dailyTotals[selectedDay]?.in || 0)}
            {dailyTotals[selectedDay]?.out > 0 && (
              <span className="text-iosRed ml-2">
                -{formatINR(dailyTotals[selectedDay]?.out || 0)}
              </span>
            )}
          </span>
        )}
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          {/* Subtle grid lines */}
          <line
            x1="0"
            y1={paddingTop}
            x2={svgWidth}
            y2={paddingTop}
            stroke="#E5E5EA"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />
          <line
            x1="0"
            y1={paddingTop + chartHeight / 2}
            x2={svgWidth}
            y2={paddingTop + chartHeight / 2}
            stroke="#E5E5EA"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />
          <line
            x1="0"
            y1={paddingTop + chartHeight}
            x2={svgWidth}
            y2={paddingTop + chartHeight}
            stroke="#C6C6C8"
            strokeWidth="1"
          />

          {/* Max amount label */}
          <text
            x={svgWidth - 2}
            y={paddingTop - 4}
            textAnchor="end"
            fontSize="9"
            fill="#8E8E93"
            fontWeight="500"
          >
            {formatINR(maxAmount)}
          </text>

          {/* Daily Bars */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const data = dailyTotals[day] || { in: 0, out: 0 };
            const inAmt = data.in || 0;
            const barH = (inAmt / maxAmount) * chartHeight;
            const x = (day - 1) * colWidth + (colWidth - barWidth) / 2;
            const y = paddingTop + chartHeight - barH;
            const isSelected = selectedDay === day;

            return (
              <g
                key={day}
                className="cursor-pointer"
                onClick={() => setSelectedDay(day)}
              >
                {/* Background tap area */}
                <rect
                  x={(day - 1) * colWidth}
                  y={paddingTop}
                  width={colWidth}
                  height={chartHeight + paddingBottom}
                  fill="transparent"
                />

                {/* Bar */}
                {barH > 0 && (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    rx={barWidth / 2}
                    fill={isSelected ? '#007AFF' : '#34C759'}
                    className="transition-all duration-300 ease-out"
                  />
                )}

                {/* Day labels at key intervals */}
                {(day === 1 || day % 5 === 0 || day === daysInMonth) && (
                  <text
                    x={x + barWidth / 2}
                    y={svgHeight - 6}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight={isSelected ? '700' : '500'}
                    fill={isSelected ? '#007AFF' : '#8E8E93'}
                  >
                    {day}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
