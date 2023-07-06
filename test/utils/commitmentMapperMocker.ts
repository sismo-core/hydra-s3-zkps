import { EddsaPublicKey } from '@sismo-core/crypto';
import { CommitmentMapperTester, EddsaAccount, EddsaSignature, SNARK_FIELD, buildPoseidon } from "@sismo-core/commitment-mapper-tester-js";
import { BigNumber } from "ethers";

export class CommitmentMapperMock {

  public static async generate(): Promise<CommitmentMapperTester> {
    const commitmentMapperTester = new CommitmentMapperTester();
    await commitmentMapperTester.generateRandomSecret();
    return commitmentMapperTester;
  }

  public async commit(
    ethAddress: string,
    ethSignature: string,
    commitment: string
  ): Promise<{
    commitmentReceipt: EddsaSignature;
    commitmentMapperPubKey: EddsaPublicKey;
  }> {
    const poseidon = await buildPoseidon();
    const ethAddressBigNumber = BigNumber.from(ethAddress.toLowerCase()).mod(
      SNARK_FIELD
    );
    const msg = poseidon([ethAddressBigNumber, commitment]);
    const eddsaAccount = await this._getEddsaAccount();
    // sign the receipt => this is the commitmentReceipt
    const commitmentReceipt = await eddsaAccount.sign(msg);

    return {
      commitmentMapperPubKey: eddsaAccount .getPubKey(),
      commitmentReceipt: [commitmentReceipt[0], commitmentReceipt[1], commitmentReceipt[2]],
    };
  }

  public async getPubKey(): Promise<EddsaPublicKey> {
    const eddsaAccount = await this._getEddsaAccount();

    const pubKeys = eddsaAccount.getPubKey()

    return [BigNumber.from(pubKeys[0]), BigNumber.from(pubKeys[1])];
  }


  private async _getEddsaAccount(): Promise<EddsaAccount> {
    const eddsaAccount = await EddsaAccount.generateFromSeed(
      BigNumber.from(32) // hardcoded for test purpose
    );
    return eddsaAccount;
  }
}


