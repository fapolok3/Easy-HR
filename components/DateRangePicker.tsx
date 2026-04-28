import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Check,
  ChevronDown
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfToday, 
  subDays, 
  isSameDay, 
  isWithinInterval, 
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isBefore,
  Locale
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  lang?: 'en' | 'bn';
}

const presets = [
  { label: 'Today', getValue: () => ({ from: startOfToday(), to: startOfToday() }) },
  { label: 'Yesterday', getValue: () => ({ from: subDays(startOfToday(), 1), to: subDays(startOfToday(), 1) }) },
  { label: 'Last 7 Days', getValue: () => ({ from: subDays(startOfToday(), 6), to: startOfToday() }) },
  { label: 'Last 30 Days', getValue: () => ({ from: subDays(startOfToday(), 29), to: startOfToday() }) },
  { label: 'This Month', getValue: () => ({ from: startOfMonth(startOfToday()), to: endOfMonth(startOfToday()) }) },
  { label: 'Custom Range', getValue: () => ({ from: undefined, to: undefined }) },
];

export default function DateRangePicker({ startDate, endDate, onChange, lang = 'en' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<DateRange>({
    from: startDate ? new Date(startDate) : undefined,
    to: endDate ? new Date(endDate) : undefined
  });
  
  const [tempRange, setTempRange] = useState<DateRange>(range);
  const [currentMonth, setCurrentMonth] = useState(range.from || new Date());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [activePreset, setActivePreset] = useState<string>('Custom Range');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRange({
      from: startDate ? new Date(startDate) : undefined,
      to: endDate ? new Date(endDate) : undefined
    });
  }, [startDate, endDate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateClick = (date: Date) => {
    setActivePreset('Custom Range');
    if (!tempRange.from || (tempRange.from && tempRange.to)) {
      setTempRange({ from: date, to: undefined });
    } else if (tempRange.from && !tempRange.to) {
      if (isBefore(date, tempRange.from)) {
        setTempRange({ from: date, to: tempRange.from });
      } else {
        setTempRange({ from: tempRange.from, to: date });
      }
    }
  };

  const handlePresetClick = (preset: typeof presets[0]) => {
    setActivePreset(preset.label);
    const newRange = preset.getValue();
    setTempRange(newRange);
    if (newRange.from) {
      setCurrentMonth(newRange.from);
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const startDayOfWeek = startOfMonth(currentMonth).getDay();
  const leadingDays = Array.from({ length: startDayOfWeek }, (_, i) => null);

  const isInRange = (date: Date) => {
    if (!tempRange.from || !tempRange.to) return false;
    return isWithinInterval(date, { start: startOfDay(tempRange.from), end: endOfDay(tempRange.to) });
  };

  const isSelected = (date: Date) => {
    return (tempRange.from && isSameDay(date, tempRange.from)) || (tempRange.to && isSameDay(date, tempRange.to));
  };

  const isHovered = (date: Date) => {
    if (!tempRange.from || tempRange.to || !hoverDate) return false;
    const start = isBefore(hoverDate, tempRange.from) ? hoverDate : tempRange.from;
    const end = isBefore(hoverDate, tempRange.from) ? tempRange.from : hoverDate;
    return isWithinInterval(date, { start: startOfDay(start), end: endOfDay(end) });
  };

  const handleApply = () => {
    if (tempRange.from && tempRange.to) {
      onChange(format(tempRange.from, 'yyyy-MM-dd'), format(tempRange.to, 'yyyy-MM-dd'));
      setIsOpen(false);
    }
  };

  return (
    <div className="relative font-sans text-left" ref={containerRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setTempRange(range);
        }}
        className="flex items-center gap-3 px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm text-gray-700 hover:border-emerald-500/50 transition-all shadow-sm min-w-[240px]"
      >
        <CalendarIcon size={18} className="text-emerald-500" />
        <span className="flex-1 text-left font-semibold">
          {range.from ? (
            <>
              {format(range.from, 'MMM dd, yyyy')}
              {range.to && ` - ${format(range.to, 'MMM dd, yyyy')}`}
            </>
          ) : (
            'Select date range'
          )}
        </span>
        <ChevronDown size={14} className={cn("text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            style={{ zIndex: 9999 }}
            className="absolute top-full mt-1 left-0 lg:left-0 z-50 bg-white rounded-[16px] shadow-[0_15px_40px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden w-[280px] md:w-[320px] flex flex-col"
          >
            <div className="flex flex-col sm:flex-row h-full">
              {/* Presets Sidebar */}
              <div className="w-full sm:w-20 bg-[#F8FAFC] border-b sm:border-b-0 sm:border-r border-gray-100 p-2 shrink-0">
                <p className="text-[7px] font-extrabold text-gray-400 uppercase tracking-[0.2em] mb-1.5 px-1.5">Presets</p>
                <div className="flex sm:flex-col gap-0.5">
                  {presets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handlePresetClick(preset)}
                      className={cn(
                        "w-full text-left px-1.5 py-1 rounded-md text-[9px] transition-all whitespace-nowrap font-bold",
                        activePreset === preset.label 
                          ? "bg-emerald-50 text-emerald-600" 
                          : "text-gray-500 hover:bg-gray-100"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar Section */}
              <div className="flex-1 p-2">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h4 className="font-extrabold text-gray-900 text-[10px]">{format(currentMonth, 'MMMM yyyy')}</h4>
                  <div className="flex items-center gap-0.5">
                    <button 
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-emerald-500 transition-colors"
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <button 
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-emerald-500 transition-colors"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                    <div key={day} className="text-center text-[7px] font-bold text-gray-400 tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-0.5">
                  {leadingDays.map((_, i) => (
                    <div key={`lead-${i}`} />
                  ))}
                  {daysInMonth.map((date) => {
                    const selected = isSelected(date);
                    const inRange = isInRange(date);
                    const hovered = isHovered(date);
                    const isToday = isSameDay(date, new Date());

                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => handleDateClick(date)}
                        onMouseEnter={() => setHoverDate(date)}
                        onMouseLeave={() => setHoverDate(null)}
                        className={cn(
                          "relative h-6 w-full flex items-center justify-center text-[9px] font-semibold transition-all focus:outline-none",
                          selected 
                            ? "bg-emerald-500 text-white rounded-md z-10 shadow-sm" 
                            : "text-gray-600 hover:bg-gray-100 rounded-md",
                          (inRange || hovered) && !selected && "bg-emerald-50 text-emerald-600 rounded-none",
                          inRange && !selected && "first:rounded-l-md last:rounded-r-md",
                          isToday && !selected && "text-emerald-500 font-extrabold border-b border-emerald-500"
                        )}
                      >
                        {format(date, 'd')}
                      </button>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-[9px] font-extrabold uppercase tracking-widest text-rose-500 hover:opacity-75 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={!tempRange.from || !tempRange.to}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[9px] font-extrabold uppercase tracking-widest shadow-sm transition-all flex items-center gap-1 disabled:opacity-50 active:scale-95"
                  >
                    <Check size={10} />
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
