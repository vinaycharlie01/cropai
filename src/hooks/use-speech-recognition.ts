
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionOptions {
    onResult: (result: string) => void;
    onError: (error: string) => void;
}

const getSpeechRecognition = () => {
    if (typeof window !== 'undefined') {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            return new SpeechRecognition();
        }
    }
    return null;
}

export const useSpeechRecognition = ({ onResult, onError }: SpeechRecognitionOptions) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const onResultRef = useRef(onResult);
    onResultRef.current = onResult;

    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    useEffect(() => {
        recognitionRef.current = getSpeechRecognition();
        const recognition = recognitionRef.current;

        if (!recognition) {
            console.error('Speech recognition not supported in this browser.');
            return;
        }

        recognition.continuous = false;
        recognition.interimResults = false;

        const handleResult = (event: SpeechRecognitionEvent) => {
            const finalTranscript = event.results[0][0].transcript;
            setTranscript(finalTranscript);
            onResultRef.current(finalTranscript);
            setIsListening(false);
        };
        
        const handleError = (event: SpeechRecognitionErrorEvent) => {
            onErrorRef.current(event.error);
            setIsListening(false);
        };
        
        const handleEnd = () => {
            setIsListening(false);
        };

        recognition.addEventListener('result', handleResult);
        recognition.addEventListener('error', handleError);
        recognition.addEventListener('end', handleEnd);
        
        return () => {
            recognition.removeEventListener('result', handleResult);
            recognition.removeEventListener('error', handleError);
            recognition.removeEventListener('end', handleEnd);
            recognitionRef.current?.stop();
        };
    }, []);

    const startListening = useCallback((lang: string = 'en-US') => {
        if (recognitionRef.current && !isListening) {
            recognitionRef.current.lang = lang;
            try {
                recognitionRef.current.start();
                setIsListening(true);
                setTranscript('');
            } catch (err) {
                console.error("Error starting speech recognition:", err);
                onErrorRef.current('start-failed');
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, [isListening]);

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        isSupported: !!recognitionRef.current,
    };
};
