import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Music2, Loader2, X, Play, Plus, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { musicService } from '../services/musicService';
import { Song } from '../types/models';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import FallbackImage from './FallbackImage';

const SongRecognition: React.FC = () => {
    const navigate = useNavigate();
    const { play, addToQueue } = useAudioPlayer();

    const [mode, setMode] = useState<'idle' | 'recording' | 'processing' | 'result'>('idle');
    const [isHumming, setIsHumming] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [result, setResult] = useState<Song | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confidence, setConfidence] = useState<number | null>(null);

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const animationRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
                mediaRecorder.current.stop();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    // Waveform visualization
    const drawWaveform = () => {
        if (!canvasRef.current || !analyserRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteTimeDomainData(dataArray);

            ctx.fillStyle = 'transparent';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgb(139, 92, 246)'; // Purple gradient color
            ctx.beginPath();

            const sliceWidth = (canvas.width * 1.0) / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        };

        draw();
    };

    const startRecording = async () => {
        try {
            setError(null);
            setResult(null);
            setRecordingTime(0);
            audioChunks.current = [];

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Setup audio visualization
            audioContextRef.current = new AudioContext();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 2048;
            source.connect(analyserRef.current);

            drawWaveform();

            mediaRecorder.current = new MediaRecorder(stream);

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            mediaRecorder.current.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                await recognizeSong(audioBlob);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
            };

            mediaRecorder.current.start();
            setMode('recording');

            // Timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 10) {
                        stopRecording();
                        return 10;
                    }
                    return prev + 1;
                });
            }, 1000);

            // Auto-stop after 10 seconds
            setTimeout(() => {
                if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
                    stopRecording();
                }
            }, 10000);

        } catch (err) {
            console.error('Microphone access error:', err);
            setError('Could not access microphone. Please allow microphone permissions.');
            setMode('idle');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stop();
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    };

    const recognizeSong = async (audioBlob: Blob) => {
        setMode('processing');

        try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);

            reader.onloadend = async () => {
                const base64Audio = reader.result as string;

                const response = await musicService.recognizeSong(base64Audio, isHumming);

                if (response.success && response.data) {
                    setResult(response.data.song);
                    setConfidence(response.data.recognized?.confidence || null);
                    setMode('result');
                } else {
                    setError(isHumming
                        ? 'Could not identify song from humming. Try humming more clearly or for longer.'
                        : 'Could not identify song. Try playing it louder or in a quieter environment.'
                    );
                    setMode('idle');
                }
            };
        } catch (err: any) {
            console.error('Recognition error:', err);
            setError(err.message || 'Recognition failed. Please try again.');
            setMode('idle');
        }
    };

    const reset = () => {
        setMode('idle');
        setResult(null);
        setError(null);
        setConfidence(null);
        setRecordingTime(0);
    };

    const handlePlay = () => {
        if (result) {
            play(result);
        }
    };

    const handleAddToQueue = () => {
        if (result) {
            addToQueue(result);
        }
    };

    const handleAddToFavorites = async () => {
        if (result) {
            try {
                await musicService.addToFavorites(result.id);
            } catch (err) {
                console.warn('Could not add to favorites');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                        <Music2 className="h-7 w-7 md:h-8 md:w-8 text-music-purple" />
                        Song Recognition
                    </h2>
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="h-6 w-6 text-gray-400 hover:text-white" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="glass rounded-3xl p-6 md:p-8 space-y-6">

                    {/* Idle State */}
                    {mode === 'idle' && (
                        <>
                            {/* Mode Toggle */}
                            <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
                                <button
                                    onClick={() => setIsHumming(false)}
                                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${!isHumming
                                            ? 'bg-gradient-to-r from-music-purple to-music-blue text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <Mic className="h-5 w-5 mx-auto mb-1" />
                                    Record Audio
                                </button>
                                <button
                                    onClick={() => setIsHumming(true)}
                                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${isHumming
                                            ? 'bg-gradient-to-r from-music-purple to-music-blue text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <Music2 className="h-5 w-5 mx-auto mb-1" />
                                    Hum/Sing
                                </button>
                            </div>

                            {/* Instructions */}
                            <div className="text-center space-y-3 py-8">
                                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-music-purple/20 to-music-blue/20 rounded-full flex items-center justify-center">
                                    {isHumming ? (
                                        <Music2 className="h-12 w-12 text-music-purple" />
                                    ) : (
                                        <Mic className="h-12 w-12 text-music-blue" />
                                    )}
                                </div>
                                <p className="text-gray-300 text-lg">
                                    {isHumming
                                        ? 'Hum or sing the melody you remember'
                                        : 'Play the song near your device'}
                                </p>
                                <p className="text-gray-500 text-sm">
                                    {isHumming
                                        ? 'We\'ll find the song from your melody'
                                        : 'We\'ll identify it in seconds'}
                                </p>
                            </div>

                            {/* Error Display */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                    <p className="text-red-400 text-sm text-center">{error}</p>
                                </div>
                            )}

                            {/* Start Button */}
                            <button
                                onClick={startRecording}
                                className="w-full py-4 bg-gradient-to-r from-music-purple to-music-blue text-white font-bold rounded-xl hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all transform hover:scale-105 active:scale-95"
                            >
                                Start {isHumming ? 'Humming' : 'Recording'}
                            </button>
                        </>
                    )}

                    {/* Recording State */}
                    {mode === 'recording' && (
                        <>
                            <div className="text-center space-y-4 py-8">
                                <div className="relative w-32 h-32 mx-auto">
                                    <div className="absolute inset-0 bg-gradient-to-br from-music-purple to-music-blue rounded-full animate-pulse opacity-20"></div>
                                    <div className="absolute inset-4 bg-gradient-to-br from-music-purple to-music-blue rounded-full flex items-center justify-center">
                                        <Mic className="h-12 w-12 text-white animate-pulse" />
                                    </div>
                                </div>

                                <div className="text-4xl font-bold text-white font-mono">
                                    {recordingTime}s / 10s
                                </div>

                                {/* Waveform Canvas */}
                                <canvas
                                    ref={canvasRef}
                                    width={300}
                                    height={80}
                                    className="w-full rounded-lg"
                                />

                                <p className="text-gray-300">
                                    {isHumming ? 'Listening to your melody...' : 'Listening...'}
                                </p>
                            </div>

                            <button
                                onClick={stopRecording}
                                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Square className="h-5 w-5 fill-white" />
                                Stop Recording
                            </button>
                        </>
                    )}

                    {/* Processing State */}
                    {mode === 'processing' && (
                        <div className="text-center space-y-6 py-12">
                            <Loader2 className="h-16 w-16 text-music-purple animate-spin mx-auto" />
                            <div className="space-y-2">
                                <p className="text-xl text-white font-semibold">
                                    {isHumming ? 'Matching melody...' : 'Identifying song...'}
                                </p>
                                <p className="text-gray-400 text-sm">This usually takes a few seconds</p>
                            </div>
                        </div>
                    )}

                    {/* Result State */}
                    {mode === 'result' && result && (
                        <>
                            <div className="text-center space-y-4 py-4">
                                <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                                    <Music2 className="h-8 w-8 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-green-400 font-semibold">Song Identified!</p>
                                    {confidence && (
                                        <p className="text-sm text-gray-500">{confidence}% confident</p>
                                    )}
                                </div>
                            </div>

                            {/* Song Card */}
                            <div className="glass rounded-2xl overflow-hidden">
                                <div className="flex gap-4 p-4">
                                    <FallbackImage
                                        src={result.thumbnail}
                                        alt={result.title}
                                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-semibold text-lg truncate">
                                            {result.title}
                                        </h3>
                                        <p className="text-gray-400 text-sm truncate">{result.artist}</p>
                                        <p className="text-gray-500 text-xs mt-1">
                                            {musicService.formatDuration(result.duration)}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 p-4 pt-0">
                                    <button
                                        onClick={handlePlay}
                                        className="flex-1 py-3 bg-gradient-to-r from-music-purple to-music-blue text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <Play className="h-5 w-5 fill-white" />
                                        Play Now
                                    </button>
                                    <button
                                        onClick={handleAddToQueue}
                                        className="p-3 glass-hover rounded-lg transition-colors"
                                        title="Add to queue"
                                    >
                                        <Plus className="h-5 w-5 text-gray-400 hover:text-white" />
                                    </button>
                                    <button
                                        onClick={handleAddToFavorites}
                                        className="p-3 glass-hover rounded-lg transition-colors"
                                        title="Add to favorites"
                                    >
                                        <Heart className="h-5 w-5 text-gray-400 hover:text-red-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Try Another Button */}
                            <button
                                onClick={reset}
                                className="w-full py-3 text-gray-400 hover:text-white font-medium transition-colors"
                            >
                                🔄 Try Another Song
                            </button>
                        </>
                    )}
                </div>

                {/* Tips */}
                {mode === 'idle' && (
                    <div className="mt-6 text-center">
                        <p className="text-gray-500 text-sm">
                            💡 Tip: {isHumming
                                ? 'Hum clearly for 5-10 seconds for best results'
                                : 'Make sure the music is loud enough and there\'s minimal background noise'
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SongRecognition;
