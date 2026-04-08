import { Trash2 } from "lucide-react";
import type { StoredFoodItem } from "../services/storage";
import { useFoodLog } from "../context/FoodLogContext";

interface FoodItemCardProps {
  item: StoredFoodItem;
}

export function FoodItemCard({ item }: FoodItemCardProps) {
  const { removeFood } = useFoodLog();

  const handleDelete = () => {
    if (confirm(`Delete "${item.name}"?`)) {
      removeFood(item.id);
    }
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 mb-3 transition-colors active:bg-slate-50 dark:active:bg-slate-800">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sea-ink dark:text-foam truncate">
            {item.name}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-semibold">{item.calories}</span> cal,{" "}
            <span className="font-semibold">{item.protein}g</span> protein,{" "}
            <span className="font-semibold">{item.carbs}g</span> carbs
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg transition-colors text-red-600 dark:text-red-400 active:bg-red-100 dark:active:bg-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
          title="Delete item"
          aria-label={`Delete ${item.name}`}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
