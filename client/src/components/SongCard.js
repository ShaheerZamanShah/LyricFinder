import React from 'react';
import { Clock, Eye } from 'lucide-react';

const SongCard = ({ song, onClick }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div 
      className="bg-white/95 rounded-2xl p-6 mb-4 shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl" 
      onClick={() => onClick && onClick(song)}
    >
      <div className="text-xl font-bold text-gray-800 mb-1">{song.title}</div>
      {typeof song.spotify_streams === 'number' && (
        <div className="text-gray-500 text-sm mb-1">{Intl.NumberFormat().format(song.spotify_streams)} streams</div>
      )}
      <div className="text-gray-600 text-base mb-2">by {song.artist}</div>
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span className="flex items-center">
          <Eye size={16} className="mr-1" />
          {song.searchCount} searches
        </span>
        <span className="flex items-center">
          <Clock size={16} className="mr-1" />
          {formatDate(song.createdAt)}
        </span>
      </div>
      {song.source && (
        <div className="text-xs text-gray-400 mt-2">
          Source: {song.source}
        </div>
      )}
    </div>
  );
};

export default SongCard;
