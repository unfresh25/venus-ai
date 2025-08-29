# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Venus AI is a Next.js application that serves as an interactive AI-powered talent show presenter. The application creates an immersive experience where "Venus" acts as a virtual host for birthday talent shows, capable of speech recognition, natural language processing, and text-to-speech functionality.

### Key Application Features
- **AI Presenter**: Venus character with personality-driven responses and visual animations
- **Voice Interaction**: Speech recognition for natural language commands and scoring
- **Score Management**: Intelligent parsing of vocal scoring commands in Spanish
- **Participant Management**: Real-time tracking of participants, talents, and performances
- **Visual Experience**: 3D holographic sphere with animated states and particle effects

## Common Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Development Workflow
```bash
# Start development with hot reload
npm run dev
# Access at http://localhost:3000

# Run type checking
npx tsc --noEmit

# Check for unused dependencies
npx depcheck
```

## Architecture & Core Patterns

### Component Architecture
The application follows a layered architecture with clear separation of concerns:

1. **Presentation Layer** (`src/components/`)
   - `aiPresenter.tsx`: Main AI presenter component with state management
   - `participantsList.tsx`: Score tracking and participant management UI
   - `visualizer/`: Visual effects and AI state display components

2. **Business Logic Layer** (`src/app/hooks/`)
   - `useParticipants.ts`: Participant state management and scoring logic
   - `useResponseGenerator.ts`: AI response generation with OpenAI integration and fallbacks
   - `useSpeechRecognition.ts`: Browser speech recognition with error handling
   - `useSpeechSynthesis.ts`: Text-to-speech with voice selection

3. **Configuration Layer**
   - `src/lib/prompts/venus-prompt.ts`: AI personality and behavior definition
   - `src/data/participants.ts`: Initial participant data

### State Management Patterns

The application uses React hooks for state management with specific patterns:

- **Participant State**: Centralized in `useParticipants` hook with immutable updates
- **AI State**: Three-state machine (`thinking` | `speaking` | `listening`) with clear transitions
- **Context Sharing**: React Context for sharing participant state across components
- **Error Recovery**: Fallback mechanisms for speech recognition and AI response generation

### Voice Command Processing

The scoring system uses sophisticated regex patterns to parse natural language commands in Spanish:

```typescript
// Examples of supported voice commands:
// "El puntaje de Mafe es 8"
// "María obtiene 9 puntos"
// "Dar 7 a Estiven"
// "8 puntos para Mafe"
```

The command processing includes fuzzy name matching and score validation (0-10 range).

### AI Integration Architecture

The application implements a robust AI system with multiple layers:

1. **Primary**: OpenAI GPT integration with conversation history management
2. **Fallback**: Local response generation system for offline functionality
3. **Error Handling**: Graceful degradation when APIs are unavailable

Configuration requires `NEXT_PUBLIC_OPENAI_API_KEY` environment variable.

### Speech Integration

Dual speech system implementation:
- **Input**: Web Speech API recognition with retry logic and error recovery
- **Output**: Speech synthesis with voice preference for Spanish speakers

## File Structure Significance

```
src/
├── app/
│   ├── hooks/           # Business logic and state management
│   │   ├── useParticipants.ts      # Participant data management
│   │   ├── useResponseGenerator.ts  # AI response handling
│   │   ├── useSpeechRecognition.ts # Voice input processing
│   │   └── useSpeechSynthesis.ts   # Text-to-speech output
│   ├── layout.tsx       # App shell with context providers
│   └── page.tsx         # Main application logic and command parsing
├── components/
│   ├── aiPresenter.tsx  # Core AI presenter component
│   ├── participantsList.tsx # Score management UI
│   └── visualizer/      # 3D visual effects components
├── data/
│   └── participants.ts  # Application data configuration
└── lib/
    └── prompts/
        └── venus-prompt.ts # AI personality configuration
```

## Development Guidelines

### Working with AI Responses
- The Venus character has a defined personality in `venus-prompt.ts` - maintain consistency
- All responses should be in Spanish and maintain the "diva" character
- Test both OpenAI and fallback response systems

### Voice Integration Development
- Always test speech recognition in multiple browsers (Chrome/Safari/Firefox)
- Handle permission denials gracefully
- Consider network connectivity issues for speech services

### Score Management
- The scoring system supports decimal values (0-10 range)
- Voice command parsing is case-insensitive with fuzzy matching
- Always validate scores before updating participant state

### UI State Management
- AI visual states should correspond to actual system states
- Maintain visual feedback for all user interactions
- Handle loading states for AI responses appropriately

### Testing Considerations
- Speech APIs require HTTPS in production
- Microphone permissions need user interaction to trigger
- Test cross-browser compatibility for speech features
- Verify OpenAI API key configuration for AI responses

## Environment Configuration

Required environment variables for full functionality:
```bash
# OpenAI Configuration (for AI responses)
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs TTS Configuration (for enhanced voice synthesis)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
```

The application has robust fallback systems:
- AI responses fallback to local responses when OpenAI API is unavailable
- Speech synthesis falls back to browser's built-in TTS when ElevenLabs TTS fails

## API Routes

The application includes the following API routes:
- `POST /api/elevenlabs-tts` - Text-to-speech conversion using ElevenLabs API with browser fallback
