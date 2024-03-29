pragma circom 2.1.2;

include "../node_modules/circomlib/circuits/compconstant.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "../node_modules/circomlib/circuits/babyjub.circom";

include "./common/verify-merkle-path.circom";
include "./common/verify-hydra-commitment.circom";

// This is the circuit for the Hydra S3 Proving Scheme
// please read this doc to understand the underlying concepts
// https://docs.sismo.io/sismo-docs/technical-concepts/hydra-zk-proving-schemes
template hydraS3(registryTreeHeight, accountsTreeHeight) {
  // Private inputs
  signal input sourceIdentifier;
  signal input sourceSecret;
  signal input vaultSecret;
  signal input sourceVaultNamespace;
  signal input destinationVaultNamespace;
  signal input sourceCommitmentReceipt[3];
  signal input destinationSecret; 
  signal input destinationCommitmentReceipt[3];
  signal input accountMerklePathElements[accountsTreeHeight];
  signal input accountMerklePathIndices[accountsTreeHeight];
  signal input accountsTreeRoot;
  signal input registryMerklePathElements[registryTreeHeight];
  signal input registryMerklePathIndices[registryTreeHeight];
  signal input sourceValue;

  // Public inputs
  signal input destinationIdentifier;
  signal input extraData;
  signal input commitmentMapperPubKey[2];
  signal input registryTreeRoot;
  signal input requestIdentifier;
  signal input proofIdentifier;
  signal input claimValue;
  signal input accountsTreeValue;
  signal input claimComparator; 
  signal input vaultIdentifier;
  signal input vaultNamespace;
  signal input sourceVerificationEnabled;
  signal input destinationVerificationEnabled;

  // In the following we verify the proof of ownership of the source identifier.
  // There is 2 ways to verify it:
  // - using a vault secret and a sourceVaultNamespace
  // - using an Hydra Delegated Proof of Ownership 

  // Verify if the sourceVaultNamespace is 0 then we don't verify the sourceIdentifier as a vault
  component sourceVaultNamespaceIsZero = IsZero();
  sourceVaultNamespaceIsZero.in <== sourceVaultNamespace;

  // Verify sourceIdentifier as source using vault secret and sourceVaultNamespace
  component sourceVaultIdentifierHasher = Poseidon(2);
  sourceVaultIdentifierHasher.inputs[0] <== vaultSecret;
  sourceVaultIdentifierHasher.inputs[1] <== sourceVaultNamespace;
  // check the constraint only if sourceVaultNamespace is not 0
  
  signal sourceIdentifierVerifiedByVaultSecret;
  sourceIdentifierVerifiedByVaultSecret <== (sourceVaultIdentifierHasher.out - sourceIdentifier) * (1 - sourceVaultNamespaceIsZero.out);
  // if source verificationEnabled is 0 this constraint is not checked
  sourceIdentifierVerifiedByVaultSecret * sourceVerificationEnabled === 0;

  // Verify the source account went through the Hydra Delegated Proof of Ownership
  // That means the user own the source address
  component sourceCommitmentVerification = VerifyHydraCommitment();
  sourceCommitmentVerification.address <== sourceIdentifier;
  sourceCommitmentVerification.vaultSecret <== vaultSecret; 
  sourceCommitmentVerification.accountSecret <== sourceSecret; 
  sourceCommitmentVerification.enabled <== sourceVaultNamespaceIsZero.out * sourceVerificationEnabled; 
  sourceCommitmentVerification.commitmentMapperPubKey[0] <== commitmentMapperPubKey[0];
  sourceCommitmentVerification.commitmentMapperPubKey[1] <== commitmentMapperPubKey[1];
  sourceCommitmentVerification.commitmentReceipt[0] <== sourceCommitmentReceipt[0];
  sourceCommitmentVerification.commitmentReceipt[1] <== sourceCommitmentReceipt[1];
  sourceCommitmentVerification.commitmentReceipt[2] <== sourceCommitmentReceipt[2];


  // In the following we verify the proof of ownership of the destination identifier.
  // There is 2 ways to verify it:
  // - using a vault secret and a sourceVaultNamespace
  // - using an Hydra Delegated Proof of Ownership 

  // Verify if the destinationVaultNamespace is 0 then we don't verify the destinationIdentifier as a vault
  component destinationVaultNamespaceIsZero = IsZero();
  destinationVaultNamespaceIsZero.in <== destinationVaultNamespace;

  // Verify destinationIdentifier using vault secret and destinationVaultNamespace
  component destinationVaultIdentifierHasher = Poseidon(2);
  destinationVaultIdentifierHasher.inputs[0] <== vaultSecret;
  destinationVaultIdentifierHasher.inputs[1] <== destinationVaultNamespace;
  // check the constraint only if sourceVaultNamespace is not 0
  
  signal destinationIdentifierVerifiedByVaultSecret;
  destinationIdentifierVerifiedByVaultSecret <== (destinationVaultIdentifierHasher.out - destinationIdentifier) * (1 - destinationVaultNamespaceIsZero.out);
  // if destination verificationEnabled is 0 this constraint is not checked
  destinationIdentifierVerifiedByVaultSecret * destinationVerificationEnabled === 0;

  // Verify the destination account went through the Hydra Delegated Proof of Ownership
  // That means the user own the destination address
  component destinationCommitmentVerification = VerifyHydraCommitment();
  destinationCommitmentVerification.address <== destinationIdentifier;
  destinationCommitmentVerification.vaultSecret <== vaultSecret; 
  destinationCommitmentVerification.accountSecret <== destinationSecret; 
  destinationCommitmentVerification.enabled <== destinationVaultNamespaceIsZero.out * destinationVerificationEnabled; 
  destinationCommitmentVerification.commitmentMapperPubKey[0] <== commitmentMapperPubKey[0];
  destinationCommitmentVerification.commitmentMapperPubKey[1] <== commitmentMapperPubKey[1];
  destinationCommitmentVerification.commitmentReceipt[0] <== destinationCommitmentReceipt[0];
  destinationCommitmentVerification.commitmentReceipt[1] <== destinationCommitmentReceipt[1];
  destinationCommitmentVerification.commitmentReceipt[2] <== destinationCommitmentReceipt[2];


  // Merkle path verification enabled
  // if accountsTreeValue is 0 then we don't verify the merkle path
  component accountsTreeValueIsZero = IsZero();
  accountsTreeValueIsZero.in <== accountsTreeValue;

  // Verification that the source account is part of an accounts tree
  // Recreating the leaf which is the hash of an account identifier and an account value
  component accountLeafConstructor = Poseidon(2);
  accountLeafConstructor.inputs[0] <== sourceIdentifier;
  accountLeafConstructor.inputs[1] <== sourceValue;

  // This tree is an Accounts Merkle Tree which is constituted by accounts
  // https://accounts-registry-tree.docs.sismo.io
  // leaf = Hash(accountIdentifier, accountValue) 
  // verify the merkle path
  component accountsTreesPathVerifier = VerifyMerklePath(accountsTreeHeight);
  accountsTreesPathVerifier.leaf <== accountLeafConstructor.out;  
  accountsTreesPathVerifier.root <== accountsTreeRoot;
  accountsTreesPathVerifier.enabled <== (1 - accountsTreeValueIsZero.out);
  for (var i = 0; i < accountsTreeHeight; i++) {
    accountsTreesPathVerifier.pathElements[i] <== accountMerklePathElements[i];
    accountsTreesPathVerifier.pathIndices[i] <== accountMerklePathIndices[i];
  }

  // Verification that the accounts tree is part of a registry tree
  // Recreating the leaf
  component registryLeafConstructor = Poseidon(2);
  registryLeafConstructor.inputs[0] <== accountsTreeRoot;
  registryLeafConstructor.inputs[1] <== accountsTreeValue; 

  // https://accounts-registry-tree.docs.sismo.io
  // leaf = Hash(accountsTreeRoot, accountsTreeValue)
  // verify the merkle path
  component registryTreePathVerifier = VerifyMerklePath(registryTreeHeight);
  registryTreePathVerifier.leaf <== registryLeafConstructor.out; 
  registryTreePathVerifier.root <== registryTreeRoot;
  registryTreePathVerifier.enabled <== (1 - accountsTreeValueIsZero.out);
  for (var i = 0; i < registryTreeHeight; i++) {
    registryTreePathVerifier.pathElements[i] <== registryMerklePathElements[i];
    registryTreePathVerifier.pathIndices[i] <== registryMerklePathIndices[i];
  }

  // Verify claim value validity
  // 0 => sourceValue can be higher than claimValue 
  // 1 => sourceValue and claimValue should be equal 
  // Prevent overflow of comparator range
  component sourceInRange = Num2Bits(252);
  sourceInRange.in <== sourceValue;
  component claimInRange = Num2Bits(252);
  claimInRange.in <== claimValue;
  // 0 <= claimValue <= sourceValue
  component leq = LessEqThan(252);
  leq.in[0] <== claimValue;
  leq.in[1] <== sourceValue;
  leq.out === 1;
  // If claimComparator == 1 then claimValue == sourceValue
  0 === (claimComparator-1)*claimComparator;
  sourceValue === sourceValue+((claimValue-sourceValue)*claimComparator);

  // Verify the proofIdentifier is valid
  // compute the sourceSecretHash using the hash of the sourceSecret
  signal sourceSecretHash; 
  component sourceSecretHasher = Poseidon(2);
  sourceSecretHasher.inputs[0] <== sourceSecret;
  sourceSecretHasher.inputs[1] <== 1;  
  sourceSecretHash <== sourceSecretHasher.out; 

  // compute the vaultSecret Hash for used as an entropy for the ProofIdentifier value
  // Only used if using a vault data source 
  // other wise it's the source Account that is used
  signal vaultSecretHashedForProofIdentifierHash;
  component vaultSecretHashedForProofIdentifierHasher = Poseidon(3);
  vaultSecretHashedForProofIdentifierHasher.inputs[0] <== vaultSecret;
  vaultSecretHashedForProofIdentifierHasher.inputs[1] <== sourceVaultNamespace;   
  vaultSecretHashedForProofIdentifierHasher.inputs[2] <== 1;
  vaultSecretHashedForProofIdentifierHash <== vaultSecretHashedForProofIdentifierHasher.out;

  // If the sourceIdentifier is made using the vaultSecret and the sourceVaultNamespace 
  // then we use the vaultSecretHashedForProofIdentifierHash
  // otherwise we use the sourceSecretHash

  signal secretHashForProofIdentifier;
  secretHashForProofIdentifier <== (sourceSecretHash - vaultSecretHashedForProofIdentifierHash) * sourceVaultNamespaceIsZero.out + vaultSecretHashedForProofIdentifierHash; 

  // Verify if the requestIdentifier is 0 then we don't verify the proofIdentifier
  component requestIdentifierIsZero = IsZero();
  requestIdentifierIsZero.in <== requestIdentifier;

  // Verify the proofIdentifier is valid
  // by hashing the secretHashForProofIdentifier and requestIdentifier
  // and verifying the result is equals
  component proofIdentifierHasher = Poseidon(2);
  proofIdentifierHasher.inputs[0] <== secretHashForProofIdentifier;
  proofIdentifierHasher.inputs[1] <== requestIdentifier;
  // Check the proofIdentifier is valid only if requestIdentifier is not 0
  (proofIdentifierHasher.out - proofIdentifier) * (1-requestIdentifierIsZero.out) === 0;


  // Verify if the vaultNamespace is 0 then we don't verify the vaultIdentifier
  component vaultNamespaceIsZero = IsZero();
  vaultNamespaceIsZero.in <== vaultNamespace;

  // Compute the vaultIdentifier
  component vaultIdentifierHasher = Poseidon(2);
  vaultIdentifierHasher.inputs[0] <== vaultSecret;
  vaultIdentifierHasher.inputs[1] <== vaultNamespace;
  (vaultIdentifierHasher.out - vaultIdentifier) * (1 - vaultNamespaceIsZero.out) === 0;

  // Square serve to avoid removing by the compilator optimizer
  signal extraDataSquare;
  extraDataSquare <== extraData * extraData;
}

component main {public [commitmentMapperPubKey, registryTreeRoot, vaultNamespace, vaultIdentifier, requestIdentifier, proofIdentifier, destinationIdentifier, claimValue, extraData, accountsTreeValue, claimComparator, sourceVerificationEnabled, destinationVerificationEnabled]} = hydraS3(20,20);