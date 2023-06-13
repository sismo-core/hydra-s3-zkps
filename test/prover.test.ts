import {
  DestinationInput,
  SourceInput,
  VaultInput,
} from "../package/src/prover/hydra-s3-prover";
import {
  CommitmentMapperTester,
  EddsaPublicKey,
  getOwnershipMsg,
} from "@sismo-core/commitment-mapper-tester-js";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import hre, { ethers } from "hardhat";
import { describe } from "mocha";
import {
  ACCOUNTS_TREE_HEIGHT,
  buildPoseidon,
  HydraS3Account,
  HydraS3Prover,
  KVMerkleTree,
  MerkleTreeData,
  Poseidon,
  REGISTRY_TREE_HEIGHT,
  SnarkProof,
} from "../package/src";
import { getProofIdentifier } from "./utils/getProofIdentifier";
import { getPublicInputs } from "./utils/getPublicInputs";
import { getVaultIdentifier } from "./utils/getVaultIdentifier";



describe("Hydra S3 Prover", () => {
  let commitmentMapperTester: CommitmentMapperTester;
  let accounts: HydraS3Account[];
  let requestIdentifier: BigNumber;
  let registryTree: KVMerkleTree;
  let poseidon: Poseidon;
  let accountsTree1: KVMerkleTree;
  let merkleTreeData1: MerkleTreeData;
  let merkleTreeData2: MerkleTreeData;
  let accountsTree2: KVMerkleTree;
  let accountsTree3: KVMerkleTree;
  let prover: HydraS3Prover;
  let extraData: string;
  let source: SourceInput;
  let destination: DestinationInput;
  let sourceValue: BigNumber;
  let snarkProof: SnarkProof;
  let vault: VaultInput;
  let sourceVault: SourceInput;
  let destinationVault: DestinationInput;
  let commitmentMapperPubKey: EddsaPublicKey;

  before(async () => {
    poseidon = await buildPoseidon();
    commitmentMapperTester = await CommitmentMapperTester.generate();

    const vaultSecret = BigNumber.from("0x123456");
    const vaultNamespace = BigNumber.from(123);
    const sourceVaultNamespace = BigNumber.from(456);
    vault = {
      secret: vaultSecret,
      namespace: vaultNamespace,
    };

    const signers = await hre.ethers.getSigners();

    accounts = [];

    for (let i = 0; i < 20; i++) {
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

    merkleTreeData1 = {
      [BigNumber.from(accounts[0].identifier).toHexString()]: 4,
      [BigNumber.from(accounts[1].identifier).toHexString()]: 5,
      [BigNumber.from(accounts[2].identifier).toHexString()]: 6,
      [BigNumber.from(accounts[3].identifier).toHexString()]: 7,
      [ethers.utils.hexZeroPad(
        BigNumber.from(accounts[19].identifier).toHexString(),
        20
      )]: 7,
    };
    accountsTree1 = new KVMerkleTree(
      merkleTreeData1,
      poseidon,
      ACCOUNTS_TREE_HEIGHT
    );

    const sourceVaultId = poseidon([vaultSecret, sourceVaultNamespace]).toHexString();
    merkleTreeData2 = {
      [sourceVaultId]: 4,
      [BigNumber.from(1).toHexString()]: 2,
      [BigNumber.from(2).toHexString()]: 5
    };
    accountsTree3 = new KVMerkleTree(
      merkleTreeData2,
      poseidon,
      ACCOUNTS_TREE_HEIGHT
    );

    registryTree = new KVMerkleTree(
      {
        [accountsTree3.getRoot().toHexString()]: 2,
        [accountsTree1.getRoot().toHexString()]: 1,
      },
      poseidon,
      REGISTRY_TREE_HEIGHT
    );

    commitmentMapperPubKey = await commitmentMapperTester.getPubKey();

    prover = new HydraS3Prover(commitmentMapperPubKey);

    extraData = "0x123345345";

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
    }
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

  describe("Proof with a HydraAccount as a Source", () => {
    it("Should generate a snark proof with all inputs", async () => {
      const claim = {
        value: sourceValue,
        comparator: 0,
        accountsTree: accountsTree1,
        registryTree,
      };
  
      snarkProof = await prover.generateSnarkProof({
        vault,
        source,
        destination,
        claim,
        requestIdentifier,
        extraData,
      });
  
      const proofIdentifier = await getProofIdentifier({ 
        sourceSecret: source.secret, 
        requestIdentifier
      });
  
      const vaultIdentifier = await getVaultIdentifier({
        vaultNamespace: vault.namespace as BigNumberish,
        vaultSecret: vault.secret
      })
  
      expect(snarkProof.input).to.deep.equal(getPublicInputs({
        destinationIdentifier: destination.identifier,
        extraData,
        commitmentMapperPubKeyX: commitmentMapperPubKey[0],
        commitmentMapperPubKeyY: commitmentMapperPubKey[1],
        registryTreeRoot: registryTree.getRoot(),
        requestIdentifier,
        proofIdentifier,
        claimValue: claim.value,
        accountsTreeValue: registryTree.getValue(accountsTree1.getRoot().toHexString()),
        claimType: 0,
        vaultIdentifier,
        vaultNamespace: 123,
        sourceVerificationEnabled: 1,
        destinationVerificationEnabled: 1
      }));
    });
  
    it("Should generate a snark proof without Vault namespace", async () => {
      const claim = {
        value: sourceValue,
        comparator: 0,
        accountsTree: accountsTree1,
        registryTree,
      };
  
      snarkProof = await prover.generateSnarkProof({
        vault: {
          secret: vault.secret
        },
        source,
        destination,
        claim,
        requestIdentifier,
        extraData,
      });
  
      const proofIdentifier = await getProofIdentifier({ 
        sourceSecret: source.secret, 
        requestIdentifier
      });
  
      expect(snarkProof.input).to.deep.equal(getPublicInputs({
        destinationIdentifier: destination.identifier,
        extraData,
        commitmentMapperPubKeyX: commitmentMapperPubKey[0],
        commitmentMapperPubKeyY: commitmentMapperPubKey[1],
        registryTreeRoot: registryTree.getRoot(),
        requestIdentifier,
        proofIdentifier,
        claimValue: claim.value,
        accountsTreeValue: registryTree.getValue(accountsTree1.getRoot().toHexString()),
        claimType: 0,
        vaultIdentifier: 0, // If there is no vault namespace it should not have a vaultIdentifier in public inputs
        vaultNamespace: 0,
        sourceVerificationEnabled: 1,
        destinationVerificationEnabled: 1
      }));
    });

    it("Should generate a snark proof without Request Identifier", async () => {
      const claim = {
        value: sourceValue,
        comparator: 0,
        accountsTree: accountsTree1,
        registryTree,
      };
  
      snarkProof = await prover.generateSnarkProof({
        vault: {
          secret: vault.secret
        },
        source,
        destination,
        claim,
        requestIdentifier: 0,
        extraData,
      });
  
      expect(snarkProof.input).to.deep.equal(getPublicInputs({
        destinationIdentifier: destination.identifier,
        extraData,
        commitmentMapperPubKeyX: commitmentMapperPubKey[0],
        commitmentMapperPubKeyY: commitmentMapperPubKey[1],
        registryTreeRoot: registryTree.getRoot(),
        requestIdentifier: 0,
        proofIdentifier: 0, // If there is no request identifier it should not have a proofIdentifier
        claimValue: claim.value,
        accountsTreeValue: registryTree.getValue(accountsTree1.getRoot().toHexString()),
        claimType: 0,
        vaultIdentifier: 0,
        vaultNamespace: 0,
        sourceVerificationEnabled: 1,
        destinationVerificationEnabled: 1
      }));
    });

    it("Should generate a snark proof without Source and Destination verification", async () => {
      const claim = {
        value: sourceValue,
        comparator: 0,
        accountsTree: accountsTree1,
        registryTree,
      };
  
      snarkProof = await prover.generateSnarkProof({
        vault: {
          secret: vault.secret
        },
        source: {
          ...source,
          commitmentReceipt: [1,2, 3], // With no verification the commitmentReceipt could not be correct
          verificationEnabled: false
        },
        destination: {
          ...destination,
          commitmentReceipt: [1,2, 3], // With no verification the commitmentReceipt could not be correct
          verificationEnabled: false
        },
        claim,
        requestIdentifier,
        extraData,
      });
  
      const proofIdentifier = await getProofIdentifier({ 
        sourceSecret: source.secret, 
        requestIdentifier
      });

      expect(snarkProof.input).to.deep.equal(getPublicInputs({
        destinationIdentifier: destination.identifier,
        extraData,
        commitmentMapperPubKeyX: commitmentMapperPubKey[0],
        commitmentMapperPubKeyY: commitmentMapperPubKey[1],
        registryTreeRoot: registryTree.getRoot(),
        requestIdentifier,
        proofIdentifier: proofIdentifier,
        claimValue: claim.value,
        accountsTreeValue: 1,
        claimType: 0,
        vaultIdentifier: 0,
        vaultNamespace: 0,
        sourceVerificationEnabled: 0,
        destinationVerificationEnabled: 0
      }));
    });

    it("Should throw with Invalid Accounts Merkle tree height", async () => {
      accountsTree2 = new KVMerkleTree(merkleTreeData1, poseidon);

      const registryTree2 = new KVMerkleTree(
        {
          [accountsTree2.getRoot().toHexString()]: 1,
        },
        poseidon,
        REGISTRY_TREE_HEIGHT
      );

      const prover2 = new HydraS3Prover(await commitmentMapperTester.getPubKey());

      try {
        await prover2.generateSnarkProof({
          vault,
          source,
          destination,
          claim: {
            accountsTree: accountsTree2,
            registryTree: registryTree2,
            value: sourceValue,
            comparator: 0,
          },
          requestIdentifier,
        });
      } catch (e: any) {
        expect(e.message).to.equal("Invalid Accounts tree height");
      }
    });

    it("Should throw with invalid Registry tree height", async () => {
      const registryTree3 = new KVMerkleTree(
        {
          [accountsTree1.getRoot().toHexString()]: 1,
        },
        poseidon
      );

      const prover3 = new HydraS3Prover(await commitmentMapperTester.getPubKey());

      try {
        await prover3.generateSnarkProof({
          vault,
          source,
          destination,
          claim: {
            value: sourceValue,
            registryTree: registryTree3,
            accountsTree: accountsTree1,
            comparator: 0,
          },
          requestIdentifier,
        });
      } catch (e: any) {
        expect(e.message).to.equal("Invalid Registry tree height");
      }
    });

    it("Should throw with invalid source secret", async () => {
      try {
        await prover.generateSnarkProof({
          vault,
          source: {
            ...source,
            secret: BigNumber.from(3),
          },
          destination,
          claim: {
            value: sourceValue,
            comparator: 0,
            accountsTree: accountsTree1,
            registryTree,
          },
          requestIdentifier,
        });
      } catch (e: any) {
        expect(e.message).to.equal("Invalid source commitment receipt");
      }
    });

    it("Should throw with invalid source commitment receipt", async () => {
      try {
        await prover.generateSnarkProof({
          vault,
          source: {
            ...source,
            commitmentReceipt: [
              BigNumber.from(1),
              BigNumber.from(2),
              BigNumber.from(3),
            ],
          },
          destination,
          claim: {
            value: sourceValue,
            comparator: 0,
            accountsTree: accountsTree1,
            registryTree,
          },
          requestIdentifier,
        });
      } catch (e: any) {
        expect(e.message).to.equal("Invalid source commitment receipt");
      }
    });

    it("Should throw with invalid destination secret", async () => {
      try {
        await prover.generateSnarkProof({
          vault,
          source,
          destination: {
            ...destination,
            secret: BigNumber.from(3),
          },
          claim: {
            value: sourceValue,
            comparator: 0,
            accountsTree: accountsTree1,
            registryTree,
          },
          requestIdentifier,
        });
      } catch (e: any) {
        expect(e.message).to.equal("Invalid destination commitment receipt");
      }
    });

    it("Should throw with invalid destination commitment receipt", async () => {
      try {
        await prover.generateSnarkProof({
          vault,
          source,
          destination: {
            ...destination,
            commitmentReceipt: [
              BigNumber.from(1),
              BigNumber.from(2),
              BigNumber.from(3),
            ],
          },
          claim: {
            value: sourceValue,
            comparator: 0,
            accountsTree: accountsTree1,
            registryTree,
          },
          requestIdentifier,
        });
      } catch (e: any) {
        expect(e.message).to.equal("Invalid destination commitment receipt");
      }
    });

    it("Should throw when sending claimValue > sourceValue", async () => {
      try {
        await prover.generateSnarkProof({
          vault,
          source,
          destination,
          claim: {
            value: BigNumber.from(10),
            comparator: 0,
            accountsTree: accountsTree1,
            registryTree,
          },
          requestIdentifier,
        });
      } catch (e: any) {
        expect(e.message).to.equal(
          `Claim value 10 can't be superior to Source value`
        );
      }
    });

    it("Should throw when sending claimValue is not equal to sourceValue and claimComparator == 1 (EQ)", async () => {
      try {
        await prover.generateSnarkProof({
          vault,
          source,
          destination,
          claim: {
            value: BigNumber.from(3),
            comparator: 1,
            accountsTree: accountsTree1,
            registryTree,
          },
          requestIdentifier,
        });
      } catch (e: any) {
        expect(e.message).to.equal(
          `Claim value 3 must be equal with Source value when claimComparator == 1`
        );
      }
    });

    it("Should throw when sending claimValue negative", async () => {
      try {
        await prover.generateSnarkProof({
          vault,
          source,
          destination,
          claim: {
            value: BigNumber.from(-3),
            comparator: 0,
            accountsTree: accountsTree1,
            registryTree,
          },
          requestIdentifier,
        });
      } catch (e: any) {
        expect(e.message).to.equal(`Claim value -3 can't be negative`);
      }
    });

    it("Should throw when sending Accounts tree which is not in the Registry tree", async () => {
      const merkleTreeData = {
        [BigNumber.from(accounts[4].identifier).toHexString()]: 4,
        [BigNumber.from(accounts[5].identifier).toHexString()]: 5,
        [BigNumber.from(accounts[6].identifier).toHexString()]: 6,
        [BigNumber.from(accounts[7].identifier).toHexString()]: 7,
      };
      const accountsTree = new KVMerkleTree(
        merkleTreeData,
        poseidon,
        ACCOUNTS_TREE_HEIGHT
      );

      try {
        await prover.generateSnarkProof({
          vault,
          source,
          destination,
          claim: {
            value: BigNumber.from(4),
            accountsTree: accountsTree,
            registryTree,
            comparator: 0,
          },
          requestIdentifier,
        });
      } catch (e: any) {
        expect(e.message).to.equal(
          "Accounts tree root not found in the Registry tree"
        );
      }
    });

    it("Should throw when sending a source which is not in the accountsTree", async () => {
      const newSource = accounts[0];
      try {
        await prover.generateSnarkProof({
          vault,
          source: {
            ...newSource,
            verificationEnabled: true,
          },
          destination,
          claim: {
            value: BigNumber.from(4),
            comparator: 0,
            accountsTree: accountsTree1,
            registryTree,
          },
          requestIdentifier,
        });
      } catch (e: any) {
        expect(e.message).to.equal(
          `Could not find the source ${BigNumber.from(
            newSource.identifier
          ).toHexString()} in the Accounts tree`
        );
      }
    });
  });

  /************************************************************************/
  /*************************** VAULT AS SOURCE ****************************/
  /************************************************************************/

  describe("Proof with a Vault as a Source", () => {
      it("Should generate a snark proof with all inputs", async () => {
      const claim = {
        value: sourceValue,
        comparator: 0,
        accountsTree: accountsTree3,
        registryTree,
      };
  
      snarkProof = await prover.generateSnarkProof({
        vault,
        source: sourceVault,
        destination,
        claim,
        requestIdentifier,
        extraData,
      });
      
      const proofIdentifier = await getProofIdentifier({ 
        sourceSecret: sourceVault.secret, 
        sourceNamespace: (sourceVault as any).namespace,
        requestIdentifier
      });

      const vaultIdentifier = await getVaultIdentifier({ 
        vaultSecret: vault.secret, 
        vaultNamespace: vault.namespace as BigNumberish
      });
  
      expect(snarkProof.input).to.deep.equal(getPublicInputs({
        destinationIdentifier: destination.identifier,
        extraData,
        commitmentMapperPubKeyX: commitmentMapperPubKey[0],
        commitmentMapperPubKeyY: commitmentMapperPubKey[1],
        registryTreeRoot: registryTree.getRoot(),
        requestIdentifier,
        proofIdentifier, // If Vault as a Source the proof Identifier is generate from poseidon([poseidon([sourceSecret, sourceNamespace, 1]), requestIdentifier])
        claimValue: claim.value,
        accountsTreeValue: registryTree.getValue(accountsTree3.getRoot().toHexString()),
        claimType: 0,
        vaultIdentifier,
        vaultNamespace: vault.namespace as BigNumberish,
        sourceVerificationEnabled: 1,
        destinationVerificationEnabled: 1
      }));
    });
  
    it("Should generate a snark proof without Vault namespace", async () => {
      const claim = {
        value: sourceValue,
        comparator: 0,
        accountsTree: accountsTree3,
        registryTree,
      };
  
      snarkProof = await prover.generateSnarkProof({
        vault: {
          secret: vault.secret
        },
        source: sourceVault,
        destination,
        claim,
        requestIdentifier,
        extraData,
      });
      
      const proofIdentifier = await getProofIdentifier({ 
        sourceSecret: sourceVault.secret, 
        sourceNamespace: (sourceVault as any).namespace,
        requestIdentifier
      });
  
      expect(snarkProof.input).to.deep.equal(getPublicInputs({
        destinationIdentifier: destination.identifier,
        extraData,
        commitmentMapperPubKeyX: commitmentMapperPubKey[0],
        commitmentMapperPubKeyY: commitmentMapperPubKey[1],
        registryTreeRoot: registryTree.getRoot(),
        requestIdentifier,
        proofIdentifier, // If Vault as a Source the proof Identifier is generate from poseidon([poseidon([sourceSecret, sourceNamespace, 1]), requestIdentifier])
        claimValue: claim.value,
        accountsTreeValue: registryTree.getValue(accountsTree3.getRoot().toHexString()),
        claimType: 0,
        vaultIdentifier: 0,
        vaultNamespace: 0,
        sourceVerificationEnabled: 1,
        destinationVerificationEnabled: 1
      }));
    });

    it("Should generate a snark proof without Request Identifier", async () => {
      const claim = {
        value: sourceValue,
        comparator: 0,
        accountsTree: accountsTree3,
        registryTree,
      };
  
      snarkProof = await prover.generateSnarkProof({
        vault: {
          secret: vault.secret
        },
        source: sourceVault,
        destination,
        claim,
        requestIdentifier: 0,
        extraData,
      });
  
      expect(snarkProof.input).to.deep.equal(getPublicInputs({
        destinationIdentifier: destination.identifier,
        extraData,
        commitmentMapperPubKeyX: commitmentMapperPubKey[0],
        commitmentMapperPubKeyY: commitmentMapperPubKey[1],
        registryTreeRoot: registryTree.getRoot(),
        requestIdentifier: 0,
        proofIdentifier: 0, // With no request identifier the proofIdentifier should be 0
        claimValue: claim.value,
        accountsTreeValue: registryTree.getValue(accountsTree3.getRoot().toHexString()),
        claimType: 0,
        vaultIdentifier: 0,
        vaultNamespace: 0,
        sourceVerificationEnabled: 1,
        destinationVerificationEnabled: 1
      }));
    });


    it("Should generate a snark proof without Source verification", async () => {
      const claim = {
        value: sourceValue,
        comparator: 0,
        accountsTree: accountsTree3,
        registryTree,
      };
  
      snarkProof = await prover.generateSnarkProof({
        vault: {
          secret: vault.secret
        },
        source: {
          ...sourceVault,
          verificationEnabled: false,
        } as any,
        destination,
        claim,
        requestIdentifier,
        extraData,
      });
      
      const proofIdentifier = await getProofIdentifier({ 
        sourceSecret: sourceVault.secret, 
        sourceNamespace: (sourceVault as any).namespace,
        requestIdentifier
      });

      expect(snarkProof.input).to.deep.equal(getPublicInputs({
        destinationIdentifier: destination.identifier,
        extraData,
        commitmentMapperPubKeyX: commitmentMapperPubKey[0],
        commitmentMapperPubKeyY: commitmentMapperPubKey[1],
        registryTreeRoot: registryTree.getRoot(),
        requestIdentifier,
        proofIdentifier,
        claimValue: claim.value,
        accountsTreeValue: registryTree.getValue(accountsTree3.getRoot().toHexString()),
        claimType: 0,
        vaultIdentifier: 0,
        vaultNamespace: 0,
        sourceVerificationEnabled: 0,
        destinationVerificationEnabled: 1
      }));
    });

    it("Should throw with invalid source namespace", async () => {
      try {
        await prover.generateSnarkProof({
          vault,
          source: {
            ...sourceVault,
            namespace: BigNumber.from(3)
          },
          destination,
          claim: {
            value: sourceValue,
            comparator: 0,
            accountsTree: accountsTree3,
            registryTree,
          },
          requestIdentifier,
        });
      } catch (e: any) {
        expect(e.message).to.equal("Invalid source namespace or secret");
      }
    });

    it("Should throw with invalid source secret", async () => {
      try {
        await prover.generateSnarkProof({
          vault: {
            secret: 2
          },
          source: {
            ...source,
            verificationEnabled: false,
            secret: 2
          },
          destination: {
            ...destination,
            verificationEnabled: false
          },
          claim: {
            value: sourceValue,
            comparator: 0,
            accountsTree: accountsTree1,
            registryTree,
          },
          requestIdentifier,
          extraData,
        });
      } catch (e: any) {
        expect(e.message).to.equal("Invalid destination namespace or secret");
      }
    });

    it("Should throw with 2 different secret", async () => {
      try {
        await prover.generateSnarkProof({
          vault: {
            secret: vault.secret
          },
          source: sourceVault,
          destination,
          claim: {
            value: sourceValue,
            comparator: 0,
            accountsTree: accountsTree3,
            registryTree,
          },
          requestIdentifier,
          extraData,
        });
      } catch (e: any) {
        expect(e.message).to.equal("vault.secret must be identical to source.secret");
      }
    });
  })

  /************************************************************************/
  /************************ VAULT AS DESTINATION **************************/
  /************************************************************************/

    describe("Proof with a Vault as a Destination", () => {
      it("Should generate a snark proof with all inputs", async () => {
       const claim = {
         value: sourceValue,
         comparator: 0,
         accountsTree: accountsTree1,
         registryTree,
       };
   
       snarkProof = await prover.generateSnarkProof({
         vault: {
           secret: vault.secret
         },
         source,
         destination: destinationVault,
         claim,
         requestIdentifier,
         extraData,
       });
       
       const proofIdentifier = await getProofIdentifier({ 
         sourceSecret: source.secret, 
         requestIdentifier
       });
   
       expect(snarkProof.input).to.deep.equal(getPublicInputs({
         destinationIdentifier: destinationVault.identifier,
         extraData,
         commitmentMapperPubKeyX: commitmentMapperPubKey[0],
         commitmentMapperPubKeyY: commitmentMapperPubKey[1],
         registryTreeRoot: registryTree.getRoot(),
         requestIdentifier,
         proofIdentifier, 
         claimValue: claim.value,
         accountsTreeValue: registryTree.getValue(accountsTree1.getRoot().toHexString()),
         claimType: 0,
         vaultIdentifier: 0,
         vaultNamespace: 0,
         sourceVerificationEnabled: 1,
         destinationVerificationEnabled: 1
       }));
     });
    
     it("Should generate a snark proof without Vault namespace", async () => {
       const claim = {
         value: sourceValue,
         comparator: 0,
         accountsTree: accountsTree1,
         registryTree,
       };
   
       snarkProof = await prover.generateSnarkProof({
         vault: {
           secret: vault.secret
         },
         source,
         destination: destinationVault,
         claim,
         requestIdentifier,
         extraData,
       });
       
       const proofIdentifier = await getProofIdentifier({ 
         sourceSecret: source.secret, 
         requestIdentifier
       });
   
       expect(snarkProof.input).to.deep.equal(getPublicInputs({
         destinationIdentifier: destinationVault.identifier,
         extraData,
         commitmentMapperPubKeyX: commitmentMapperPubKey[0],
         commitmentMapperPubKeyY: commitmentMapperPubKey[1],
         registryTreeRoot: registryTree.getRoot(),
         requestIdentifier,
         proofIdentifier, 
         claimValue: claim.value,
         accountsTreeValue: registryTree.getValue(accountsTree1.getRoot().toHexString()),
         claimType: 0,
         vaultIdentifier: 0,
         vaultNamespace: 0,
         sourceVerificationEnabled: 1,
         destinationVerificationEnabled: 1
       }));
     });

     it("Should generate a snark proof without Request Identifier", async () => {
       const claim = {
         value: sourceValue,
         comparator: 0,
         accountsTree: accountsTree1,
         registryTree,
       };
   
       snarkProof = await prover.generateSnarkProof({
         vault: {
           secret: vault.secret
         },
         source,
         destination: destinationVault,
         claim,
         requestIdentifier: 0,
         extraData,
       });
   
       expect(snarkProof.input).to.deep.equal(getPublicInputs({
         destinationIdentifier: destinationVault.identifier,
         extraData,
         commitmentMapperPubKeyX: commitmentMapperPubKey[0],
         commitmentMapperPubKeyY: commitmentMapperPubKey[1],
         registryTreeRoot: registryTree.getRoot(),
         requestIdentifier: 0,
         proofIdentifier: 0, // With no request identifier the proofIdentifier should be 0
         claimValue: claim.value,
         accountsTreeValue: registryTree.getValue(accountsTree1.getRoot().toHexString()),
         claimType: 0,
         vaultIdentifier: 0,
         vaultNamespace: 0,
         sourceVerificationEnabled: 1,
         destinationVerificationEnabled: 1
       }));
     });


     it("Should generate a snark proof without destination verification", async () => {
       const claim = {
         value: sourceValue,
         comparator: 0,
         accountsTree: accountsTree1,
         registryTree,
       };
   
       snarkProof = await prover.generateSnarkProof({
         vault: {
           secret: vault.secret
         },
         source,
         destination: {
          ...destinationVault,
          verificationEnabled: false,
        } as any,
         claim,
         requestIdentifier: 0,
         extraData,
       });

       expect(snarkProof.input).to.deep.equal(getPublicInputs({
         destinationIdentifier: destinationVault.identifier,
         extraData,
         commitmentMapperPubKeyX: commitmentMapperPubKey[0],
         commitmentMapperPubKeyY: commitmentMapperPubKey[1],
         registryTreeRoot: registryTree.getRoot(),
         requestIdentifier: 0,
         proofIdentifier: 0,
         claimValue: claim.value,
         accountsTreeValue: registryTree.getValue(accountsTree1.getRoot().toHexString()),
         claimType: 0,
         vaultIdentifier: 0,
         vaultNamespace: 0,
         sourceVerificationEnabled: 1,
         destinationVerificationEnabled: 0
       }));
    })

    it("Should throw with invalid destination namespace", async () => {
      try {
        await prover.generateSnarkProof({
          vault,
          source,
          destination: {
            ...destinationVault,
            namespace: BigNumber.from(3)
          },
          claim: {
            value: sourceValue,
            comparator: 0,
            accountsTree: accountsTree1,
            registryTree,
          },
          requestIdentifier,
        });
      } catch (e: any) {
        expect(e.message).to.equal("Invalid destination namespace or secret");
      }
    });

    it("Should throw with invalid destination secret", async () => {
      try {
        await prover.generateSnarkProof({
          vault: {
            secret: 2
          },
          source: {
            ...source,
            verificationEnabled: false
          },
          destination: {
            ...destinationVault,
            secret: 2
          },
          claim: {
            value: sourceValue,
            comparator: 0,
            accountsTree: accountsTree1,
            registryTree,
          },
          requestIdentifier,
          extraData,
        });
      } catch (e: any) {
        expect(e.message).to.equal("Invalid destination namespace or secret");
      }
    });

    it("Should throw with 2 different secret", async () => {
      try {
        await prover.generateSnarkProof({
          vault: {
            secret: vault.secret
          },
          source,
          destination: {
            ...destinationVault,
            secret: 2
          },
          claim: {
            value: sourceValue,
            comparator: 0,
            accountsTree: accountsTree1,
            registryTree,
          },
          requestIdentifier,
          extraData,
        });
      } catch (e: any) {
        expect(e.message).to.equal("vault.secret must be identical to destination.secret");
      }
    });
  })

  describe("SnarkProof", () => {
    it("Should export the proof in Bytes", async () => {
      expect(snarkProof.toBytes().substring(514)).to.equal(
        "05398bbcc734689ec07e5add82d947e44de9fdd0577719503080378babf6a74900000000000000000000000000000000000000000000000000000001233453450739d67c4d0c90837361c2fe595d11dfecc2847dc41e1ef0da8201c0b16aa09c2206d2a327e39f643e508f5a08e922990cceba9610c15f9a94ef30d6dd54940f1bdeb4db623a998799dcc366d056ff9077af82bff96f75032ec3e77a6787a33f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000"
      );
    });
  })

  describe("Helpers", () => {
    it("Should test getProofIdentifier", async () => {
      let proofIdentifier: string;
      let sourceSecret = "0x237638673";
      let requestIdentifier = "0x89739783";
      let sourceNamespace = "0x376538709";

      proofIdentifier = await getProofIdentifier({ 
        sourceSecret, 
        requestIdentifier
      });

      expect(proofIdentifier).to.deep.equal(poseidon([poseidon([sourceSecret, 1]), requestIdentifier]));

      proofIdentifier = await getProofIdentifier({ 
        sourceSecret, 
        sourceNamespace,
        requestIdentifier
      });

      expect(proofIdentifier).to.deep.equal(poseidon([poseidon([sourceSecret, sourceNamespace, 1]), requestIdentifier]));
    })

    it("Should test getVaultIdentifier", async () => {
      const vaultNamespace = "0x3897636";
      const vaultSecret = "0x354663";

      const vaultIdentifier = await getVaultIdentifier({
        vaultNamespace,
        vaultSecret
      })

      expect(vaultIdentifier).to.deep.equal(poseidon([vaultSecret, vaultNamespace]));
    })
  })
});
