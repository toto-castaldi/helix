import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, User, Calendar, FileText, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { GoalForm } from '@/components/clients/GoalForm'
import { GoalList } from '@/components/clients/GoalList'
import { supabase } from '@/lib/supabase'
import { useGyms } from '@/hooks/useGyms'
import type { Client, GoalHistory } from '@/types'

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [client, setClient] = useState<Client | null>(null)
  const [goals, setGoals] = useState<GoalHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [goalsLoading, setGoalsLoading] = useState(true)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalHistory | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<GoalHistory | null>(null)
  const [selectedGymId, setSelectedGymId] = useState<string>('')
  const [exportLoading, setExportLoading] = useState(false)
  const loadedRef = useRef(false)

  const { gyms } = useGyms()

  useEffect(() => {
    if (!id || loadedRef.current) return
    loadedRef.current = true

    async function loadData() {
      setLoading(true)
      setGoalsLoading(true)

      // Fetch client
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

      setClient(clientData)
      setLoading(false)

      // Fetch goals
      const { data: goalsData } = await supabase
        .from('goal_history')
        .select('*')
        .eq('client_id', id)
        .order('started_at', { ascending: false })

      setGoals(goalsData || [])
      setGoalsLoading(false)
    }

    loadData()
  }, [id])

  const refreshGoalsAndClient = async () => {
    if (!id) return

    // Refresh goals list
    const { data: goalsData } = await supabase
      .from('goal_history')
      .select('*')
      .eq('client_id', id)
      .order('started_at', { ascending: false })

    const updatedGoals = goalsData || []
    setGoals(updatedGoals)

    // Update client's current_goal con il più recente
    const mostRecentGoal = updatedGoals[0]?.goal || null
    await supabase
      .from('clients')
      .update({ current_goal: mostRecentGoal })
      .eq('id', id)

    // Refresh client
    const { data: updatedClient } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()
    setClient(updatedClient)
  }

  const handleSubmitGoal = async (goalText: string, startedAt?: string) => {
    if (!id) return
    setIsSubmitting(true)

    if (editingGoal) {
      // Update existing goal
      await supabase
        .from('goal_history')
        .update({
          goal: goalText,
          started_at: startedAt || editingGoal.started_at,
        })
        .eq('id', editingGoal.id)
    } else {
      // Insert new goal
      await supabase
        .from('goal_history')
        .insert({
          client_id: id,
          goal: goalText,
          started_at: startedAt || new Date().toISOString(),
        })
    }

    await refreshGoalsAndClient()
    setShowGoalForm(false)
    setEditingGoal(null)
    setIsSubmitting(false)
  }

  const handleEditGoal = (goal: GoalHistory) => {
    setEditingGoal(goal)
    setShowGoalForm(true)
    setDeleteConfirm(null)
  }

  const handleCancelForm = () => {
    setShowGoalForm(false)
    setEditingGoal(null)
  }

  const handleDeleteGoal = async () => {
    if (!deleteConfirm || !id) return

    await supabase
      .from('goal_history')
      .delete()
      .eq('id', deleteConfirm.id)

    // Update local state
    const remainingGoals = goals.filter(g => g.id !== deleteConfirm.id)
    setGoals(remainingGoals)

    // Update client's current_goal con il più recente
    const mostRecentGoal = remainingGoals[0]?.goal || null
    await supabase
      .from('clients')
      .update({ current_goal: mostRecentGoal })
      .eq('id', id)

    // Refresh client
    const { data: updatedClient } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()
    setClient(updatedClient)

    setDeleteConfirm(null)
  }

  const handleExport = async () => {
    if (!client || !id) return

    setExportLoading(true)
    try {
      // Refresh session to ensure we have a valid token
      const { data: { session }, error: authError } = await supabase.auth.refreshSession()
      if (authError || !session) {
        throw new Error('Non autenticato')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-export`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            clientId: id,
            gymId: selectedGymId || undefined,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Errore durante l\'export')
      }

      const { markdown, filename } = await response.json()

      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert(error instanceof Error ? error.message : 'Errore durante l\'export')
    } finally {
      setExportLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente non trovato.</p>
        <Button variant="link" onClick={() => navigate('/clients')}>
          Torna ai clienti
        </Button>
      </div>
    )
  }

  const displayAge = client.birth_date
    ? calculateAge(client.birth_date)
    : client.age_years

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {client.last_name} {client.first_name}
        </h1>
      </div>

      {/* Client Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              {displayAge && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{displayAge} anni</span>
                </div>
              )}
              {client.physical_notes && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2">
                  <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{client.physical_notes}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Obiettivi</h2>
          {!showGoalForm && (
            <Button size="sm" onClick={() => setShowGoalForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo
            </Button>
          )}
        </div>

        {/* Goal Form */}
        {showGoalForm && (
          <Card className="mb-4">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {editingGoal ? 'Modifica Obiettivo' : 'Nuovo Obiettivo'}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={handleCancelForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <GoalForm
                onSubmit={handleSubmitGoal}
                onCancel={handleCancelForm}
                isSubmitting={isSubmitting}
                editingGoal={editingGoal}
              />
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <Card className="border-destructive mb-4">
            <CardContent className="p-4">
              <p className="mb-4">
                Eliminare questo obiettivo?
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                "{deleteConfirm.goal}"
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleDeleteGoal}>
                  Elimina
                </Button>
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                  Annulla
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goals List */}
        {goalsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <GoalList goals={goals} onEdit={handleEditGoal} onDelete={setDeleteConfirm} />
        )}
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5" />
            Esporta Scheda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gym-select">Filtra per palestra</Label>
            <select
              id="gym-select"
              value={selectedGymId}
              onChange={(e) => setSelectedGymId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Tutte le palestre</option>
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleExport}
            disabled={exportLoading}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportLoading ? 'Generazione...' : 'Scheda cliente'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
