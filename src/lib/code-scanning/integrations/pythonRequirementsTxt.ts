import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CodePackageType } from "@transcend-io/privacy-types";
import { findAllWithRegex } from "@transcend-io/type-utils";
import { listFiles } from "../../api-keys";
import { CodeScanningConfig } from "../types";

const REQUIREMENTS_PACKAGE_MATCH = /(.+?)(=+)(.+)/;
const PACKAGE_NAME = /name *= *('|")(.+?)('|")/;
const PACKAGE_DESCRIPTION = /description *= *('|")(.+?)('|")/;

export const pythonRequirementsTxt: CodeScanningConfig = {
  supportedFiles: ["requirements.txt"],
  ignoreDirs: ["build", "lib", "lib64"],
  scanFunction: (filePath) => {
    const fileContents = readFileSync(filePath, "utf-8");
    const directory = dirname(filePath);
    const filesInFolder = listFiles(directory);

    // parse setup file for name
    const setupFile = filesInFolder.find((file) => file === "setup.py");
    const setupFileContents = setupFile
      ? readFileSync(join(directory, setupFile), "utf-8")
      : undefined;
    const packageName = setupFileContents
      ? (PACKAGE_NAME.exec(setupFileContents) || [])[2]
      : undefined;
    const packageDescription = setupFileContents
      ? (PACKAGE_DESCRIPTION.exec(setupFileContents) || [])[2]
      : undefined;

    const targets = findAllWithRegex(
      {
        value: new RegExp(REQUIREMENTS_PACKAGE_MATCH, "g"),
        matches: ["name", "equals", "version"],
      },
      fileContents
    );

    return [
      {
        name: packageName || directory.split("/").pop()!,
        description: packageDescription || undefined,
        type: CodePackageType.RequirementsTxt,
        softwareDevelopmentKits: targets.map((package_) => ({
          name: package_.name,
          version: package_.version,
        })),
      },
    ];
  },
};
