"use client"

import Link from "next/link"

import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { CloseIcon, MenuIcon } from "@/shared/ui/icons"

import { useNavigationDrawer } from "../model/use-navigation-drawer"
import { NavigationLinks } from "./navigation-links"

export type SavedBatchCopyLink =
  | { count: number; status: "ready" }
  | { onRetry(): void; status: "failure" }
  | null

type MobileNavigationProps = {
  pathname: string
  savedBatchCopy?: SavedBatchCopyLink
}

export function MobileNavigation({
  pathname,
  savedBatchCopy = null,
}: MobileNavigationProps) {
  const { close, closeOnBackdrop, dialog, navigate, open, restoreFocus, trigger } =
    useNavigationDrawer()
  const showSavedBatchCopy =
    savedBatchCopy?.status === "ready" && savedBatchCopy.count > 0
  const savedCount = showSavedBatchCopy
    ? `${savedBatchCopy.count.toLocaleString("ko-KR")}개`
    : null

  return (
    <>
      <IconButton
        aria-label="탐색 열기"
        onClick={open}
        ref={trigger}
        size="compact"
      >
        <MenuIcon />
      </IconButton>
      <dialog
        aria-label="주요 화면 탐색"
        className="notes-navigation-drawer"
        onClose={restoreFocus}
        onClick={closeOnBackdrop}
        ref={dialog}
      >
        <div className="flex h-full min-h-0 flex-col bg-surface-raised px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] shadow-floating">
          <div className="flex min-h-12 items-center justify-between gap-2 px-3">
            <p className="text-sm font-semibold text-text">개인 메모</p>
            <IconButton aria-label="탐색 닫기" onClick={close} size="compact">
              <CloseIcon />
            </IconButton>
          </div>
          <nav aria-label="주요 화면" className="mt-3 grid gap-1">
            <NavigationLinks onNavigate={navigate} pathname={pathname} presentation="drawer" />
          </nav>
          {showSavedBatchCopy ? (
            <div className="mt-3 border-t border-line pt-3">
              <Link
                aria-label={`일괄 복사 ${savedCount} 관리`}
                className="flex min-h-12 items-center justify-between gap-3 rounded-control px-3 text-base font-semibold text-text hover:bg-canvas"
                href="/batch-copy/"
                onNavigate={(event) => navigate("/batch-copy/", event)}
              >
                <span>일괄 복사</span>
                <span className="tabular-nums text-soft-ink">{savedCount}</span>
              </Link>
            </div>
          ) : null}
          {savedBatchCopy?.status === "failure" ? (
            <div className="mt-3 grid gap-2 border-t border-line px-3 pt-3">
              <p className="text-sm text-danger">일괄 복사 항목을 불러오지 못했습니다.</p>
              <Button onClick={savedBatchCopy.onRetry} tone="quiet">
                다시 시도
              </Button>
            </div>
          ) : null}
        </div>
      </dialog>
    </>
  )
}
