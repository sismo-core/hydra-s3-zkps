import {
  DestinationInput,
  SourceInput,
  VaultInput,
} from "../package/src/prover/hydra-s3-prover";
import { BigNumber } from "ethers";
import hre from "hardhat";
import path from "path";
import { describe } from "mocha";
import {
  buildPoseidon,
  Poseidon,
  HydraS3Account,
  KVMerkleTree,
  MerkleTreeData,
  ACCOUNTS_TREE_HEIGHT,
  PrivateInputs,
  PublicInputs,
  REGISTRY_TREE_HEIGHT,
  HydraS3Prover,
} from "../package/src";
import { circuitShouldFail } from "./utils/circuit-should-fail";
import {
  CommitmentMapperTester,
  getOwnershipMsg,
} from "@sismo-core/commitment-mapper-tester-js";
import { wasm, WasmTester } from "circom_tester";

describe("Hydra S3 Circuits", () => {
  let commitmentMapperTester: CommitmentMapperTester;
  let accounts: HydraS3Account[];
  let circuitTester: WasmTester;
  let requestIdentifier: BigNumber;
  let registryTree: KVMerkleTree;
  let poseidon: Poseidon;
  let inputs: PublicInputs & PrivateInputs;
  let sourceVaultInputs: PublicInputs & PrivateInputs;
  let destinationVaultInputs: PublicInputs & PrivateInputs;
  let accountsTree1: KVMerkleTree;
  let merkleTreeData1: MerkleTreeData;
  let accountsTree2: KVMerkleTree;
  let accountsTree3: KVMerkleTree;
  let merkleTreeData2: MerkleTreeData;
  let merkleTreeData3: MerkleTreeData;
  let prover: HydraS3Prover;
  let extraData: string;
  let source: SourceInput;
  let sourceVault: SourceInput;
  let destinationVault: DestinationInput;
  let destination: DestinationInput;
  let sourceValue: BigNumber;
  let vault: VaultInput;
  let sourceVaultId: string;

  before(async () => {
    poseidon = await buildPoseidon();
    commitmentMapperTester = await CommitmentMapperTester.generate();
    const signers = await hre.ethers.getSigners();
    const vaultSecret = BigNumber.from("0x123456");
    const vaultNamespace = BigNumber.from(123);
    const sourceVaultNamespace = BigNumber.from(456);
    vault = {
      secret: vaultSecret,
      namespace: vaultNamespace,
    };

    accounts = [];

    for (let i = 0; i < 10; i++) {
      const address = (await signers[i].getAddress()).toLowerCase();
      const signature = await signers[i].signMessage(getOwnershipMsg(address));
      const secret = BigNumber.from(i);
      const commitment = poseidon([vaultSecret, secret]).toHexString();
      const { commitmentReceipt } = await commitmentMapperTester.commit(
        address,
        signature,
        commitment
      );
      accounts.push({
        identifier: address,
        secret,
        commitmentReceipt,
      });
    }
    circuitTester = await wasm(
      path.join(__dirname, "../circuits", "hydra-s3.circom")
    );
    requestIdentifier = BigNumber.from(123);

    merkleTreeData1 = {
      [BigNumber.from(accounts[0].identifier).toHexString()]: 4,
      [BigNumber.from(accounts[1].identifier).toHexString()]: 5,
      [BigNumber.from(accounts[2].identifier).toHexString()]: 6,
      [BigNumber.from(accounts[3].identifier).toHexString()]: 7,
    };
    accountsTree1 = new KVMerkleTree(
      merkleTreeData1,
      poseidon,
      ACCOUNTS_TREE_HEIGHT
    );

    merkleTreeData2 = {
      [BigNumber.from(accounts[4].identifier).toHexString()]: 4,
      [BigNumber.from(accounts[5].identifier).toHexString()]: 2,
      [BigNumber.from(accounts[6].identifier).toHexString()]: 5,
      [BigNumber.from(accounts[7].identifier).toHexString()]: 1,
    };
    accountsTree2 = new KVMerkleTree(
      merkleTreeData2,
      poseidon,
      ACCOUNTS_TREE_HEIGHT
    );

    sourceVaultId = poseidon([vaultSecret, sourceVaultNamespace]).toHexString();
    merkleTreeData3 = {
      [sourceVaultId]: 4,
      [BigNumber.from(1).toHexString()]: 2,
      [BigNumber.from(2).toHexString()]: 5
    };
    accountsTree3 = new KVMerkleTree(
      merkleTreeData3,
      poseidon,
      ACCOUNTS_TREE_HEIGHT
    );

    registryTree = new KVMerkleTree(
      {
        [accountsTree3.getRoot().toHexString()]: 2,
        [accountsTree1.getRoot().toHexString()]: 1,
        [accountsTree2.getRoot().toHexString()]: 0,
      },
      poseidon,
      REGISTRY_TREE_HEIGHT
    );

    prover = new HydraS3Prover(await commitmentMapperTester.getPubKey());

    extraData = "0x123345";

    sourceVault = {
      identifier: sourceVaultId,
      namespace: sourceVaultNamespace,
      secret: vaultSecret,
      verificationEnabled: true,
    };

    destinationVault = {
      identifier: sourceVaultId,
      namespace: sourceVaultNamespace,
      secret: vaultSecret,
      verificationEnabled: true,
    };
    source = {
      ...accounts[0],
      verificationEnabled: true,
    };
    destination = {
      ...accounts[4],
      verificationEnabled: true,
    };

    sourceValue = BigNumber.from(
      merkleTreeData1[BigNumber.from(source.identifier).toHexString()]
    );
  });

  describe("Generating proofs", async () => {
    it("Snark proof of vault identifier for a specific vault namespace", async () => {
      const { privateInputs, publicInputs } = await prover.generateInputs({
        vault,
      });

      inputs = { ...privateInputs, ...publicInputs };

      const w = await circuitTester.calculateWitness(inputs, true);
      await circuitTester.checkConstraints(w);
    });

    it("Snark proof of vault identifier with some extraData", async () => {
      const { privateInputs, publicInputs } = await prover.generateInputs({
        vault,
        extraData,
      });

      inputs = { ...privateInputs, ...publicInputs };

      const w = await circuitTester.calculateWitness(inputs, true);
      await circuitTester.checkConstraints(w);
    });

    it("Snark proof of vault identifier for a specific vault namespace with source verification", async () => {
      const { privateInputs, publicInputs } = await prover.generateInputs({
        vault,
        source,
      });

      inputs = { ...privateInputs, ...publicInputs };

      const w = await circuitTester.calculateWitness(inputs, true);
      await circuitTester.checkConstraints(w);
    });

    it("Snark proof of vault identifier for a specific vault namespace with an unverified destination", async () => {
      const { privateInputs, publicInputs } = await prover.generateInputs({
        vault,
        source,
        destination: {
          ...destination,
          verificationEnabled: false,
        },
      });

      inputs = { ...privateInputs, ...publicInputs };

      const w = await circuitTester.calculateWitness(inputs, true);
      await circuitTester.checkConstraints(w);
    });

    it("Snark proof of simple value in a merkleTree with simple proofIdentifier without destination verification", async () => {
      const { privateInputs, publicInputs } = await prover.generateInputs({
        vault,
        source,
        destination: {
          ...destination,
          verificationEnabled: false,
        },
        claim: {
          value: sourceValue,
          accountsTree: accountsTree1,
          registryTree,
          comparator: 0,
        },
        requestIdentifier,
      });

      inputs = { ...privateInputs, ...publicInputs };

      const w = await circuitTester.calculateWitness(inputs, true);
      await circuitTester.checkConstraints(w);
    });

    it("Snark proof without vault namespace", async () => {
      const { privateInputs, publicInputs } = await prover.generateInputs({
        vault: {
          secret: vault.secret
        },
        source: sourceVault,
        destination,
        claim: {
          value: merkleTreeData3[sourceVaultId],
          accountsTree: accountsTree3,
          registryTree,
          comparator: 0,
        },
        requestIdentifier,
      });
      
      inputs = { ...privateInputs, ...publicInputs };

      const w = await circuitTester.calculateWitness(inputs, true);
      await circuitTester.checkConstraints(w);
    });

    it("Snark proof using a VaultAccount as a source", async () => {
      const { privateInputs, publicInputs } = await prover.generateInputs({
        vault,
        source: sourceVault,
        destination,
        claim: {
          value: merkleTreeData3[sourceVaultId],
          accountsTree: accountsTree3,
          registryTree,
          comparator: 0,
        },
        requestIdentifier,
      });
      
      sourceVaultInputs = { ...privateInputs, ...publicInputs };

      const w = await circuitTester.calculateWitness(inputs, true);
      await circuitTester.checkConstraints(w);
    });


    it("Snark proof using a VaultAccount as a destination", async () => {
      const { privateInputs, publicInputs } = await prover.generateInputs({
        vault,
        source,
        destination: destinationVault,
        requestIdentifier,
      });
      
      destinationVaultInputs = { ...privateInputs, ...publicInputs };

      const w = await circuitTester.calculateWitness(destinationVaultInputs, true);
      await circuitTester.checkConstraints(w);
    });

    it("Snark proof of simple value in a merkleTree with simple proofIdentifier", async () => {
      const { privateInputs, publicInputs } = await prover.generateInputs({
        vault,
        source,
        destination,
        claim: {
          value: sourceValue,
          accountsTree: accountsTree1,
          registryTree,
          comparator: 0,
        },
        requestIdentifier,
      });

      inputs = { ...privateInputs, ...publicInputs };

      const w = await circuitTester.calculateWitness(inputs, true);
      const res = await circuitTester.checkConstraints(w);
      console.log("res", res);
    });
  });

  
  describe("Verifying accountsTree and registryTree are good", async () => {
    it("Should throw when using an Accounts tree with wrong height", async () => {
      const accountsTree3 = new KVMerkleTree(merkleTreeData1, poseidon);

      const registryTree3 = new KVMerkleTree(
        {
          [accountsTree3.getRoot().toHexString()]: 1,
        },
        poseidon,
        REGISTRY_TREE_HEIGHT
      );

      const prover2 = new HydraS3Prover(
        await commitmentMapperTester.getPubKey()
      );

      const { privateInputs, publicInputs } = await prover2.generateInputs({
        vault,
        source,
        destination,
        claim: {
          value: BigNumber.from(1),
          registryTree: registryTree3,
          accountsTree: accountsTree3,
          comparator: 1,
        },
        requestIdentifier,
      });

      const inputs3 = { ...privateInputs, ...publicInputs };

      await circuitShouldFail(
        circuitTester,
        {
          ...inputs3,
        },
        "Not enough values for input signal accountMerklePathElements"
      );
    });

    it("Should throw when using an Registry Merkle tree with wrong height", async () => {
      const registryTree3 = new KVMerkleTree(
        {
          [accountsTree1.getRoot().toHexString()]: 1,
          [accountsTree2.getRoot().toHexString()]: 0,
        },
        poseidon
      );

      const prover2 = new HydraS3Prover(
        await commitmentMapperTester.getPubKey()
      );

      const { privateInputs, publicInputs } = await prover2.generateInputs({
        vault,
        source,
        destination,
        claim: {
          value: BigNumber.from(1),
          registryTree: registryTree3,
          accountsTree: accountsTree1,
          comparator: 1,
        },
        requestIdentifier,
      });

      const inputs3 = { ...privateInputs, ...publicInputs };

      await circuitShouldFail(
        circuitTester,
        {
          ...inputs3,
        },
        "Not enough values for input signal registryMerklePathElements"
      );
    });
  });

  describe("Verifying source constraints are good", async () => {
    it("Should throw with wrong source address", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{
            sourceIdentifier: BigNumber.from(accounts[1].identifier).toBigInt(),
          },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw with wrong sourceSecret", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{ sourceSecret: BigInt(123) },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw with wrong vault secret", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{ vaultSecret: BigInt(123) },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw with wrong sourceCommitmentReceipt", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{
            sourceCommitmentReceipt: [
              BigInt(1),
              BigInt(2),
              BigInt(3),
            ],
          },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });
  });


  describe("Verifying source constraints using a Vault as a source", async () => {
    it("Should throw with wrong source identifier", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...sourceVaultInputs,
          ...{
            sourceIdentifier: BigNumber.from(accounts[1].identifier).toBigInt(),
          },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw with wrong vault secret", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...sourceVaultInputs,
          ...{ vaultSecret: BigInt(123) },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw with wrong sourceNamespace", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...sourceVaultInputs,
          ...{ sourceVaultNamespace: BigInt(1) },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw with wrong proofIdentifier", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...sourceVaultInputs,
          ...{ proofIdentifier: BigInt(1) },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });
  });

  describe("Verifying destination constraints using Vault as a destination", async () => {
    it("Should throw with wrong destination identifier", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...destinationVaultInputs,
          ...{
            destinationIdentifier: BigNumber.from(accounts[1].identifier).toBigInt(),
          },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw with wrong vault secret", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...destinationVaultInputs,
          ...{ vaultSecret: BigInt(123) },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw with wrong namespace", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...destinationVaultInputs,
          ...{
            destinationVaultNamespace: BigInt(1)
          },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });
  });

  describe("Verifying vault constraints are good", async () => {
    it("Should throw with wrong vault identifier", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{
            vaultIdentifier: BigNumber.from("0x123").toBigInt(),
          },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw with wrong proofIdentifier", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...sourceVaultInputs,
          ...{ proofIdentifier: BigInt(1) },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });
  });

  describe("Verifying destination constraints are good", async () => {
    it("Should throw with wrong destination identifier", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{
            destinationIdentifier: BigNumber.from(
              accounts[5].identifier
            ).toBigInt(),
          },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw with wrong destinationSecret", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{ destinationSecret: BigInt(123) },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw with wrong destinationCommitmentReceipt", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{
            destinationCommitmentReceipt: [
              BigInt(1),
              BigInt(2),
              BigInt(3),
            ],
          },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw with wrong commitmentMapperPubKey", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{
            commitmentMapperPubKey: [
              BigInt(1),
              BigInt(2),
            ],
          },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });
  });

  describe("Verify externalDataMerkleTree constraint against the globalSismoTree", async () => {
    it("Should verify the global sismo tree root constraint", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{
            registryTreeRoot: registryTree.getRoot().add(1).toBigInt(),
          },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should verify the accountsTreeRoot constraint along the global sismo merkle tree", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{
            registryMerklePathElements: inputs.registryMerklePathElements
              .slice()
              .reverse(),
          },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });
  });

  describe("Verify data merkle tree constraint is good", async () => {
    it("Should throw when having a bad data merkle tree root or a bad data merkle tree height", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{ accountsTreeRoot: BigInt(123) }, // changing only the merkle Root
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw when using a bad Merkle path", async () => {
      const wrongAccountMerklePathElements = [
        ...inputs.accountMerklePathElements,
      ];
      wrongAccountMerklePathElements[2] = BigNumber.from(345).toBigInt();
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{ accountMerklePathElements: wrongAccountMerklePathElements },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
      const wrongAccountMerklePathIndices = [
        ...inputs.accountMerklePathIndices,
      ];
      wrongAccountMerklePathIndices[0] = 1;
      wrongAccountMerklePathIndices[1] = 0;
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{ accountMerklePathIndices: wrongAccountMerklePathIndices },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw when using a good Merkle path but for an other source address than the specified one", async () => {
      const externalDataMerklePathSource2 = accountsTree1.getMerklePathFromKey(
        BigNumber.from(accounts[2].identifier).toHexString()
      );

      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          accountMerklePathElements: externalDataMerklePathSource2.elements.map(
            (el) => el.toBigInt()
          ),
          accountMerklePathIndices: externalDataMerklePathSource2.indices,
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });
  });

  describe("Verify the value selected by the user", async () => {
    it("Should throw when using claimComparator < 0", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{
            claimComparator: -5 as any, // Must force any to bypass typescript error
          },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw when using claimComparator > 1", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{
            claimComparator: 2 as any, // Must force any to bypass typescript error
          },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw when using a value superior of the Merkle tree value for claimComparator == 1", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{ claimValue: BigNumber.from(5).toBigInt() }, // the good one is value: 4
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw when using a value superior of the Merkle tree value for claimComparator == 0", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{
            claimValue: BigNumber.from(5).toBigInt(),
            claimComparator: BigInt(0),
          }, // the good one is value: 4
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw when using negative value for claimComparator == 1", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{ claimValue: BigNumber.from(-5).toBigInt() }, // the good one is value: 4
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw when using negative value for claimComparator == 0", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{
            claimValue: BigNumber.from(-5).toBigInt(),
            claimComparator: BigInt(0),
          }, // the good one is value: 4
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw when using a value inferior of the Merkle tree value for claimComparator == 1", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{
            claimComparator: BigInt(1),
            claimValue: BigInt(3),
          }, // the good one is value: 4
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should generate a Snark proof when using a value inferior of the Merkle tree value for claimComparator == 0", async () => {
      const w = await circuitTester.calculateWitness(
        {
          ...inputs,
          ...{
            claimValue: BigNumber.from(3),
            claimComparator: 0,
          }, // the good one is value: 4
        },
        true
      );
      await circuitTester.checkConstraints(w);
    });
  });

  describe("Verify proofIdentifier validity", async () => {
    it("Should throw when the requestIdentifier does not corresponds to the proofIdentifier ", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{ requestIdentifier: BigNumber.from(456).toBigInt() }, // good one is 123
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });

    it("Should throw when the proofIdentifier does not corresponds to the requestIdentifier and sourceNullifier", async () => {
      await circuitShouldFail(
        circuitTester,
        {
          ...inputs,
          ...{ proofIdentifier: BigNumber.from(789).toBigInt() },
        },
        "Error: Assert Failed.\nError in template ForceEqualIfEnabled"
      );
    });
  });
});
