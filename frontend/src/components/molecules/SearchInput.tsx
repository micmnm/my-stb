import { useId, type ReactNode } from 'react';
import { IconClose, IconSearch } from '../icons';
import { useT } from '../../i18n/useT';
import styles from './SearchInput.module.css';

export interface SearchInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  leadingIcon?: ReactNode;
  autoFocus?: boolean;
  onClear?: () => void;
  ariaLabel?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  leadingIcon,
  autoFocus,
  onClear,
  ariaLabel,
  className,
}: SearchInputProps) {
  const t = useT();
  const id = useId();
  const ph = placeholder ?? t('search.placeholder');
  const handleClear = () => {
    onChange('');
    onClear?.();
  };
  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <span className={styles.leading} aria-hidden="true">
        {leadingIcon ?? <IconSearch size={20} />}
      </span>
      <input
        id={id}
        type="search"
        className={styles.input}
        value={value}
        placeholder={ph}
        autoFocus={autoFocus}
        aria-label={ariaLabel ?? ph}
        onChange={e => onChange(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {value !== '' && (
        <button type="button" className={styles.clear} onClick={handleClear} aria-label="Clear">
          <IconClose size={18} />
        </button>
      )}
    </div>
  );
}
