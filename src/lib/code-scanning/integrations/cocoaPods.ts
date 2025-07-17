import { readFileSync } from "node:fs";
import { CodePackageType } from "@transcend-io/privacy-types";
import { findAllWithRegex } from "@transcend-io/type-utils";
import { CodePackageSdk } from "../../../codecs";
import { CodeScanningConfig } from "../types";

const POD_TARGET_REGEX = /target ('|")(.*?)('|")/;
const POD_PACKAGE_REGEX = /pod ('|")(.*?)('|")(, ('|")~> (.+?)('|")|)/;

export const cocoaPods: CodeScanningConfig = {
  supportedFiles: ["Podfile"],
  ignoreDirs: ["Pods"],
  scanFunction: (filePath) => {
    const fileContents = readFileSync(filePath, "utf-8");

    const targets = findAllWithRegex(
      {
        value: new RegExp(POD_TARGET_REGEX, "g"),
        matches: ["quote1", "name", "quote2"],
      },
      fileContents
    );
    const packages = findAllWithRegex(
      {
        value: new RegExp(POD_PACKAGE_REGEX, "g"),
        matches: [
          "quote1",
          "name",
          "quote2",
          "extra",
          "quote3",
          "version",
          "quote4",
        ],
      },
      fileContents
    );

    const deps: CodePackageSdk[] = targets.map((target, ind) => ({
      name: target.name,
      type: CodePackageType.CocoaPods,
      softwareDevelopmentKits: packages
        .filter(
          (package_) =>
            package_.matchIndex > target.matchIndex &&
            (!targets[ind + 1] ||
              package_.matchIndex < targets[ind + 1].matchIndex)
        )
        .map((package_) => ({
          name: package_.name,
          version: package_.version,
        })),
    }));

    return deps;
  },
};
