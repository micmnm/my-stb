import { useState } from 'react';
import type { Favourite } from '../types';

interface FavouritesManagerProps {
  favourites: Favourite[];
  onAdd: (name: string, lat: number, lng: number) => void;
  onUpdate: (id: string, name: string, lat: number, lng: number) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  pendingSave: { lat: number; lng: number; name: string } | null;
}

export function FavouritesManager({ favourites, onAdd, onUpdate, onRemove, onClose, pendingSave }: FavouritesManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saveName, setSaveName] = useState(pendingSave?.name ?? '');

  const handleSave = () => {
    if (!pendingSave || !saveName.trim()) return;
    onAdd(saveName.trim(), pendingSave.lat, pendingSave.lng);
    onClose();
  };

  const handleEdit = (fav: Favourite) => {
    setEditingId(fav.id);
    setEditName(fav.name);
  };

  const handleEditSave = (fav: Favourite) => {
    if (!editName.trim()) return;
    onUpdate(fav.id, editName.trim(), fav.lat, fav.lng);
    setEditingId(null);
  };

  return (
    <div className="favourites-manager">
      <div className="favourites-header">
        <h3>Favourites</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {pendingSave && (
        <div className="save-favourite">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Name this place"
          />
          <button onClick={handleSave}>Save</button>
        </div>
      )}

      <ul className="favourites-list">
        {favourites.map((fav) => (
          <li key={fav.id}>
            {editingId === fav.id ? (
              <div className="edit-row">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                <button onClick={() => handleEditSave(fav)}>OK</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            ) : (
              <div className="fav-row">
                <span className="fav-name">{fav.name}</span>
                <button onClick={() => handleEdit(fav)}>Edit</button>
                <button className="delete-btn" onClick={() => onRemove(fav.id)}>Delete</button>
              </div>
            )}
          </li>
        ))}
        {favourites.length === 0 && !pendingSave && (
          <li className="empty">No favourites yet. Search for a place and save it.</li>
        )}
      </ul>
    </div>
  );
}
