import React, { useState, useEffect, useRef } from 'react';
import SearchForm from '../components/SearchForm';
import ArtistSection from '../components/ArtistSection';
import { Music, Play, Pause, ExternalLink } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import useSpotify from '../hooks/useSpotify';
import { API_ENDPOINTS } from '../config/api';
import SongDetails from '../components/SongDetails';

const Home = ({ searchResult: externalResult, onSearchResults, onCollapseChange, isSearchCollapsed, onCoverColorChange }) => {
  const [searchResult, setSearchResult] = useState(externalResult || null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState(null);
  const [isLoadingRecommendationSong, setIsLoadingRecommendationSong] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(0);
  const [showLyric, setShowLyric] = useState(false);
  const [showFinder, setShowFinder] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);
  // Transliteration UI state
  const [isTransliterateEligible, setIsTransliterateEligible] = useState(false);
  const [isTransliterateActive, setIsTransliterateActive] = useState(false);
  const [isTransliterateLoading, setIsTransliterateLoading] = useState(false);
  const [transliteratedLyrics, setTransliteratedLyrics] = useState(null);
  const [transliterationMeta, setTransliterationMeta] = useState({ lang: null, provider: null, error: null });
  const { theme } = useTheme();
  const { getRecommendations } = useSpotify();
  const searchContainerRef = useRef(null);

  // Fallback cover used when recommendation thumbnails fail
  const FALLBACK_COVER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjMyIiB5PSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1zaXplPSIyNCIgZm9udC1mYW1pbHk9IkFyaWFsIj7imaE8L3RleHQ+Cjwvc3ZnPg==';

  // Dominant color extracted from the main album cover
  const [coverColor, setCoverColor] = useState(null);

  // Lightweight dominant color extractor with safe fallback
  const extractDominantColor = (imgEl) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      const w = Math.min(32, imgEl.naturalWidth || 32);
      const h = Math.min(32, imgEl.naturalHeight || 32);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(imgEl, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 16) continue; // ignore near-transparent
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      if (!count) return null;
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      return { r, g, b };
    } catch (e) {
      return null;
    }
  };

  // Preload an image by URL with CORS enabled and extract dominant color
  const computeDominantColorFromUrl = (url) => {
    if (!url) { setCoverColor(null); onCoverColorChange?.(null); return; }
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.loading = 'eager';
      img.onload = () => {
        const col = extractDominantColor(img);
        setCoverColor(col);
        onCoverColorChange?.(col || null);
      };
      img.onerror = () => { setCoverColor(null); onCoverColorChange?.(null); };
      img.src = url;
    } catch {
      setCoverColor(null);
      onCoverColorChange?.(null);
    }
  };

  const clamp = (v) => Math.max(0, Math.min(255, v));
  const adjustColor = ({ r, g, b }, factor = 0.8) => ({
    r: clamp(Math.round(r * factor)),
    g: clamp(Math.round(g * factor)),
    b: clamp(Math.round(b * factor)),
  });
  const rgba = ({ r, g, b }, a) => `rgba(${r}, ${g}, ${b}, ${a})`;
  const getLyricsBackground = (color, theme) => {
    const darken = adjustColor(color, 0.65);
    const a1 = theme === 'light' ? 0.85 : 0.7;
    const a2 = theme === 'light' ? 0.95 : 0.85;
    return `linear-gradient(135deg, ${rgba(color, a1)} 0%, ${rgba(darken, a2)} 100%)`;
  };

  // Robust lyrics normalizer: strips site boilerplate, restores line breaks, and formats sections.
  const normalizeLyrics = (raw) => {
    if (!raw || typeof raw !== 'string') return '';
    let text = raw
      .replace(/\r\n?/g, '\n')
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, '') // zero-width chars
      .trim();

    // 1) Remove obvious non-lyrics boilerplate lines
    const boilerplatePatterns = [
      /^\s*\d+\s*Contributors?.*$/gim,
      /^\s*Translations?\b.*$/gim,
      /^\s*About this song.*$/gim,
      /^\s*Genius\s*Annotation.*$/gim,
      /^\s*Produced by.*$/gim,
      /^\s*\d+\s*Embed\s*$/gim,
    ];
    boilerplatePatterns.forEach((re) => { text = text.replace(re, ''); });

    // 2) If a clear section header exists, drop anything before the first one
    const headerMatch = text.match(/\[(?:intro|verse|chorus|bridge|outro|pre-chorus|post-chorus|hook|refrain)[^\]]*\]/i);
    if (headerMatch && headerMatch.index != null) {
      text = text.slice(headerMatch.index);
    }

    // 3) Normalize spaces
    text = text
      .replace(/[\t\f\v]+/g, ' ')
      .replace(/ {2,}/g, ' ');

    // 3a) Fix jammed words where a lowercase letter is immediately followed by an uppercase letter (e.g., "meAt" -> "me At")
    //     This is common in scraped lyrics where sentence breaks lose the space.
    text = text.replace(/([a-z])([A-Z])/g, '$1 $2');

    // 3b) Punctuation spacing: ensure no space before commas and exactly one space after (unless followed by newline or quote)
    text = text
      .replace(/\s+,/g, ',')
      .replace(/,([^\s\n"”'])/g, ', $1')
      .replace(/,(?=["“])/g, ', ');

    // 4) Ensure section headers have blank lines around them
    text = text
      .replace(/\s*\n\s*\[(.+?)\]\s*\n\s*/g, '\n\n[$1]\n')
      .replace(/(?<!\n)\[(.+?)\]/g, '\n\n[$1]');

    // 5) Repair jammed lines: insert newlines before common leading tokens when glued
    const breakTokens = ['But','And','Oh','Ooh','Uh','Hey','I','We','You','She','He','They','Girl','Boy','Yeah','No'];
    for (const tok of breakTokens) {
      const re = new RegExp(`(\\S)(${tok}\\b)`, 'g');
      text = text.replace(re, '$1\n$2');
    }

    // 6) Break after sentence punctuation when immediately followed by a capital letter with no space
    text = text.replace(/([.!?])(\s*)([A-Z])/g, (m, p1, p2, p3) => `${p1}${p2 && p2.length ? p2 : '\n'}${p3}`);

    // 7) Keep quoted lines readable: if a quote is followed immediately by a capital, insert a space (not a newline)
    text = text
      .replace(/(["”'])\s*([A-Z])/g, (m, q, cap) => `${q} ${cap}`)
      // Do NOT force a newline after a closing parenthesis; prefer a space
      .replace(/\)([A-Z])/g, ') $1');

    // 7a) Parentheses normalization: repair line breaks and spacing around ( ... )
    // - Bring lines like "word (\nContent)" back to "word (Content)"
    // - Avoid spaces right inside parentheses and ensure one space before '(' when attached to a word
    // - Ensure a space after ')' when followed by a word character
    text = text
      // If an opening parenthesis is at end of a line, pull next line up
      .replace(/ \(\s*\n\s*/g, ' (')
      // If a closing parenthesis starts a new line, pull it up
      .replace(/\n\s*\)/g, ')')
      // Ensure one space before '(' when attached to a non-space character (e.g., "love(" -> "love (")
      .replace(/([^\s(])\(/g, '$1 (')
      // Remove any extra spaces right after '('
      .replace(/\(\s+/g, '(')
      // Remove spaces before ')'
      .replace(/\s+\)/g, ')')
      // Ensure a single space after ')' when followed by a letter/number/quote (but not punctuation)
      .replace(/\)(?=([A-Za-z0-9"“]))/g, ') ');

  // 8) Remove duplicate blank lines (keep max two)
    text = text
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // 9) Trim trailing spaces on each line
    text = text
      .split('\n')
      .map((l) => l.replace(/\s+$/g, ''))
      .join('\n');

  // Final pass: collapse multiple spaces introduced by the above rules
  text = text.replace(/ {2,}/g, ' ');

  return text;
  };

  // Heuristic: determine if lyrics likely contain non-Latin script (so transliteration is useful)
  const isLikelyNonLatin = (txt) => {
    if (!txt) return false;
    const sample = txt.slice(0, 4000); // limit for perf
    const total = sample.length;
    if (total < 20) return false;
    const nonAscii = (sample.match(/[^\x00-\x7F]/g) || []).length;
    // Eligible if > 3% non-ASCII characters
    return nonAscii / total > 0.03;
  };

  const resetTransliteration = () => {
    setIsTransliterateActive(false);
    setIsTransliterateLoading(false);
    setTransliteratedLyrics(null);
    setTransliterationMeta({ lang: null, provider: null, error: null });
  };

  const updateTransliterationEligibility = (lyrics) => {
    const eligible = isLikelyNonLatin(lyrics);
    setIsTransliterateEligible(eligible);
    // If lyrics changed, clear previous transliteration
    resetTransliteration();
  };

  const requestTransliteration = async () => {
    if (!searchResult?.song?.lyrics) return;
    try {
      setIsTransliterateLoading(true);
          setTransliterationMeta({ lang: null, provider: null, error: null });
      const res = await fetch(API_ENDPOINTS.TRANSLITERATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: searchResult?.song?.lyrics }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const original = (searchResult?.song?.lyrics || '').trim();
      const returned = (data?.result || '').trim();
      const provider = data?.provider || null;
      if (!returned || !provider || provider === 'none' || returned === original) {
        setTransliterationMeta({ lang: data?.lang || null, provider: provider, error: 'No transliteration available' });
        setIsTransliterateActive(false);
        setTransliteratedLyrics(null);
      } else {
        setTransliteratedLyrics(normalizeLyrics(returned));
        setTransliterationMeta({ lang: data.lang || null, provider: provider, error: null });
        setIsTransliterateActive(true);
      }
    } catch (e) {
      setTransliterationMeta((m) => ({ ...m, error: e?.message || 'Transliteration failed' }));
    } finally {
      setIsTransliterateLoading(false);
    }
  };

  // Parse featured artists from common title patterns: feat./ft./featuring ...
  const parseFeaturedArtists = (title = '') => {
    if (!title || typeof title !== 'string') return [];
    const patterns = [
      /\((?:feat\.|featuring|ft\.)\s*([^\)]+)\)/i,
      /-\s*(?:feat\.|featuring|ft\.)\s*([^\-]+)$/i,
      /(?:feat\.|featuring|ft\.)\s*([^\(\-\[]+)/i,
    ];
    let names = [];
    for (const re of patterns) {
      const m = title.match(re);
      if (m && m[1]) {
        names = m[1]
          .split(/,|&|x|\+|\band\b/i)
          .map(s => s.replace(/[\[\](){}]/g, '').trim())
          .filter(Boolean);
        break;
      }
    }
    // De-duplicate and limit to a reasonable amount
    const seen = new Set();
    const out = [];
    for (const n of names) {
      const key = n.toLowerCase();
      if (!seen.has(key)) { seen.add(key); out.push(n); }
    }
    return out;
  };

  useEffect(() => {
    setSearchResult(externalResult || null);
  }, [externalResult]);

  // Reset cover color when the album image changes
  useEffect(() => {
    setCoverColor(null);
    onCoverColorChange?.(null);
  }, [searchResult?.song?.image, onCoverColorChange]);

  // Collapse on outside click only when results exist
  useEffect(() => {
    const handleDocMouseDown = (e) => {
      const toggleClicked = e.target.closest?.('[data-search-toggle]');
      if (toggleClicked) return;
      if (!searchContainerRef.current) return;
      const clickedInside = searchContainerRef.current.contains(e.target);
      if (!clickedInside) {
        if (searchResult && searchResult.song) {
          onCollapseChange?.(true);
        }
      }
    };
    document.addEventListener('mousedown', handleDocMouseDown);
    return () => document.removeEventListener('mousedown', handleDocMouseDown);
  }, [searchResult, onCollapseChange]);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setShowLyric(true);
      setStep(1);
    }, 200); // Much faster

    const timer2 = setTimeout(() => {
      setShowFinder(true);
      setStep(2);
    }, 400); // Much faster

    const timer3 = setTimeout(() => {
      setShowTagline(true);
      setStep(3);
    }, 600); // Much faster

    const timer4 = setTimeout(() => {
      setFadeOut(true);
      setStep(4);
    }, 800); // Much faster

    const timer5 = setTimeout(() => {
      setShowIntro(false);
    }, 1000); // Much faster

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, []);

  // Handle keyboard events for lyrics modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isLyricsModalOpen) {
        setIsLyricsModalOpen(false);
      }
    };

    if (isLyricsModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isLyricsModalOpen]);

  const handleSearchResults = async (result) => {
    console.log('=== Search Results Debug ===');
    console.log('Full result object:', result);
    console.log('Song object:', result?.song);
    console.log('Song image:', result?.song?.image);
    console.log('Song title:', result?.song?.title);
    console.log('Song artist:', result?.song?.artist);
    console.log('Song preview_url:', result?.song?.preview_url);
    console.log('=== End Search Results Debug ===');

    // Stop any currently playing audio when searching for a new song
    if (audioRef) {
      audioRef.pause();
      setIsPlaying(false);
      setAudioRef(null);
    }
    
    // Minimal processing for fastest display
  if (result && result.song) {
      if (!result.song.artist_bio) {
        result.song.artist_bio = `${result.song.artist} is a talented artist known for their distinctive style and memorable songs.`;
      }
      if (result.song.lyrics) {
        result.song.lyrics = normalizeLyrics(result.song.lyrics);
        updateTransliterationEligibility(result.song.lyrics);
      }
        // Attach featured artists from structured data if available, else parse title
        if (Array.isArray(result.song.artists) && result.song.artists.length > 1) {
          const primary = result.song.artist || result.song.artists[0].name;
          const others = result.song.artists
            .map(a => a.name)
            .filter(n => n && n.toLowerCase() !== (primary || '').toLowerCase());
          result.song.featured_artists = others;
        } else {
          result.song.featured_artists = parseFeaturedArtists(result.song.title);
        }
      // Set result immediately - no recommendations initially
      setSearchResult(result);
      onSearchResults?.(result);
     // Try to compute dominant color from current image
     if (result.song.image) {
       computeDominantColorFromUrl(result.song.image);
     } else {
       setCoverColor(null);
       onCoverColorChange?.(null);
     }

      // Proactively fetch preview and high-quality cover so the album image shows without clicking
      (async () => {
        try {
          const needsCover = !result.song.image || result.song.image.startsWith('data:image');
          const needsPreview = !result.song.preview_url || !result.song.spotify_id || !result.song.spotify_url;

          // Fetch Spotify preview/details if needed
          if (needsCover || needsPreview) {
            const resp = await fetch(`${API_ENDPOINTS.SPOTIFY_PREVIEW}?q=${encodeURIComponent(`${result.song.title} ${result.song.artist}`)}`);
            if (resp.ok) {
              const previewData = await resp.json();
              if (previewData) {
                result.song.image = previewData.cover || result.song.image;
                result.song.preview_url = previewData.preview || result.song.preview_url;
                result.song.preview_source = previewData.source || result.song.preview_source;
                result.song.spotify_url = previewData.spotifyUrl || result.song.spotify_url;
                result.song.spotify_id = previewData.spotifyId || result.song.spotify_id;
  
                result.song.preview_url = previewData.preview || result.song.preview_url;
                result.song.preview_source = previewData.source || result.song.preview_source;
                result.song.spotify_url = previewData.spotifyUrl || result.song.spotify_url;
                result.song.spotify_id = previewData.spotifyId || result.song.spotify_id;
                // Persist structured artist data for UI
                if (Array.isArray(previewData.artists)) {
                  result.song.artists = previewData.artists;
                }
                if (Array.isArray(previewData.albumArtists)) {
                  result.song.album_artists = previewData.albumArtists;
                }
                // Use Spotify artists array if present to detect collaborators/features
                if (Array.isArray(previewData.artists) && previewData.artists.length > 0) {
                  const primary = previewData.albumArtists?.[0]?.name || result.song.artist;
                  const others = previewData.artists
                    .map(a => a.name)
                    .filter(n => n && n.toLowerCase() !== (primary || '').toLowerCase());
                  if (others.length) {
                    result.song.featured_artists = others;
                  }
                }
                setSearchResult({ ...result });
               if (previewData.cover) computeDominantColorFromUrl(previewData.cover);
              }
            }
          }

          // Resolve exact YouTube link (safe if no key configured)
          try {
            const ytResp = await fetch(`${API_ENDPOINTS.YOUTUBE_LINK}?q=${encodeURIComponent(`${result.song.title} ${result.song.artist}`)}`);
            if (ytResp.ok) {
              const ytData = await ytResp.json();
              if (ytData && ytData.url) {
                result.song.youtube_url = ytData.url;
                setSearchResult({ ...result });
              }
            }
          } catch {}
        } catch (e) {
          console.error('Error preloading preview/cover or youtube link:', e);
        }
      })();
      
      // Start background recommendations immediately (no 2 second delay)
      setIsLoadingRecommendations(true);
      setTimeout(async () => {
        try {
          const recommendations = await getSpotifyRecommendations(result.song.spotify_id, result.song.artist);
          result.song.recommendations = recommendations;
          setSearchResult({ ...result });
        } catch (error) {
          result.song.recommendations = getFallbackRecommendations();
          setSearchResult({ ...result });
        }
        setIsLoadingRecommendations(false);
      }, 100);
    } else {
      setSearchResult(result);
      // Notify parent even when no song to keep state in sync
      onSearchResults?.(result);
    }
  };

  const playAudio = async (audioUrl) => {
    // If currently playing, pause and stop
    if (isPlaying && audioRef) {
      console.log('Stopping currently playing audio');
      audioRef.pause();
      audioRef.currentTime = 0;
      setIsPlaying(false);
      setAudioRef(null);
      return;
    }

    // Stop any existing audio before starting new one
    if (audioRef) {
      console.log('Cleaning up existing audio reference');
      audioRef.pause();
      audioRef.currentTime = 0;
      setAudioRef(null);
    }

    try {
      console.log('Attempting to play:', audioUrl);
      // Create new audio instance
      const audio = new Audio(audioUrl);
      audio.volume = 0.7;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      
      // Set up event listeners
      const handleEnded = () => {
        setIsPlaying(false);
        setAudioRef(null);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
      
      const handleError = (e) => {
        console.error('Audio error:', e, audio.error);
        alert(`🎵 Audio playback failed\n\nError: ${audio.error?.message || 'Unknown error'}\n\nTry listening on Spotify or YouTube instead!`);
        setIsPlaying(false);
        setAudioRef(null);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
      
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      
      // Attempt to play
      try {
        console.log('Starting audio playback...');
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          console.log('Audio started successfully');
          setIsPlaying(true);
          setAudioRef(audio);
        }
      } catch (playError) {
        console.error('Play error:', playError);
        alert(`🎵 Playback failed: ${playError.message}\n\nThis might be due to browser autoplay restrictions. Try clicking the album cover again!`);
        setIsPlaying(false);
        setAudioRef(null);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      }
    } catch (error) {
      alert(`🎵 Error creating audio: ${error.message}`);
      setIsPlaying(false);
      setAudioRef(null);
    }
  };

  const handleAlbumCoverClick = async () => {
    console.log('=== Album Cover Click Debug ===');
    console.log('Album cover clicked');
    console.log('Search result object:', searchResult);
    console.log('Song object:', searchResult?.song);
    console.log('Preview URL:', searchResult?.song?.preview_url);
    console.log('Preview URL type:', typeof searchResult?.song?.preview_url);
    console.log('Preview URL length:', searchResult?.song?.preview_url?.length);
    console.log('Preview source:', searchResult?.song?.preview_source);
    console.log('=== End Debug ===');
    
    // If no preview URL, try to fetch one first
    if (!searchResult?.song?.preview_url) {
      console.log('No preview URL found - attempting to fetch one...');
      
      try {
        const response = await fetch(`${API_ENDPOINTS.SPOTIFY_PREVIEW}?q=${encodeURIComponent(`${searchResult.song.title} ${searchResult.song.artist}`)}`);
        
        if (response.ok) {
          const previewData = await response.json();
          console.log('Preview data received:', previewData);
          
          if (previewData.preview || previewData.spotifyUrl) {
            // Update the search result with preview data
            const updatedResult = {
              ...searchResult,
              song: {
                ...searchResult.song,
                preview_url: previewData.preview || searchResult.song.preview_url,
                preview_source: previewData.source || searchResult.song.preview_source,
                image: previewData.cover || searchResult.song.image,
                spotify_url: previewData.spotifyUrl || searchResult.song.spotify_url,
                spotify_id: previewData.spotifyId || searchResult.song.spotify_id
              }
            };
            
            setSearchResult(updatedResult);
            console.log('Preview/Spotify URL found!');
            
            // Now try to play if preview exists
            if (previewData.preview) {
              await playAudio(previewData.preview);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch preview:', error);
      }
      
      // If we still don't have a preview URL, show the alert
      console.log('No preview URL available - showing alert');
      alert(`🎵 Audio preview not available for "${searchResult?.song?.title}"\n\nThis is common for popular songs due to licensing restrictions. You can listen to the full song on Spotify or YouTube using the buttons below!`);
      return;
    }

    console.log('Preview URL exists, proceeding with playback...');
    await playAudio(searchResult.song.preview_url);
  };

  const getSpotifyRecommendations = async (spotifyId, artistName) => {
    try {
      const recommendations = await getRecommendations(spotifyId, artistName);
      
      const formattedRecs = recommendations.map((rec, index) => ({
        id: `spotify_${rec.id}_${Date.now()}_${index}`,
        title: rec.title,
        artist: rec.artist,
        thumbnail: rec.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjMyIiB5PSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1zaXplPSIyNCIgZm9udC1mYW1pbHk9IkFyaWFsIj7imaE8L3RleHQ+Cjwvc3ZnPg==',
        spotify_id: rec.spotify_id
      }));
      
      return formattedRecs;
    } catch (error) {
      console.error('Error getting Spotify recommendations:', error);
      throw error;
    }
  };

  const getFallbackRecommendations = () => {
    // More diverse fallback songs that change randomly
    const allFallbackSongs = [
      { artist: "The Weeknd", title: "Blinding Lights", image: "https://i.scdn.co/image/ab67616d00001e02c06f0e8b33d17de4e8e0ec86" },
      { artist: "Adele", title: "Hello", image: "https://i.scdn.co/image/ab67616d00001e02cd519fa579e8c2d24e35a39b" },
      { artist: "Ed Sheeran", title: "Shape of You", image: "https://i.scdn.co/image/ab67616d00001e02ba5db46f4b838ef6027e6f96" },
      { artist: "Billie Eilish", title: "bad guy", image: "https://i.scdn.co/image/ab67616d00001e0250a3147b4edd7701a876c6ce" },
      { artist: "Post Malone", title: "Circles", image: "https://i.scdn.co/image/ab67616d00001e029478c87599550dd73bfa7e02" },
      { artist: "Dua Lipa", title: "Levitating", image: "https://i.scdn.co/image/ab67616d00001e02be841ba4bc24340152e3a79a" },
      { artist: "Taylor Swift", title: "Anti-Hero", image: "https://i.scdn.co/image/ab67616d0000b273bb54dde68cd23e2a268ae0f5" },
      { artist: "Harry Styles", title: "As It Was", image: "https://i.scdn.co/image/ab67616d0000b273b46f74097655d7f353caab14" },
      { artist: "Bad Bunny", title: "Me Porto Bonito", image: "https://i.scdn.co/image/ab67616d0000b273f63c6a15e9dc098e73b4c545" },
      { artist: "Olivia Rodrigo", title: "good 4 u", image: "https://i.scdn.co/image/ab67616d0000b273a91c10fe9472d9bd89802e5a" },
      { artist: "Drake", title: "God's Plan", image: "https://i.scdn.co/image/ab67616d0000b273f907de96b9a4fbc04accc0d5" },
      { artist: "Ariana Grande", title: "positions", image: "https://i.scdn.co/image/ab67616d0000b273be841ba4bc24340152e3a79a" },
      { artist: "Justin Bieber", title: "Peaches", image: "https://i.scdn.co/image/ab67616d0000b273a91c10fe9472d9bd89802e5a" },
      { artist: "Lil Nas X", title: "MONTERO", image: "https://i.scdn.co/image/ab67616d0000b273be841ba4bc24340152e3a79a" },
      { artist: "SZA", title: "Good Days", image: "https://i.scdn.co/image/ab67616d0000b273f63c6a15e9dc098e73b4c545" },
      { artist: "BTS", title: "Dynamite", image: "https://i.scdn.co/image/ab67616d0000b273bb54dde68cd23e2a268ae0f5" }
    ];

    // Shuffle and take 6 random songs each time
    const shuffled = allFallbackSongs.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 6);
    
    return selected.map((song, index) => ({
      id: `fallback_${Date.now()}_${index}`, // Add timestamp for uniqueness
      title: song.title,
      artist: song.artist,
      thumbnail: song.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjMyIiB5PSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1zaXplPSIyNCIgZm9udC1mYW1pbHk9IkFyaWFsIj7imaE8L3RleHQ+Cjwvc3ZnPg=='
    }));
  };

  const handleRecommendationClick = async (recommendation) => {
    // Set loading state for the specific recommendation
    setIsLoadingRecommendationSong(true);
    
    // Stop any currently playing audio when clicking a recommendation
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
      setIsPlaying(false);
      setAudioRef(null);
    }
    
    try {
  const response = await fetch(API_ENDPOINTS.SEARCH_LYRICS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: recommendation.title, 
          artist: recommendation.artist 
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        console.log('=== Recommendation Click Debug ===');
        console.log('API Response result:', result);
        console.log('Song object:', result.song);
        console.log('Image URL:', result.song?.image);
        console.log('Preview URL:', result.song?.preview_url);
        console.log('Spotify URL:', result.song?.spotify_url);
        console.log('=== End Debug ===');
        
        if (result.song) {
          // Minimal processing - no heavy cleaning
          if (!result.song.artist_bio) {
            result.song.artist_bio = `${result.song.artist} is a talented artist known for their distinctive style and memorable songs.`;
          }
          if (result.song.lyrics) {
            result.song.lyrics = normalizeLyrics(result.song.lyrics);
            updateTransliterationEligibility(result.song.lyrics);
          }
          // Attach featured artists from structured data if available, else parse title
          if (Array.isArray(result.song.artists) && result.song.artists.length > 1) {
            const primary = result.song.artist || result.song.artists[0].name;
            const others = result.song.artists
              .map(a => a.name)
              .filter(n => n && n.toLowerCase() !== (primary || '').toLowerCase());
            result.song.featured_artists = others;
          } else {
            result.song.featured_artists = parseFeaturedArtists(result.song.title);
          }
          // Set the result immediately - no recommendations initially
          setSearchResult(result);
         // Compute dominant color from recommendation cover if available
         if (result.song.image) {
           computeDominantColorFromUrl(result.song.image);
         } else {
           setCoverColor(null);
           onCoverColorChange?.(null);
         }
          
          // If no preview URL, try to fetch one from our backend immediately
          if (!result.song.preview_url || !result.song.spotify_url) {
            try {
              const response = await fetch(`${API_ENDPOINTS.SPOTIFY_PREVIEW}?q=${encodeURIComponent(`${result.song.title} ${result.song.artist}`)}`);
              
              if (response.ok) {
                const previewData = await response.json();
                
                if (previewData) {
                  if (previewData.preview) {
                    result.song.preview_url = previewData.preview;
                    result.song.preview_source = previewData.source;
                  }
                  result.song.image = previewData.cover || result.song.image;
                  result.song.spotify_url = previewData.spotifyUrl || result.song.spotify_url;
                  result.song.spotify_id = previewData.spotifyId || result.song.spotify_id;
                  // Persist structured artist data for UI
                  if (Array.isArray(previewData.artists)) {
                    result.song.artists = previewData.artists;
                  }
                  if (Array.isArray(previewData.albumArtists)) {
                    result.song.album_artists = previewData.albumArtists;
                  }
                  // Use Spotify artists array if present to detect collaborators/features
                  if (Array.isArray(previewData.artists) && previewData.artists.length > 0) {
                    const primary = previewData.albumArtists?.[0]?.name || result.song.artist;
                    const others = previewData.artists
                      .map(a => a.name)
                      .filter(n => n && n.toLowerCase() !== (primary || '').toLowerCase());
                    if (others.length) {
                      result.song.featured_artists = others;
                    }
                  }
                  
                  setSearchResult({...result});
                 if (previewData.cover) computeDominantColorFromUrl(previewData.cover);
                }
              }
            } catch (error) {
              console.error('Failed to fetch preview:', error);
            }
          }

          // Resolve exact YouTube link
          try {
            const ytResp = await fetch(`${API_ENDPOINTS.YOUTUBE_LINK}?q=${encodeURIComponent(`${result.song.title} ${result.song.artist}`)}`);
            if (ytResp.ok) {
              const ytData = await ytResp.json();
              if (ytData && ytData.url) {
                result.song.youtube_url = ytData.url;
                setSearchResult({ ...result });
              }
            }
          } catch {}
          
          // Load recommendations in background (remove artificial delay)
          setIsLoadingRecommendations(true);
          setTimeout(async () => {
            try {
              const recommendations = await getSpotifyRecommendations(result.song.spotify_id, result.song.artist);
              result.song.recommendations = recommendations;
              setSearchResult({...result});
            } catch (error) {
              result.song.recommendations = getFallbackRecommendations();
              setSearchResult({...result});
            }
            setIsLoadingRecommendations(false);
          }, 100); // Reduced from 2000ms to 100ms - just enough to let UI update
          
          // Scroll to top of results
          window.scrollTo({ top: 200, behavior: 'smooth' });
        } else {
          alert(`Sorry, couldn't find lyrics for "${recommendation.title}" by ${recommendation.artist}`);
        }
      } else {
        alert(`Failed to search for the song. Server responded with status ${response.status}.`);
      }
    } catch (error) {
      console.error('Error fetching recommendation lyrics:', error);
      alert(`Network error occurred while searching. Please check your connection and try again.`);
    } finally {
      setIsLoadingRecommendationSong(false);
    }
  };

  const getTextColor = () => {
    switch (theme) {
      case 'light': return 'text-gray-900';
      case 'medium': return 'text-gray-100';
      case 'dark': return 'text-white';
      default: return 'text-gray-900';
    }
  };

  const animationStyles = `
    @keyframes wave {
      0%, 100% { height: 0.5rem; }
      50% { height: 2rem; }
    }
    @keyframes fadeIn {
      0% { opacity: 0; transform: scale(0.95); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes equalize {
      0% {
        height: 10px;
      }
      100% {
        height: 50px;
      }
    }
    @keyframes fadeInMain {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    .vinyl-record {
      position: relative;
      border-radius: 50%;
      background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 25%, #1a1a1a 50%, #2d2d2d 75%, #1a1a1a 100%);
      box-shadow: 
        0 0 0 8px #0f0f0f,
        0 0 0 12px #2a2a2a,
        0 8px 32px rgba(0, 0, 0, 0.6),
        inset 0 0 0 2px rgba(255, 255, 255, 0.1);
    }
    .vinyl-record::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 24px;
      height: 24px;
      background: #1a1a1a;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 
        0 0 0 2px #333,
        0 0 0 4px #1a1a1a,
        inset 0 2px 4px rgba(0, 0, 0, 0.8);
    }
    .vinyl-record::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 6px;
      height: 6px;
      background: #000;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      z-index: 10;
    }
    .vinyl-spinning {
      animation: spin 2s linear infinite;
    }
    .album-cover {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 70%;
      height: 70%;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      object-fit: cover;
      z-index: 5;
      box-shadow: 
        inset 0 0 20px rgba(0, 0, 0, 0.3),
        0 2px 8px rgba(0, 0, 0, 0.4);
    }
    
    /* Custom Scrollbar Styles */
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
    }
    
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 10px;
    }
    
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(156, 163, 175, 0.3);
      border-radius: 10px;
      border: 2px solid transparent;
      background-clip: content-box;
    }
    
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(156, 163, 175, 0.5);
      background-clip: content-box;
    }
    
    /* Dark theme scrollbar */
    .custom-scrollbar-dark {
      scrollbar-width: thin;
      scrollbar-color: rgba(75, 85, 99, 0.5) transparent;
    }
    
    .custom-scrollbar-dark::-webkit-scrollbar {
      width: 8px;
    }
    
    .custom-scrollbar-dark::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 10px;
    }
    
    .custom-scrollbar-dark::-webkit-scrollbar-thumb {
      background: rgba(75, 85, 99, 0.4);
      border-radius: 10px;
      border: 2px solid transparent;
      background-clip: content-box;
    }
    
    .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover {
      background: rgba(75, 85, 99, 0.6);
      background-clip: content-box;
    }
    
    /* Light theme scrollbar */
    .custom-scrollbar-light {
      scrollbar-width: thin;
      scrollbar-color: rgba(209, 213, 219, 0.6) transparent;
    }
    
    .custom-scrollbar-light::-webkit-scrollbar {
      width: 8px;
    }
    
    .custom-scrollbar-light::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 10px;
    }
    
    .custom-scrollbar-light::-webkit-scrollbar-thumb {
      background: rgba(209, 213, 219, 0.5);
      border-radius: 10px;
      border: 2px solid transparent;
      background-clip: content-box;
    }
    
    .custom-scrollbar-light::-webkit-scrollbar-thumb:hover {
      background: rgba(209, 213, 219, 0.7);
      background-clip: content-box;
    }
  `;

  // Compute collaborator names for badges and the "with …" line, based on current searchResult
  const collaboratorNames = React.useMemo(() => {
    const song = searchResult?.song;
    if (!song) return [];
    // Prefer explicitly set featured_artists
    if (Array.isArray(song.featured_artists) && song.featured_artists.length > 0) {
      return song.featured_artists;
    }
    // Otherwise derive from Spotify artists array (exclude primary artist)
    if (Array.isArray(song.artists) && song.artist) {
      const primary = (song.artist || '').toLowerCase();
      const others = song.artists
        .map(a => a?.name)
        .filter(n => n && n.toLowerCase() !== primary)
        .map(n => n.trim());
      // De-duplicate while preserving order
      const seen = new Set();
      return others.filter(n => (seen.has(n.toLowerCase()) ? false : (seen.add(n.toLowerCase()), true)));
    }
    // Fallback to parsing the title
    if (song.title) {
      return parseFeaturedArtists(song.title);
    }
    return [];
  }, [searchResult]);

  return (
    <>
      <style>{animationStyles}</style>
      <div className={`${getTextColor()} min-h-screen flex flex-col items-stretch px-0 py-6 transition-colors duration-300 ${
        !showIntro ? 'animate-[fadeInMain_2s_ease-out]' : ''
      }`}>
        {/* Search Section (collapsible) */}
        <div
          ref={searchContainerRef}
          className={`w-full max-w-xl mx-auto overflow-hidden transition-all duration-300 ${
            isSearchCollapsed ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
          } ${!isSearchCollapsed && !(searchResult && searchResult.song) ? 'mt-24 md:mt-40' : 'mt-2'}`}
          style={{ maxHeight: isSearchCollapsed ? 0 : 400 }}
        >
          <SearchForm
            onSearchResults={handleSearchResults}
            onCollapseChange={onCollapseChange}
          />
        </div>

        {/* Results Section - Two-Column Layout */}
        <div className={`w-full transition-all duration-500 ${isSearchCollapsed ? 'mt-2' : 'mt-6'}`}>
        {searchResult && searchResult.song && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start w-full gap-4 px-0 md:px-0">
            {/* Left Side: Search Results */}
            <div className={`w-full backdrop-blur-md p-8 rounded-3xl shadow-xl transition-all duration-300 animate-fade-in ${
              theme === 'light' 
                ? 'bg-black/20' 
                : theme === 'medium'
                ? 'bg-white/10'
                : 'bg-black/40'
            }`}>
              {/* Album Art & Song Info */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-full flex items-start justify-center gap-4">
                  <div 
                    className="relative group cursor-pointer"
                    onClick={(e) => {
                      console.log('Container clicked!', e);
                      handleAlbumCoverClick();
                    }}
                  >
                    {/* Vinyl Record Base */}
                    <div className={`vinyl-record w-44 h-44 ${isPlaying ? 'vinyl-spinning' : ''}`}>
                      {/* Album Cover */}
                      <img 
                        src={searchResult.song.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjQ4IiBmb250LWZhbWlseT0iQXJpYWwiPuKZqjwvdGV4dD4KPC9zdmc+'} 
                        alt="album art" 
                        className="album-cover"
                        style={{ pointerEvents: 'none' }}
                        loading="eager"
                        crossOrigin="anonymous"
                        onLoad={(e) => {
                          try {
                            const col = extractDominantColor(e.target);
                            setCoverColor(col);
                            onCoverColorChange?.(col || null);
                            console.log('Album cover loaded successfully:', e.target.src, col);
                          } catch {}
                        }}
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjQ4IiBmb250LWZhbWlseT0iQXJpYWwiPuKZqjwvdGV4dD4KPC9zdmc+';
                          setCoverColor(null);
                          onCoverColorChange?.(null);
                        }}
                      />
                    </div>
                    
                    {/* Play/Pause Overlay */}
                    {searchResult.song.preview_url && (
                      <div className={`absolute inset-0 flex items-center justify-center rounded-full transition-opacity duration-300 pointer-events-none ${
                        isPlaying ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        <div className="bg-black/60 rounded-full p-4 backdrop-blur-sm">
                          {isPlaying ? (
                            <Pause className="w-8 h-8 text-white drop-shadow-lg" />
                          ) : (
                            <Play className="w-8 h-8 text-white drop-shadow-lg ml-1" />
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Vinyl Grooves Effect */}
                    <div className="absolute inset-2 rounded-full pointer-events-none" style={{
                      background: `radial-gradient(
                        circle at center, 
                        transparent 15%, 
                        rgba(255,255,255,0.02) 16%, 
                        transparent 17%, 
                        rgba(255,255,255,0.02) 18%, 
                        transparent 19%, 
                        rgba(255,255,255,0.02) 20%, 
                        transparent 21%, 
                        rgba(255,255,255,0.02) 22%, 
                        transparent 23%, 
                        rgba(255,255,255,0.02) 24%, 
                        transparent 25%
                      )`
                    }}>
                    </div>
                  </div>
                  
                </div>
                
                <div className="flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <span className={`text-lg font-semibold ${
                      theme === 'light' ? 'text-gray-900' : 'text-indigo-200'
                    }`}>{searchResult.song.title}</span>
                    {collaboratorNames.length > 0 && (
                      <div className="flex items-center gap-1">
                        {collaboratorNames.slice(0, 3).map((name, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600/80 text-white shadow-sm">{name}</span>
                        ))}
                        {collaboratorNames.length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600/50 text-white">+{collaboratorNames.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`text-md font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-indigo-400'
                  }`}>{searchResult.song.artist}</span>
                  {collaboratorNames.length > 0 && (
                    <div className={`text-xs mt-0.5 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                      with {collaboratorNames.join(', ')}
                    </div>
                  )}
                  {searchResult.song.album && (
                    <div className={`text-xs mt-1 ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                    }`}>Album: {searchResult.song.album}</div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 mt-4 justify-center">
                  {/* YouTube button (direct link if available, else search) */}
                  {searchResult.song.youtube_url ? (
                    <a 
                      href={searchResult.song.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-5 py-3 bg-red-500 hover:bg-red-600 rounded-full transition-all duration-300 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <svg width="18" height="18" fill="currentColor" className="mr-2" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      YouTube
                    </a>
                  ) : (
                    <a 
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${searchResult.song.title} ${searchResult.song.artist}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-5 py-3 bg-red-500 hover:bg-red-600 rounded-full transition-all duration-300 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <svg width="18" height="18" fill="currentColor" className="mr-2" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      YouTube
                    </a>
                  )}

                  {/* Spotify button (direct link if available, else search) */}
                  {searchResult.song.spotify_url ? (
                    <a 
                      href={searchResult.song.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-5 py-3 bg-green-500 hover:bg-green-600 rounded-full transition-all duration-300 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <svg width="18" height="18" fill="currentColor" className="mr-2" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.859-.179-.982-.599-.122-.421.18-.861.599-.983 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02v.141zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.3 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56z"/>
                      </svg>
                      Spotify
                    </a>
                  ) : (
                    <a 
                      href={`https://open.spotify.com/search/${encodeURIComponent(`${searchResult.song.title} ${searchResult.song.artist}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-5 py-3 bg-green-500 hover:bg-green-600 rounded-full transition-all duration-300 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <svg width="18" height="18" fill="currentColor" className="mr-2" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.859-.179-.982-.599-.122-.421.18-.861.599-.983 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02v.141zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.3 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56z"/>
                      </svg>
                      Spotify
                    </a>
                  )}

                  {/* Open in New Tab Button for External Links */}
                  {(searchResult.song.external_url || searchResult.song.genius_url) && (
                    <a 
                      href={searchResult.song.external_url || searchResult.song.genius_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-5 py-3 bg-purple-500 hover:bg-purple-600 rounded-full transition-all duration-300 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Lyrics Source
                    </a>
                  )}
                </div>
              </div>

              {/* Lyrics Display */}
              {searchResult.song.lyrics && (
                <div 
                  className={`relative rounded-2xl p-6 shadow-md max-h-96 overflow-y-auto transition-all duration-300 mt-6 ${
                    coverColor
                      ? (theme === 'light' 
                        ? 'custom-scrollbar-light' 
                        : theme === 'medium' 
                          ? 'custom-scrollbar' 
                          : 'custom-scrollbar-dark')
                      : (
                        theme === 'light' 
                          ? 'bg-gradient-to-br from-black/60 to-gray-800/80 hover:from-black/70 hover:to-gray-800/90 custom-scrollbar-light' 
                          : theme === 'medium'
                          ? 'bg-gradient-to-br from-black/50 to-indigo-900/70 hover:from-black/60 hover:to-indigo-900/80 custom-scrollbar'
                          : 'bg-gradient-to-br from-black/60 to-indigo-900/80 hover:from-black/70 hover:to-indigo-900/90 custom-scrollbar-dark'
                      )
                  }`}
                  style={coverColor ? { background: getLyricsBackground(coverColor, theme) } : undefined}
                >
                  {/* Top-right controls */}
                  <div className="absolute right-3 top-3 flex items-center gap-2">
                    {isTransliterateEligible && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isTransliterateActive) {
                            setIsTransliterateActive(false);
                          } else if (!transliteratedLyrics && !isTransliterateLoading) {
                            requestTransliteration();
                          } else {
                            setIsTransliterateActive(true);
                          }
                        }}
                        disabled={isTransliterateLoading}
                        className={`text-xs px-3 py-1.5 rounded-full border backdrop-blur-sm ${
                          theme === 'light' ? 'bg-white/20 border-white/30 text-white hover:bg-white/30' : 'bg-black/20 border-white/20 text-indigo-100 hover:bg-black/30'
                        } ${isTransliterateActive ? 'ring-2 ring-indigo-400/60' : ''}`}
                        title={isTransliterateActive ? 'Show original lyrics' : 'Transliterate to Latin script'}
                      >
                        {isTransliterateLoading ? 'Transliterating…' : (isTransliterateActive ? 'Original' : 'Transliterate')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsLyricsModalOpen(true)}
                      className={`text-xs px-3 py-1.5 rounded-full border backdrop-blur-sm ${
                        theme === 'light' ? 'bg-white/20 border-white/30 text-white hover:bg-white/30' : 'bg-black/20 border-white/20 text-indigo-100 hover:bg-black/30'
                      }`}
                      title="Open full lyrics"
                    >
                      Expand
                    </button>
                  </div>
                  <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
                    theme === 'light' ? 'text-white' : 'text-gray-100'
                  }`}>
                    <Music className="w-5 h-5" />
                    Lyrics
                  </h3>
                  <pre className={`whitespace-pre-wrap font-mono text-lg leading-relaxed pb-3 ${
                    theme === 'light' ? 'text-gray-100' : 'text-gray-100'
                  }`}>
                    {isTransliterateActive && transliteratedLyrics ? transliteratedLyrics : searchResult.song.lyrics}
                  </pre>
                  {isTransliterateActive && (transliterationMeta.lang || transliterationMeta.provider) && (
                    <div className={`text-xs opacity-80 mt-2 ${theme === 'light' ? 'text-white/80' : 'text-indigo-100/80'}`}>
                      {transliterationMeta.lang && <span>Detected: {transliterationMeta.lang}</span>}
                      {transliterationMeta.lang && transliterationMeta.provider && <span> · </span>}
                      {transliterationMeta.provider && <span>Provider: {transliterationMeta.provider}</span>}
                      {transliterationMeta.error && <span> · Error: {transliterationMeta.error}</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Genius Song Details (below lyrics, above recommendations) */}
              {searchResult?.song?.title && (
                <SongDetails
                  title={searchResult.song.title}
                  artist={searchResult.song.artist}
                  theme={theme}
                  coverColor={coverColor}
                />
              )}

              {/* Recommendations Section */}
              {(searchResult.song.recommendations && searchResult.song.recommendations.length > 0) || isLoadingRecommendations ? (
                <div className="mt-6">
                  <div className={`font-semibold text-md mb-4 ${
                    theme === 'light' ? 'text-gray-900' : 'text-indigo-200'
                  }`}>
                    More Songs
                  </div>
                  
                  {isLoadingRecommendations ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, index) => (
                        <div 
                          key={`loading_${index}`}
                          className={`rounded-xl p-4 flex flex-col items-center transition-all duration-300 shadow-md animate-pulse ${
                            theme === 'light' 
                              ? 'bg-gray-200/70' 
                              : 'bg-gray-900/70'
                          }`}
                        >
                          <div className="w-16 h-16 rounded mb-2 bg-gray-400/50"></div>
                          <div className="h-4 w-20 bg-gray-400/50 rounded mb-1"></div>
                          <div className="h-3 w-16 bg-gray-400/50 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchResult.song.recommendations.map((rec, index) => (
                        <div 
                          key={rec.id || index} 
                          className={`rounded-xl p-4 flex flex-col items-center transition-all duration-300 shadow-md hover:scale-105 cursor-pointer relative ${
                            coverColor ? '' : (
                              theme === 'light' 
                                ? 'bg-gray-200/70 hover:bg-gray-300/70' 
                                : 'bg-gray-900/70 hover:bg-gray-800'
                            )
                          } ${isLoadingRecommendationSong ? 'pointer-events-none opacity-50' : ''}`}
                          style={coverColor ? { background: getLyricsBackground(coverColor, theme) } : undefined}
                          onClick={() => {
                            if (!isLoadingRecommendationSong) {
                              handleRecommendationClick(rec);
                            }
                          }}
                          title={`Click to view lyrics for "${rec.title}" by ${rec.artist}`}
                        >
                          {isLoadingRecommendationSong && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                          )}
                          <img 
                            src={rec.thumbnail || rec.image || FALLBACK_COVER} 
                            alt="cover" 
                            className="w-16 h-16 rounded mb-2 object-cover border-2 border-indigo-300"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={(e) => { e.currentTarget.src = FALLBACK_COVER; }}
                          />
                          <div className={`text-sm font-bold text-center ${
                            theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                          }`}>
                            {rec.title}
                          </div>
                          <div className={`text-xs text-center ${
                            theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                          }`}>
                            {rec.artist}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Right Side: Artist Information */}
            {searchResult && searchResult.song && searchResult.song.artist && (
              <div className="w-full -mt-0 lg:-mt-10">
                <ArtistSection artistName={searchResult.song.artist} coverColor={coverColor} featuredArtists={searchResult.song.featured_artists || []} />
              </div>
            )}
          </div>
        )}
        
        </div>
      </div>

      {/* Lyrics Modal */}
      {isLyricsModalOpen && searchResult?.song?.lyrics && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setIsLyricsModalOpen(false)}
        >
          {/* Blurred Background Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md"></div>
          
          {/* Modal Content */}
          <div 
            className={`relative w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden ${
              theme === 'light' 
                ? 'bg-gradient-to-br from-white to-gray-100' 
                : theme === 'medium'
                ? 'bg-gradient-to-br from-gray-800 to-gray-900'
                : 'bg-gradient-to-br from-gray-900 to-black'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`p-6 border-b ${
              theme === 'light' ? 'border-gray-200' : 'border-gray-700'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-2xl font-bold ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}>
                    {searchResult.song.title}
                  </h2>
                  <p className={`text-lg ${
                    theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    by {searchResult.song.artist}
                  </p>
                </div>
                <button
                  onClick={() => setIsLyricsModalOpen(false)}
                  className={`p-2 rounded-full transition-colors ${
                    theme === 'light' 
                      ? 'hover:bg-gray-200 text-gray-600' 
                      : 'hover:bg-gray-700 text-gray-400'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Lyrics Content */}
            <div className={`p-6 overflow-y-auto max-h-[calc(90vh-120px)] ${
              theme === 'light' 
                ? 'custom-scrollbar-light' 
                : theme === 'medium'
                ? 'custom-scrollbar'
                : 'custom-scrollbar-dark'
            }`}>
              <pre className={`whitespace-pre-wrap font-mono text-lg leading-relaxed ${
                theme === 'light' ? 'text-gray-800' : 'text-gray-200'
              }`}>
                {isTransliterateActive && transliteratedLyrics ? transliteratedLyrics : searchResult.song.lyrics}
              </pre>
              {isTransliterateActive && (transliterationMeta.lang || transliterationMeta.provider) && (
                <div className={`text-xs opacity-80 mt-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                  {transliterationMeta.lang && <span>Detected: {transliterationMeta.lang}</span>}
                  {transliterationMeta.lang && transliterationMeta.provider && <span> · </span>}
                  {transliterationMeta.provider && <span>Provider: {transliterationMeta.provider}</span>}
                  {transliterationMeta.error && <span> · Error: {transliterationMeta.error}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Intro Animation Overlay */}
      {showIntro && (
        <div
          className={`fixed inset-0 flex flex-col items-center justify-center bg-black text-white transition-opacity duration-500 z-50 ${
            fadeOut ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="relative flex items-center justify-center mb-8">
            {/* Animated music notes */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-12 w-12 absolute -left-16 transition-all duration-700 ${
                step >= 1 ? 'opacity-100 -translate-y-2' : 'opacity-0 translate-y-4'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-12 w-12 absolute -right-16 transition-all duration-700 ${
                step >= 2 ? 'opacity-100 translate-y-2' : 'opacity-0 -translate-y-4'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            
            {/* Main title */}
            <div className="flex items-baseline">
              <h1
                className={`text-6xl md:text-8xl font-bold transition-all duration-700 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent ${
                  showLyric ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Lyric
              </h1>
              <h1
                className={`text-6xl md:text-8xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent transition-all duration-700 ${
                  showFinder ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                }`}
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Finder
              </h1>
            </div>
          </div>

          {/* Tagline */}
          <p
            className={`text-xl md:text-2xl text-gray-300 transition-all duration-700 ${
              showTagline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Discover the words behind the music
          </p>

          {/* Animated equalizer effect at the bottom */}
          <div className="absolute bottom-10 left-0 right-0 flex justify-center space-x-1 h-12 items-end">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
              <div
                key={bar}
                className="w-2 bg-yellow-300 rounded-t-sm"
                style={{
                  height: `${Math.random() * 40 + 10}px`,
                  animation: `equalize 300ms infinite alternate ${bar * 100}ms`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
