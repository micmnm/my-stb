import { ScreenShell } from '../../components/layout/ScreenShell';
import { useT } from '../../i18n/useT';

export default function HomePage() {
  const t = useT();
  return (
    <ScreenShell>
      <div className="page-stub">
        <h1>{t('home.greeting')}</h1>
        <p>{t('home.empty_saved')}</p>
      </div>
    </ScreenShell>
  );
}
