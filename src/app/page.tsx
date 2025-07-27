// app/page.tsx
'use client';

import { useState } from 'react';
import AIPresenter from '@/components/aiPresenter';

export default function Home() {
  const [lastTranscription, setLastTranscription] = useState('');

  const handleTranscription = (text: string) => {
    setLastTranscription(text);
    console.log('Transcripción recibida:', text);
    // Aquí puedes procesar el texto como desees
    // Por ejemplo, enviarlo a una API, guardarlo en una base de datos, etc.
  };

  return (
    <main>
      <AIPresenter onTranscription={handleTranscription} />
      
      {/* Panel de control opcional */}
      {lastTranscription && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '1rem',
          borderRadius: '8px',
          color: 'white',
          maxWidth: '300px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h4>Última transcripción:</h4>
          <p>{lastTranscription}</p>
        </div>
      )}
    </main>
  );
}

// "use client"

// import SpeechToText from '@/components/SpeechToText';

// export default function Page() {
//   return <SpeechToText />;
// }
