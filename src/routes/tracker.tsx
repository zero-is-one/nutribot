import { createFileRoute } from "@tanstack/react-router";
import { FoodHeader } from "../components/FoodHeader";
import { FoodInput } from "../components/FoodInput";
import { FoodItemCard } from "../components/FoodItemCard";
import { useFoodLog } from "../context/FoodLogContext";

export const Route = createFileRoute("/tracker")({
  component: Tracker,
  meta: () => [
    {
      title: "Nutrition Tracker",
    },
  ],
});

function Tracker() {
  const { todayFoods, selectedDate } = useFoodLog();

  const isToday = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate.getTime() === today.getTime();
  })();

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900">
      {/* Header - fixed at top */}
      <FoodHeader />

      {/* Food List - scrollable middle section */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
        {todayFoods.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-center text-slate-500 dark:text-slate-400">
              {isToday
                ? "No foods logged yet. Add your first food below!"
                : "No foods logged for this day."}
            </p>
          </div>
        ) : (
          <div>
            {todayFoods.map((item) => (
              <FoodItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Input - sticky at bottom */}
      <FoodInput />
    </div>
  );
}
