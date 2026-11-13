import { Link } from "react-router"

import type { Project } from "@/entities/project"

export function EditorPage({ project }: { project: Project }) {
  return (
    <main>
      <Link to="/">프로젝트 목록</Link>
      <h1>{project.title}</h1>
    </main>
  )
}
