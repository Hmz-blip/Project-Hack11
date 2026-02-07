'use client';

import { useState } from 'react';
import { VibeInput } from '@/components/vibe-input';
import { Player } from '@/components/player';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleVibeSubmit = async (vibeInput: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/dj/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vibe: vibeInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch vibe');
      }

      console.log('DJ Response:', data);
      if (data.playlist && Array.isArray(data.playlist)) {
        setPlaylist(data.playlist);
      }
    } catch (error) {
      console.error('Error fetching vibe:', error);
      // Fallback for demo if API fails
      setPlaylist(['5rXQe8Q5h_w', 'hT_nvWreIhg']);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0" />

      <div className="z-10 w-full max-w-4xl text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/50 mb-4 text-glow">
            Vibe DJ
          </h1>
          <p className="text-xl text-neutral-400 max-w-lg mx-auto">
            Your personal AI music curator. Just describe the vibe, and we'll handle the rest.
          </p>
        </motion.div>

        <VibeInput onVibeSubmit={handleVibeSubmit} isLoading={isLoading} />
      </div>

      <AnimatePresence>
        {playlist.length > 0 && (
          <Player playlist={playlist} onNext={() => console.log('Next track requested')} />
        )}
      </AnimatePresence>
    </main>
  );
}
