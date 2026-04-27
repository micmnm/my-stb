import { useParams } from 'react-router-dom';
import { ScreenShell } from '../../components/layout/ScreenShell';

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ScreenShell>
      <div className="page-stub">
        <h1>Route {id}</h1>
      </div>
    </ScreenShell>
  );
}
