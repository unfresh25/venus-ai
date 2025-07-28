// components/AIVisualizer.tsx
import React from 'react';
import styles from '../aiPresenter.module.css';

interface AIVisualizerProps {
  state: 'thinking' | 'speaking' | 'listening';
  isSpeaking: boolean;
  onClick: () => void;
}

export const AIVisualizer: React.FC<AIVisualizerProps> = ({ 
  state, 
  isSpeaking, 
  onClick 
}) => {
  return (
    <div 
      className={`${styles.holographicSphere} ${styles[state]} ${isSpeaking ? styles.speaking : ''}`}
      onClick={onClick}
    >
      <div className={styles.sphereMain}>
        <div className={styles.crystalFacets}>
          <div className={styles.facet}></div>
          <div className={styles.facet}></div>
          <div className={styles.facet}></div>
        </div>
      </div>
      
      <div className={styles.aiEyes}>
        <div className={styles.eye}></div>
        <div className={styles.eye}></div>
      </div>
      
      <div className={styles.groundReflection}></div>
      
      {/* Partículas animadas */}
      <div className={styles.particle}></div>
      <div className={styles.particle}></div>
      <div className={styles.particle}></div>
      <div className={styles.particle}></div>
    </div>
  );
};