#!/bin/bash -e

cd "$(git rev-parse --show-toplevel)"

# Uncomment next lines to update Trusted setup
cp "./artifacts/circuits/hydra-s3_js/hydra-s3.wasm" "./package/src/prover"
cp "./artifacts/circuits/hydra-s3.zkey" "./package/src/prover"