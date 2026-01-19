import { Button } from '@/shared/components/ui/button'
import { Check, SkipForward, Plus, Trash2 } from 'lucide-react'

interface ActionPanelProps {
  onComplete: () => void
  onSkip: () => void
  onAdd?: () => void
  onDelete?: () => void
  disabled?: boolean
}

export function ActionPanel({
  onComplete,
  onSkip,
  onAdd,
  onDelete,
  disabled = false,
}: ActionPanelProps) {
  return (
    <div className="flex flex-col gap-4 w-24">
      {/* Complete Button */}
      <Button
        onClick={onComplete}
        disabled={disabled}
        size="xl"
        className="h-20 flex-col gap-2 bg-green-600 hover:bg-green-700"
      >
        <Check className="w-8 h-8" />
        <span className="text-xs">OK</span>
      </Button>

      {/* Skip Button */}
      <Button
        onClick={onSkip}
        disabled={disabled}
        size="xl"
        variant="secondary"
        className="h-20 flex-col gap-2"
      >
        <SkipForward className="w-8 h-8" />
        <span className="text-xs">SKIP</span>
      </Button>

      {/* Add Button */}
      {onAdd && (
        <Button
          onClick={onAdd}
          disabled={disabled}
          size="xl"
          variant="outline"
          className="h-20 flex-col gap-2 border-gray-600"
        >
          <Plus className="w-8 h-8" />
          <span className="text-xs">ADD</span>
        </Button>
      )}

      {/* Delete Button */}
      {onDelete && (
        <Button
          onClick={onDelete}
          disabled={disabled}
          size="xl"
          variant="destructive"
          className="h-20 flex-col gap-2"
        >
          <Trash2 className="w-8 h-8" />
          <span className="text-xs">DEL</span>
        </Button>
      )}
    </div>
  )
}
