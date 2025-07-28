// components/VoiceSelector.tsx
import React from 'react';
import styles from '../aiPresenter.module.css';

interface VoiceSelectorProps {
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  onVoiceChange: (voice: SpeechSynthesisVoice | null) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ 
  voices, 
  selectedVoice, 
  onVoiceChange 
}) => {
  if (voices.length === 0) return null;

  return (
    <div className={styles.voiceSelector}>
      <label>
        🎤 Voz: 
        <select 
          value={selectedVoice?.name || ''}
          onChange={(e) => {
            const voice = voices.find(v => v.name === e.target.value);
            onVoiceChange(voice || null);
          }}
          className={styles.voiceSelect}
        >
          {voices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};