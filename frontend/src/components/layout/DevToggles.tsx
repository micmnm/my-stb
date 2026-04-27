import { getLang, setLang } from '../../i18n';
import { useT } from '../../i18n/useT';
import { useTheme, type ThemeMode } from '../../hooks/useTheme';

const themes: ThemeMode[] = ['auto', 'light', 'dark'];

export function DevToggles() {
  useT();
  const { theme, setTheme } = useTheme();
  const lang = getLang();

  return (
    <div className="dev-toggles" aria-label="Developer toggles">
      <div className="dev-toggles__group" role="group" aria-label="Language">
        <button
          type="button"
          onClick={() => setLang('ro')}
          aria-pressed={lang === 'ro'}
          className={'dev-toggles__btn' + (lang === 'ro' ? ' is-active' : '')}
        >
          RO
        </button>
        <button
          type="button"
          onClick={() => setLang('en')}
          aria-pressed={lang === 'en'}
          className={'dev-toggles__btn' + (lang === 'en' ? ' is-active' : '')}
        >
          EN
        </button>
      </div>
      <div className="dev-toggles__group" role="group" aria-label="Theme">
        {themes.map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => setTheme(mode)}
            aria-pressed={theme === mode}
            className={'dev-toggles__btn' + (theme === mode ? ' is-active' : '')}
          >
            {mode === 'auto' ? 'A' : mode === 'light' ? 'L' : 'D'}
          </button>
        ))}
      </div>
    </div>
  );
}
