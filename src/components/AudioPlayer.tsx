
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
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioDataUriRef = useRef<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize the audio element once.
    if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    }
    
    // Reset state when the text to speak changes.
    setIsPlaying(false);
    audioDataUriRef.current = null;
    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    // Cleanup on unmount
    return () => {
        if (audioRef.current) {
            audioRef.current.removeEventListener('ended', () => setIsPlaying(false));
        }
    }
  }, [textToSpeak, language]);


  const fetchAndPlayAudio = useCallback(async () => {
    // If we already have the audio, just play it.
    if (audioDataUriRef.current && audioRef.current) {
      audioRef.current.play().catch(e => {
          console.error("Audio play failed:", e);
          setError("Could not play audio.");
      });
      setIsPlaying(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ttsLang = getTtsLanguageCode(language);
      const result = await generateSpeech({ text: textToSpeak, languageCode: ttsLang });
      
      if (result.audioDataUri) {
        audioDataUriRef.current = result.audioDataUri;
        if (audioRef.current) {
          audioRef.current.src = result.audioDataUri;
          audioRef.current.play().catch(e => {
            console.error("Audio play failed:", e);
            setError("Could not play audio.");
            setIsPlaying(false);
          });
          setIsPlaying(true);
        }
      } else {
        throw new Error('Failed to generate audio from the service.');
      }
    } catch (e: any) {
      console.error(e);
      const errorMessage = e.message || 'Failed to generate audio for this text.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Audio Error',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [language, textToSpeak, toast]);


  const handlePlayPause = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      fetchAndPlayAudio();
    }
  };
  
  if (!textToSpeak || textToSpeak.trim() === '') return null;

  return (
    <Button variant="ghost" size="icon" onClick={handlePlayPause} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isPlaying ? (
        <Pause className="h-5 w-5" />
      ) : error ? (
        <AlertTriangle className="h-5 w-5 text-destructive" />
      ) : (
        <Play className="h-5 w-5" />
      )}
      <span className="sr-only">Play/Pause Audio</span>
    </Button>
  );
}
