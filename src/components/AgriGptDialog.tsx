
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Bot, User, Send, Mic, Loader2, Sparkles, History, AlertTriangle } from 'lucide-react';
import { agriGpt, type AgriGptInput, type AgriGptOutput } from '@/ai/flows/agrigpt-flow';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { getTtsLanguageCode, TranslationKeys } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioPlayer } from './AudioPlayer';
import { generateSpeech } from '@/ai/flows/tts-flow';
import { HistoryPart } from '@/types/agrigpt';

interface Message {
  role: 'user' | 'model';
  text: string;
  audioSrc?: string | null;
  isAudioLoading?: boolean;
}

interface AgriGptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const suggestedPrompts: TranslationKeys[] = [
    'diagnoseDisease',
    'mandiPrices',
    'govtSchemes',
    'weatherForecast'
];

export function AgriGptDialog({ open, onOpenChange }: AgriGptDialogProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: 'model',
          text: 'Hello! I am AgriGPT, your personal AI assistant. How can I help you today? You can ask me about crop diseases, market prices, or government schemes.',
        },
      ]);
    }
  }, [open, messages.length]);


  useEffect(scrollToBottom, [messages]);
  
  const handleTtsForMessage = useCallback(async (textToSpeak: string, messageIndex: number) => {
    setMessages(prev => prev.map((msg, idx) => idx === messageIndex ? { ...msg, isAudioLoading: true } : msg));
    try {
        const response = await generateSpeech({ text: textToSpeak, language });
        setMessages(prev => prev.map((msg, idx) => idx === messageIndex ? { ...msg, audioSrc: response.audioDataUri, isAudioLoading: false } : msg));
    } catch (err) {
        console.error('TTS Generation Error:', err);
        toast({ variant: 'destructive', title: 'Audio Error', description: 'Failed to generate audio.' });
        setMessages(prev => prev.map((msg, idx) => idx === messageIndex ? { ...msg, isAudioLoading: false } : msg));
    }
  }, [language, toast]);

  const handleSubmit = async (messageText?: string) => {
    const userMessage = messageText || input;
    if (!userMessage.trim()) return;

    setIsLoading(true);
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', text: userMessage }];
    setMessages(newMessages);

    try {
      const history: HistoryPart[] = newMessages.slice(0, -1).map(msg => ({
        role: msg.role,
        content: [{ text: msg.text }],
      }));

      const result = await agriGpt({ message: userMessage, history, language });
      setMessages(prev => [...prev, { role: 'model', text: result.reply }]);
    } catch (e: any) {
      console.error("AgriGPT Error:", e);
      toast({ variant: 'destructive', title: t('error'), description: e.message || 'An unexpected error occurred.' });
      setMessages(prev => [...prev, { role: 'model', text: "I'm sorry, something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition({
    onResult: (result) => {
      setInput(result);
      handleSubmit(result);
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Speech Error', description: `Speech recognition failed: ${error}` });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2 font-headline text-xl">
            <Sparkles className="text-primary" />
            AgriGPT Assistant
          </DialogTitle>
           <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 p-3 rounded-lg text-xs flex items-start gap-2 mt-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>This is a new service and prone to errors. Please take a critical look at the answers given.</p>
            </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4">
          <AnimatePresence>
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex items-start gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {msg.role === 'model' && <Bot className="h-8 w-8 text-primary shrink-0" />}
                  <div
                    className={cn(
                      'max-w-md p-3 rounded-lg shadow-sm',
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                     {msg.role === 'model' && (
                      <div className="text-right mt-2">
                           <AudioPlayer
                              audioSrc={msg.audioSrc || null}
                              isLoading={msg.isAudioLoading || false}
                              onPlaybackRequest={() => handleTtsForMessage(msg.text, index)}
                          />
                      </div>
                  )}
                  </div>
                  {msg.role === 'user' && <User className="h-8 w-8 text-muted-foreground shrink-0" />}
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-3">
                    <Bot className="h-8 w-8 text-primary" />
                    <div className="p-3 rounded-lg bg-muted">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                </div>
              )}
            </div>
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </ScrollArea>
        
        <div className="p-4 border-t bg-background">
            {messages.length <= 1 && (
                <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                    {suggestedPrompts.map((key) => (
                        <Button key={key} variant="outline" size="sm" className="justify-start h-auto py-2" onClick={() => handleSubmit(t(key))}>
                            {t(key)}
                        </Button>
                    ))}
                </div>
            )}
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSubmit()}
              placeholder={isListening ? 'Listening...' : "Ask a question..."}
              disabled={isLoading || isListening}
              className="h-11"
            />
            <Button size="icon" className="h-11 w-11" onClick={() => handleSubmit()} disabled={isLoading || !input.trim()}>
              <Send />
            </Button>
            <Button size="icon" className="h-11 w-11" variant={isListening ? 'destructive' : 'outline'} onClick={isListening ? stopListening : () => startListening(getTtsLanguageCode(language))} disabled={!isSupported}>
              <Mic />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
