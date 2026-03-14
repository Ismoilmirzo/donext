import SkeletonCard, { SkeletonBlock } from './SkeletonCard';

function HeaderSkeleton({ compact = false }) {
  return (
    <SkeletonCard>
      <div className={`flex flex-wrap items-center justify-between gap-4 ${compact ? '' : 'min-h-[5.5rem]'}`}>
        <div className="space-y-3">
          <SkeletonBlock className="h-7 w-44 rounded-full" />
          <SkeletonBlock className="h-4 w-60 rounded-full" />
        </div>
        <SkeletonBlock className="h-11 w-32 rounded-xl" />
      </div>
    </SkeletonCard>
  );
}

function StatSkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <SkeletonCard key={index}>
          <SkeletonBlock className="h-4 w-24 rounded-full" />
          <SkeletonBlock className="mt-4 h-7 w-20 rounded-full" />
          <SkeletonBlock className="mt-3 h-2 w-full rounded-full" />
        </SkeletonCard>
      ))}
    </div>
  );
}

export function HabitsPageSkeleton() {
  return (
    <div className="space-y-4">
      <HeaderSkeleton />
      <SkeletonCard>
        <SkeletonBlock className="h-2 w-full rounded-full" />
        <div className="mt-4 grid gap-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center justify-between rounded-xl border border-slate-700 px-4 py-3">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-7 w-7 rounded-lg" />
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-36 rounded-full" />
                  <SkeletonBlock className="h-3 w-20 rounded-full" />
                </div>
              </div>
              <SkeletonBlock className="h-9 w-9 rounded-lg" />
            </div>
          ))}
        </div>
      </SkeletonCard>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonCard key={index} className="min-h-[15rem]">
            <SkeletonBlock className="h-4 w-32 rounded-full" />
            <SkeletonBlock className="mt-5 h-40 w-full rounded-2xl" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

export function ProjectsPageSkeleton() {
  return (
    <div className="space-y-4">
      <HeaderSkeleton />
      {Array.from({ length: 3 }, (_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-3">
          <SkeletonBlock className="h-4 w-28 rounded-full" />
          {Array.from({ length: sectionIndex === 0 ? 3 : 2 }, (_, cardIndex) => (
            <SkeletonCard key={cardIndex}>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <SkeletonBlock className="h-5 w-40 rounded-full" />
                    <SkeletonBlock className="h-4 w-64 rounded-full" />
                  </div>
                  <SkeletonBlock className="h-8 w-20 rounded-full" />
                </div>
                <SkeletonBlock className="h-2 w-full rounded-full" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      ))}
    </div>
  );
}

export function FocusPageSkeleton() {
  return (
    <div className="space-y-4">
      <HeaderSkeleton compact />
      <SkeletonCard className="min-h-[16rem]">
        <SkeletonBlock className="h-5 w-44 rounded-full" />
        <SkeletonBlock className="mt-3 h-4 w-full rounded-full" />
        <SkeletonBlock className="mt-2 h-4 w-5/6 rounded-full" />
        <SkeletonBlock className="mt-8 h-14 w-full rounded-2xl" />
        <SkeletonBlock className="mt-4 h-10 w-36 rounded-xl" />
      </SkeletonCard>
      <SkeletonCard>
        <SkeletonBlock className="h-4 w-36 rounded-full" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonBlock key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

export function StatsPageSkeleton() {
  return (
    <div className="space-y-4">
      <HeaderSkeleton compact />
      <StatSkeletonGrid />
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <SkeletonCard className="min-h-[18rem]">
          <SkeletonBlock className="h-5 w-40 rounded-full" />
          <SkeletonBlock className="mt-5 h-48 w-full rounded-2xl" />
        </SkeletonCard>
        <SkeletonCard className="min-h-[18rem]">
          <SkeletonBlock className="h-5 w-36 rounded-full" />
          <SkeletonBlock className="mt-5 h-48 w-full rounded-2xl" />
        </SkeletonCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonCard key={index} className="min-h-[14rem]">
            <SkeletonBlock className="h-4 w-32 rounded-full" />
            <SkeletonBlock className="mt-5 h-36 w-full rounded-2xl" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-4">
      <HeaderSkeleton compact />
      {Array.from({ length: 5 }, (_, index) => (
        <SkeletonCard key={index}>
          <SkeletonBlock className="h-5 w-36 rounded-full" />
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-11 w-full rounded-xl" />
            <SkeletonBlock className="h-11 w-full rounded-xl" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <div className="space-y-4">
      <HeaderSkeleton compact />
      <SkeletonCard>
        <SkeletonBlock className="h-2 w-full rounded-full" />
        <div className="mt-5 grid gap-3">
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonBlock key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </SkeletonCard>
      <SkeletonCard className="min-h-[16rem]">
        <SkeletonBlock className="h-4 w-32 rounded-full" />
        <SkeletonBlock className="mt-5 h-40 w-full rounded-2xl" />
      </SkeletonCard>
    </div>
  );
}
