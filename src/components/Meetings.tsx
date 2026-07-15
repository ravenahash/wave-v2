import { useState } from 'react';
import { Video, Calendar, Users, Clock, FileText, Plus, ExternalLink, CheckCircle, Bell, Download } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { CreateMeetingModal } from './CreateMeetingModal';
import { isManager, type Role } from '@/lib/rbac';

import { toast } from 'sonner';
import { X } from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  meetLink: string;
  status: 'scheduled' | 'ongoing' | 'completed';
  participants: number;
  maxParticipants: number;
  agenda: string[];
  createdBy: string;
  createdAt: string;
  minutesUrl?: string;
  recordingUrl?: string;
  ataContent?: string;
}

interface MeetingsProps {
  userProfile: {
    name: string;
    role: Role;
  };
}

export function Meetings({ userProfile }: MeetingsProps) {
  const [meetings, setMeetings] = useLocalStorage<Meeting[]>('wave_meetings', [
    {
      id: '1',
      title: 'Assembleia Ordinária - Julho 2026',
      description: 'Assembleia ordinária para aprovação de contas e discussão de melhorias',
      date: '2026-07-15',
      time: '19:00',
      duration: 120,
      meetLink: 'https://meet.google.com/abc-defg-hij',
      status: 'scheduled',
      participants: 0,
      maxParticipants: 100,
      agenda: [
        'Aprovação da ata anterior',
        'Prestação de contas - Junho 2026',
        'Proposta: Instalação de painéis solares',
        'Proposta: Renovação da academia',
        'Assuntos gerais'
      ],
      createdBy: 'Síndico João',
      createdAt: '2026-06-01'
    },
    {
      id: '2',
      title: 'Reunião Extraordinária - Segurança',
      description: 'Discussão sobre melhorias no sistema de segurança do condomínio',
      date: '2026-07-20',
      time: '20:00',
      duration: 90,
      meetLink: 'https://meet.google.com/xyz-abcd-efg',
      status: 'scheduled',
      participants: 0,
      maxParticipants: 100,
      agenda: [
        'Apresentação de propostas de segurança',
        'Análise de custos',
        'Votação de implementação',
        'Definição de cronograma'
      ],
      createdBy: 'Síndico João',
      createdAt: '2026-06-05'
    },
    {
      id: '3',
      title: 'Assembleia Ordinária - Junho 2026',
      description: 'Assembleia ordinária mensal',
      date: '2026-06-15',
      time: '19:00',
      duration: 120,
      meetLink: 'https://meet.google.com/old-meet-link',
      status: 'completed',
      participants: 42,
      maxParticipants: 100,
      agenda: [
        'Aprovação da ata anterior',
        'Prestação de contas',
        'Assuntos gerais'
      ],
      createdBy: 'Síndico João',
      createdAt: '2026-05-01',
      minutesUrl: '#',
      recordingUrl: '#'
    }
  ]);

  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmedMeetings, setConfirmedMeetings] = useLocalStorage<string[]>('wave_confirmed_meetings', []);
  const [showAtaModal, setShowAtaModal] = useState(false);
  const [selectedMeetingForAta, setSelectedMeetingForAta] = useState<Meeting | null>(null);
  const [ataText, setAtaText] = useState('');

  const canCreateMeeting = isManager(userProfile.role);

  const handleCreateMeeting = (data: Omit<Meeting, 'id' | 'participants' | 'createdBy' | 'createdAt' | 'status'>) => {
    const newMeeting: Meeting = {
      ...data,
      id: Date.now().toString(),
      participants: 0,
      status: 'scheduled',
      createdBy: userProfile.name,
      createdAt: new Date().toLocaleDateString('pt-BR')
    };

    setMeetings([newMeeting, ...meetings]);
    setShowCreateModal(false);
  };

  const handleConfirmPresence = (meetingId: string) => {
    if (!confirmedMeetings.includes(meetingId)) {
      setConfirmedMeetings([...confirmedMeetings, meetingId]);
      
      setMeetings(meetings.map(m => 
        m.id === meetingId 
          ? { ...m, participants: m.participants + 1 }
          : m
      ));

      toast.success('Presença confirmada!', { description: 'Você receberá um lembrete antes da reunião.' });
    }
  };

  const handleOpenAtaModal = (meeting: Meeting) => {
    setSelectedMeetingForAta(meeting);
    setAtaText(meeting.ataContent || '');
    setShowAtaModal(true);
  };

  const handleSaveAta = () => {
    if (!selectedMeetingForAta || !ataText.trim()) {
      toast.error('Por favor, insira o conteúdo da ata');
      return;
    }

    setMeetings(meetings.map(m =>
      m.id === selectedMeetingForAta.id
        ? { ...m, ataContent: ataText, status: 'completed' }
        : m
    ));

    setShowAtaModal(false);
    setSelectedMeetingForAta(null);
    setAtaText('');
    
    toast.success('Ata da reunião registrada com sucesso!', {
      description: 'A ata foi salva e está disponível para consulta.'
    });
  };

  const filteredMeetings = meetings.filter(meeting => {
    if (filter === 'all') return true;
    if (filter === 'scheduled') return meeting.status === 'scheduled' || meeting.status === 'ongoing';
    if (filter === 'completed') return meeting.status === 'completed';
    return true;
  });

  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled' || m.status === 'ongoing');
  const completedMeetings = meetings.filter(m => m.status === 'completed');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-wave-100 text-wave-600 rounded-full text-sm">
            <Calendar className="w-4 h-4" />
            Agendada
          </span>
        );
      case 'ongoing':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm animate-pulse">
            <Video className="w-4 h-4" />
            Ao Vivo
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" />
            Concluída
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-wave-700 to-wave-500 min-h-screen relative">
      

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h1 className="text-wave-800 text-3xl mb-2">Reuniões & Assembleias</h1>
          <p className="text-wave-500">Participe das decisões do condomínio online via Google Meets</p>
        </div>
        {canCreateMeeting && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-3 bg-gradient-to-r from-wave-700 to-wave-500 text-white rounded-xl hover:from-wave-700 hover:to-wave-500 transition-all shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Agendar Reunião
          </button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-wave-100 rounded-xl">
              <Calendar className="w-6 h-6 text-wave-500" />
            </div>
            <span className="text-3xl text-wave-800">{upcomingMeetings.length}</span>
          </div>
          <h3 className="text-wave-800">Próximas Reuniões</h3>
          <p className="text-wave-500 text-sm">Agendadas</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-3xl text-wave-800">
              {upcomingMeetings.reduce((acc, m) => acc + m.participants, 0)}
            </span>
          </div>
          <h3 className="text-wave-800">Confirmados</h3>
          <p className="text-wave-500 text-sm">Presenças confirmadas</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-3xl text-wave-800">{completedMeetings.length}</span>
          </div>
          <h3 className="text-wave-800">Atas Disponíveis</h3>
          <p className="text-wave-500 text-sm">Reuniões realizadas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-wave-100 mb-6 shadow-lg relative z-10">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-r from-wave-700 to-wave-500 text-white shadow-lg'
                : 'bg-wave-50 text-wave-500 hover:bg-wave-100'
            }`}
          >
            Todas ({meetings.length})
          </button>
          <button
            onClick={() => setFilter('scheduled')}
            className={`px-4 py-2 rounded-xl transition-all ${
              filter === 'scheduled'
                ? 'bg-gradient-to-r from-wave-700 to-wave-500 text-white shadow-lg'
                : 'bg-wave-50 text-wave-500 hover:bg-wave-100'
            }`}
          >
            Agendadas ({upcomingMeetings.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-xl transition-all ${
              filter === 'completed'
                ? 'bg-gradient-to-r from-wave-700 to-wave-500 text-white shadow-lg'
                : 'bg-wave-50 text-wave-500 hover:bg-wave-100'
            }`}
          >
            Concluídas ({completedMeetings.length})
          </button>
        </div>
      </div>

      {/* Meetings List */}
      {filteredMeetings.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 border border-wave-100 shadow-lg text-center relative z-10">
          <Video className="w-16 h-16 text-wave-300 mx-auto mb-4" />
          <h3 className="text-wave-800 text-xl mb-2">Nenhuma reunião encontrada</h3>
          <p className="text-wave-500 mb-4">
            {filter === 'all' 
              ? 'Não há reuniões agendadas no momento' 
              : `Nenhuma reunião ${filter === 'scheduled' ? 'agendada' : 'concluída'}`}
          </p>
          {canCreateMeeting && filter !== 'completed' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-wave-700 to-wave-500 text-white rounded-xl hover:from-wave-700 hover:to-wave-500 transition-all shadow-lg"
            >
              Agendar Primeira Reunião
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6 relative z-10">
          {filteredMeetings.map((meeting) => {
            const isConfirmed = confirmedMeetings.includes(meeting.id);
            const meetingDate = new Date(meeting.date + 'T' + meeting.time);
            const isUpcoming = meetingDate > new Date();

            return (
              <div
                key={meeting.id}
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-wave-100 p-6 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-wave-800 text-xl">{meeting.title}</h3>
                      {getStatusBadge(meeting.status)}
                    </div>
                    <p className="text-wave-500 mb-4">{meeting.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-wave-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                          {new Date(meeting.date).toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: 'long' 
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-wave-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{meeting.time} ({meeting.duration}min)</span>
                      </div>
                      <div className="flex items-center gap-2 text-wave-600">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">
                          {meeting.participants}/{meeting.maxParticipants} confirmados
                        </span>
                      </div>
                      <div className="text-wave-500 text-sm">
                        Por: {meeting.createdBy}
                      </div>
                    </div>

                    {/* Agenda */}
                    <div className="bg-wave-50 rounded-xl p-4 mb-4">
                      <h4 className="text-wave-800 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Pauta
                      </h4>
                      <ol className="list-decimal list-inside text-wave-600 text-sm space-y-1">
                        {meeting.agenda.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {meeting.status === 'scheduled' || meeting.status === 'ongoing' ? (
                  <div className="flex gap-3">
                    <a
                      href={meeting.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <Video className="w-5 h-5" />
                      Entrar na Reunião (Google Meets)
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    {!isConfirmed && isUpcoming && (
                      <button
                        onClick={() => handleConfirmPresence(meeting.id)}
                        className="px-6 py-3 bg-wave-100 text-wave-600 rounded-xl hover:bg-wave-200 transition-all flex items-center gap-2"
                      >
                        <Bell className="w-5 h-5" />
                        Confirmar Presença
                      </button>
                    )}
                    {isConfirmed && (
                      <div className="px-6 py-3 bg-green-100 text-green-700 rounded-xl flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Presença Confirmada
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-3">
                    {meeting.ataContent && (
                      <button
                        onClick={() => {
                          const blob = new Blob([
                            `ATA - ${meeting.title}\n`,
                            `Data: ${new Date(meeting.date).toLocaleDateString('pt-BR')} às ${meeting.time}\n`,
                            `\n${'='.repeat(60)}\n\n`,
                            meeting.ataContent || ''
                          ], { type: 'text/plain;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `ATA_${meeting.title.replace(/\s+/g, '_')}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex-1 py-3 bg-wave-100 text-wave-600 rounded-xl hover:bg-wave-200 transition-all flex items-center justify-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        Baixar Ata
                      </button>
                    )}
                    {canCreateMeeting && (
                      <button
                        onClick={() => handleOpenAtaModal(meeting)}
                        className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        <FileText className="w-5 h-5" />
                        {meeting.ataContent ? 'Editar Ata' : 'Inserir Ata'}
                      </button>
                    )}
                    {meeting.recordingUrl && (
                      <a
                        href={meeting.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-all flex items-center justify-center gap-2"
                      >
                        <Video className="w-5 h-5" />
                        Ver Gravação
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-gradient-to-r from-wave-700 to-wave-500 rounded-2xl p-6 border border-wave-200 shadow-lg relative z-10">
        <div className="flex items-start gap-3">
          <Video className="w-6 h-6 text-wave-500 shrink-0 mt-1" />
          <div>
            <h3 className="text-wave-800 mb-2">Como participar das reuniões</h3>
            <ol className="list-decimal list-inside text-wave-600 text-sm space-y-1">
              <li>Confirme sua presença clicando no botão "Confirmar Presença"</li>
              <li>Você receberá um lembrete antes da reunião</li>
              <li>No horário marcado, clique em "Entrar na Reunião"</li>
              <li>Você será direcionado para o Google Meets (não precisa instalar nada)</li>
              <li>Participe, vote e tire suas dúvidas em tempo real!</li>
            </ol>
            <p className="text-wave-500 text-sm mt-3">
              💡 <strong>Dica:</strong> Todas as decisões importantes são registradas na rede Stellar após a reunião, 
              garantindo transparência e rastreabilidade total.
            </p>
          </div>
        </div>
      </div>

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <CreateMeetingModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateMeeting}
        />
      )}

      {/* ATA Modal */}
      {showAtaModal && selectedMeetingForAta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-wave-800 text-2xl">Ata da Reunião</h2>
              <button
                onClick={() => {
                  setShowAtaModal(false);
                  setSelectedMeetingForAta(null);
                  setAtaText('');
                }}
                className="text-wave-500 hover:text-wave-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-wave-800 mb-2">{selectedMeetingForAta.title}</h3>
              <p className="text-wave-500 text-sm">
                {new Date(selectedMeetingForAta.date).toLocaleDateString('pt-BR')} às {selectedMeetingForAta.time}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-wave-800 mb-2">Conteúdo da Ata</label>
              <textarea
                value={ataText}
                onChange={(e) => setAtaText(e.target.value)}
                rows={15}
                placeholder="Digite aqui o conteúdo da ata da reunião...&#10;&#10;Exemplo:&#10;&#10;ATA DA ASSEMBLEIA ORDINÁRIA&#10;&#10;Data: [data]&#10;Horário: [horário]&#10;&#10;PRESENTES:&#10;- Lista de presentes&#10;&#10;PAUTA:&#10;1. [primeira pauta]&#10;2. [segunda pauta]&#10;&#10;DELIBERAÇÕES:&#10;- [decisões tomadas]&#10;&#10;Nada mais havendo a tratar, eu, [nome], lavrei a presente ata que vai assinada por mim e pelos presentes."
                className="w-full px-4 py-3 bg-wave-50 border border-wave-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-wave-300 text-wave-800 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAtaModal(false);
                  setSelectedMeetingForAta(null);
                  setAtaText('');
                }}
                className="flex-1 py-3 bg-wave-100 text-wave-600 rounded-xl hover:bg-wave-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAta}
                className="flex-1 py-3 bg-gradient-to-r from-wave-700 to-wave-500 text-white rounded-xl hover:from-wave-700 hover:to-wave-500 transition-all shadow-lg"
              >
                Salvar Ata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
