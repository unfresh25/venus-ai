import { useState } from 'react';
import { Trophy, Star, Music, Users, Edit2, Check } from 'lucide-react';

interface Participant {
  id: number;
  name: string;
  talent: string;
  score: number;
  hasPerformed: boolean;
}

interface ParticipantsListProps {
  participants: Participant[];
  onUpdateScore: (id: number, score: number) => void;
  currentParticipant?: number | null;
}

export default function ParticipantsList({ participants, onUpdateScore, currentParticipant }: ParticipantsListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempScore, setTempScore] = useState<string>('');

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.hasPerformed && !b.hasPerformed) return -1;
    if (!a.hasPerformed && b.hasPerformed) return 1;
    if (a.hasPerformed && b.hasPerformed) return b.score - a.score;
    return 0;
  });

  const handleEditScore = (participant: Participant) => {
    setEditingId(participant.id);
    setTempScore(participant.score.toString());
  };

  const handleSaveScore = (id: number) => {
    const score = parseFloat(tempScore) || 0;
    if (score >= 0 && score <= 10) {
      onUpdateScore(id, score);
      setEditingId(null);
      setTempScore('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTempScore('');
  };

  const getRankIcon = (index: number, hasPerformed: boolean) => {
    if (!hasPerformed) return null;
    
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (index === 1) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Trophy className="w-5 h-5 text-amber-600" />;
    return <Star className="w-4 h-4 text-blue-400" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'text-green-400';
    if (score >= 7) return 'text-yellow-400';
    if (score >= 5) return 'text-orange-400';
    return 'text-red-400';
  };

  const performedCount = participants.filter(p => p.hasPerformed).length;
  const averageScore = performedCount > 0 
    ? participants.filter(p => p.hasPerformed).reduce((sum, p) => sum + p.score, 0) / performedCount 
    : 0;

  return (
    <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Participantes</h2>
          <p className="text-gray-300 text-sm">Show de Talentos - Cumpleaños de Angie</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">Presentaciones</span>
          </div>
          <p className="text-xl font-bold text-white">
            {performedCount}/{participants.length}
          </p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-gray-300">Promedio</span>
          </div>
          <p className="text-xl font-bold text-white">
            {averageScore.toFixed(1)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sortedParticipants.map((participant, index) => (
          <div
            key={participant.id}
            className={`bg-white/5 backdrop-blur-sm rounded-xl p-4 border transition-all duration-300 ${
              participant.hasPerformed 
                ? 'border-white/20 shadow-lg' 
                : 'border-white/10'
            } ${
              currentParticipant === participant.id
                ? 'ring-2 ring-green-400 bg-green-500/10'
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getRankIcon(index, participant.hasPerformed)}
                <div>
                  <h3 className="font-semibold text-white">{participant.name}</h3>
                  <p className="text-sm text-gray-300">{participant.talent}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {participant.hasPerformed ? (
                  <>
                    {editingId === participant.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={tempScore}
                          onChange={(e) => setTempScore(e.target.value)}
                          className="w-16 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-center text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveScore(participant.id)}
                          className="p-1 text-green-400 hover:text-green-300 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${getScoreColor(participant.score)}`}>
                          {participant.score.toFixed(1)}
                        </span>
                        <button
                          onClick={() => handleEditScore(participant)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">Esperando...</span>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <Music className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {participant.hasPerformed && (
              <div className="mt-3">
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${(participant.score / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {performedCount === participants.length && performedCount > 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
          <h3 className="text-lg font-bold text-yellow-400 mb-2 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            ¡Resultados Finales!
          </h3>
          <p className="text-gray-200 text-sm">
            Todas las presentaciones han terminado. ¡Felicitaciones a todos los participantes!
          </p>
        </div>
      )}
    </div>
  );
}