import { ScreenShell } from '../../components/layout/ScreenShell';
import { useT } from '../../i18n/useT';

export default function PlanPage() {
  const t = useT();
  return (
    <ScreenShell>
      <div className="page-stub">
        <h1>{t('nav.plan')}</h1>
      </div>
    </ScreenShell>
  );
}
