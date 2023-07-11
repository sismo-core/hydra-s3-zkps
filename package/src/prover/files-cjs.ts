export const wasmPath =
  process.env.MODULE_FORMAT != "esm" ? require.resolve("./hydra-s3.wasm") : null;
export const zkeyPath =
  process.env.MODULE_FORMAT != "esm" ? require.resolve("./hydra-s3.zkey") : null;
// export const wasmPath = "https://static.sismo.io/hydra-s3-zkps/v1/hydra-s3.wasm";
// export const zkeyPath = "https://static.sismo.io/hydra-s3-zkps/v1/hydra-s3.zkey";
