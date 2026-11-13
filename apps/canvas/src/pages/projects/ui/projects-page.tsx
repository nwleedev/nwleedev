import { Link } from "react-router"

import type { ProjectDocument } from "@/entities/project"

import { CardPreview, type ReadPreview } from "./card-preview"
import { ProjectImport, type ReadArchive } from "./project-import"

import "./projects-page.css"

type ProjectCard = {
  id: string
  href: string
  title: string
  updatedAt: number
  revision: number
}

type Props = {
  projects?: readonly ProjectCard[]
  readPreview: ReadPreview
  onCreate?: () => void
  readArchive: ReadArchive
  restore: (project: ProjectDocument) => Promise<void>
  createFailed?: boolean
}

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function ProjectsPage({ projects = [], readPreview, onCreate, readArchive, restore, createFailed }: Props) {
  return (
    <>
      <header className="projects-header">
        <span className="projects-logo" aria-hidden="true" />
        <div className="projects-actions">
          <button type="button" className="projects-create" aria-label="새 프로젝트" title="새 프로젝트" onClick={onCreate} disabled={!onCreate}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <ProjectImport read={readArchive} restore={restore} />
        </div>
      </header>
      <main className="projects">
        <h1>이 브라우저의 프로젝트</h1>
        {createFailed && <p role="alert">프로젝트를 만들지 못했습니다. 다시 시도해 주세요.</p>}
        {projects.length === 0 ? (
          <p className="projects-empty">저장된 프로젝트가 없습니다.</p>
        ) : (
          <ul className="project-grid">
            {projects.map(({ id, href, title, updatedAt, revision }) => (
              <li key={id}>
                <Link className="project-card" to={href}>
                  <CardPreview key={revision} id={id} read={readPreview} />
                  <h2>{title}</h2>
                  <time dateTime={new Date(updatedAt).toISOString()}>{dateFormat.format(new Date(updatedAt))}</time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
