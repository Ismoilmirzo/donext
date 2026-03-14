import {
  FocusPageSkeleton,
  HabitsPageSkeleton,
  ProjectsPageSkeleton,
  SettingsPageSkeleton,
  StatsPageSkeleton,
} from './PageSkeletons';

const FALLBACKS = {
  habits: HabitsPageSkeleton,
  projects: ProjectsPageSkeleton,
  focus: FocusPageSkeleton,
  stats: StatsPageSkeleton,
  settings: SettingsPageSkeleton,
};

export default function RouteLoadingFallback({ variant = 'habits' }) {
  const Skeleton = FALLBACKS[variant] || HabitsPageSkeleton;

  return (
    <div className="space-y-4">
      <div className="dn-route-progress" aria-hidden="true" />
      <div className="dn-route-fade">
        <Skeleton />
      </div>
    </div>
  );
}
