
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionOptions {
    onResult: (result: string) => void;
    onError: (error: string) => void;
    onEnd?: () => void;
}

let recognition: SpeechRecognition | null = null;

const getSpeechRecognition = (): SpeechRecognition | null => {
    if (typeof window !== 'undefined' && !recognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
        }
    }
    return recognition;
};

export const useSpeechRecognition = ({ onResult, onError, onEnd }: SpeechRecognitionOptions) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');

    const onResultRef = useRef(onResult);
    onResultRef.current = onResult;

    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;
    
    const onEndRef = useRef(onEnd);
    onEndRef.current = onEnd;

    useEffect(() => {
        const recognitionInstance = getSpeechRecognition();

        if (!recognitionInstance) {
            console.error('Speech recognition not supported in this browser.');
            return;
        }

        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;

        const handleResult = (event: SpeechRecognitionEvent) => {
            const finalTranscript = event.results[0][0].transcript;
            setTranscript(finalTranscript);
            onResultRef.current(finalTranscript);
        };
        
        const handleError = (event: SpeechRecognitionErrorEvent) => {
            onErrorRef.current(event.error);
        };
        
        const handleEnd = () => {
            setIsListening(false);
            if(onEndRef.current) {
                onEndRef.current();
            }
        };

        recognitionInstance.addEventListener('result', handleResult);
        recognitionInstance.addEventListener('error', handleError);
        recognitionInstance.addEventListener('end', handleEnd);
        
        return () => {
            recognitionInstance.removeEventListener('result', handleResult);
            recognitionInstance.removeEventListener('error', handleError);
            recognitionInstance.removeEventListener('end', handleEnd);
            recognitionInstance.stop();
        };
    }, []);

    const startListening = useCallback((lang: string = 'en-US') => {
        const recognitionInstance = getSpeechRecognition();
        if (recognitionInstance && !isListening) {
            recognitionInstance.lang = lang;
            try {
                recognitionInstance.start();
                setIsListening(true);
                setTranscript('');
            } catch (err) {
                console.error("Error starting speech recognition:", err);
                onErrorRef.current('start-failed');
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        const recognitionInstance = getSpeechRecognition();
        if (recognitionInstance && isListening) {
            recognitionInstance.stop();
        }
    }, [isListening]);

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        isSupported: !!getSpeechRecognition(),
    };
};
