import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { BADGE_CATEGORIES } from '../../data/badges';
import Card from '../ui/Card';
import BadgeCard from './BadgeCard';

export default function BadgeGrid({ badges = [], unlockedCount = 0, title = 'Achievements' }) {
  const [openSections, setOpenSections] = useState(() =>
    BADGE_CATEGORIES.reduce((acc, category) => ({ ...acc, [category.id]: true }), {})
  );

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {unlockedCount}/{badges.length} unlocked
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {BADGE_CATEGORIES.map((category) => {
          const categoryBadges = badges.filter((badge) => badge.category === category.id);
          const isOpen = openSections[category.id];
          return (
            <section key={category.id} className="rounded-2xl border border-slate-700/80 bg-slate-900/35">
              <button
                type="button"
                onClick={() =>
                  setOpenSections((prev) => ({
                    ...prev,
                    [category.id]: !prev[category.id],
                  }))
                }
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-100">{category.label}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {categoryBadges.filter((badge) => badge.unlocked).length}/{categoryBadges.length} unlocked
                  </p>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="grid gap-3 border-t border-slate-800 px-4 py-4 lg:grid-cols-2">
                  {categoryBadges.map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </Card>
  );
}
