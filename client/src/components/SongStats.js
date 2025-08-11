import React from "react";
import { FaFire, FaSmile, FaRegSadCry, FaRunning, FaMusic } from "react-icons/fa";

export default function SongStats({ popularity, vibe }) {
  // Popularity bar color logic
  const getPopularityColor = () => {
    if (popularity >= 80) return "bg-green-500";
    if (popularity >= 50) return "bg-yellow-400";
    return "bg-red-500";
  };

  // Vibe icon logic
  const getVibeIcon = () => {
    switch (vibe) {
      case "danceable":
        return <FaRunning className="text-pink-400 text-2xl" />;
      case "energetic":
        return <FaFire className="text-orange-500 text-2xl" />;
      case "happy":
        return <FaSmile className="text-yellow-400 text-2xl" />;
      case "sad":
        return <FaRegSadCry className="text-blue-400 text-2xl" />;
      default:
        return <FaMusic className="text-gray-400 text-2xl" />;
    }
  };

  return (
    <div className="bg-gray-900 p-5 rounded-xl shadow-lg w-full max-w-md">
      {/* Popularity */}
      <div className="mb-4">
        <h2 className="text-white font-semibold mb-2">Popularity</h2>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getPopularityColor()}`}
            style={{ width: `${Math.max(0, Math.min(100, Number(popularity || 0)))}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-400 mt-1">{Math.max(0, Math.min(100, Number(popularity || 0)))}%</p>
      </div>

      {/* Vibe */}
      <div className="flex items-center gap-3">
        {getVibeIcon()}
        <div>
          <p className="text-white font-medium capitalize">{vibe || 'unknown'}</p>
          <p className="text-gray-400 text-sm">Song vibe</p>
        </div>
      </div>
    </div>
  );
}
