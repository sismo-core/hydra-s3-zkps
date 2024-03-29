import hre from "hardhat";
import { BigNumber } from "ethers";
import { describe } from "mocha";
import { HydraS3Verifier, HydraS3Verifier__factory } from "../types";
import { expect } from "chai";
import {
  ACCOUNTS_TREE_HEIGHT,
  KVMerkleTree,
  MerkleTreeData,
  buildPoseidon,
  HydraS3Account,
  SnarkProof,
  REGISTRY_TREE_HEIGHT,
  HydraS3Prover,
  VaultInput,
} from "../package/src";
import {
  CommitmentMapperTester,
  getOwnershipMsg,
} from "@sismo-core/commitment-mapper-tester-js";

describe("Hydra S3 Verifier contract", () => {
  let commitmentMapperTester: CommitmentMapperTester;
  let accounts: HydraS3Account[];
  let requestIdentifier: BigNumber;
  let hydraS3VerifierContract: HydraS3Verifier;
  let proof: SnarkProof;
  let registryTree: KVMerkleTree;
  let accountsTree: KVMerkleTree;
  let merkleTreeData: MerkleTreeData;
  let vault: VaultInput;

  before(async () => {
    // init poseidon hash function and elliptic curve setup
    const poseidon = await buildPoseidon();
    // generate an commitmentMapper that make the link between an ethereum account and a eddsa account.
    commitmentMapperTester = await CommitmentMapperTester.generate();

    const signers = await hre.ethers.getSigners();

    const vaultSecret = BigNumber.from("0x123456");
    const vaultNamespace = BigNumber.from(123);
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

    requestIdentifier = BigNumber.from(123);

    merkleTreeData = {
      [BigNumber.from(accounts[0].identifier).toHexString()]: 1,
      [BigNumber.from(accounts[1].identifier).toHexString()]: 2,
      [BigNumber.from(accounts[2].identifier).toHexString()]: 3,
      [BigNumber.from(accounts[3].identifier).toHexString()]: 4,
    };
    accountsTree = new KVMerkleTree(
      merkleTreeData,
      poseidon,
      ACCOUNTS_TREE_HEIGHT
    );

    registryTree = new KVMerkleTree(
      {
        [accountsTree.getRoot().toHexString()]: 1,
      },
      poseidon,
      REGISTRY_TREE_HEIGHT
    );

    //deploy contracts

    const deployer = signers[0];
    const deployed = await hre.deployments.deploy("HydraS3Verifier", {
      contract: "HydraS3Verifier",
      from: deployer.address,
      args: [],
      skipIfAlreadyDeployed: false,
    });
    hydraS3VerifierContract = HydraS3Verifier__factory.connect(
      deployed.address,
      deployer
    );
  });

  it("Should be able to generate the proof using the prover package", async () => {
    const prover = new HydraS3Prover(await commitmentMapperTester.getPubKey());

    const source = {
      ...accounts[0],
      verificationEnabled: true,
    };
    const destination = {
      ...accounts[4],
      verificationEnabled: true,
      chainId: parseInt(await hre.getChainId()),
    };
    const claimValue = BigNumber.from(
      merkleTreeData[BigNumber.from(source.identifier).toHexString()]
    );

    proof = await prover.generateSnarkProof({
      vault,
      source,
      destination,
      claim: {
        value: claimValue,
        comparator: 1,
        accountsTree: accountsTree,
        registryTree: registryTree,
      },
      requestIdentifier,
    });
  });

  it("Should be able to verify the proof using the verifier", async () => {
    const isValidContract = await hydraS3VerifierContract.verifyProof(
      proof.a,
      proof.b,
      proof.c,
      proof.input
    );
    expect(isValidContract).to.equals(true);
  });

  it("Should change a public input and expect the verifier to revert", async () => {
    const invalidInput = proof.input;
    invalidInput[3] = BigNumber.from(123); // override signal corresponding to registryTreeRoot
    const isValidContract = await hydraS3VerifierContract.verifyProof(
      proof.a,
      proof.b,
      proof.c,
      invalidInput
    );
    expect(isValidContract).to.equals(false);
  });
});
