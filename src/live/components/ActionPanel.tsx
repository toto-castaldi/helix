import { Button } from '@/shared/components/ui/button'
import { Check, SkipForward, Plus, Trash2, Target, RefreshCw, Info, RotateCcw } from 'lucide-react'

interface ActionPanelProps {
  onComplete: () => void
  onSkip: () => void
  onCenter: () => void
  onDelete: () => void
  onChange?: () => void
  onInfo?: () => void
  onAdd?: () => void
  onReset?: () => void
  disabled?: boolean
  hasLumioCard?: boolean
  canReset?: boolean
}

export function ActionPanel({
  onComplete,
  onSkip,
  onCenter,
  onDelete,
  onChange,
  onInfo,
  onAdd,
  onReset,
  disabled = false,
  hasLumioCard = false,
  canReset = false,
}: ActionPanelProps) {
  return (
    <div className="flex flex-col gap-2 w-20 h-full">
      {/* Complete Button - emerald come esercizi completati */}
      <Button
        onClick={onComplete}
        disabled={disabled}
        size="lg"
        className="flex-1 min-h-0 flex-col gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <Check className="w-6 h-6 shrink-0" />
        <span className="text-[10px]">OK</span>
      </Button>

      {/* Skip Button - amber come esercizi saltati */}
      <Button
        onClick={onSkip}
        disabled={disabled}
        size="lg"
        className="flex-1 min-h-0 flex-col gap-1 bg-amber-600 hover:bg-amber-700 text-white"
      >
        <SkipForward className="w-6 h-6 shrink-0" />
        <span className="text-[10px]">SALTA</span>
      </Button>

      {/* Reset Button - gray/slate per reset stato */}
      {onReset && (
        <Button
          onClick={onReset}
          disabled={disabled || !canReset}
          size="lg"
          className={`flex-1 min-h-0 flex-col gap-1 text-white ${
            canReset && !disabled
              ? "bg-slate-600 hover:bg-slate-700"
              : "bg-slate-600/50 cursor-not-allowed opacity-50"
          }`}
        >
          <RotateCcw className="w-6 h-6 shrink-0" />
          <span className="text-[10px]">RESET</span>
        </Button>
      )}

      {/* Center Button - gray come esercizi da fare */}
      <Button
        onClick={onCenter}
        disabled={disabled}
        size="lg"
        className="flex-1 min-h-0 flex-col gap-1 bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
      >
        <Target className="w-6 h-6 shrink-0" />
        <span className="text-[10px]">PROSSIMO</span>
      </Button>

      {/* Delete Button - rose/red distintivo */}
      <Button
        onClick={onDelete}
        disabled={disabled}
        size="lg"
        className="flex-1 min-h-0 flex-col gap-1 bg-rose-600 hover:bg-rose-700 text-white"
      >
        <Trash2 className="w-6 h-6 shrink-0" />
        <span className="text-[10px]">ELIMINA</span>
      </Button>

      {/* Change Button - viola per modifica esercizio */}
      {onChange && (
        <Button
          onClick={onChange}
          disabled={disabled}
          size="lg"
          className="flex-1 min-h-0 flex-col gap-1 bg-violet-600 hover:bg-violet-700 text-white"
        >
          <RefreshCw className="w-6 h-6 shrink-0" />
          <span className="text-[10px]">MODIFICA</span>
        </Button>
      )}

      {/* Info Button - sky/azzurro per scheda Lumio */}
      {onInfo && (
        <Button
          onClick={onInfo}
          disabled={disabled || !hasLumioCard}
          size="lg"
          className={`flex-1 min-h-0 flex-col gap-1 text-white ${
            hasLumioCard && !disabled
              ? "bg-sky-600 hover:bg-sky-700"
              : "bg-sky-600/50 cursor-not-allowed opacity-50"
          }`}
        >
          <Info className="w-6 h-6 shrink-0" />
          <span className="text-[10px]">INFO</span>
        </Button>
      )}

      {/* Add Button - cyan/blue per azione positiva di aggiunta */}
      {onAdd && (
        <Button
          onClick={onAdd}
          disabled={disabled}
          size="lg"
          className="flex-1 min-h-0 flex-col gap-1 bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          <Plus className="w-6 h-6 shrink-0" />
          <span className="text-[10px]">AGGIUNGI</span>
        </Button>
      )}
    </div>
  )
}
