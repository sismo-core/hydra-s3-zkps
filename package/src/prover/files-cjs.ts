export const wasmPath =
  process.env.MODULE_FORMAT != "esm" ? require.resolve("./hydra-s3.wasm") : null;
export const zkeyPath =
  process.env.MODULE_FORMAT != "esm" ? require.resolve("./hydra-s3.zkey") : null;
