import { BigNumberish } from "ethers";
import { buildPoseidon } from "../../package/src";

export const getVaultIdentifier = async ({
    vaultSecret,
    vaultNamespace
}: {
    vaultSecret: BigNumberish,
    vaultNamespace: BigNumberish,
}): Promise<string> => {
  const poseidon = await buildPoseidon();
  let vaultIdentifier = poseidon([vaultSecret, vaultNamespace]);
  return vaultIdentifier.toString();
}