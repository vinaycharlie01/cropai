
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Speaker, Loader2, Play, Pause, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateSpeech } from '@/ai/flows/tts-flow';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';

interface AudioPlayerProps {
  textToSpeak: string;
}

export function AudioPlayer({ textToSpeak }: AudioPlayerProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const handleFetchAndPlay = async () => {
    setError(null);
    if (audioSrc) {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
      }
      return;
    }

    setIsLoading(true);
    try {
      const response = await generateSpeech({ text: textToSpeak, language });
      setAudioSrc(response.audioDataUri);
    } catch (err) {
      console.error('TTS Generation Error:', err);
      setError('Could not generate audio.');
      toast({
        variant: 'destructive',
        title: 'Audio Error',
        description: 'Failed to generate audio for this text.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Effect to play audio when src is set
  useEffect(() => {
    if (audioSrc && audioRef.current) {
      audioRef.current.play();
    }
  }, [audioSrc]);

  // Effect to reset audio when text changes
  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
      }
      setAudioSrc(null);
  }, [textToSpeak]);

  // Cleanup audio element
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => setIsPlaying(false);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handleFetchAndPlay}
        disabled={isLoading || !textToSpeak}
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
             <motion.div key="speaker" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
              <Speaker className="h-4 w-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      {error && <AlertCircle className="h-5 w-5 text-destructive" title={error} />}

      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          className="hidden"
        />
      )}
    </div>
  );
}
