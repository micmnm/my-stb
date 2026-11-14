import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenShell } from '../../components/layout/ScreenShell';
import { SectionHeader } from '../../components/patterns/SectionHeader';
import { RouteBadge } from '../../components/atoms/RouteBadge';
import { Toast } from '../../components/atoms/Toast';
import { Chevron, IconClose } from '../../components/icons';
import { useStopArrivalPeek } from '../../hooks/useStopArrivalPeek';
import { useT } from '../../i18n/useT';
import {
  getSaved,
  mergeItems,
  migrateLegacyFavouritesIfPresent,
  onSavedStorageError,
  replaceAll,
  sanitizeItems,
  type SavedItem,
  useSaved,
} from '../../stores/saved';
import { api } from '../../api/client';
import { modeFromRouteType, type Arrival } from '../../types';
import './saved.css';

function formatPeekEta(seconds: number): string {
  if (seconds <= 0) return '—';
  if (seconds < 60) return '<1';
  if (seconds < 3600) return String(Math.round(seconds / 60));
  const d = new Date(Date.now() + seconds * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function PeekArrivals({ arrivals }: { arrivals: Arrival[] }) {
  if (arrivals.length === 0) return null;
  return (
    <span className="home__peek">
      {arrivals.slice(0, 2).map(a => (
        <span key={a.vehicleId} className="home__peek-pair">
          <RouteBadge num={a.shortName} mode={modeFromRouteType(a.routeType, a.shortName)} size="sm" />
          <span className={['home__peek-eta', !a.isLive && 'home__peek-eta--not-live'].filter(Boolean).join(' ')}>
            {formatPeekEta(a.etaSeconds)}
          </span>
        </span>
      ))}
    </span>
  );
}

interface SavedRowProps {
  item: SavedItem;
  editing: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  peekArrivals?: Arrival[];
  unavailable?: boolean;
  onTap: () => void;
  onRename: (next: string) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
}

function SavedStopRow({
  item,
  editing,
  isDragging,
  isDropTarget,
  peekArrivals,
  unavailable,
  onTap,
  onRename,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
}: SavedRowProps) {
  const t = useT();
  // null = no pending edit; the input shows the stored name.
  const [draft, setDraft] = useState<string | null>(null);
  const draftName = draft ?? item.nickname ?? item.name ?? '';
  const setDraftName = setDraft;

  const commit = () => {
    const v = draftName.trim();
    if (v && v !== (item.nickname ?? item.name)) onRename(v);
    setDraft(null);
  };

  return (
    <div
      className={['saved-row', isDragging && 'is-dragging', isDropTarget && 'is-drop-target']
        .filter(Boolean).join(' ')}
      draggable={editing}
      onDragStart={onDragStart}
      onDragOver={e => { if (editing) { e.preventDefault(); onDragOver(); } }}
      onDragEnd={onDragEnd}
    >
      {editing && (
        <span
          className="saved-row__handle"
          aria-label={t('saved.reorder')}
          aria-hidden="true"
        >
          ≡
        </span>
      )}
      {editing ? (
        <input
          className="saved-row__rename"
          value={draftName}
          onChange={e => setDraftName(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur(); }
            if (e.key === 'Escape') setDraft(null);
          }}
          placeholder={t('saved.rename_placeholder')}
          aria-label={t('saved.nickname')}
        />
      ) : (
        <button type="button" className="saved-row__main" onClick={onTap}>
          <span className="saved-row__text">
            <span className="saved-row__nickname">{item.nickname ?? item.name ?? item.id}</span>
            {item.name && item.nickname && item.name !== item.nickname && (
              <span className="saved-row__sub">{item.name}</span>
            )}
          </span>
          {unavailable && (
            <span className="saved-row__badge">{t('saved.unavailable')}</span>
          )}
          {!unavailable && peekArrivals && <PeekArrivals arrivals={peekArrivals} />}
        </button>
      )}
      {editing && (
        <button
          type="button"
          className="saved-row__delete"
          onClick={onDelete}
          aria-label={t('saved.delete')}
        >
          <IconClose size={20} />
        </button>
      )}
    </div>
  );
}

function SavedRouteRow({
  item,
  editing,
  isDragging,
  isDropTarget,
  onTap,
  onRename,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
}: Omit<SavedRowProps, 'peekArrivals' | 'unavailable'>) {
  const t = useT();
  const [draft, setDraft] = useState<string | null>(null);
  const draftName = draft ?? item.nickname ?? item.shortName ?? '';
  const setDraftName = setDraft;

  const commit = () => {
    const v = draftName.trim();
    if (v && v !== (item.nickname ?? item.shortName)) onRename(v);
    setDraft(null);
  };

  return (
    <div
      className={['saved-row', isDragging && 'is-dragging', isDropTarget && 'is-drop-target']
        .filter(Boolean).join(' ')}
      draggable={editing}
      onDragStart={onDragStart}
      onDragOver={e => { if (editing) { e.preventDefault(); onDragOver(); } }}
      onDragEnd={onDragEnd}
    >
      {editing && (
        <span
          className="saved-row__handle"
          aria-label={t('saved.reorder')}
          aria-hidden="true"
        >
          ≡
        </span>
      )}
      {item.shortName && item.mode && (
        <RouteBadge num={item.shortName} mode={item.mode} size="md" />
      )}
      {editing ? (
        <input
          className="saved-row__rename"
          value={draftName}
          onChange={e => setDraftName(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur(); }
            if (e.key === 'Escape') setDraft(null);
          }}
          placeholder={t('saved.rename_placeholder')}
          aria-label={t('saved.nickname')}
        />
      ) : (
        <button type="button" className="saved-row__main" onClick={onTap}>
          <span className="saved-row__text">
            <span className="saved-row__nickname">{item.nickname ?? item.shortName ?? item.id}</span>
            {item.nickname && item.shortName && item.nickname !== item.shortName && (
              <span className="saved-row__sub">{item.shortName}</span>
            )}
          </span>
          <Chevron size={20} />
        </button>
      )}
      {editing && (
        <button
          type="button"
          className="saved-row__delete"
          onClick={onDelete}
          aria-label={t('saved.delete')}
        >
          <IconClose size={20} />
        </button>
      )}
    </div>
  );
}

