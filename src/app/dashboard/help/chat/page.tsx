
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Mic } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { chatWithSupport, SupportChatOutput } from '@/ai/flows/support-chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { getTtsLanguageCode } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';

type Message = {
    role: 'user' | 'model';
    parts: { text: string }[];
};

export default function ChatPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const onRecognitionResult = useCallback((result: string) => {
      setInput(result);
    }, []);

    const onRecognitionError = useCallback((err: string) => {
        console.error(err);
        toast({ variant: 'destructive', title: t('error'), description: 'Speech recognition failed.' });
    }, [t, toast]);

    const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition({
      onResult: onRecognitionResult,
      onError: onRecognitionError,
    });

    const handleSttToggle = () => {
        if (isListening) {
            stopListening();
        } else {
            const ttsLang = getTtsLanguageCode(language);
            startListening(ttsLang);
        }
    };


    useEffect(() => {
        if(messages.length === 0) {
            setMessages([
                { role: 'model', parts: [{ text: t('chatWelcomeMessage') }] }
            ]);
        }
    }, [t, messages.length]);

    useEffect(() => {
        // Scroll to the bottom when messages change
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }
    }, [messages]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const newUserMessage: Message = { role: 'user', parts: [{ text: input }] };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            const result: SupportChatOutput = await chatWithSupport({
                message: input,
                history: updatedMessages.map(m => ({
                    role: m.role,
                    parts: m.parts.map(p => ({text: p.text}))
                })),
                language: language,
            });
            
            const newBotMessage: Message = { role: 'model', parts: [{ text: result.reply }] };
            setMessages(prev => [...prev, newBotMessage]);

        } catch (error) {
            console.error("Chat error:", error);
            const errorMessage: Message = { role: 'model', parts: [{ text: t('chatError') }] };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="h-[calc(100vh-10rem)]"
        >
            <Card className="h-full flex flex-col bg-background">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center gap-2">
                        <Bot /> {t('chatWithSupport')}
                    </CardTitle>
                    <CardDescription>{t('chatWithSupportDescLong')}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow overflow-hidden">
                   <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
                        <div className="space-y-6">
                            <AnimatePresence>
                                {messages.map((msg, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className={cn(
                                            "flex items-start gap-3",
                                            msg.role === 'user' && "justify-end"
                                        )}
                                    >
                                        {msg.role === 'model' && (
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback><Bot /></AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div className={cn(
                                            "max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg whitespace-pre-wrap",
                                            msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                                        )}>
                                            {msg.parts[0].text}
                                        </div>
                                         {msg.role === 'user' && (
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback><User /></AvatarFallback>
                                            </Avatar>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                             {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex items-start gap-3"
                                >
                                     <Avatar className="h-8 w-8">
                                        <AvatarFallback><Bot /></AvatarFallback>
                                    </Avatar>
                                    <div className="bg-muted p-3 rounded-lg rounded-bl-none flex items-center">
                                       <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="pt-4 border-t">
                    <form onSubmit={handleSendMessage} className="w-full flex items-center gap-2">
                        <div className="relative w-full">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={t('chatPlaceholder')}
                                disabled={isLoading}
                                className="pr-12"
                            />
                             <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={handleSttToggle}
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                disabled={!isSupported || isLoading}
                            >
                                <Mic className={`h-5 w-5 ${isListening ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                            </Button>
                        </div>
                        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
