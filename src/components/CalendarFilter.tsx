import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Sparkles, ChevronDown } from 'lucide-react';

interface CalendarFilterProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
  className?: string;
  variant?: 'default' | 'large';
}

export default function CalendarFilter({ 
  startDate, 
  endDate, 
  onChange, 
  className = '',
  variant = 'default'
}: CalendarFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Month and Year to display in the custom calendar grid
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  // Temp selected dates while picker is open
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);

  // Sync with prop updates
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  // Handle outside click to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const MONTHS_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Presets helper
  const handlePreset = (preset: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start = '';
    let end = '';

    const formatISO = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (preset) {
      case 'hoje':
        start = formatISO(today);
        end = formatISO(today);
        break;
      case 'ontem': {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        start = formatISO(yesterday);
        end = formatISO(yesterday);
        break;
      }
      case '7dias': {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        start = formatISO(sevenDaysAgo);
        end = formatISO(today);
        break;
      }
      case '30dias': {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 29);
        start = formatISO(thirtyDaysAgo);
        end = formatISO(today);
        break;
      }
      case 'esteMes': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        start = formatISO(firstDay);
        end = formatISO(today);
        break;
      }
      case 'mesPassado': {
        const firstDayPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayPrev = new Date(today.getFullYear(), today.getMonth(), 0);
        start = formatISO(firstDayPrev);
        end = formatISO(lastDayPrev);
        break;
      }
      case '4meses': {
        const startOf4MonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        start = formatISO(startOf4MonthsAgo);
        end = formatISO(today);
        break;
      }
      case 'todos':
        start = '';
        end = '';
        break;
      default:
        break;
    }

    setTempStart(start);
    setTempEnd(end);
    onChange(start, end);
    setIsOpen(false);
  };

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Date parsing helper
  const parseDateString = (str: string) => {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length !== 3) return null;
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  };

  const isSelected = (dayString: string) => {
    return tempStart === dayString || tempEnd === dayString;
  };

  const isInRange = (dayString: string) => {
    if (!tempStart || !tempEnd) return false;
    const date = parseDateString(dayString);
    const start = parseDateString(tempStart);
    const end = parseDateString(tempEnd);
    if (!date || !start || !end) return false;
    return date > start && date < end;
  };

  // Day cell click handler
  const handleDayClick = (dayString: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dayString);
      setTempEnd('');
    } else {
      // We have tempStart but no tempEnd
      const start = parseDateString(tempStart);
      const clicked = parseDateString(dayString);
      if (start && clicked && clicked < start) {
        // Clicked date is before current start, so reset start to clicked
        setTempStart(dayString);
      } else {
        setTempEnd(dayString);
      }
    }
  };

  // Calendar render math
  const renderDays = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];

    // Prev month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = prevMonthTotalDays - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dayString = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      cells.push(
        <button
          key={`prev-${day}`}
          onClick={() => handleDayClick(dayString)}
          className={`h-6 text-[10px] rounded-md transition-all cursor-pointer font-semibold border-none text-slate-300 hover:bg-slate-100 ${
            isSelected(dayString) ? 'bg-[#032b5e]! text-white!' : isInRange(dayString) ? 'bg-amber-100 text-[#032b5e]' : 'bg-transparent'
          }`}
        >
          {day}
        </button>
      );
    }

    // Active month days
    for (let day = 1; day <= totalDays; day++) {
      const dayString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = now.getDate() === day && now.getMonth() === currentMonth && now.getFullYear() === currentYear;

      cells.push(
        <button
          key={`curr-${day}`}
          onClick={() => handleDayClick(dayString)}
          className={`h-6 text-[10px] rounded-md transition-all cursor-pointer font-bold border-none relative ${
            isSelected(dayString)
              ? 'bg-[#032b5e] text-white hover:bg-[#021f44]'
              : isInRange(dayString)
              ? 'bg-amber-100 text-[#032b5e] hover:bg-amber-200'
              : 'bg-transparent text-slate-700 hover:bg-slate-100'
          }`}
        >
          {day}
          {isToday && !isSelected(dayString) && (
            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1e56f0]" />
          )}
        </button>
      );
    }

    // Next month padding days to complete calendar lines (typically 42 blocks total)
    const totalRendered = cells.length;
    const remainingDays = 42 - totalRendered;
    for (let day = 1; day <= remainingDays; day++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dayString = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      cells.push(
        <button
          key={`next-${day}`}
          onClick={() => handleDayClick(dayString)}
          className={`h-6 text-[10px] rounded-md transition-all cursor-pointer font-semibold border-none text-slate-300 hover:bg-slate-100 ${
            isSelected(dayString) ? 'bg-[#032b5e]! text-white!' : isInRange(dayString) ? 'bg-amber-100 text-[#032b5e]' : 'bg-transparent'
          }`}
        >
          {day}
        </button>
      );
    }

    return cells;
  };

  const handleApply = () => {
    onChange(tempStart, tempEnd);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempStart('');
    setTempEnd('');
    onChange('', '');
    setIsOpen(false);
  };

  // Build elegant visual label
  const getButtonLabel = () => {
    if (!startDate && !endDate) return 'Todo o Período';

    const formatBr = (isoStr: string) => {
      const parts = isoStr.split('-');
      if (parts.length !== 3) return isoStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    if (startDate && !endDate) {
      return `De ${formatBr(startDate)}`;
    }
    if (!startDate && endDate) {
      return `Até ${formatBr(endDate)}`;
    }
    if (startDate === endDate) {
      return formatBr(startDate);
    }
    return `${formatBr(startDate)} - ${formatBr(endDate)}`;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {variant === 'large' ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between h-10 px-3.5 border border-slate-200 rounded-xl bg-white flex items-center text-xs font-bold hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer shadow-sm outline-none w-full"
          type="button"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-blue-600 font-extrabold">{getButtonLabel()}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 hover:border-blue-400 text-[#032b5e] hover:text-[#032b5e] font-sans font-bold rounded-lg text-[10px] h-[26px] cursor-pointer transition-all shadow-xs"
          type="button"
        >
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span className="truncate max-w-[130px]">{getButtonLabel()}</span>
        </button>
      )}

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-[380px] bg-white border border-gray-200/95 shadow-lg rounded-xl z-50 p-3 flex gap-3 text-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
          
          {/* Presets Column */}
          <div className="flex flex-col gap-1.5 w-[110px] border-r border-slate-100 pr-2">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Atalhos</span>
            <button
              onClick={() => handlePreset('hoje')}
              className="text-[9px] font-bold text-left px-2 py-1 rounded-md text-slate-600 hover:text-[#032b5e] hover:bg-slate-50 border-none bg-transparent cursor-pointer transition-all"
            >
              Hoje
            </button>
            <button
              onClick={() => handlePreset('ontem')}
              className="text-[9px] font-bold text-left px-2 py-1 rounded-md text-slate-600 hover:text-[#032b5e] hover:bg-slate-50 border-none bg-transparent cursor-pointer transition-all"
            >
              Ontem
            </button>
            <button
              onClick={() => handlePreset('7dias')}
              className="text-[9px] font-bold text-left px-2 py-1 rounded-md text-slate-600 hover:text-[#032b5e] hover:bg-slate-50 border-none bg-transparent cursor-pointer transition-all"
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => handlePreset('30dias')}
              className="text-[9px] font-bold text-left px-2 py-1 rounded-md text-slate-600 hover:text-[#032b5e] hover:bg-slate-50 border-none bg-transparent cursor-pointer transition-all"
            >
              Últimos 30 dias
            </button>
            <button
              onClick={() => handlePreset('esteMes')}
              className="text-[9px] font-bold text-left px-2 py-1 rounded-md text-slate-600 hover:text-[#032b5e] hover:bg-slate-50 border-none bg-transparent cursor-pointer transition-all"
            >
              Este Mês
            </button>
            <button
              onClick={() => handlePreset('mesPassado')}
              className="text-[9px] font-bold text-left px-2 py-1 rounded-md text-slate-600 hover:text-[#032b5e] hover:bg-slate-50 border-none bg-transparent cursor-pointer transition-all"
            >
              Mês Passado
            </button>
            <button
              onClick={() => handlePreset('4meses')}
              className="text-[9px] font-bold text-left px-2 py-1 rounded-md text-slate-600 hover:text-[#032b5e] hover:bg-slate-50 border-none bg-transparent cursor-pointer transition-all"
            >
              Últimos 4 meses
            </button>
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={() => handlePreset('todos')}
              className="text-[9px] font-black text-left px-2 py-1 rounded-md text-rose-500 hover:bg-rose-50 border-none bg-transparent cursor-pointer transition-all uppercase tracking-wider"
            >
              Limpar Filtro
            </button>
          </div>

          {/* Interactive Month Grid Column */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={prevMonth}
                className="p-1 hover:bg-slate-100 rounded-md border-none bg-transparent cursor-pointer text-slate-500 hover:text-slate-800 transition-colors"
                type="button"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-black uppercase text-[#032b5e] tracking-wider font-mono">
                {MONTHS_NAMES[currentMonth]} {currentYear}
              </span>
              <button
                onClick={nextMonth}
                className="p-1 hover:bg-slate-100 rounded-md border-none bg-transparent cursor-pointer text-slate-500 hover:text-slate-800 transition-colors"
                type="button"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 text-center gap-y-1 mb-1">
              {DAYS_OF_WEEK.map(day => (
                <span key={day} className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  {day}
                </span>
              ))}
            </div>

            {/* Calendar Numbers Grid */}
            <div className="grid grid-cols-7 text-center gap-x-0.5 gap-y-0.5 mb-3">
              {renderDays()}
            </div>

            {/* Actions Footer row */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-auto">
              <div className="flex flex-col">
                <span className="text-[7.5px] uppercase font-bold text-slate-400">Customizado</span>
                <span className="text-[8.5px] font-mono font-bold text-slate-600 truncate max-w-[110px]">
                  {tempStart ? tempStart.split('-').reverse().join('/') : '—'} 
                  {tempEnd ? ` a ${tempEnd.split('-').reverse().join('/')}` : ''}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleClear}
                  className="px-2 py-1 text-[8.5px] font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-md border-none cursor-pointer transition-colors uppercase tracking-wider"
                  type="button"
                >
                  Limpar
                </button>
                <button
                  onClick={handleApply}
                  className="px-2.5 py-1 text-[8.5px] font-bold text-white bg-[#032b5e] hover:bg-[#021f44] rounded-md border-none cursor-pointer transition-colors uppercase tracking-wider flex items-center gap-0.5"
                  type="button"
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                  Aplicar
                </button>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
