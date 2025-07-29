import React from 'react';
import styles from '../aiPresenter.module.css';

interface StatusDisplayProps {
  state: 'thinking' | 'speaking' | 'listening';
  message: string;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({ state, message }) => {
  return (
    <div className={`${styles.aiStatus} ${styles[state]}`}>
      {message}
    </div>
  );
};