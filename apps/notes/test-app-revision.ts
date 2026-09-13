import { execFileSync } from "node:child_process"

export function readAppRevision() {
  const gitRevision = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    encoding: "utf8",
  }).trim()
  const workingTree = execFileSync(
    "git",
    ["status", "--porcelain", "--untracked-files=no"],
    { encoding: "utf8" },
  ).trim()

  return workingTree === "" ? gitRevision : `${gitRevision}+working-tree`
}
