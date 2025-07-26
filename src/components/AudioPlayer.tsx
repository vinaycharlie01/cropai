
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

  useEffect(() => {
    // Reset state when text changes
    setIsPlaying(false);
    setAudioDataUri(null);
    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [textToSpeak]);
  
  useEffect(() => {
    if (audioDataUri && !audioRef.current) {
        audioRef.current = new Audio(audioDataUri);
        audioRef.current.onended = () => setIsPlaying(false);
    }
    if (audioRef.current && audioDataUri) {
        audioRef.current.src = audioDataUri;
    }
  }, [audioDataUri]);

  const fetchAndPlayAudio = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const ttsLang = getTtsLanguageCode(language);
      const result = await generateSpeech({ text: textToSpeak, languageCode: ttsLang });
      
      if (result.audioDataUri) {
        setAudioDataUri(result.audioDataUri);
      } else {
        throw new Error('Failed to generate audio.');
      }
    } catch (e) {
      console.error(e);
      setError('Failed to generate audio.');
      toast({
        variant: 'destructive',
        title: 'Audio Error',
        description: 'Failed to generate audio for this text.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [language, textToSpeak, toast]);

  useEffect(() => {
    if(audioDataUri && audioRef.current && isPlaying) {
        audioRef.current.play().catch(e => {
            console.error("Audio play failed:", e)
            setIsPlaying(false);
        });
    }
  }, [audioDataUri, isPlaying])

  const handlePlayPause = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (audioDataUri && audioRef.current) {
        audioRef.current.play().catch(e => console.error(e));
        setIsPlaying(true);
      } else if (!isLoading) {
        await fetchAndPlayAudio();
        setIsPlaying(true);
      }
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
