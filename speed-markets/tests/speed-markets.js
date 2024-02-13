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
    const [speedMarketPDA, speedMarketBump] =
      await PublicKey.findProgramAddressSync([], speedMarketsProgram.programId);
    console.log("SpeedMarketPDA: ", speedMarketPDA);
    console.log("speedMarketBump: ", speedMarketBump);
    console.log("rpc: \n", program.rpc);
    let now = parseInt(Date.now()/1000);
    console.log("time: ", now);
    await program.rpc.initializeMarketRequirements(new anchor.BN(10), new anchor.BN(100), new anchor.BN(20), new anchor.BN(200),{
      accounts:{
        marketRequirements: marketRequirementsAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      }, signers: [marketRequirementsAccount],
    });
    try {
      const create_tx = await program.rpc.createSpeedMarket(speedMarketBump, new anchor.BN(now+50), new anchor.BN(0), {
        accounts:{
          marketRequirements: marketRequirementsAccount.publicKey,
          authority: speedMarketPDA,
        },
      });
  
      console.log("create tx: ", create_tx);

    }
    catch(err) {
      throw err;
    }

  });
  
});
