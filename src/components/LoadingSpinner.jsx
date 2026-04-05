export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
        <span className="text-red-400 text-lg">!</span>
      </div>
      <p className="text-sm text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ message = 'No data available' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-2">
      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
        <span className="text-slate-500 text-lg">∅</span>
      </div>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}
