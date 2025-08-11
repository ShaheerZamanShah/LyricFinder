import React from 'react';

/**
 * ArtistList - shows all artists (primary + collaborators) in a horizontal list.
 * @param {Object} props
 * @param {Array<{name: string, id?: string}>} props.artists
 * @param {string} [props.primary] - Name of the primary artist (optional, for highlighting)
 */
const ArtistList = ({ artists, primary }) => {
  if (!Array.isArray(artists) || artists.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 items-center justify-start ml-2">
      {artists.map((artist, idx) => (
        <span
          key={artist.id || artist.name || idx}
          className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-all duration-200
            ${primary && artist.name && artist.name.toLowerCase() === primary.toLowerCase()
              ? 'bg-indigo-700 text-white border border-indigo-900'
              : 'bg-indigo-100 text-indigo-800 border border-indigo-200'}
          `}
        >
          {artist.name}
        </span>
      ))}
    </div>
  );
};

export default ArtistList;
