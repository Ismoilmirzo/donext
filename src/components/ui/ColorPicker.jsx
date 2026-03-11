const COLORS = [
  '#6366F1',
  '#F59E0B',
  '#10B981',
  '#EF4444',
  '#EC4899',
  '#3B82F6',
  '#8B5CF6',
  '#14B8A6',
  '#F97316',
  '#84CC16',
];

export default function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((color) => {
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange?.(color)}
            className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-105 ${
              selected ? 'border-slate-100' : 'border-slate-700'
            }`}
            style={{ backgroundColor: color }}
            aria-label={`Pick ${color}`}
          />
        );
      })}
    </div>
  );
}
