import React, { useState, useRef } from 'react';
import { Edit3, Trash2, CheckCircle } from 'lucide-react';

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  onTap: () => void;
  onLongPress?: () => void;
  onMarkPaid?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  markPaidLabel?: string;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  onEdit,
  onDelete,
  onTap,
  onLongPress,
  onMarkPaid,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  markPaidLabel = 'Paid',
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);

  const ACTIONS_WIDTH = onMarkPaid ? 210 : 140; // width of action buttons combined

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startX.current = clientX;
    startY.current = clientY;
    isDragging.current = true;
    hasMoved.current = false;
    isHorizontalSwipe.current = null;
    isLongPressTriggered.current = false;

    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        if (!hasMoved.current && !isOpen && isHorizontalSwipe.current !== false) {
          isLongPressTriggered.current = true;
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate(50);
            } catch {
              // ignore vibrate errors
            }
          }
          onLongPress();
        }
      }, 500);
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const diffX = clientX - startX.current;
    const diffY = clientY - startY.current;

    // Any movement cancels long press timer immediately
    if (Math.abs(diffX) > 4 || Math.abs(diffY) > 4) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }

    // If already determined to be a vertical scroll, allow native page scrolling and abort swipe
    if (isHorizontalSwipe.current === false) return;
    if (!isDragging.current) return;

    // Directional lock:
    if (isHorizontalSwipe.current === null) {
      // If movement is predominantly vertical, lock out horizontal swiping completely
      if (Math.abs(diffY) > 4 && Math.abs(diffY) >= Math.abs(diffX)) {
        isHorizontalSwipe.current = false;
        isDragging.current = false;
        setOffsetX(0);
        return;
      }
      // If movement is predominantly horizontal and passes threshold, lock into swipe
      if (Math.abs(diffX) > 8 && Math.abs(diffX) > Math.abs(diffY)) {
        isHorizontalSwipe.current = true;
      } else {
        return;
      }
    }

    if (!isHorizontalSwipe.current) return;

    hasMoved.current = true;

    if (isOpen) {
      // Swiping right from open state
      const newOffset = Math.min(0, Math.max(-ACTIONS_WIDTH, -ACTIONS_WIDTH + diffX));
      setOffsetX(newOffset);
    } else {
      // Swiping left from closed state
      if (diffX < 0) {
        setOffsetX(Math.max(-ACTIONS_WIDTH - 20, diffX));
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isLongPressTriggered.current) {
      isLongPressTriggered.current = false;
      isDragging.current = false;
      isHorizontalSwipe.current = null;
      return;
    }

    if (!isDragging.current && isHorizontalSwipe.current === false) return;
    isDragging.current = false;
    isHorizontalSwipe.current = null;

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

    // Determine snap position with iOS-style spring snap
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
    <div className="relative overflow-hidden w-full bg-white select-none touch-pan-y">
      {/* Background action buttons revealed upon swipe */}
      <div className="absolute inset-y-0 right-0 flex items-stretch z-0">
        {onMarkPaid && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setOffsetX(0);
              onMarkPaid();
            }}
            className="w-[70px] bg-iosGreen text-white flex flex-col items-center justify-center text-xs font-medium active:opacity-80 transition-opacity"
            aria-label={markPaidLabel}
          >
            <CheckCircle className="w-5 h-5 mb-1" />
            <span>{markPaidLabel}</span>
          </button>
        )}
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

      {/* Foreground sliding row with spring physics */}
      <div
        className="relative z-10 bg-white transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] touch-pan-y"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
          isDragging.current = false;
        }}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={() => {
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
          isDragging.current = false;
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
          if (onLongPress) {
            onLongPress();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
};
