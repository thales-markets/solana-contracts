const anchor = require("@coral-xyz/anchor");
const assert = require("assert");
const { SystemProgram } = anchor.web3;

describe("speed-markets", () => {
  // Configure the client to use the local cluster.
  // anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SpeedMarkets;

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

  // it("Is initialized!", async () => {
  //   // Add your test here.
  //   const provider = anchor.getProvider();
  //   console.log("Block Height: ", await anchor.getProvider().connection.getBlockHeight());
  //   // console.log(anchor.workspace.Mysolanaapp);
  //   const tx = await program.methods.create().accounts({
  //     counter: counter.publicKey,
  //     user: provider.publicKey,
  //     systemProgram: anchor.web3.SystemProgram.programId,
  //   }).rpc();
  //   console.log("Your transaction signature", tx);
  // });

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
