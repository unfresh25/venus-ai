'use client';

import React, { useState } from 'react';
import { useTalentShow } from '@/contexts/TalentShowContext';
import { 
  Trophy, 
  Star, 
  Users, 
  Volume2, 
  VolumeX, 
  Play, 
  RotateCcw, 
  Plus,
  Trash2,
  Mic,
  Settings
} from 'lucide-react';

export default function ControlPanel() {
  const {
    participants,
    currentParticipant,
    updateParticipantScore,
    setCurrentParticipant,
    resetScores,
    playCensorBeep,
    playIntroTemplate,
    getNextParticipant,
    addParticipant,
    removeParticipant
  } = useTalentShow();

  const [newParticipant, setNewParticipant] = useState({ name: '', talent: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.hasPerformed && !b.hasPerformed) return -1;
    if (!a.hasPerformed && b.hasPerformed) return 1;
    if (a.hasPerformed && b.hasPerformed) return b.score - a.score;
    return 0;
  });

  const performedCount = participants.filter(p => p.hasPerformed).length;
  const averageScore = performedCount > 0 
    ? participants.filter(p => p.hasPerformed).reduce((sum, p) => sum + p.score, 0) / performedCount 
    : 0;

  const nextParticipant = getNextParticipant();

  const handleScoreChange = (id: number, score: string) => {
    const numScore = parseFloat(score) || 0;
    if (numScore >= 0 && numScore <= 10) {
      updateParticipantScore(id, numScore);
      setCurrentParticipant(id);
    }
  };

  const handleAddParticipant = () => {
    if (newParticipant.name.trim() && newParticipant.talent.trim()) {
      addParticipant({
        name: newParticipant.name.trim(),
        talent: newParticipant.talent.trim()
      });
      setNewParticipant({ name: '', talent: '' });
      setShowAddForm(false);
    }
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

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Panel de Control</h1>
              <p className="text-gray-300">Show de Talentos - Cumpleaños de Angie</p>
            </div>
          </div>

          <a 
            href="/" 
            target="_blank"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Ver Presentadora
          </a>
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={playCensorBeep}
            className="flex items-center justify-center gap-3 p-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <VolumeX className="w-6 h-6" />
            CENSURA (PITIDO)
          </button>

          <button
            onClick={resetScores}
            className="flex items-center justify-center gap-3 p-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
          >
            <RotateCcw className="w-6 h-6" />
            Reiniciar Puntuaciones
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center gap-3 p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <Plus className="w-6 h-6" />
            Agregar Participante
          </button>
        </div>

        {/* Add Participant Form */}
        {showAddForm && (
          <div className="bg-white/5 rounded-lg p-6 mb-8 border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Agregar Nuevo Participante</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nombre del participante"
                value={newParticipant.name}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, name: e.target.value }))}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="Descripción del talento"
                value={newParticipant.talent}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, talent: e.target.value }))}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
              />
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleAddParticipant}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Agregar
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-300">Total Participantes</span>
            </div>
            <p className="text-2xl font-bold text-white">{participants.length}</p>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Play className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-300">Han Presentado</span>
            </div>
            <p className="text-2xl font-bold text-white">{performedCount}</p>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-gray-300">Promedio</span>
            </div>
            <p className="text-2xl font-bold text-white">{averageScore.toFixed(1)}</p>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-gray-300">Siguiente</span>
            </div>
            <p className="text-lg font-bold text-white truncate">
              {nextParticipant ? nextParticipant.name : 'Ninguno'}
            </p>
          </div>
        </div>

        {/* Participants List */}
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Control de Participantes
          </h2>

          <div className="space-y-4">
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {getRankIcon(index, participant.hasPerformed)}
                    <div>
                      <h3 className="font-semibold text-white text-lg">{participant.name}</h3>
                      <p className="text-gray-300">{participant.talent}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Intro Template Button */}
                    <button
                      onClick={() => playIntroTemplate(participant.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      title="Reproducir presentación"
                    >
                      <Volume2 className="w-4 h-4" />
                      Presentar
                    </button>

                    {/* Score Input */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300">Puntaje:</span>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={participant.score}
                        onChange={(e) => handleScoreChange(participant.id, e.target.value)}
                        className="w-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center font-bold"
                      />
                      <span className={`text-2xl font-bold ${getScoreColor(participant.score)}`}>
                        {participant.score.toFixed(1)}
                      </span>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeParticipant(participant.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Eliminar participante"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Score Progress Bar */}
                {participant.hasPerformed && (
                  <div className="mt-3">
                    <div className="w-full bg-white/10 rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                        style={{ width: `${(participant.score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Final Results */}
          {performedCount === participants.length && performedCount > 0 && (
            <div className="mt-8 p-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
              <h3 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-3">
                <Trophy className="w-6 h-6" />
                ¡Resultados Finales!
              </h3>
              <p className="text-gray-200">
                Todas las presentaciones han terminado. ¡Felicitaciones a todos los participantes por este increíble show!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
