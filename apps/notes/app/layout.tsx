import type { Metadata } from "next"
import type { ReactNode } from "react"

import { ApplicationFrame, PersonalNotesProvider } from "@/_app"
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
        <PersonalNotesProvider>
          <ApplicationFrame>{children}</ApplicationFrame>
        </PersonalNotesProvider>
      </body>
    </html>
  )
}
