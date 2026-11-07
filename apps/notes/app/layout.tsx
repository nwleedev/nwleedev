import type { Metadata } from "next"
import type { ReactNode } from "react"

import {
  NavigationGuardProvider,
  PersonalNotesProvider,
  RuntimeAccessGuard,
} from "@/_app/index.browser"
import { SkipLink } from "@/_app/index.server"
import "@/_app/styles/globals.css"

export const metadata: Metadata = {
  description: "브라우저에 저장되는 개인 메모 작업 공간",
  title: "개인 메모",
}

type RootLayoutProps = Readonly<{
  children: ReactNode
}>

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>
        <NavigationGuardProvider>
          <RuntimeAccessGuard>
            <PersonalNotesProvider>
              <SkipLink />
              {children}
            </PersonalNotesProvider>
          </RuntimeAccessGuard>
        </NavigationGuardProvider>
      </body>
    </html>
  )
}
