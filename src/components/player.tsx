'use client';

import { useEffect, useState } from 'react';
// @ts-ignore
import ReactPlayer from 'react-player';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, Volume2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerProps {
    playlist: string[]; // Array of YouTube IDs
    onNext: () => void;
}

export function Player({ playlist, onNext }: PlayerProps) {
    const [playing, setPlaying] = useState(true);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || playlist.length === 0) return null;

    const currentId = playlist[currentTrackIndex];
    const ReactPlayerAny = ReactPlayer as any;

    // Handle moving to next track when one ends
    const handleEnded = () => {
        if (currentTrackIndex < playlist.length - 1) {
            setCurrentTrackIndex(prev => prev + 1);
        } else {
            onNext(); // Fetch more or loop?
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none flex justify-center"
        >
            <div className="glass-card p-4 w-full max-w-3xl pointer-events-auto flex items-center gap-4">
                {/* Hidden Player for Logic */}
                <div className="hidden">
                    <ReactPlayerAny
                        url={`https://www.youtube.com/watch?v=${currentId}`}
                        playing={playing}
                        onEnded={handleEnded}
                        width="0"
                        height="0"
                        controls={false}
                    />
                </div>

                {/* Custom Controls UI (Minimal Vibe) */}
                <div className="w-16 h-16 bg-black/50 rounded-lg overflow-hidden relative group">
                    <img
                        src={`https://img.youtube.com/vi/${currentId}/mqdefault.jpg`}
                        alt="Thumbnail"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="music-bars flex gap-0.5 items-end h-4">
                            {[1, 2, 3, 4].map(i => (
                                <motion.div
                                    key={i}
                                    className="w-1 bg-primary"
                                    animate={{ height: playing ? [4, 16, 8, 12] : 4 }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 0.5,
                                        delay: i * 0.1,
                                        repeatType: "reverse"
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">Vibe Mix</h3>
                    <p className="text-xs text-neutral-400 truncate">Now Playing: Track {currentTrackIndex + 1}</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setPlaying(!playing)}
                        className="p-3 rounded-full bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
                    >
                        {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                    </button>

                    <button
                        onClick={handleEnded}
                        className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                    >
                        <SkipForward className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
