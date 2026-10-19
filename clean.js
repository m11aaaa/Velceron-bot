const fs = require("fs");
for (const path of ["./dist", "./node_modules", "./package-lock.json", "./tsconfig.tsbuildinfo"]) {
  try { fs.rmSync(path, { recursive: true, force: true }); }
  catch (error) { console.error(`Could not clean ${path}:`, error); }
}
