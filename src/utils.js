import fs from "node:fs";
import path, { join } from "node:path";

import yaml from "js-yaml";

export const loadYamlWithPath = (path) => {
  const includeType = new yaml.Type("!include", {
    kind: "scalar",
    construct: function (filePath) {
      const content = fs.readFileSync(join(path, "..", filePath), "utf8");
      return yaml.load(content); // you could recurse here
    },
  });
  const schema = yaml.DEFAULT_SCHEMA.extend([includeType]);
  return yaml.load(fs.readFileSync(path, "utf8"), { schema });
};

/**
 * Traverse all files in the current directory and its subdirectories
 * Return an array of full path of files
 */
export const traverseAllFiles = (startPath, extensions) => {
  const results = [];
  const files = fs.readdirSync(startPath);
  for (const file of files) {
    const filePath = path.join(startPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      results.push(...traverseAllFiles(filePath, extensions));
    } else if (extensions.some((ext) => file.endsWith(ext))) {
      results.push(filePath);
    }
  }
  return results;
};
