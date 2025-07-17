import { useState, useRef, useCallback, useEffect } from 'react';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { useToast } from './use-toast';

export const useAudioPlayer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

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
  
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ''; // Release memory
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    // Create the audio element once and reuse it
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const onPlaying = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    // Cleanup on unmount
    return () => {
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = null;
    };
  }, []);

  const generateAudio = useCallback(async (text: string, language: string) => {
    if (!text || !audioRef.current) return;
    
    cleanup();
    setIsLoading(true);

    try {
      const result = await textToSpeech({ text, language });
      if (audioRef.current) {
        audioRef.current.src = result.audioDataUri;
        play(); // Autoplay when ready
      }
    } catch (e) {
      console.error("TTS Error:", e);
      toast({ 
        variant: "destructive", 
        title: "Audio Error", 
        description: "Could not generate audio at this time." 
      });
      if (audioRef.current) {
        audioRef.current.src = '';
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast, cleanup, play]);

  const hasAudio = !!audioRef.current?.src;

  return { isLoading, isPlaying, hasAudio, generateAudio, play, pause };
};
