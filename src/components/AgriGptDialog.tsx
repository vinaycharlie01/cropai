
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
import { processAgriGptCommand, AgriGptOutput, HistoryPart } from '@/ai/flows/agrigpt-flow';
import { usePathname } from 'next/navigation';
import { getTtsLanguageCode } from '@/lib/translations';
import { AudioPlayer } from './AudioPlayer';

export function AgriGptDialog() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<HistoryPart[]>([]);
  const [currentResponse, setCurrentResponse] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onRecognitionResult = useCallback(async (result: string) => {
    if (!result) return;
    setIsProcessing(true);
    setCurrentResponse(null);

    const userMessage: HistoryPart = { role: 'user', content: [{ text: result }] };
    const newHistory = [...conversationHistory, userMessage];
    setConversationHistory(newHistory);

    try {
      const response = await processAgriGptCommand({
        transcribedQuery: result,
        conversationHistory: newHistory,
        language: language,
      });
      
      const aiMessage: HistoryPart = { role: 'model', content: [{ text: response.kisanMitraResponse }] };
      setConversationHistory(prev => [...prev, aiMessage]);
      setCurrentResponse(response.kisanMitraResponse);

    } catch (error) {
      console.error('AgriGPT Error:', error);
      const errorMessage = 'Sorry, I had trouble understanding that. Please try again.';
      toast({
        variant: 'destructive',
        title: 'AgriGPT Error',
        description: errorMessage,
      });
      setCurrentResponse(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [pathname, language, toast, conversationHistory]);

  const onRecognitionError = useCallback((err: string) => {
    console.error(err);
    if (err !== 'no-speech') {
        toast({ variant: 'destructive', title: t('error'), description: 'Speech recognition failed.' });
    }
  }, [t, toast]);

  const { isListening, startListening, stopListening, transcript, isSupported } = useSpeechRecognition({
    onResult: onRecognitionResult,
    onError: onRecognitionError,
  });

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setCurrentResponse(null);
      startListening(getTtsLanguageCode(language));
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if(isListening) stopListening();
      // Reset state when closing the dialog
      setConversationHistory([]);
      setCurrentResponse(null);
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
            disabled={isProcessing}
          >
            <Mic className="h-12 w-12" />
          </Button>
          <p className="text-lg text-muted-foreground text-center">
            {isProcessing ? "Thinking..." : isListening ? "Listening..." : "Tap the mic and speak"}
          </p>
          <div className="min-h-[50px] text-center">
            {transcript && !currentResponse && <p className="text-sm">"{transcript}"</p>}
            {currentResponse && (
                <div className='space-y-4'>
                    <p className="font-semibold">{currentResponse}</p>
                    <AudioPlayer textToSpeak={currentResponse} />
                </div>
            )}
          </div>
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" className="w-full">Close</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
