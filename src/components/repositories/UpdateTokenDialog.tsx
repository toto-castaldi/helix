import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import type { LumioRepository } from '@/types'

interface UpdateTokenDialogProps {
  repository: LumioRepository
  onClose: () => void
}

export function UpdateTokenDialog({ repository, onClose }: UpdateTokenDialogProps) {
  const [token, setToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Ensure fresh session token before invoking edge function
      const { error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError) {
        setError('Sessione scaduta. Effettua nuovamente il login.')
        return
      }

      const { error: invokeError } = await supabase.functions.invoke('docora-update-token', {
        body: {
          repositoryId: repository.id,
          newToken: token.trim(),
        },
      })

      if (invokeError) {
        // supabase-js puts the raw Response in error.context on non-2xx
        let detail = invokeError.message
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res = (invokeError as any).context
          if (res && typeof res.json === 'function') {
            const body = await res.json()
            detail = body.error || detail
          }
        } catch { /* ignore parse errors */ }
        setError(detail)
        return
      }

      // Success -- close dialog
      // Realtime subscription will update the card automatically
      onClose()
    } catch {
      setError('Errore di connessione. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Aggiorna Token</h2>
              <Button variant="ghost" size="icon" onClick={onClose} disabled={isSubmitting}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Info text */}
            <p className="text-sm text-muted-foreground mb-4">
              Inserisci un nuovo Personal Access Token per <strong>{repository.name}</strong>
            </p>

            {/* Error display */}
            {error && (
              <div className="mb-4 p-2 bg-destructive/10 rounded text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pat-token">Personal Access Token</Label>
                  <Input
                    id="pat-token"
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ghp_..."
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={!token.trim() || isSubmitting}>
                    {isSubmitting ? 'Aggiornamento...' : 'Aggiorna'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
