import { ScreenShell } from '../../components/layout/ScreenShell';
import { useT } from '../../i18n/useT';

export default function SearchPage() {
  const t = useT();
  return (
    <ScreenShell>
      <div className="page-stub">
        <h1>{t('nav.search')}</h1>
      </div>
    </ScreenShell>
  );
}
