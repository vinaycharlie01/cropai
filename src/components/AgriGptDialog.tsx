
'use client';

import { Mic, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { processAgriGptCommand, AgriGptOutput } from '@/ai/flows/agrigpt-flow';
import { usePathname, useRouter } from 'next/navigation';

export function AgriGptDialog() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState<AgriGptOutput | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAiResponse = (response: AgriGptOutput) => {
    setAiResponse(response);
    // Future: Play TTS audio of response.kisanMitraResponse.localized

    // Handle navigation
    if (response.actionCode === 'SPEAK_AND_NAVIGATE' && response.navigationTarget) {
      router.push(response.navigationTarget);
      setTimeout(() => setIsOpen(false), 1000); // Close dialog after navigation
    }
  };

  const onRecognitionResult = useCallback(async (result: string) => {
    if (!result) return;
    setIsProcessing(true);
    setAiResponse(null);
    try {
      const response = await processAgriGptCommand({
        transcribedQuery: result,
        conversationHistory: [], // TODO: Implement conversation history
        currentScreen: pathname,
        language: language,
      });
      handleAiResponse(response);
    } catch (error) {
      console.error('AgriGPT Error:', error);
      toast({
        variant: 'destructive',
        title: 'AgriGPT Error',
        description: 'Sorry, I had trouble understanding that. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [pathname, language, toast, router]);

  const onRecognitionError = useCallback((err: string) => {
    console.error(err);
    if (err !== 'no-speech') {
        toast({ variant: 'destructive', title: t('error'), description: 'Speech recognition failed.' });
    }
  }, [t, toast]);

  const { isListening, startListening, stopListening, transcript, isSupported } = useSpeechRecognition({
    onResult: onRecognitionResult,
    onError: onRecognitionError,
    onEnd: () => {
        // Automatically stop listening if user stops talking
    }
  });

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setAiResponse(null);
      startListening(language);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50"
        >
          <Mic className="h-8 w-8" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background/80 backdrop-blur-sm border-border/50">
        <DialogHeader>
          <DialogTitle className="text-center font-headline text-2xl">AgriGPT</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-6 py-8 min-h-[200px]">
          <Button
            size="icon"
            onClick={handleMicClick}
            className={cn(
                "h-24 w-24 rounded-full transition-all duration-300",
                isListening && "scale-110 bg-destructive hover:bg-destructive/90 animate-pulse"
            )}
          >
            <Mic className="h-12 w-12" />
          </Button>
          <p className="text-lg text-muted-foreground text-center">
            {isProcessing ? "Thinking..." : isListening ? "Listening..." : "Tap the mic and speak"}
          </p>
          <div className="min-h-[50px] text-center">
            {transcript && <p className="text-sm">"{transcript}"</p>}
            {aiResponse && <p className="font-semibold">{aiResponse.kisanMitraResponse.localized}</p>}
          </div>
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" className="w-full">{isListening ? "Stop" : "Close"}</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
