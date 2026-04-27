import { ScreenShell } from '../../components/layout/ScreenShell';
import { useT } from '../../i18n/useT';

export default function SavedPage() {
  const t = useT();
  return (
    <ScreenShell>
      <div className="page-stub">
        <h1>{t('nav.saved')}</h1>
        <p>{t('saved.empty')}</p>
      </div>
    </ScreenShell>
  );
}
