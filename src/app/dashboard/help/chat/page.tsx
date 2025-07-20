
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, Mic, Loader2, Bot, User, Speaker } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { processAgriGptCommand, AgriGptOutput } from '@/ai/flows/agrigpt-flow';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getTtsLanguageCode } from '@/lib/translations';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function KisanSaathiChatPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const pathname = usePathname();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  
  const handleAiResponse = useCallback((response: AgriGptOutput) => {
    setMessages(prev => [...prev, { role: 'model', text: response.kisanMitraResponse.localized }]);
    // In a real app, you would handle navigation or other actions here
  }, []);

  const onRecognitionResult = useCallback((result: string) => {
    if (result) {
      setInput(result);
      handleSubmit(result);
    }
  }, []); // We'll define handleSubmit inside the component render scope

  const onRecognitionError = useCallback((err: string) => {
      console.error(err);
      toast({ variant: 'destructive', title: t('error'), description: 'Speech recognition failed.' });
  }, [t, toast]);

  const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition({
    onResult: onRecognitionResult,
    onError: onRecognitionError
  });
  
  const handleVoiceInput = () => {
      if (isListening) {
          stopListening();
      } else {
          startListening(getTtsLanguageCode(language));
      }
  };

  const handleSubmit = async (query?: string) => {
    const userMessage = query || input;
    if (!userMessage.trim()) return;

    setIsLoading(true);
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    
    try {
        const conversationHistory = messages.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        const response = await processAgriGptCommand({
            transcribedQuery: userMessage,
            conversationHistory: conversationHistory,
            currentScreen: pathname,
            language: language,
        });
        handleAiResponse(response);
    } catch (e) {
        console.error("AI chat error:", e);
        toast({ variant: 'destructive', title: t('error'), description: t('chatError') });
         setMessages(prev => [...prev, { role: 'model', text: t('chatError') }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col h-[calc(100vh-8rem)]" // Adjust height based on your layout
    >
      <Card className="flex-1 flex flex-col bg-background">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">{t('chatWithSupport')}</CardTitle>
          <CardDescription>{t('chatWithSupportDescLong')}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'model' && <Bot className="h-8 w-8 text-primary" />}
              <div className={cn(
                  "max-w-xs md:max-w-md p-3 rounded-lg",
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                 {msg.role === 'model' && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 mt-2 ml-auto block">
                      <Speaker className="h-4 w-4" />
                    </Button>
                )}
              </div>
              {msg.role === 'user' && <User className="h-8 w-8 text-muted-foreground" />}
            </div>
          ))}
           {isLoading && (
              <div className="flex items-center gap-3">
                  <Bot className="h-8 w-8 text-primary" />
                  <div className="p-3 rounded-lg bg-muted">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
              </div>
            )}
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSubmit()}
              placeholder={t('chatPlaceholder')}
              disabled={isLoading || isListening}
            />
            <Button size="icon" onClick={() => handleSubmit()} disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
            <Button size="icon" variant={isListening ? 'destructive' : 'outline'} onClick={handleVoiceInput} disabled={!isSupported}>
              <Mic />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