const MAX_IMPORT_BYTES = 256 * 1024;

function exportSaved(): void {
  const now = new Date();
  const payload = { app: 'mystb', version: 1, exportedAt: now.toISOString(), items: getSaved() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mystb-saved-${now.toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Returns the valid items, or null if the file isn't a v1 mystb export. */
function parseImport(text: string): SavedItem[] | null {
  try {
    const p: unknown = JSON.parse(text);
    if (!p || typeof p !== 'object') return null;
    const o = p as { app?: unknown; version?: unknown; items?: unknown };
    if (o.app !== 'mystb' || o.version !== 1 || !Array.isArray(o.items)) return null;
    if (o.items.some(i => !i || typeof i !== 'object'
      || ((i as { kind?: unknown }).kind !== 'stop' && (i as { kind?: unknown }).kind !== 'route')
      || typeof (i as { id?: unknown }).id !== 'string')) return null;
    return sanitizeItems(o.items);
  } catch {
    return null;
  }
}

export default function SavedPage() {
  const t = useT();
  const navigate = useNavigate();
  const { stops, routes, remove, restore, update, reorder } = useSaved();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<SavedItem[] | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => onSavedStorageError(() => setNotice(t('saved.storage_full'))), [t]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setNotice(t('saved.import_too_large'));
      return;
    }
    const items = parseImport(await file.text());
    if (!items) {
      setNotice(t('saved.import_invalid'));
      return;
    }
    setPendingImport(items);
  };

  const applyImport = (mode: 'merge' | 'replace') => {
    if (!pendingImport) return;
    if (mode === 'merge') mergeItems(pendingImport); else replaceAll(pendingImport);
    setNotice(t('saved.import_done', { count: pendingImport.length }));
    setPendingImport(null);
  };
  const [pendingUndo, setPendingUndo] = useState<SavedItem | null>(null);
  const [drag, setDrag] = useState<{ kind: 'stop' | 'route'; from: number; over: number } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Migrate legacy favourites once.
  useEffect(() => {
    void migrateLegacyFavouritesIfPresent(async (lat, lng) => {
      const nearby = await api.getNearbyStops(lat, lng, { limit: 1, maxMeters: 50 }).catch(() => []);
      const closest = nearby[0];
      if (!closest) return null;
      return { id: closest.id, name: closest.name };
    });
  }, []);

  const stopIds = useMemo(() => stops.filter(s => !s.legacy).map(s => s.id), [stops]);
  const { data: peek } = useStopArrivalPeek(stopIds);

  const startUndoTimer = (item: SavedItem) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setPendingUndo(item);
    undoTimerRef.current = setTimeout(() => setPendingUndo(null), 5000);
  };

  const handleDelete = (kind: 'stop' | 'route', id: string) => {
    const removed = remove(kind, id);
    if (removed) startUndoTimer(removed);
  };

  const handleUndo = () => {
    if (pendingUndo) restore(pendingUndo);
    setPendingUndo(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const handleDragStart = (kind: 'stop' | 'route', idx: number) => {
    setDrag({ kind, from: idx, over: idx });
  };
  const handleDragOver = (kind: 'stop' | 'route', idx: number) => {
    if (!drag || drag.kind !== kind) return;
    if (drag.over !== idx) setDrag({ ...drag, over: idx });
  };
  const handleDragEnd = () => {
    if (drag && drag.from !== drag.over) {
      reorder(drag.kind, drag.from, drag.over);
    }
    setDrag(null);
  };

  const isEmpty = stops.length === 0 && routes.length === 0;

  return (
    <ScreenShell>
      <div className="saved-page">
        <header className="saved-page__header">
          <h1 className="saved-page__title">{t('nav.saved')}</h1>
          <div className="saved-page__actions">
            <button
              type="button"
              className="saved-page__action"
              onClick={() => navigate('/search?intent=save')}
              aria-label={t('saved.add')}
            >
              + {t('saved.add')}
            </button>
            {!isEmpty && (
              <button
                type="button"
                className={['saved-page__action', editing ? 'is-active' : ''].filter(Boolean).join(' ')}
                onClick={() => setEditing(v => !v)}
              >
                {editing ? t('saved.done') : t('saved.edit')}
              </button>
            )}
          </div>
        </header>

        {isEmpty && (
          <div className="saved-page__empty">
            <p>{t('saved.empty')}</p>
            <button
              type="button"
              className="saved-page__cta"
              onClick={() => navigate('/search?intent=save')}
            >
              {t('saved.add')}
            </button>
          </div>
        )}

        {stops.length > 0 && (
          <section>
            <SectionHeader title={t('saved.section_stops')} />
            <div className="saved-page__list">
              {stops.map((item, idx) => {
                const peekArrivals = item.legacy ? [] : peek[item.id]?.soonest ?? [];
                return (
                  <SavedStopRow
                    key={`${item.kind}:${item.id}`}
                    item={item}
                    editing={editing}
                    isDragging={!!drag && drag.kind === 'stop' && drag.from === idx}
                    isDropTarget={!!drag && drag.kind === 'stop' && drag.over === idx && drag.from !== idx}
                    peekArrivals={peekArrivals}
                    unavailable={!!item.legacy}
                    onTap={() => {
                      if (item.legacy) return;
                      navigate(`/stop/${encodeURIComponent(item.id)}`);
                    }}
                    onRename={next => update('stop', item.id, { nickname: next })}
                    onDelete={() => handleDelete('stop', item.id)}
                    onDragStart={() => handleDragStart('stop', idx)}
                    onDragOver={() => handleDragOver('stop', idx)}
                    onDragEnd={handleDragEnd}
                  />
                );
              })}
            </div>
          </section>
        )}

        {routes.length > 0 && (
          <section>
            <SectionHeader title={t('saved.section_routes')} />
            <div className="saved-page__list">
              {routes.map((item, idx) => (
                <SavedRouteRow
                  key={`${item.kind}:${item.id}`}
                  item={item}
                  editing={editing}
                  isDragging={!!drag && drag.kind === 'route' && drag.from === idx}
                  isDropTarget={!!drag && drag.kind === 'route' && drag.over === idx && drag.from !== idx}
                  onTap={() => navigate(`/route/${encodeURIComponent(item.id)}`)}
                  onRename={next => update('route', item.id, { nickname: next })}
                  onDelete={() => handleDelete('route', item.id)}
                  onDragStart={() => handleDragStart('route', idx)}
                  onDragOver={() => handleDragOver('route', idx)}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          </section>
        )}

        <section className="saved-page__portability">
          <div className="saved-page__actions">
            <button
              type="button"
              className="saved-page__action"
              onClick={exportSaved}
              disabled={isEmpty}
            >
              {t('saved.export')}
            </button>
            <button
              type="button"
              className="saved-page__action"
              onClick={() => fileRef.current?.click()}
            >
              {t('saved.import')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={e => {
                void handleFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          {pendingImport && (
            <div className="saved-page__import" role="group">
              <p>{t('saved.import_preview', { count: pendingImport.length })}</p>
              <div className="saved-page__actions">
                <button type="button" className="saved-page__action" onClick={() => applyImport('merge')}>
                  {t('saved.import_merge')}
                </button>
                <button type="button" className="saved-page__action" onClick={() => applyImport('replace')}>
                  {t('saved.import_replace')}
                </button>
                <button type="button" className="saved-page__action" onClick={() => setPendingImport(null)}>
                  {t('saved.import_cancel')}
                </button>
              </div>
            </div>
          )}
        </section>

        <p className="saved-page__privacy">{t('saved.privacy')}</p>

        {notice && <Toast message={notice} onDismiss={() => setNotice(null)} />}

        {pendingUndo && (
          <Toast
            message={t('saved.removed', { name: pendingUndo.nickname ?? pendingUndo.name ?? pendingUndo.shortName ?? '' })}
            actionLabel={t('saved.undo')}
            onAction={handleUndo}
            onDismiss={() => setPendingUndo(null)}
          />
        )}
      </div>
    </ScreenShell>
  );
}
