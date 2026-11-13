import { createBrowserRouter, data, isRouteErrorResponse, Link, redirect, useFetcher, useLoaderData, useRevalidator, useRouteError } from "react-router"
import { useCallback } from "react"

import type { MemoUpdate, PlacementGeometry } from "@/entities/project"

import { EditorPage } from "@/pages/editor"
import { ProjectsPage } from "@/pages/projects"

import { composeProjects } from "../composition/storage/projects"
import { useProjectRevalidation } from "./use-project-revalidation"

const projects = composeProjects()

async function readEditorDocument(id: string | undefined) {
  const document = id ? await projects.readDocument(id) : undefined
  if (!document) throw data(null, { status: 404 })
  return document
}
function ProjectListRoute() {
  const saved = useLoaderData<typeof projects.list>()
  const creation = useFetcher<{ failed: true }>()
  const creating = creation.state !== "idle"

  return (
    <ProjectsPage
      projects={saved.map((project) => ({ ...project, href: `/projects/${project.id}` }))}
      onCreate={creating ? undefined : () => creation.submit(null, { method: "post" })}
      createFailed={!creating && creation.data?.failed === true}
    />
  )
}

function ProjectRoute() {
  const { revalidate } = useRevalidator()
  const document = useLoaderData() as Awaited<ReturnType<typeof readEditorDocument>>
  const { id } = document.project
  const saveMemo = useCallback((update: MemoUpdate) => projects.saveMemoUpdate(id, update), [id])
  useProjectRevalidation(document.project, projects.subscribe)
  return (
    <EditorPage
      key={id}
      document={document}
      saveMemo={saveMemo}
      addImage={async (image) => {
        await projects.addImage(id, { ...image, projectId: id })
        await revalidate()
      }}
      updatePlacement={async (placementId: string, change: PlacementGeometry) => {
        await projects.updatePlacement(id, placementId, change)
        await revalidate()
      }}
      addMemo={async (placementId) => {
        await projects.addMemo(id, placementId)
        await revalidate()
      }}
      updateMemoSide={async (memoId, side) => {
        await projects.updateMemoSide(id, memoId, side)
        await revalidate()
      }}
      updateMemoSize={async (memoId, size) => {
        await projects.updateMemoSize(id, memoId, size)
        await revalidate()
      }}
    />
  )
}

function PendingProjects() {
  return <p role="status">프로젝트를 불러오는 중입니다.</p>
}

function ProjectRouteError() {
  const error: unknown = useRouteError()
  const missing = isRouteErrorResponse(error) && error.status === 404

  return (
    <main>
      <h1>{missing ? "프로젝트를 찾을 수 없습니다." : "프로젝트를 불러오지 못했습니다."}</h1>
      <Link to="/">프로젝트 목록</Link>
    </main>
  )
}

export const router = createBrowserRouter([
  {
    path: "/",
    HydrateFallback: PendingProjects,
    ErrorBoundary: ProjectRouteError,
    children: [
      {
        index: true,
        loader: projects.list,
        async action() {
          try {
            const project = await projects.create()
            return redirect(`/projects/${project.id}`)
          } catch {
            return data({ failed: true }, { status: 500 })
          }
        },
        Component: ProjectListRoute,
      },
      {
        path: "projects/:id",
        loader: ({ params }) => readEditorDocument(params.id),
        Component: ProjectRoute,
      },
    ],
  },
])
