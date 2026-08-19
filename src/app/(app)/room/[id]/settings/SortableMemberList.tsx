'use client'

import React, { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { updateMemberOrder } from '../actions'
import { ReorderControls } from './ReorderControls'

interface Member {
  id: string
  position: number
  userId: string
  user: {
    id: string
    name: string | null
    email: string
    avatarUrl: string | null
  }
}

interface SortableMemberListProps {
  roomId: string
  initialMembers: Member[]
  currentUserId: string
}

function SortableItem({ member, idx, roomId, isFirst, isLast, currentUserId }: { 
  member: Member, 
  idx: number,
  roomId: string,
  isFirst: boolean,
  isLast: boolean,
  currentUserId: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center justify-between p-4 bg-[var(--card)] ${isDragging ? 'shadow-lg border-y border-[var(--border)] relative' : ''}`}>
      <div className="flex items-center gap-3 w-full">
        <ReorderControls 
          roomId={roomId} 
          memberId={member.id} 
          isFirst={isFirst} 
          isLast={isLast} 
        />
        
        {/* Drag Handle */}
        <div 
          className="cursor-grab active:cursor-grabbing p-1.5 -ml-1 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] rounded-md touch-none"
          {...attributes}
          {...listeners}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="12" r="1"></circle>
            <circle cx="9" cy="5" r="1"></circle>
            <circle cx="9" cy="19" r="1"></circle>
            <circle cx="15" cy="12" r="1"></circle>
            <circle cx="15" cy="5" r="1"></circle>
            <circle cx="15" cy="19" r="1"></circle>
          </svg>
        </div>

        <div className="w-6 h-6 rounded-full bg-[var(--secondary)] flex items-center justify-center text-[10px] font-bold text-[var(--muted-foreground)]">
          {idx + 1}
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[var(--secondary)] border border-[var(--border)]">
          {member.user.avatarUrl ? (
            <img src={member.user.avatarUrl} alt="" className="w-full h-full object-cover p-0.5 rounded-full" />
          ) : (
            <span className="text-sm font-bold text-[var(--muted-foreground)] flex items-center justify-center h-full">
              {member.user.name ? member.user.name.charAt(0).toUpperCase() : member.user.email.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <p className="text-[15px] font-medium text-[var(--card-foreground)]">
            {member.user.name || member.user.email.split('@')[0]}
            {member.userId === currentUserId && ' (You)'}
          </p>
        </div>
      </div>
    </div>
  )
}

export function SortableMemberList({ roomId, initialMembers, currentUserId }: SortableMemberListProps) {
  const [members, setMembers] = useState(initialMembers)

  useEffect(() => {
    setMembers(initialMembers)
  }, [initialMembers])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = members.findIndex((item) => item.id === active.id)
      const newIndex = members.findIndex((item) => item.id === over.id)

      const newMembers = arrayMove(members, oldIndex, newIndex)
      setMembers(newMembers)
      
      const orderedIds = newMembers.map(m => m.id)
      await updateMemberOrder(roomId, orderedIds)
    }
  }

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
        <SortableContext 
          items={members.map(m => m.id)}
          strategy={verticalListSortingStrategy}
        >
          {members.map((m, idx) => (
            <SortableItem 
              key={m.id} 
              member={m} 
              idx={idx} 
              roomId={roomId}
              isFirst={idx === 0}
              isLast={idx === members.length - 1}
              currentUserId={currentUserId}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  )
}
