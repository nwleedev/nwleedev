"use client"

import Link from "next/link"
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"

import type { Note } from "@/entities/note"
import { joinClassNames } from "@/shared/lib/join-class-names"

type MobileNoteCardProps = {
  batchCopyActive: boolean
  disabled: boolean
  note: Note
  onAddToBatchCopy(note: Note): Promise<void>
  onCopy(note: Note): Promise<void>
}

type LongPressGesture = {
  held: boolean
  pointerId: number
  startX: number
  startY: number
  timer: ReturnType<typeof setTimeout>
}

const longPressDuration = 500
const longPressMovement = 10

export function MobileNoteCard({
  batchCopyActive,
  disabled,
  note,
  onAddToBatchCopy,
  onCopy,
}: MobileNoteCardProps) {
  const gesture = useRef<LongPressGesture | null>(null)
  const preview = useRef<HTMLAnchorElement>(null)
  const suppressClick = useRef(false)
  const [contentOverflow, setContentOverflow] = useState(false)
  const text = note.content.length === 0 ? "빈 메모" : note.content
  const overflowDescriptionId = `note-${encodeURIComponent(note.id)}-overflow`
  const href = `/notes/${encodeURIComponent(note.id)}/`
  const accessibleName = batchCopyActive
    ? "일괄 복사에 추가"
    : "메모 열기"
  const linkClassName = joinClassNames(
    "block max-h-48 min-h-24 touch-pan-y select-none overflow-hidden whitespace-pre-wrap break-words px-4 py-3 text-[0.98rem] leading-7 text-ink",
    disabled ? "pointer-events-none opacity-60" : undefined,
  )

  useEffect(() => {
    return () => {
      if (gesture.current !== null) {
        clearTimeout(gesture.current.timer)
      }
    }
  }, [])

  useEffect(() => {
    const element = preview.current

    if (element === null) {
      return
    }

    function measureOverflow() {
      const currentElement = preview.current

      if (currentElement !== null) {
        setContentOverflow(
          currentElement.scrollHeight > currentElement.clientHeight,
        )
      }
    }

    measureOverflow()

    if (typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver(measureOverflow)
    observer.observe(element)

    return () => observer.disconnect()
  }, [text])

  function cancelGesture(suppressFollowingClick: boolean) {
    const current = gesture.current

    if (current === null) {
      return
    }

    clearTimeout(current.timer)
    gesture.current = null
    suppressClick.current = suppressFollowingClick
  }

  function beginLongPress(event: ReactPointerEvent<HTMLAnchorElement>) {
    if (disabled || event.pointerType !== "touch" || !event.isPrimary) {
      return
    }

    const pointerId = event.pointerId
    const timer = setTimeout(() => {
      const current = gesture.current

      if (current !== null && current.pointerId === pointerId) {
        current.held = true
      }
    }, longPressDuration)

    gesture.current = {
      held: false,
      pointerId,
      startX: event.clientX,
      startY: event.clientY,
      timer,
    }
    event.currentTarget.setPointerCapture(pointerId)
  }

  function trackLongPress(event: ReactPointerEvent<HTMLAnchorElement>) {
    const current = gesture.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    const distance = Math.hypot(
      event.clientX - current.startX,
      event.clientY - current.startY,
    )

    if (distance > longPressMovement) {
      cancelGesture(true)
    }
  }

  function finishLongPress(event: ReactPointerEvent<HTMLAnchorElement>) {
    const current = gesture.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    const hitTarget = document.elementFromPoint(event.clientX, event.clientY)
    const releasedInside =
      hitTarget !== null && event.currentTarget.contains(hitTarget)
    const held = current.held
    clearTimeout(current.timer)
    gesture.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (!releasedInside) {
      suppressClick.current = true
      return
    }

    if (!held) {
      return
    }

    suppressClick.current = true

    if (!batchCopyActive) {
      void onCopy(note)
    }
  }

  function cancelLongPress() {
    cancelGesture(true)
  }

  function handleClick(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (disabled) {
      event.preventDefault()
      return
    }

    if (suppressClick.current) {
      suppressClick.current = false
      event.preventDefault()
      return
    }

    if (!batchCopyActive) {
      return
    }

    event.preventDefault()
    void onAddToBatchCopy(note)
  }

  function preventTouchContextMenu(
    event: ReactMouseEvent<HTMLAnchorElement>,
  ) {
    if (gesture.current !== null) {
      event.preventDefault()
    }
  }

  return (
    <article className="relative overflow-hidden rounded-note border border-note-line bg-note shadow-note">
      <Link
        aria-disabled={disabled}
        aria-describedby={contentOverflow ? overflowDescriptionId : undefined}
        aria-label={accessibleName}
        className={linkClassName}
        href={href}
        onClick={handleClick}
        onContextMenu={preventTouchContextMenu}
        onLostPointerCapture={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onPointerDown={beginLongPress}
        onPointerMove={trackLongPress}
        onPointerUp={finishLongPress}
        ref={preview}
      >
        {text}
      </Link>
      {contentOverflow ? (
        <span
          className="pointer-events-none absolute bottom-2 right-2 rounded-full border border-note-line bg-note-header px-2 py-0.5 text-[0.7rem] font-semibold text-ink shadow-sm"
          id={overflowDescriptionId}
        >
          내용 더 있음
        </span>
      ) : null}
    </article>
  )
}
