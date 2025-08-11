import React, { useEffect, useState } from 'react';
import { fetchArtistInfo } from '../api/artistInfo';
import ArtistBio from './ArtistBio';
import GenreTags from './GenreTags';
import SimilarArtists from './SimilarArtists';
import FeaturedArtistBios from './FeaturedArtistBios';
import { Loader, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ArtistSection({ artistName, genresOnly = false, coverColor = null, featuredArtists = [] }) {
  const [artistData, setArtistData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    if (artistName && artistName.trim()) {
      setLoading(true);
      setError(false);
      
      fetchArtistInfo(artistName.trim())
        .then(data => {
          if (data) {
            setArtistData(data);
            setError(false);
          } else {
            setError(true);
          }
        })
        .catch(error => {
          console.error('Error loading artist info:', error);
          setArtistData(null);
          setError(true);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [artistName]);

  if (loading) {
    if (genresOnly) {
      return (
        <div className="flex items-center justify-center gap-2">
          <Loader className="animate-spin w-4 h-4 text-indigo-500" />
          <span className={`text-xs transition-colors ${
            theme === 'light' ? 'text-gray-600' : 'text-gray-400'
          }`}>
            Loading genres...
          </span>
        </div>
      );
    }
    
    return (
      <section className="mt-10">
        <div className={`p-6 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 ${
          theme === 'light'
            ? 'bg-white/95 border-gray-200 shadow-gray-300/30'
            : theme === 'medium'
            ? 'bg-gray-700/95 border-gray-600 shadow-black/30'
            : 'bg-gray-800/95 border-gray-700 shadow-black/50'
        }`}>
          <div className="flex items-center justify-center gap-3">
            <Loader className="animate-spin w-5 h-5 text-indigo-500" />
            <span className={`transition-colors ${
              theme === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              Loading artist information...
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    if (genresOnly) {
      return null; // Don't show error for genres only
    }
    
    return (
      <section className="mt-10">
        <div className={`p-6 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 ${
          theme === 'light'
            ? 'bg-white/95 border-gray-200 shadow-gray-300/30'
            : theme === 'medium'
            ? 'bg-gray-700/95 border-gray-600 shadow-black/30'
            : 'bg-gray-800/95 border-gray-700 shadow-black/50'
        }`}>
          <div className="flex items-center justify-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <span className={`text-sm transition-colors ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-400'
            }`}>
              Artist information not available for "{artistName}"
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (!artistData) return null;

  // If genresOnly mode, return only the genres with compact styling
  if (genresOnly) {
    return <GenreTags tags={artistData.tags} compact={true} />;
  }

  // Full artist section
  return (
    <section className="mt-10 space-y-6">
      <ArtistBio name={artistData.name} bio={artistData.bio} image={artistData.image} coverColor={coverColor} />
      <FeaturedArtistBios names={featuredArtists} coverColor={coverColor} />
      <GenreTags tags={artistData.tags} />
      <SimilarArtists artists={artistData.similar} coverColor={coverColor} />
    </section>
  );
}
