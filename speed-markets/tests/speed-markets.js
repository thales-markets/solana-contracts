const anchor = require("@coral-xyz/anchor");
const assert = require("assert");
const { Keypair, PublicKey } = require("@solana/web3.js");
const { SystemProgram } = anchor.web3;

describe("speed-markets", () => {
  // Configure the client to use the local cluster.
  // anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SpeedMarkets;
  const speedMarketsProgram  = anchor.workspace.SpeedMarkets;

  it("Create speed markets", async () => {
    const marketRequirementsAccount = anchor.web3.Keypair.generate();
    const priceFeed = anchor.web3.Keypair.generate();
    const speedMarketAccount = anchor.web3.Keypair.generate();
    const btcFeed = new PublicKey(
      "HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J"
    );
    console.log("speed acc: ", speedMarketAccount);
    console.log("provider acc: ", provider.wallet);
    const [speedMarketPDA, speedMarketBump] =
      await PublicKey.findProgramAddressSync([anchor.utils.bytes.utf8.encode("speed"), provider.wallet.publicKey.toBuffer()], speedMarketsProgram.programId);
    console.log("SpeedMarketPDA: ", speedMarketPDA.toString());
    console.log("SpeedMarketAccount: ", speedMarketAccount.publicKey.toString());
    console.log("speedMarketBump: ", speedMarketBump);
    console.log("rpc: \n", program.rpc);
    let now = parseInt(Date.now()/1000);
    console.log("time: ", now);
    await program.rpc.initializeMarketRequirements(new anchor.BN(10), new anchor.BN(100), new anchor.BN(20), new anchor.BN(200), new anchor.BN(2),{
      accounts:{
        marketRequirements: marketRequirementsAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      }, signers: [marketRequirementsAccount],
    });
    try {
      const create_tx = await program.rpc.createSpeedMarket(speedMarketBump, new anchor.BN(now+50), new anchor.BN(0), new anchor.BN(100), {
        accounts:{
          marketRequirements: marketRequirementsAccount.publicKey,
          user: provider.wallet.publicKey,
          speedMarket: speedMarketPDA,
          priceFeed: btcFeed,
          systemProgram: SystemProgram.programId,
        }
      });
      console.log("create tx: ", create_tx);

    }
    catch(err) {
      throw err;
    }

  });
  
});
