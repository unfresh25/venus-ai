// components/TranscriptDisplay.tsx
import React from 'react';
import styles from '../aiPresenter.module.css';

interface TranscriptDisplayProps {
  transcript: string;
  response: string;
  isGenerating?: boolean;
  error?: string | null;
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ 
  transcript, 
  response,
  isGenerating = false,
  error = null
}) => {
  return (
    <div className={styles.transcriptContainer}>
      {transcript && (
        <div className={styles.transcriptDisplay}>
          <strong>🎤 Escuché:</strong> {transcript}
        </div>
      )}

      {isGenerating && (
        <div className={styles.generatingDisplay}>
          <strong>🤖 Pensando...</strong>
          <div className={styles.loadingDots}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorDisplay}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {response && !isGenerating && (
        <div className={styles.responseDisplay}>
          <strong>🤖 Venus AI:</strong> {response}
        </div>
      )}
    </div>
  );
};