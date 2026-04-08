import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useFoodLog } from "../context/FoodLogContext";

export function FoodHeader() {
  const { selectedDate, goToPreviousDay, goToNextDay } = useFoodLog();

  const dateStr = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = selectedDate.getTime() === today.getTime();
  const dateLabel = isToday ? `Today - ${dateStr}` : dateStr;

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button
            onClick={goToPreviousDay}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sea-ink dark:text-foam"
            title="Previous day"
            aria-label="View previous day"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-28 text-center text-lg font-semibold text-sea-ink dark:text-foam">
            {dateLabel}
          </div>
          <button
            onClick={goToNextDay}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sea-ink dark:text-foam"
            title="Next day"
            aria-label="View next day"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/settings"
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sea-ink dark:text-foam"
            title="Settings"
            aria-label="Open settings"
          >
            <Settings size={20} />
          </Link>
        </div>
      </div>
      <div className="h-px bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}
