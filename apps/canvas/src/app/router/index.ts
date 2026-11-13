import { createBrowserRouter } from "react-router"

import { ProjectsPage } from "@/pages/projects"

export const router = createBrowserRouter([
  { path: "/", Component: ProjectsPage },
])
