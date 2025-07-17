import { execSync } from "node:child_process";
import fastGlob from "fast-glob";
import { difference } from "lodash-es";

/**
 * Function thats gets the git files that have changed
 * and returns the code
 *
 * @param options - Options
 * @returns Changes files and diffs
 */
export function getGitFilesThatChanged({
  baseBranch,
  rootDirectory,
  githubRepo,
  excludedGlob = [],
  fileBlockList = [],
}: {
  /** Base branch */
  baseBranch: string;
  /** Github repo name */
  githubRepo: string;
  /** Root directory */
  rootDirectory: string;
  /** A glob that excludes files */
  excludedGlob?: string[];
  /** Block list of files to not process */
  fileBlockList?: string[];
}): {
  /** The list of files that changed */
  changedFiles: string[];
  /** Github repo name */
  repoName: string;
  /** Current commit */
  commit: string;
  /** File diffs */
  fileDiffs: Record<string, string>;
} {
  // Pull base branch
  execSync(`git fetch origin ${baseBranch}`);

  // Latest commit on base branch. If we are on the base branch, we take the prior commit
  const latestBasedCommit = execSync(
    `git ls-remote ${githubRepo} "refs/heads/${baseBranch}" | cut -f 1`,
    { encoding: "utf-8" }
  ).split("\n")[0];

  // This commit
  const latestThisCommit = execSync("git rev-parse HEAD", {
    encoding: "utf-8",
  }).split("\n")[0];

  // Ensure commits are present
  if (!latestBasedCommit || !latestThisCommit) {
    throw new Error("FAILED TO FIND COMMIT RANGE");
  }

  // Get the diff between the given branch and base branch
  const diff = execSync(
    `git fetch && git diff --name-only "${
      baseBranch || latestBasedCommit
    }...${latestThisCommit}" -- ${rootDirectory}`,
    { encoding: "utf-8" }
  );

  // Filter out block list
  const changedFiles = difference(
    diff.split("\n").filter(Boolean),
    fileBlockList
  );

  // Filter out globs
  const filteredChanges =
    excludedGlob.length > 0
      ? fastGlob.sync(changedFiles, { ignore: excludedGlob })
      : changedFiles;

  // Get the contents of only the changed files
  const fileDiffs: Record<string, string> = {};
  for (const file of filteredChanges) {
    const contents = execSync(`git show ${latestThisCommit}:${file}`, {
      encoding: "utf-8",
    });
    fileDiffs[file] = contents;
  }

  // Pull the github repo name
  const repoName = githubRepo.split("/").pop()!.split(".")[0];

  return {
    changedFiles,
    fileDiffs,
    repoName,
    commit: latestThisCommit,
  };
}
