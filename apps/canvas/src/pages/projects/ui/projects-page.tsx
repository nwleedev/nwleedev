import "./projects-page.css"

type ProjectCard = {
  id: string
  href: string
  title: string
  updatedAt: string
  previewUrl?: string
}

type Props = {
  projects?: readonly ProjectCard[]
  onCreate?: () => void
  onImport?: () => void
}

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function ProjectsPage({ projects = [], onCreate, onImport }: Props) {
  return (
    <>
      <header className="projects-header">
        <span className="projects-logo" aria-hidden="true" />
        <div className="projects-actions">
          <button type="button" className="projects-create" aria-label="새 프로젝트" title="새 프로젝트" onClick={onCreate} disabled={!onCreate}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <button type="button" aria-label="불러오기" title="불러오기" onClick={onImport} disabled={!onImport}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V5h6l2 2h10v12H3V7Zm9 3v6m-3-3 3 3 3-3" /></svg>
          </button>
        </div>
      </header>
      <main className="projects">
        <h1>이 브라우저의 프로젝트</h1>
        {projects.length === 0 ? (
          <p className="projects-empty">저장된 프로젝트가 없습니다.</p>
        ) : (
          <ul className="project-grid">
            {projects.map(({ id, href, title, updatedAt, previewUrl }) => (
              <li key={id}>
                <a className="project-card" href={href}>
                  <div className="project-preview">
                    {previewUrl && <img src={previewUrl} alt="" loading="lazy" />}
                  </div>
                  <h2>{title}</h2>
                  <time dateTime={updatedAt}>{dateFormat.format(new Date(updatedAt))}</time>
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
