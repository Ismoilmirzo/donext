import { ArrowLeft, FolderKanban, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import LocaleSwitcher from '../components/ui/LocaleSwitcher';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

function PrivacySection({ title, paragraphs = [], bullets = [] }) {
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="text-sm leading-6 text-slate-300">
          {paragraph}
        </p>
      ))}
      {!!bullets.length && (
        <ul className="space-y-2 pl-5 text-sm leading-6 text-slate-300">
          {bullets.map((bullet) => (
            <li key={bullet} className="list-disc">
              {bullet}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function PrivacyPage() {
  const { user } = useAuth();
  const { t } = useLocale();

  const backPath = user ? '/settings' : '/';
  const backLabel = user ? t('privacy.backToSettings') : t('privacy.backToHome');
  const sections = t('privacy.sections');
  const highlights = t('privacy.highlights');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between gap-4 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-xl font-bold text-emerald-400">
            <FolderKanban className="h-5 w-5" />
            {t('common.appName')}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <LocaleSwitcher />
            <Link to={backPath} className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-slate-100">
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </div>
        </header>

        <Card className="space-y-4 border-emerald-500/20 bg-slate-800/80">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            {t('common.privacyPolicy')}
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-50 sm:text-4xl">{t('privacy.title')}</h1>
            <p className="text-sm text-slate-400">
              {t('privacy.effectiveDateLabel')}: {t('privacy.effectiveDate')}
            </p>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-slate-300">{t('privacy.intro')}</p>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-100">{t('privacy.highlightsTitle')}</h2>
          <ul className="space-y-2 pl-5 text-sm leading-6 text-slate-300">
            {highlights.map((item) => (
              <li key={item} className="list-disc">
                {item}
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          {sections.map((section) => (
            <PrivacySection
              key={section.title}
              title={section.title}
              paragraphs={section.paragraphs}
              bullets={section.bullets}
            />
          ))}
        </div>

        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-100">{t('privacy.contactTitle')}</h2>
          <p className="text-sm leading-6 text-slate-300">{t('privacy.contactBody')}</p>
          <a
            className="inline-flex text-sm font-medium text-emerald-400 hover:text-emerald-300"
            href="https://t.me/ismoilmirzouz"
            target="_blank"
            rel="noreferrer"
          >
            {t('privacy.contactLinkLabel')}
          </a>
        </Card>
      </div>
    </div>
  );
}
