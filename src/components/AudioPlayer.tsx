
'use client';

import { useState, useRef, useEffect } from 'react';
import { Speaker, Loader2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

interface AudioPlayerProps {
  audioSrc: string | null;
  isLoading: boolean;
  onPlaybackRequest: () => void;
}

export function AudioPlayer({ audioSrc, isLoading, onPlaybackRequest }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioSrc && audioRef.current) {
        audioRef.current.play().catch(e => console.error("Audio autoplay failed:", e));
    }
  }, [audioSrc]);
  
  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => setIsPlaying(false);
      
      audioElement.addEventListener('play', handlePlay);
      audioElement.addEventListener('pause', handlePause);
      audioElement.addEventListener('ended', handleEnded);

      // Set initial state
      setIsPlaying(!audioElement.paused);

      return () => {
        audioElement.removeEventListener('play', handlePlay);
        audioElement.removeEventListener('pause', handlePause);
        audioElement.removeEventListener('ended', handleEnded);
      };
    }
  }, [audioSrc]);

  const handleTogglePlay = () => {
    if (!audioSrc) {
      onPlaybackRequest();
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handleTogglePlay}
        disabled={isLoading}
        className="flex-shrink-0 h-8 w-8"
        title="Listen to advice"
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="loader" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
              <Loader2 className="h-4 w-4 animate-spin" />
            </motion.div>
          ) : isPlaying ? (
            <motion.div key="pause" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
              <Pause className="h-4 w-4" />
            </motion.div>
          ) : (
             <motion.div key="play" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
              <Play className="h-4 w-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
      
      {audioSrc && <audio ref={audioRef} src={audioSrc} className="hidden" />}
    </div>
  );
}
