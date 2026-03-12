import React from 'react';
import { useAuthStore } from '../../store/authStore';

interface TimeDisplayProps {
  date: string | Date;
  format?: 'full' | 'time' | 'date'; // e.g. "Oct 24, 14:30" vs "14:30" vs "Oct 24"
  className?: string;
  showUtcLabel?: boolean;
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({ 
  date, 
  format = 'full', 
  className = '',
  showUtcLabel = true
}) => {
  const { user } = useAuthStore();
  const timezoneOffset = user?.timezone; // e.g. "+04:00" or "-05:00"

  if (!date) return <span className={className}>-</span>;

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return <span className={className}>Invalid Date</span>;

    // 1. Get original UTC components
    const utcYear = d.getUTCFullYear();
    const utcMonth = d.getUTCMonth();
    const utcDate = d.getUTCDate();
    const utcHours = d.getUTCHours();
    const utcMinutes = d.getUTCMinutes();
    const utcSeconds = d.getUTCSeconds();

    // The base display is UTC
    let targetYear = utcYear;
    let targetMonth = utcMonth;
    let targetDate = utcDate;
    let targetHours = utcHours;
    let targetMinutes = utcMinutes;

    // 2. Apply offset if user has one
    if (timezoneOffset && timezoneOffset.length === 6) {
      const sign = timezoneOffset[0] === '-' ? -1 : 1;
      const offsetHours = parseInt(timezoneOffset.slice(1, 3), 10);
      const offsetMinutes = parseInt(timezoneOffset.slice(4, 6), 10);

      const totalOffsetMinutes = sign * ((offsetHours * 60) + offsetMinutes);
      
      // Calculate new time by creating a dummy date starting at UTC 0 and adding offset
      const localDate = new Date(Date.UTC(utcYear, utcMonth, utcDate, utcHours, utcMinutes + totalOffsetMinutes, utcSeconds));
      targetYear = localDate.getUTCFullYear();
      targetMonth = localDate.getUTCMonth();
      targetDate = localDate.getUTCDate();
      targetHours = localDate.getUTCHours();
      targetMinutes = localDate.getUTCMinutes();
    }

    // 3. Format strings
    const pad = (n: number) => n.toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const timeStr = `${pad(targetHours)}:${pad(targetMinutes)}`;
    const dateStr = `${months[targetMonth]} ${targetDate}, ${targetYear}`;
    const utcTimeStr = `${pad(utcHours)}:${pad(utcMinutes)} UTC`;

    let primaryDisplay = '';
    if (format === 'time') primaryDisplay = timeStr;
    else if (format === 'date') primaryDisplay = dateStr;
    else primaryDisplay = `${dateStr} ${timeStr}`;

    // 4. Render with tooltip/label if local time differs from UTC
    if (timezoneOffset && showUtcLabel) {
      return (
        <div className={`inline-flex flex-col sm:flex-row sm:items-baseline gap-1 ${className}`}>
          <span>{primaryDisplay}</span>
          <span className="text-[10px] text-gray-500 font-normal whitespace-nowrap" title={`Original UTC time: ${utcTimeStr}`}>
            ({utcTimeStr})
          </span>
        </div>
      );
    }

    // Default return for standard UTC preference or no timezone set
    return (
      <span className={className}>
        {primaryDisplay} {showUtcLabel && format !== 'date' ? <span className="text-[10px] text-gray-500 font-normal ml-1">UTC</span> : null}
      </span>
    );

  } catch (e) {
    return <span className={className}>Error</span>;
  }
};
