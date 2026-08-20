export function LoadingSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center p-8 min-h-[50vh]">
      <div className="w-12 h-12 border-4 border-[var(--border)] border-t-[#1cc29f] rounded-full animate-spin"></div>
    </div>
  )
}
