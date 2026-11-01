import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send, Loader2 } from 'lucide-react';
import { uploadFileApi } from '../../api/upload';

interface VoiceRecorderProps {
  onSend: (media: any, duration: number) => Promise<void>;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(true);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start recording on mount
  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not access microphone. Please ensure microphone permissions are granted.');
      onCancel();
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  };

  const togglePreviewPlay = () => {
    if (!audioUrl) return;

    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio(audioUrl);
      previewAudioRef.current.onended = () => {
        setIsPlayingPreview(false);
      };
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSendVoiceNote = async () => {
    if (!audioBlob) return;
    setIsSending(true);

    try {
      const ext = audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
      const filename = `voice_note_${Date.now()}.${ext}`;
      const media = await uploadFileApi(audioBlob, filename);
      media.duration = recordingSeconds;

      await onSend(media, recordingSeconds);
      cleanup();
    } catch (err: any) {
      alert(err.message || 'Failed to send voice message.');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-1.5 sm:space-x-3 w-full bg-slate-100 dark:bg-slate-800/90 py-1.5 sm:py-2 px-2 sm:px-4 rounded-2xl border border-slate-200 dark:border-slate-700 animate-slide-up select-none">
      {/* Delete / Cancel button */}
      <button
        type="button"
        onClick={() => {
          cleanup();
          onCancel();
        }}
        disabled={isSending}
        className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition flex-shrink-0"
        title="Discard voice recording"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Recording status or Audio preview */}
      <div className="flex-1 flex items-center space-x-2 min-w-0">
        {isRecording ? (
          <>
            <span className="flex h-2.5 w-2.5 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="text-xs font-mono font-bold text-rose-500 flex-shrink-0">
              {formatTime(recordingSeconds)}
            </span>
            <div className="hidden sm:flex flex-1 items-center space-x-1 h-4 overflow-hidden opacity-60">
              <span className="w-1 bg-rose-500 rounded animate-pulse h-2"></span>
              <span className="w-1 bg-rose-500 rounded animate-pulse h-4 delay-75"></span>
              <span className="w-1 bg-rose-500 rounded animate-pulse h-3 delay-150"></span>
              <span className="w-1 bg-rose-500 rounded animate-pulse h-5 delay-200"></span>
              <span className="w-1 bg-rose-500 rounded animate-pulse h-2 delay-100"></span>
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={togglePreviewPlay}
              className="p-1.5 sm:p-2 rounded-full bg-brand-600 text-white hover:bg-brand-700 transition flex-shrink-0"
              title={isPlayingPreview ? 'Pause preview' : 'Play preview'}
            >
              {isPlayingPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 flex-shrink-0">
              {formatTime(recordingSeconds)}
            </span>
            <span className="text-xs text-slate-400 italic hidden sm:inline truncate">Preview audio</span>
          </div>
        )}
      </div>

      {/* Stop / Record action */}
      {isRecording ? (
        <button
          type="button"
          onClick={stopRecording}
          className="px-2.5 sm:px-3 py-1.5 flex items-center space-x-1 sm:space-x-1.5 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 transition flex-shrink-0"
        >
          <Square className="w-3 h-3 fill-current text-rose-500" />
          <span>Stop</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSendVoiceNote}
          disabled={isSending}
          className="px-3 sm:px-4 py-1.5 sm:py-2 flex items-center space-x-1 sm:space-x-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-md shadow-brand-500/25 transition disabled:opacity-50 flex-shrink-0"
        >
          {isSending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
