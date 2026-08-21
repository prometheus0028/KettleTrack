'use client'

import React from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Lock } from 'lucide-react'
import { reorderSubgroup } from '../actions'

type User = {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

type SubgroupMember = {
  id: string
  position: number
  user: User
}

type Subgroup = {
  id: string
  hash: string
  queueLocked: boolean
  members: SubgroupMember[]
}

function SortableSubgroupMember({ 
  member, 
  disabled 
}: { 
  member: SubgroupMember, 
  disabled: boolean 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: member.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl mb-2 ${
        isDragging ? 'shadow-lg border-[#1cc29f]' : ''
      } ${disabled ? 'opacity-80' : ''}`}
    >
      <div 
        {...attributes} 
        {...listeners}
        className={`p-1 -ml-1 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab active:cursor-grabbing text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
      >
        <GripVertical className="w-5 h-5" />
      </div>

      <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--secondary)] border border-[var(--border)] flex-shrink-0">
        {member.user.avatarUrl ? (
          <img src={member.user.avatarUrl} alt="" className="w-full h-full object-cover p-0.5 rounded-full" />
        ) : (
          <span className="text-xs font-bold text-[var(--muted-foreground)] flex items-center justify-center h-full">
            {member.user.name ? member.user.name.charAt(0).toUpperCase() : member.user.email.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 font-medium text-[var(--foreground)] truncate text-sm">
        {member.user.name || member.user.email.split('@')[0]}
      </div>
    </div>
  )
}

function SubgroupBlock({ 
  roomId, 
  subgroup, 
  isOwner, 
  currentUserId 
}: { 
  roomId: string
  subgroup: Subgroup
  isOwner: boolean
  currentUserId: string 
}) {
  const [members, setMembers] = React.useState(subgroup.members.sort((a, b) => a.position - b.position))
  const [isSaving, setIsSaving] = React.useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = members.findIndex(m => m.id === active.id)
      const newIndex = members.findIndex(m => m.id === over.id)
      
      const newOrder = arrayMove(members, oldIndex, newIndex)
      setMembers(newOrder)

      setIsSaving(true)
      try {
        await reorderSubgroup(roomId, subgroup.id, newOrder.map(m => m.id))
      } finally {
        setIsSaving(false)
      }
    }
  }

  // Find out who is in this subgroup
  const names = members.map(m => m.user.name || m.user.email.split('@')[0])
  const title = names.join(', ')

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-[var(--foreground)] text-sm mb-1 line-clamp-1">{title}</h3>
          {subgroup.queueLocked ? (
            <p className="text-xs text-[#ff652f] flex items-center gap-1 font-medium"><Lock className="w-3 h-3" /> Locked</p>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">Drag to reorder next turn</p>
          )}
        </div>
        {isSaving && <span className="text-xs text-[#1cc29f] font-medium animate-pulse">Saving...</span>}
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={members.map(m => m.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {members.map(member => (
              <SortableSubgroupMember 
                key={member.id} 
                member={member} 
                disabled={subgroup.queueLocked || !isOwner}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

export function SubgroupsManager({ 
  roomId, 
  subgroups, 
  isOwner,
  currentUserId 
}: { 
  roomId: string, 
  subgroups: Subgroup[], 
  isOwner: boolean,
  currentUserId: string
}) {
  if (subgroups.length === 0) {
    return (
      <div className="text-center p-8 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--muted-foreground)] text-sm">
        No active subgroups yet. Logs some washes to generate them!
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {subgroups.map(subgroup => (
        <SubgroupBlock 
          key={subgroup.id} 
          roomId={roomId}
          subgroup={subgroup}
          isOwner={isOwner}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
}
