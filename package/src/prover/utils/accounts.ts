import { BigNumber, BigNumberish, ethers } from "ethers";

export const sourceAccountHexFormatter = (account: BigNumberish | BigInt): string => {
  // if account more than 22, it's a vaultId
  const isSourceVaultId = BigNumber.from(account).toHexString().length > 42;
  return isSourceVaultId
    ? ethers.utils.hexlify(BigNumber.from(account))
    : ethers.utils.hexZeroPad(ethers.utils.hexlify(BigNumber.from(account)), 20);
};
