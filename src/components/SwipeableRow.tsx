import React, { useState, useRef } from 'react';
import { Edit3, Trash2 } from 'lucide-react';

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  onTap: () => void;
  editLabel?: string;
  deleteLabel?: string;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  onEdit,
  onDelete,
  onTap,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const hasMoved = useRef(false);

  const ACTIONS_WIDTH = 140; // width of both buttons combined

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startX.current = clientX;
    currentX.current = clientX;
    isDragging.current = true;
    hasMoved.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const diff = clientX - startX.current;

    if (Math.abs(diff) > 6) {
      hasMoved.current = true;
    }

    if (isOpen) {
      // Swiping right from open state
      const newOffset = Math.min(0, Math.max(-ACTIONS_WIDTH, -ACTIONS_WIDTH + diff));
      setOffsetX(newOffset);
    } else {
      // Swiping left from closed state
      if (diff < 0) {
        setOffsetX(Math.max(-ACTIONS_WIDTH - 20, diff));
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (!hasMoved.current) {
      // It was a tap!
      if (isOpen) {
        setIsOpen(false);
        setOffsetX(0);
      } else {
        onTap();
      }
      return;
    }

    // Determine snap position
    if (isOpen) {
      if (offsetX > -ACTIONS_WIDTH + 40) {
        setIsOpen(false);
        setOffsetX(0);
      } else {
        setOffsetX(-ACTIONS_WIDTH);
      }
    } else {
      if (offsetX < -50) {
        setIsOpen(true);
        setOffsetX(-ACTIONS_WIDTH);
      } else {
        setOffsetX(0);
      }
    }
  };

  return (
    <div className="relative overflow-hidden w-full bg-white select-none">
      {/* Background action buttons revealed upon swipe */}
      <div className="absolute inset-y-0 right-0 flex items-stretch z-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
            setOffsetX(0);
            onEdit();
          }}
          className="w-[70px] bg-iosBlue text-white flex flex-col items-center justify-center text-xs font-medium active:opacity-80 transition-opacity"
          aria-label={editLabel}
        >
          <Edit3 className="w-5 h-5 mb-1" />
          <span>{editLabel}</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
            setOffsetX(0);
            onDelete();
          }}
          className="w-[70px] bg-iosRed text-white flex flex-col items-center justify-center text-xs font-medium active:opacity-80 transition-opacity"
          aria-label={deleteLabel}
        >
          <Trash2 className="w-5 h-5 mb-1" />
          <span>{deleteLabel}</span>
        </button>
      </div>

      {/* Foreground sliding row */}
      <div
        className="relative z-10 bg-white transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};
