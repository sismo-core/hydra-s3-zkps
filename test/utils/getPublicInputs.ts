import { BigNumber, BigNumberish } from "ethers"

export const getPublicInputs = ({
    destinationIdentifier,
    extraData,
    commitmentMapperPubKeyX,
    commitmentMapperPubKeyY,
    registryTreeRoot,
    requestIdentifier,
    proofIdentifier,
    claimValue,
    accountsTreeValue,
    claimType,
    vaultIdentifier,
    vaultNamespace,
    sourceVerificationEnabled,
    destinationVerificationEnabled
  }: {
    destinationIdentifier: BigNumberish,
    extraData: BigNumberish,
    commitmentMapperPubKeyX: BigNumberish,
    commitmentMapperPubKeyY: BigNumberish,
    registryTreeRoot: BigNumberish,
    requestIdentifier: BigNumberish,
    proofIdentifier: BigNumberish,
    claimValue: BigNumberish,
    accountsTreeValue: BigNumberish,
    claimType: BigNumberish,
    vaultIdentifier: BigNumberish,
    vaultNamespace: BigNumberish,
    sourceVerificationEnabled: BigNumberish,
    destinationVerificationEnabled: BigNumberish
  }): string[] => {
    return [
      BigNumber.from(destinationIdentifier).toString(),
      BigNumber.from(extraData).toString(),
      BigNumber.from(commitmentMapperPubKeyX).toString(),
      BigNumber.from(commitmentMapperPubKeyY).toString(),
      BigNumber.from(registryTreeRoot).toString(),
      BigNumber.from(requestIdentifier).toString(),
      BigNumber.from(proofIdentifier).toString(),
      BigNumber.from(claimValue).toString(),
      BigNumber.from(accountsTreeValue).toString(),
      BigNumber.from(claimType).toString(),
      BigNumber.from(vaultIdentifier).toString(),
      BigNumber.from(vaultNamespace).toString(),
      BigNumber.from(sourceVerificationEnabled).toString(),
      BigNumber.from(destinationVerificationEnabled).toString()
    ]
}