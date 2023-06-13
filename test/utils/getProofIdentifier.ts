import { BigNumberish } from "ethers";
import { buildPoseidon } from "../../package/src";

export const getProofIdentifier = async ({
    sourceSecret,
    sourceNamespace,
    requestIdentifier,
}: {
    sourceSecret: BigNumberish,
    sourceNamespace?: BigNumberish,
    requestIdentifier: BigNumberish
}): Promise<string> => {
  const poseidon = await buildPoseidon();
  let proofIdentifier = BigInt(0);
  if (requestIdentifier !== BigInt(0)) {
    let secretHash = BigInt(0);
    if (sourceNamespace) {
      secretHash = poseidon([sourceSecret, sourceNamespace, 1]).toBigInt()
    } else {
      secretHash = poseidon([sourceSecret, 1]).toBigInt()
    }
    proofIdentifier = poseidon([secretHash, requestIdentifier]).toBigInt();
  }
  return proofIdentifier.toString();
}