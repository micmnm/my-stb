import { Polyline, Tooltip } from 'react-leaflet';

interface LastMileLineProps {
  from: [number, number];
  to: [number, number];
  distance: number;
}

export function LastMileLine({ from, to, distance }: LastMileLineProps) {
  return (
    <Polyline
      positions={[from, to]}
      pathOptions={{ color: '#999', weight: 3, dashArray: '8, 8' }}
    >
      <Tooltip permanent direction="center">
        ~{distance}m
      </Tooltip>
    </Polyline>
  );
}
