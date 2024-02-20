const anchor = require("@coral-xyz/anchor");
const assert = require("assert");
const { Keypair, PublicKey, LAMPORTS_PER_SOL  } = require("@solana/web3.js");
const { createMint, getMint, mintTo, getOrCreateAssociatedTokenAccount, getAccount, transfer , TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { SystemProgram } = anchor.web3;

describe("speed-markets", () => {
  // Configure the client to use the local cluster.
  // anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SpeedMarkets;
  const speedMarketsProgram  = anchor.workspace.SpeedMarkets;

  const newUser = Keypair.generate();

  it("Simulate minting tokens to account", async () => {
    const mintAuthority = Keypair.generate();
    const freezeAuthority = Keypair.generate();
    const airdropSignature = await provider.connection.requestAirdrop(
      newUser.publicKey,
      LAMPORTS_PER_SOL
    )
    await provider.connection.confirmTransaction(airdropSignature);
    const mint = await createMint(
      provider.connection,
      newUser,
      mintAuthority.publicKey,
      freezeAuthority.publicKey,
      9 // We are using 9 to match the CLI decimal default exactly
    );
    console.log("new token address: ", mint.toBase58());
    let mintInfo = await getMint(
      provider.connection,
      mint
    );
    console.log("token supply: ", mintInfo.supply);
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      newUser,
      mint,
      newUser.publicKey
    );
    let tokenAccountInfo = await getAccount(
      provider.connection,
      tokenAccount.address
    );
    console.log("Token amount before mint: ", tokenAccountInfo.amount);
    console.log("new token account: ", tokenAccount.address.toBase58());
    await mintTo(
      provider.connection,
      newUser,
      mint,
      tokenAccount.address,
      mintAuthority,
      100000000000 // because decimals for the mint are set to 9 
    );
    mintInfo = await getMint(
      provider.connection,
      mint
    )
    console.log("mint amount: ", mintInfo.supply);
    tokenAccountInfo = await getAccount(
      provider.connection,
      tokenAccount.address
    );
    console.log("Token amount after mint: ", tokenAccountInfo.amount);
  });

  it("Simulate transfering tokens from A to B accounts", async () => {
    const userA = Keypair.generate();
    const userB = Keypair.generate();

    const mintAuthority = Keypair.generate();
    const freezeAuthority = Keypair.generate();
    const airdropSignature = await provider.connection.requestAirdrop(
      userA.publicKey,
      LAMPORTS_PER_SOL
    )
    
    await provider.connection.confirmTransaction(airdropSignature);

    const mint = await createMint(
      provider.connection,
      userA,
      userA.publicKey,
      null,
      9 // We are using 9 to match the CLI decimal default exactly
    );
    
    console.log("new token address: ", mint.toBase58());

    let mintInfo = await getMint(
      provider.connection,
      mint
    )
    
    console.log("token supply: ", mintInfo.supply);
    
    const userATokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      userA,
      mint,
      userA.publicKey
    );
    const userBTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      userA,
      mint,
      userB.publicKey
    );

    let userATokenAccountInfo = await getAccount(
      provider.connection,
      userATokenAccount.address
    );
    let userBTokenAccountInfo = await getAccount(
      provider.connection,
      userBTokenAccount.address
    );

    
    console.log("Token amount for A before mint: ", userATokenAccountInfo.amount);
    console.log("Token amount for B before mint: ", userBTokenAccountInfo.amount);
    
    // Mint 1 new token to the "fromTokenAccount" account we just created
    let signature = await mintTo(
      provider.connection,
      userA,
      mint,
      userATokenAccountInfo.address,
      userA.publicKey,
      1000000000
      );
      console.log('mint tx:', signature);
      
      console.log("new userA token account: ", userATokenAccountInfo.address.toBase58());
      
    signature = await transfer(
      provider.connection,
      userA,
      userATokenAccountInfo.address,
      userBTokenAccountInfo.address,
      userA.publicKey,
      50
    );

    
    console.log('transfer tx:', signature);

    userATokenAccountInfo = await getAccount(
      provider.connection,
      userATokenAccount.address
    );
    userBTokenAccountInfo = await getAccount(
      provider.connection,
      userBTokenAccount.address
    );
    
    console.log("Token amount for A after transfer: ", userATokenAccountInfo.amount);
    console.log("Token amount for B after transfer: ", userBTokenAccountInfo.amount);

    const userC = Keypair.generate();

    const userCTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      userA,
      mint,
      userC.publicKey
    );

    let userCTokenAccountInfo = await getAccount(
      provider.connection,
      userCTokenAccount.address
    );

    await provider.connection.requestAirdrop(
      userC.publicKey,
      LAMPORTS_PER_SOL
    )

    signature = await transfer(
      provider.connection,
      userA,
      userATokenAccountInfo.address,
      userCTokenAccountInfo.address,
      userA.publicKey,
      50,
      [userA, userC]
    );

    userATokenAccountInfo = await getAccount(
      provider.connection,
      userATokenAccount.address
    );
    userCTokenAccountInfo = await getAccount(
      provider.connection,
      userCTokenAccount.address
    );
    console.log("Token amount for A after transfer: ", userATokenAccountInfo.amount);
    console.log("Token amount for C after transfer: ", userCTokenAccountInfo.amount);
  });

  describe("speed-markets", () => {
    const mintAuthority = Keypair.generate();
    const freezeAuthority = Keypair.generate();
    const user_account = Keypair.generate();
    let tokenAccount;

    beforeEach(async () => {
      const airdropSignature = await provider.connection.requestAirdrop(
        user_account.publicKey,
        LAMPORTS_PER_SOL
      )
      await provider.connection.confirmTransaction(airdropSignature);
      const mint = await createMint(
        provider.connection,
        user_account,
        mintAuthority.publicKey,
        freezeAuthority.publicKey,
        9 // We are using 9 to match the CLI decimal default exactly
      );
      console.log("new token address: ", mint.toBase58());
      let mintInfo = await getMint(
        provider.connection,
        mint
      );
      console.log("token supply: ", mintInfo.supply);
      tokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user_account,
        mint,
        user_account.publicKey
      );
      let tokenAccountInfo = await getAccount(
        provider.connection,
        tokenAccount.address
      );
      console.log("Token amount before mint: ", tokenAccountInfo.amount);
      console.log("new token account: ", tokenAccount.address.toBase58());
      await mintTo(
        provider.connection,
        user_account,
        mint,
        tokenAccount.address,
        mintAuthority,
        100000000000 // because decimals for the mint are set to 9 
      );
      mintInfo = await getMint(
        provider.connection,
        mint
      )
      console.log("mint amount: ", mintInfo.supply);
      tokenAccountInfo = await getAccount(
        provider.connection,
        tokenAccount.address
      );
      console.log("Token amount after mint: ", tokenAccountInfo.amount);
    });
    it("Create a speed market", async () => {
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

  // it("Create speed markets", async () => {
  //   const marketRequirementsAccount = anchor.web3.Keypair.generate();
  //   const priceFeed = anchor.web3.Keypair.generate();
  //   const speedMarketAccount = anchor.web3.Keypair.generate();
  //   const btcFeed = new PublicKey(
  //     "HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J"
  //   );
  //   console.log("speed acc: ", speedMarketAccount);
  //   console.log("provider acc: ", provider.wallet);
  //   const [speedMarketPDA, speedMarketBump] =
  //     await PublicKey.findProgramAddressSync([anchor.utils.bytes.utf8.encode("speed"), provider.wallet.publicKey.toBuffer()], speedMarketsProgram.programId);
  //   console.log("SpeedMarketPDA: ", speedMarketPDA.toString());
  //   console.log("SpeedMarketAccount: ", speedMarketAccount.publicKey.toString());
  //   console.log("speedMarketBump: ", speedMarketBump);
  //   console.log("rpc: \n", program.rpc);
  //   let now = parseInt(Date.now()/1000);
  //   console.log("time: ", now);
  //   await program.rpc.initializeMarketRequirements(new anchor.BN(10), new anchor.BN(100), new anchor.BN(20), new anchor.BN(200), new anchor.BN(2),{
  //     accounts:{
  //       marketRequirements: marketRequirementsAccount.publicKey,
  //       user: provider.wallet.publicKey,
  //       systemProgram: SystemProgram.programId,
  //     }, signers: [marketRequirementsAccount],
  //   });
  //   try {
  //     const create_tx = await program.rpc.createSpeedMarket(speedMarketBump, new anchor.BN(now+50), new anchor.BN(0), new anchor.BN(100), {
  //       accounts:{
  //         marketRequirements: marketRequirementsAccount.publicKey,
  //         user: provider.wallet.publicKey,
  //         speedMarket: speedMarketPDA,
  //         priceFeed: btcFeed,
  //         systemProgram: SystemProgram.programId,
  //       }
  //     });
  //     console.log("create tx: ", create_tx);

  //   }
  //   catch(err) {
  //     throw err;
  //   }

  // });
  
});
