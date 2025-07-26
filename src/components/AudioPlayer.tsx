
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Play, Pause, AlertTriangle } from 'lucide-react';
import { generateSpeech } from '@/ai/flows/tts-flow';
import { getTtsLanguageCode } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AudioPlayerProps {
  textToSpeak: string;
  language: string;
}

export function AudioPlayer({ textToSpeak, language }: AudioPlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Effect to create and manage the audio element instance
  useEffect(() => {
    audioRef.current = new Audio();
    const audioElement = audioRef.current;

    const handleAudioEnd = () => setIsPlaying(false);
    audioElement.addEventListener('ended', handleAudioEnd);

    // Cleanup function to remove event listener
    return () => {
      audioElement.removeEventListener('ended', handleAudioEnd);
    };
  }, []);

  // Effect to reset state when the text to speak changes
  useEffect(() => {
    setIsPlaying(false);
    setAudioDataUri(null);
    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, [textToSpeak, language]);


  const fetchAndPlayAudio = useCallback(async () => {
    if (audioDataUri && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      setIsPlaying(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const ttsLang = getTtsLanguageCode(language);
      const result = await generateSpeech({ text: textToSpeak, languageCode: ttsLang });
      
      if (result.audioDataUri) {
        setAudioDataUri(result.audioDataUri);
        if (audioRef.current) {
          audioRef.current.src = result.audioDataUri;
          audioRef.current.play().catch(e => console.error("Audio play failed:", e));
          setIsPlaying(true);
        }
      } else {
        throw new Error('Failed to generate audio.');
      }
    } catch (e) {
      console.error(e);
      const errorMessage = 'Failed to generate audio for this text.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Audio Error',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [language, textToSpeak, toast, audioDataUri]);


  const handlePlayPause = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      fetchAndPlayAudio();
    }
  };
  
  if (!textToSpeak) return null;

  return (
    <Button variant="ghost" size="icon" onClick={handlePlayPause} disabled={isLoading || !!error}>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isPlaying ? (
        <Pause className="h-5 w-5" />
      ) : error ? (
        <AlertTriangle className="h-5 w-5 text-destructive" />
      ) : (
        <Play className="h-5 w-5" />
      )}
    </Button>
  );
}
