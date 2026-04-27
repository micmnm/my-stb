import styles from './SchematicStop.module.css';

export interface SchematicStopProps {
  name: string;
  sub?: string;
  you?: boolean;
  passed?: boolean;
  eta?: string;
  className?: string;
}

export function SchematicStop({ name, sub, you, passed, eta, className }: SchematicStopProps) {
  const dotClass = [
    styles.dot,
    passed && styles.dotPassed,
    you && styles.dotYou,
  ].filter(Boolean).join(' ');

  return (
    <div className={[styles.row, className].filter(Boolean).join(' ')}>
      <div className={styles.dotWrap}><span className={dotClass} /></div>
      <div className={styles.text}>
        <div className={[styles.name, you && styles.nameYou].filter(Boolean).join(' ')}>{name}</div>
        {sub && <div className={styles.sub}>{sub}</div>}
      </div>
      {eta && <div className={styles.eta}>{eta}</div>}
    </div>
  );
}
