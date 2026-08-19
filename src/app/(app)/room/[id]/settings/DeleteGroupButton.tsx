'use client'

import { useState } from 'react'
import { SubmitButton } from '@/components/SubmitButton'
import { Trash2 } from 'lucide-react'

export function DeleteGroupButton() {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
      <button 
        type="button"
        className="w-full bg-white dark:bg-black border border-[#ff652f] text-[#ff652f] py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#ff652f] hover:text-white transition-colors"
        onClick={() => setShowConfirm(true)}
      >
        <Trash2 className="w-4 h-4" />
        Delete Group
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-sm rounded-2xl p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-[19px] font-bold text-[var(--foreground)] mb-2">Delete Group?</h3>
            <p className="text-[15px] text-[var(--muted-foreground)] mb-6 leading-relaxed">
              Are you sure you want to delete this group? All data, members, and wash logs will be permanently lost. This action cannot be reversed.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-[var(--secondary)] text-[var(--foreground)] py-3.5 rounded-xl font-medium text-[15px] hover:bg-[var(--border)] active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <SubmitButton
                defaultText="Delete it"
                successText="Deleted"
                className="flex-1 bg-[#ff652f] text-white py-3.5 rounded-xl font-medium text-[15px] hover:bg-[#e55b2a] active:scale-[0.98] transition-all shadow-sm disabled:opacity-70 flex justify-center items-center gap-2"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
