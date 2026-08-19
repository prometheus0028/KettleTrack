export function LoadingSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center p-8 min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-[#1cc29f]/30 border-t-[#1cc29f] rounded-full animate-spin"></div>
    </div>
  )
}
