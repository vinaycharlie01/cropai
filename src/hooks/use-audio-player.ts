
import { useState, useRef, useCallback, useEffect } from 'react';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { useToast } from './use-toast';

export const useAudioPlayer = () => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const cleanup = useCallback(() => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
    }
    setAudioUrl(null);
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

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
  }, [toast, cleanup]);
  
  const play = useCallback(() => {
    if (audioRef.current) {
        audioRef.current.play().catch(e => console.error("Audio play error:", e));
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
        audioRef.current.pause();
    }
  }, []);

  useEffect(() => {
    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);
      const audio = audioRef.current;
      
      const onPlaying = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      const onEnded = () => setIsPlaying(false);

      audio.addEventListener('playing', onPlaying);
      audio.addEventListener('pause', onPause);
      audio.addEventListener('ended', onEnded);
      
      return () => {
        audio.removeEventListener('playing', onPlaying);
        audio.removeEventListener('pause', onPause);
        audio.removeEventListener('ended', onEnded);
        audio.pause();
      };
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
