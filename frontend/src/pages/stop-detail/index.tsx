import { useParams } from 'react-router-dom';
import { ScreenShell } from '../../components/layout/ScreenShell';

export default function StopDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ScreenShell>
      <div className="page-stub">
        <h1>Stop {id}</h1>
      </div>
    </ScreenShell>
  );
}
