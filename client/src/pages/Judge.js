import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function Judge() {
  const { theme } = useTheme();

  return (
    <div className="max-w-6xl mx-auto">
      <section
        className={`rounded-2xl border border-white/15 bg-black/30 backdrop-blur-md p-6 md:p-8 shadow-xl`}
        aria-label="Judge page"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Judge</h1>
        <p className="text-white/80 mb-6">
          Welcome to the Judge page. This section shares the same animated background as the rest of the app.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-white font-semibold mb-1">Panel</h2>
            <p className="text-white/70 text-sm">Add your judging tools or widgets here.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-white font-semibold mb-1">Activity</h2>
            <p className="text-white/70 text-sm">Show recent actions or decisions.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
