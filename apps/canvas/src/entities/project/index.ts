export type Project = {
  id: string
  title: string
  updatedAt: string
  revision: number
}

export type ListProjects = () => Promise<readonly Project[]>
export type ReadProject = (id: string) => Promise<Project | undefined>
export type CreateProject = () => Promise<Project>
