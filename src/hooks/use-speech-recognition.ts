
'use client';

import { useState, useEffect, useRef } from 'react';

interface SpeechRecognitionOptions {
    onResult?: (result: string) => void;
    onError?: (error: string) => void;
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

export const useSpeechRecognition = ({ onResult, onError }: SpeechRecognitionOptions = {}) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        recognitionRef.current = getSpeechRecognition();
        const recognition = recognitionRef.current;

        if (!recognition) {
            console.error('Speech recognition not supported in this browser.');
            return;
        }

        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const finalTranscript = event.results[0][0].transcript;
            setTranscript(finalTranscript);
            if (onResult) {
                onResult(finalTranscript);
            }
            setIsListening(false);
        };

        recognition.onerror = (event) => {
            if (onError) {
                onError(event.error);
            }
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };
        
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onResult, onError]);

    const startListening = (lang: string = 'en-US') => {
        if (recognitionRef.current && !isListening) {
            recognitionRef.current.lang = lang;
            recognitionRef.current.start();
            setIsListening(true);
            setTranscript('');
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        isSupported: !!recognitionRef.current,
    };
};
