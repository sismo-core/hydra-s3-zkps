#!/bin/bash -e

cd "$(git rev-parse --show-toplevel)"

# new trusted setup

npx snarkjs zkey export solidityverifier artifacts/circuits/$1.zkey package/contracts/HydraS3Verifier.sol
sed -i.bak "s/contract Verifier/contract HydraS3Verifier/g" package/contracts/HydraS3Verifier.sol
sed -i.bak "s/pragma solidity ^0.6.11;/pragma solidity ^0.8.0;/g" package/contracts/HydraS3Verifier.sol
rm -f "./package/contracts/HydraS3Verifier.sol.bak"