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

  it("Creates a counter)", async () => {
    /* Call the create function via RPC */
    const baseAccount = anchor.web3.Keypair.generate();
    await program.rpc.create({
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [baseAccount],
    });

    /* Fetch the account and check the value of count */
    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
    console.log('Count 0: ', account.count.toString())
    assert.ok(account.count.toString() == 0);
    _baseAccount = baseAccount;

  });

  it("Increments the counter", async () => {
    const baseAccount = _baseAccount;

    await program.rpc.increment({
      accounts: {
        baseAccount: baseAccount.publicKey,
      },
    });

    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
    console.log('Count 1: ', account.count.toString())
    assert.ok(account.count.toString() == 2);

    await program.rpc.decrement({
      accounts: {
        baseAccount: baseAccount.publicKey,
      },
    });
    const account2 = await program.account.baseAccount.fetch(baseAccount.publicKey);
    console.log('Count 2: ', account2.count.toString())
    assert.ok(account2.count.toString() == 1);
  });

  it("It initializes the account", async () => {
    const secondBaseAccount = anchor.web3.Keypair.generate();
    await program.rpc.initialize("Hello World", {
      accounts: {
        secondBaseAccount: secondBaseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [secondBaseAccount],
    });

    const account = await program.account.secondBaseAccount.fetch(secondBaseAccount.publicKey);
    console.log('Data: ', account.data);
    assert.ok(account.data === "Hello World");
    _secondBaseAccount = secondBaseAccount;

  });

  it("Updates a previously created account", async () => {
    const secondBaseAccount = _secondBaseAccount;

    await program.rpc.update("Some new data", {
      accounts: {
        secondBaseAccount: secondBaseAccount.publicKey,
      },
    });

    const account = await program.account.secondBaseAccount.fetch(secondBaseAccount.publicKey);
    console.log('Updated data: ', account.data)
    assert.ok(account.data === "Some new data");
    console.log('all account data:', account)
    console.log('All data: ', account.dataList);
    assert.ok(account.dataList.length === 2);
  });
  
  
});
