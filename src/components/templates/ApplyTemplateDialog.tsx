import { useState } from 'react'
import { X, Plus, RefreshCw, LayoutTemplate } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { GroupTemplateWithExercises } from '@/types'

interface ApplyTemplateDialogProps {
  templates: GroupTemplateWithExercises[]
  hasGroupExercises: boolean
  onApply: (templateId: string, mode: 'add' | 'replace') => void
  onClose: () => void
}

export function ApplyTemplateDialog({
  templates,
  hasGroupExercises,
  onApply,
  onClose,
}: ApplyTemplateDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showModeSelection, setShowModeSelection] = useState(false)

  const handleSelectTemplate = (templateId: string) => {
    if (hasGroupExercises) {
      // Show mode selection dialog
      setSelectedTemplate(templateId)
      setShowModeSelection(true)
    } else {
      // Apply immediately in 'add' mode
      onApply(templateId, 'add')
    }
  }

  const handleConfirmMode = (mode: 'add' | 'replace') => {
    if (selectedTemplate) {
      onApply(selectedTemplate, mode)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Applica Template</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {showModeSelection ? (
          // Mode selection view
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  La sessione ha gia esercizi di gruppo. Cosa vuoi fare?
                </p>
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => handleConfirmMode('add')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleConfirmMode('replace')}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sostituisci
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Aggiungi:</strong> mantiene gli esercizi esistenti e aggiunge quelli del template.
                  <br />
                  <strong>Sostituisci:</strong> rimuove gli esercizi di gruppo esistenti e li sostituisce con quelli del template.
                </p>
              </CardContent>
            </Card>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowModeSelection(false)
                setSelectedTemplate(null)
              }}
            >
              Torna alla selezione
            </Button>
          </div>
        ) : templates.length === 0 ? (
          // Empty state
          <div className="text-center py-8 text-muted-foreground">
            <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nessun template disponibile.</p>
            <p className="text-sm">Crea un template dalla sezione Template.</p>
          </div>
        ) : (
          // Template list
          <div className="space-y-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleSelectTemplate(template.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {template.exercises?.length || 0} esercizi
                      </p>
                    </div>
                    <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {template.exercises && template.exercises.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {template.exercises
                        .slice(0, 3)
                        .map((ex) => ex.exercise?.name)
                        .join(', ')}
                      {template.exercises.length > 3 && '...'}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
