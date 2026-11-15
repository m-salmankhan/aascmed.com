const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

const compile = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: '@emotion/react',
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
require.extensions['.ts'] = require.extensions['.tsx'] = compile;

// Vite asset imports are opaque URLs during server-rendered unit tests.
const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.endsWith('?url')) return request.slice(0, -4);
  return load.call(this, request, parent, isMain);
};
