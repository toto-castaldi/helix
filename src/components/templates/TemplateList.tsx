import { TemplateCard } from './TemplateCard'
import { EmptyState } from '@/components/shared'
import type { GroupTemplateWithExercises } from '@/types'

interface TemplateListProps {
  templates: GroupTemplateWithExercises[]
  onEdit: (template: GroupTemplateWithExercises) => void
  onDelete: (template: GroupTemplateWithExercises) => void
}

export function TemplateList({ templates, onEdit, onDelete }: TemplateListProps) {
  if (templates.length === 0) {
    return (
      <EmptyState
        title="Nessun template ancora."
        description="Crea il tuo primo template di gruppo per iniziare."
      />
    )
  }

  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
