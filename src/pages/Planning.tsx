import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, Building2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ClientSelector } from '@/components/planning/ClientSelector'
import { AIChatInterface } from '@/components/planning/AIChatInterface'
import { useClients } from '@/hooks/useClients'
import { useGyms } from '@/hooks/useGyms'
import { useAIPlanning } from '@/hooks/useAIPlanning'
import type { Client, Gym } from '@/types'

export function Planning() {
  const { clientId } = useParams<{ clientId?: string }>()
  const navigate = useNavigate()

  const { clients, loading: clientsLoading } = useClients()
  const { gyms, loading: gymsLoading } = useGyms()
  const {
    conversation,
    messages,
    currentPlan,
    loading,
    sending,
    error,
    startConversation,
    sendMessage,
    acceptPlan,
    clearPlan,
    clearError,
  } = useAIPlanning()

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null)
  const [step, setStep] = useState<'client' | 'gym' | 'chat'>('client')

  // If clientId is provided in URL, go to gym selection
  useEffect(() => {
    if (clientId && clients.length > 0 && !selectedClient) {
      const client = clients.find(c => c.id === clientId)
      if (client) {
        setSelectedClient(client)
        setStep('gym')
      }
    }
  }, [clientId, clients])

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client)
    setStep('gym')
    // Update URL to include clientId
    if (!clientId) {
      navigate(`/planning/${client.id}`, { replace: true })
    }
  }

  const handleGymSelect = async (gym: Gym | null) => {
    setSelectedGym(gym)
    if (selectedClient) {
      await startConversation(selectedClient.id)
      setStep('chat')
    }
  }

  const handleBack = () => {
    if (step === 'chat') {
      setStep('gym')
      setSelectedGym(null)
    } else if (step === 'gym') {
      setStep('client')
      setSelectedClient(null)
      navigate('/planning', { replace: true })
    } else {
      navigate('/sessions')
    }
  }

  const handleAcceptPlan = async () => {
    const sessionId = await acceptPlan(selectedGym?.id)
    if (sessionId) {
      navigate(`/sessions/${sessionId}`)
    }
  }

  // Show error message
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  // Loading state
  if (clientsLoading || gymsLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Chat interface
  if (step === 'chat' && selectedClient && conversation) {
    return (
      <div className="fixed inset-0 top-[57px] bottom-[64px] bg-background">
        {error && (
          <div className="absolute top-0 left-0 right-0 z-20 rounded-md bg-destructive/10 p-3 text-sm text-destructive m-4">
            {error}
          </div>
        )}
        <AIChatInterface
          client={selectedClient}
          selectedGym={selectedGym}
          messages={messages}
          currentPlan={currentPlan}
          sending={sending}
          onSendMessage={sendMessage}
          onAcceptPlan={handleAcceptPlan}
          onRejectPlan={clearPlan}
          onBack={handleBack}
        />
      </div>
    )
  }

  // Gym selection
  if (step === 'gym' && selectedClient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Pianifica con AI
            </h1>
            <p className="text-sm text-muted-foreground">
              Seleziona la palestra per {selectedClient.first_name}
            </p>
          </div>
        </div>

        {/* Selected client summary */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{selectedClient.first_name} {selectedClient.last_name}</p>
              {selectedClient.current_goal && (
                <p className="text-sm text-muted-foreground">{selectedClient.current_goal}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Gym list */}
        <div className="space-y-2">
          {gyms.map((gym) => (
            <Card
              key={gym.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleGymSelect(gym)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{gym.name}</p>
                  {gym.address && (
                    <p className="text-sm text-muted-foreground truncate">{gym.address}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Option to skip gym selection */}
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors border-dashed"
            onClick={() => handleGymSelect(null)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-muted p-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Nessuna palestra specifica</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Client selection
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Pianifica con AI
          </h1>
          <p className="text-sm text-muted-foreground">
            Seleziona un cliente per iniziare
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ClientSelector
        clients={clients}
        onSelect={handleClientSelect}
        loading={clientsLoading}
      />
    </div>
  )
}
