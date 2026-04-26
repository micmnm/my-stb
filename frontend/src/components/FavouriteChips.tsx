import type { Favourite } from '../types';

interface FavouriteChipsProps {
  favourites: Favourite[];
  onSelect: (fav: Favourite) => void;
}

export function FavouriteChips({ favourites, onSelect }: FavouriteChipsProps) {
  if (favourites.length === 0) return null;

  return (
    <div className="favourite-chips">
      {favourites.map((fav) => (
        <button key={fav.id} className="chip" onClick={() => onSelect(fav)}>
          {fav.name}
        </button>
      ))}
    </div>
  );
}
