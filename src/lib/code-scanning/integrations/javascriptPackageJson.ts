import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { CodePackageSdk } from "../../../codecs";
import { CodeScanningConfig } from "../types";

export const javascriptPackageJson: CodeScanningConfig = {
  supportedFiles: ["package.json"],
  ignoreDirs: ["node_modules", "serverless-build", "lambda-build"],
  scanFunction: (filePath) => {
    const file = readFileSync(filePath, "utf-8");
    const directory = dirname(filePath);
    const asJson = JSON.parse(file);
    const {
      name,
      description,
      dependencies = {},
      devDependencies = {},
      optionalDependencies = {},
    } = asJson;
    return [
      {
        // name of the package
        name: name || directory.split("/").pop()!,
        description,
        softwareDevelopmentKits: [
          ...Object.entries(dependencies).map(
            ([name, version]): CodePackageSdk => ({
              name,
              version: typeof version === "string" ? version : undefined,
            })
          ),
          ...Object.entries(devDependencies).map(
            ([name, version]): CodePackageSdk => ({
              name,
              version: typeof version === "string" ? version : undefined,
              isDevDependency: true,
            })
          ),
          ...Object.entries(optionalDependencies).map(
            ([name, version]): CodePackageSdk => ({
              name,
              version: typeof version === "string" ? version : undefined,
            })
          ),
        ],
      },
    ];
  },
};
