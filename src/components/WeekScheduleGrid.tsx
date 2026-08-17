import { useMemo } from 'react';

import type { TimetableSlot, Weekday } from '../api';
import { colorForSubject, computeHourBounds, ROW_HEIGHT, toHHMM, toMinutes, WEEKDAYS } from '../lib/schedule';
import { personName } from '../lib/text';

/**
 * Grille hebdomadaire en lecture seule : même géométrie que le planning
 * éditable de l'admin (`ClassSchedulePanel`), sans glisser-déposer ni action —
 * utilisée côté enseignant (mes cours) et parent (classe de mon enfant).
 */
export function WeekScheduleGrid({ slots }: { slots: TimetableSlot[] }) {
  const slotsByDay = useMemo(() => {
    const map = new Map<Weekday, TimetableSlot[]>(WEEKDAYS.map((d) => [d.id, []]));
    for (const slot of slots) map.get(slot.dayOfWeek)?.push(slot);
    return map;
  }, [slots]);

  const { gridStartMin, gridEndMin, hourMarks } = useMemo(() => computeHourBounds(slots), [slots]);
  const gridHeight = ((gridEndMin - gridStartMin) / 60) * ROW_HEIGHT;

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[760px]">
        <div className="w-14 shrink-0">
          <div className="h-10" />
          <div className="relative" style={{ height: gridHeight }}>
            {hourMarks.map((m) => (
              <div
                key={m}
                className="absolute right-2 -translate-y-1/2 text-[11px] font-medium text-gray-400"
                style={{ top: ((m - gridStartMin) / 60) * ROW_HEIGHT }}
              >
                {toHHMM(m)}
              </div>
            ))}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-7 overflow-hidden rounded-lg border border-gray-100">
          {WEEKDAYS.map((day) => (
            <div key={day.id} className="border-r border-gray-100 last:border-r-0">
              <div className="flex h-10 items-center justify-center border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
                {day.short}
              </div>
              <div
                className="relative"
                style={{
                  height: gridHeight,
                  backgroundImage: 'linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)',
                  backgroundSize: `100% ${ROW_HEIGHT}px`,
                }}
              >
                {(slotsByDay.get(day.id) ?? []).map((slot) => {
                  const top = ((toMinutes(slot.startTime) - gridStartMin) / 60) * ROW_HEIGHT;
                  const height = Math.max(((toMinutes(slot.endTime) - toMinutes(slot.startTime)) / 60) * ROW_HEIGHT, 26);
                  const color = colorForSubject(slot.subjectId);
                  return (
                    <div
                      key={slot.id}
                      className="absolute inset-x-1 overflow-hidden rounded-md border-l-4 px-2 py-1 shadow-sm"
                      style={{ top, height, backgroundColor: `${color}1a`, borderLeftColor: color }}
                    >
                      <div className="truncate text-[11px] font-bold text-gray-800">{slot.startTime}–{slot.endTime}</div>
                      <div className="truncate text-[11px] font-semibold" style={{ color }}>{slot.subjectName}</div>
                      {height >= 50 ? (
                        <div className="truncate text-[10px] text-gray-500">
                          {personName({ firstName: slot.teacherFirstName, lastName: slot.teacherLastName })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
