import React from 'react';
import { AppointmentStatus } from '../types';

interface StatusBadgeProps {
  status: AppointmentStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStyle = () => {
    switch (status) {
      case 'confirmed':
        return 'bg-[#EBF7EE] text-[#1E7E34] border-[#D4EDDA]';
      case 'checked-in':
        return 'bg-[#EBF3FF] text-[#0A60C2] border-[#CCE0FF]';
      case 'completed':
        return 'bg-[#F2F2F7] text-[#6B6B6B] border-[#E5E5EA]';
      case 'cancelled':
        return 'bg-[#FDF2F2] text-[#D32F2F] border-[#FFCDD2]';
      case 'no-show':
        return 'bg-[#FFF8E1] text-[#B78103] border-[#FFE082]';
      case 'booked':
      default:
        return 'bg-[#F6F5F3] text-[#4A4A4A] border-[#E8E6E1]';
    }
  };

  const formatText = (text: string) => {
    if (text === 'checked-in') return 'Checked in';
    if (text === 'no-show') return 'No-show';
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${sizeCls} ${getStyle()} select-none`}
    >
      {formatText(status)}
    </span>
  );
};

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-[18px] border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${
        onClick ? 'cursor-pointer active:scale-[0.99] transition-transform duration-100' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const SectionHeader: React.FC<{
  title: string;
  actionText?: string;
  onAction?: () => void;
  count?: number;
}> = ({ title, actionText, onAction, count }) => {
  return (
    <div className="flex items-center justify-between px-1 mb-2.5 select-none">
      <div className="flex items-center gap-2">
        <h3 className="text-[14px] font-bold text-[#171717] tracking-tight">{title}</h3>
        {typeof count === 'number' && (
          <span className="text-[11px] font-semibold text-[#8E8E93] bg-[#EBEAE6] px-1.5 py-0.2 rounded-full">
            {count}
          </span>
        )}
      </div>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-[13px] font-semibold text-[#007AFF] hover:opacity-80 active:opacity-60 transition-opacity"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
