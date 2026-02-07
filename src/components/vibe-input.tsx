'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Music2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@auth0/nextjs-auth0/client';

interface VibeInputProps {
    onVibeSubmit: (vibe: string) => void;
    isLoading: boolean;
}

export function VibeInput({ onVibeSubmit, isLoading }: VibeInputProps) {
    const [vibe, setVibe] = useState('');
    const { user, isLoading: isAuthLoading } = useUser();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (vibe.trim()) {
            onVibeSubmit(vibe);
        }
    };

    if (isAuthLoading) return null;

    return (
        <div className="w-full max-w-2xl mx-auto p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-1 rounded-2xl relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 animate-pulse-slow" />

                <form onSubmit={handleSubmit} className="relative z-10 bg-black/80 rounded-xl p-2 flex gap-2 items-center">
                    <div className="p-3 text-primary">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <input
                        type="text"
                        value={vibe}
                        onChange={(e) => setVibe(e.target.value)}
                        placeholder={user ? "Describe your vibe... (e.g., 'Late night coding session')" : "Please login to vibe"}
                        className="flex-1 bg-transparent border-none outline-none text-lg text-white placeholder:text-neutral-500"
                        disabled={isLoading || !user}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !vibe.trim() || !user}
                        className={cn(
                            "p-3 rounded-lg transition-all duration-300",
                            vibe.trim() && !isLoading && user
                                ? "bg-primary text-white hover:bg-primary/80 hover:scale-105 shadow-lg shadow-primary/25"
                                : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                        )}
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send className="w-6 h-6" />
                        )}
                    </button>
                </form>
            </motion.div>

            {!user && (
                <div className="text-center mt-4">
                    <a href="/auth/login" className="text-sm text-neutral-400 hover:text-primary transition-colors">
                        Login to start vibing →
                    </a>
                </div>
            )}
        </div>
    );
}
