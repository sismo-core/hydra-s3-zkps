<br />
<div align="center">
  <img src="https://static.sismo.io/readme/top-secondary.png" alt="Logo" width="150" height="150" style="borderRadius: 20px">

  <h3 align="center">
    Hydra S3 Proving scheme
  </h3>

  <p align="center">
    Implementations of Hydra S3 prover (js/ts) and verifiers (js/ts/Solidity)
  </p>

  <p align="center">
    Made by <a href="https://www.sismo.io/" target="_blank">Sismo</a>
  </p>
  
  <p align="center">
    <a href="https://discord.gg/sismo" target="_blank">
        <img src="https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white"/>
    </a>
    <a href="https://twitter.com/sismo_eth" target="_blank">
        <img src="https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white"/>
    </a>
  </p>
</div>

## Installation

```sh
$ yarn add @sismo-core/hydra-s3
```

## Prover js (HydraS3Prover) <a name="ProverJs"></a>


``` javascript

const prover = new HydraS3Prover(
    registryTree,
    commitmentMapperPubKey,
    // + Optional override of the circuit path for ES module (see below for more information)
    {
        wasmPath: "https://[Your server].hydra-s3.wasm",
        zkeyPath: "https://[Your server].hydra-s3.zkey"
    }
); 

```

|  Params  | Type      | Description |
| ---------- | -------------- | ------------- |
| registryTree | MerkleTree | Registry Merkle tree that contain the Accounts Merkle tree |
| commitmentMapperPubKey | EddsaPublicKey | Pub key of the CommitmentMapper |


To generate the proof, we need to provide a .wasm and a .zkey to the witness calculator. For CommonJS modules we add theses files directly in the package and we resolve the path. For ES module we can't do that, that's why we choose to host files on an S3. 

If this solution doesn't suite you or if you want to optimize the download time, you can override S3 paths by adding a third params in the HydraS3Prover constructor and host files wherever you want.

#### ES modules (which can be overridden)

```javascript
export const wasmPath = "https://static.sismo.io/hydra-s3-zkps/v1/hydra-s3.wasm";
export const zkeyPath = "https://static.sismo.io/hydra-s3-zkps/v1/hydra-s3.zkey";
```

#### CommonJS

```javascript
export const wasmPath = require.resolve('./hydra-s3.wasm');
export const zkeyPath = require.resolve('./hydra-s3.zkey');
```

### Generate Snark Proof

``` javascript

const source: HydraS3Account = {
    identifier: address,
    secret,
    commitmentReceipt
}

const destination: DestinationInput = {
    identifier: address,
    secret,
    commitmentReceipt,
    chainId: 1,
}

const claim: ClaimInput = {
    value?: BigNumberish;
    // A comparator of 0 means the accounts value in the tree can be more than the value in the claim
    // A comparator of 1 means the accounts value in the tree must be equal to the value in the claim
    comparator?: number;
    registryTree: KVMerkleTree;
    accountsTree: KVMerkleTree;
}

const params = {
    vault,
    source,
    destination,
    claim,
    requestIdentifier
}

const snarkProof = await prover.generateSnarkProof(params);

// Generate inputs
// This function is automatically called by generateSnarkProof but you can call it in your tests
const { privateInputs, publicInputs } = await prover.generateInputs(params);

// Throw human readable errors
// This function is automatically called by generateSnarkProof but you can call it in your tests
try {
    await prover.userParamsValidation(params);
} catch (e) {
    console.log(e);
}
``` 

|  Params  | Type      | Description |
| ---------- | -------------- | ------------- |
| source | HydraS3Account \| VaultAccount | Source account |
| destination | HydraS3Account \| VaultAccount | Destination account |
| claimValue | BigNumberish | Must be 0 <= claimValue <= accountValue if claimComparator is false or claimValue = accountValue if claimComparator is true |
| chainId | BigNumberish | Chain id |
| accountsTree | MerkleTree | Merkle tree constituted which include the source and a value |
| requestIdentifier | BigNumberish | proofIdentifier = hash((hash(source.secret, 1), requestIdentifier) |
| claimComparator | boolean | Define if the value is strict or not |

``` javascript
export type HydraS3Account = { 
  identifier: BigNumberish,
  secret: BigNumberish,
  commitmentReceipt: [BigNumberish, BigNumberish, BigNumberish]
};
export type VaultAccount = {
  identifier: BigNumberish;
  secret: BigNumberish;
  namespace: BigNumberish;
};
```

## Verifier js (HydraS3Verifier) <a name="VerifierJs"></a>

``` javascript
import { HydraS3Verifier } from "@sismo-core/hydra-s3";

const isValid = await HydraS3Verifier.verifyProof(snarkProof.a, snarkProof.b, snarkProof.c, snarkProof.input);
``` 


## Verifier contract (HydraS3Verifier)<a name="VerifierContract"></a>

``` javascript
import {HydraS3Verifier} from "@sismo-core/hydra-s3/contracts/HydraS3Verifier.sol";

struct ZKProof {
    uint256[2] a;
    uint256[2][2] b;
    uint256[2] c; 
    uint256[10] input; 
}

contract HydraS3Attester {
    HydraS3Verifier internal _verifier;

    error InvalidSnarkProof(uint256[10] publicInputs);

    constructor(
        HydraS3Verifier hydraS3Verifier
    ) {
        _verifier = hydraS3Verifier;
    }

    function attest(ZKProof calldata proof) external {
        if(! _verifier.verifyProof(proof.a, proof.b, proof.c, proof.input)) {
            revert InvalidSnarkProof(proof.input);
        }
    }
}
``` 

## License

Distributed under the MIT License.

## Contribute

Please, feel free to open issues, PRs or simply provide feedback!

## Contact

Prefer [Discord](https://discord.gg/sismo) or [Twitter](https://twitter.com/sismo_eth)

<br/>
<img src="https://static.sismo.io/readme/bottom-secondary.png" alt="bottom" width="100%" >