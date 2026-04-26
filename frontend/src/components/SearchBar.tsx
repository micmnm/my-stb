import { useState } from 'react';
import { useSearch } from '../hooks/useSearch';
import type { GeocodingResult } from '../types';

interface SearchBarProps {
  onSelect: (result: GeocodingResult) => void;
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const { results, loading, search, clear } = useSearch();

  const handleChange = (value: string) => {
    setQuery(value);
    search(value);
  };

  const handleSelect = (result: GeocodingResult) => {
    setQuery(result.displayName.split(',')[0]);
    clear();
    onSelect(result);
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Where to?"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
      />
      {loading && <span className="search-loading">...</span>}
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((r, i) => (
            <li key={i} onClick={() => handleSelect(r)}>
              {r.displayName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
