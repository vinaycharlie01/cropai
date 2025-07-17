
import { useState, useRef, useCallback, useEffect } from 'react';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { useToast } from './use-toast';

export const useAudioPlayer = () => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const generateAudio = useCallback(async (text: string, language: string) => {
    if (!text) return;
    setIsLoading(true);
    cleanup();
    try {
      const result = await textToSpeech({ text, language });
      setAudioUrl(result.audioDataUri);
    } catch (e) {
      console.error("TTS Error:", e);
      toast({ variant: "destructive", title: "Audio Error", description: "Could not generate audio." });
      setAudioUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  const play = useCallback(() => {
    if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
    }
  }, []);
  
  const cleanup = useCallback(() => {
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
      }
      setAudioUrl(null);
      setIsPlaying(false);
      setIsLoading(false);
  }, []);


  useEffect(() => {
    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onplay = () => setIsPlaying(true);
    }
    
    // Cleanup on unmount
    return () => {
        if(audioRef.current) {
            audioRef.current.pause();
        }
    }
  }, [audioUrl]);


  return {
    audioUrl,
    isLoading,
    isPlaying,
    generateAudio,
    play,
    pause,
    cleanup,
  };
};

    