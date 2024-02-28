const anchor = require("@coral-xyz/anchor");
const assert = require("assert");
const { Keypair, PublicKey, LAMPORTS_PER_SOL, getTokenAccountsByOwner } = require("@solana/web3.js");
const { createMint, getMint, mintTo, getOrCreateAssociatedTokenAccount, getAccount, transfer , TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { log } = require("console");
const { SystemProgram } = anchor.web3;

describe("speed-markets", () => {
  // Configure the client to use the local cluster.
  // anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SpeedMarkets;
  const speedMarketsProgram  = anchor.workspace.SpeedMarkets;
  let mint;
  const newUser = Keypair.generate();

  it("Simulate minting tokens to account", async () => {
    const mintAuthority = Keypair.generate();
    const freezeAuthority = Keypair.generate();
    const airdropSignature = await provider.connection.requestAirdrop(
      newUser.publicKey,
      LAMPORTS_PER_SOL
    )
    await provider.connection.confirmTransaction(airdropSignature);
    mint = await createMint(
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

    const tokenAccounts = await provider.connection.getTokenAccountsByOwner(
      newUser.publicKey, {
        mint
      }
    );

    // console.log("TOKEN ACCOUNTS DATA: \n", tokenAccounts.value[0].account);
    // console.log("Token account info: ", tokenAccountInfo);
    // console.log("MINT ACCOUNTS OWNER: \n", tokenAccounts.value[0].account.owner.toString());

    console.log("user address: ", newUser.publicKey.toString());
    console.log("mint address: ", mint.toBase58());
    console.log("mint info address: ", mintInfo.address.toString());
    console.log("mint info mintAuthority: ", mintInfo.mintAuthority.toString());
    console.log("mint info freezeAuthority: ", mintInfo.freezeAuthority.toString());
    console.log("mint info supply: ", mintInfo.supply.toString());
    console.log("mint info decimals: ", mintInfo.decimals.toString());
    console.log("address: ", tokenAccountInfo.address.toString());
    console.log("owner: ", tokenAccountInfo.owner.toString());
    console.log("mint: ", tokenAccountInfo.owner.toString());
    console.log("amount: ", tokenAccountInfo.amount.toString());
    assert(tokenAccountInfo.owner.toString() == newUser.publicKey.toString(), "User does not own token account");
    assert(mintInfo.supply == tokenAccountInfo.amount, "User does not own full amount");
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

    mint = await createMint(
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
    let mintInfo;

    beforeEach(async () => {
      const airdropSignature = await provider.connection.requestAirdrop(
        user_account.publicKey,
        LAMPORTS_PER_SOL
      )
      await provider.connection.confirmTransaction(airdropSignature);
      mint = await createMint(
        provider.connection,
        user_account,
        mintAuthority.publicKey,
        freezeAuthority.publicKey,
        9 // We are using 9 to match the CLI decimal default exactly
      );
      console.log(mint)
      console.log("new token address: ", mint.toBase58());
      mintInfo = await getMint(
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
      let tokenAccountInfo = await getAccount(
        provider.connection,
        tokenAccount.address
      );
      console.log("amount before creaation: ", tokenAccountInfo.amount.toString());
      let userTokenAmountBeforeCreation = tokenAccountInfo.amount;

      const marketRequirementsAccount = anchor.web3.Keypair.generate();
      const priceFeed = anchor.web3.Keypair.generate();
      const btcFeed = new PublicKey(
        "HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J"
      );
      console.log("provider acc: ", provider.wallet.publicKey.toString());
      console.log("toke mint: ", mint.toBase58());
      const userWalletPubkey = user_account.publicKey;
      let now = parseInt(Date.now()/1000);
      const marketStrikeTime = new anchor.BN(parseInt(now + 100)); // 100 seconds in future
      const marketStrikeTimeUtf8 = marketStrikeTime.toBuffer('le', 8);
      const directionUp = new anchor.BN(0);
      const directionUpUtf8 = directionUp.toBuffer('le', 8);
      const directionDown = new anchor.BN(1);
      const buyInAmount = new anchor.BN(100);

      console.log("buyInLength 2: ", buyInAmount.toBuffer('le', 1).length);
      console.log("buyInLength 2: ", buyInAmount.toBuffer('le', 2).length);
      console.log("buyInLength 4: ", buyInAmount.toBuffer('le', 4).length);
      console.log("buyInLength 8: ", buyInAmount.toBuffer('le', 8).length);
      console.log("buyInLength 9: ", buyInAmount.toBuffer('le', 9).length);
      console.log("buyIn to bufffer: \n", buyInAmount.toBuffer());
      console.log("buyIn to bufffer be 1: \n", buyInAmount.toBuffer('be', 1));
      console.log("buyIn to bufffer le 1: \n", buyInAmount.toBuffer('le', 1));
      console.log("buyIn to bufffer be 2: \n", buyInAmount.toBuffer('be', 2));
      console.log("buyIn to bufffer le 8: \n", buyInAmount.toBuffer('le', 8));
      console.log("buyIn to bufffer be 8: \n", buyInAmount.toBuffer('be', 8));
      console.log("direction to bufffer: \n", directionUp.toBuffer());
      console.log("user account to bufffer: \n", user_account.publicKey.toBuffer());
      console.log("mint to bufffer: \n", mint.toBuffer());

      const [speedMarketPDA, speedMarketBump] =
        await PublicKey.findProgramAddressSync(
          [
            anchor.utils.bytes.utf8.encode("speed"), 
            user_account.publicKey.toBuffer(),
            mint.toBuffer(),
            directionUp.toBuffer(), 
            // buyInAmount.toBuffer(),
            // buyInAmount.toArrayLike(Buffer, "le", 8)
            // buyInAmount.toBuffer(),
            // marketStrikeTime.toBuffer(), 
            // directionUpUtf8
            // anchor.utils.bytes.utf8.encode(directionUp.toString()),
            // anchor.utils.bytes.utf8.encode(mint.toBase58()), 
          ],
          program.programId
        );

      const [speedMarketWalletPDA, speedMarketWalletBump] =
        await PublicKey.findProgramAddressSync(
          [
            anchor.utils.bytes.utf8.encode("wallet"), 
            user_account.publicKey.toBuffer(),
            mint.toBuffer(),
            directionUp.toBuffer(), 
            // marketStrikeTime.toBuffer(), 
            // buyInAmount.toBuffer(),
            // directionUpUtf8,
            // anchor.utils.bytes.utf8.encode(directionUp),
            // marketStrikeTime.toBuffer(), 
            // directionUp.toBuffer('le', 8), 
            // buyInAmount.toBuffer('le', 8)
          ],
          program.programId
        )
      
      console.log("SpeedMarketPDA: ", speedMarketPDA.toString());
      console.log("SpeedMarketBump: ", speedMarketBump.toString());
      console.log("rpc: \n", program);
      console.log("time: ", now);
        
      const minStrikeTime = 10; // seconds
      const maxStrikeTime = 200; // seconds
      const minBuyInAmount = 10;
      const maxBuyInAmount = 100;
      const safeBoxImpact = 1;

      const [liquidityWalletPDA, requirementsBump] =
      await PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode("liquidity"), 
          provider.wallet.publicKey.toBuffer(),
          mint.toBuffer(),
        ],
        program.programId
      )

      console.log("user: ", provider.wallet.publicKey.toString());
      console.log("marketRequirementsAccount: ", marketRequirementsAccount.publicKey.toString());
      console.log("liquidityWallet: ", liquidityWalletPDA.toString());
      console.log("tokenMint: ", mint.toBase58());

      await program.rpc.initializeMarketRequirements(
        new anchor.BN(minStrikeTime), 
        new anchor.BN(maxStrikeTime), 
        new anchor.BN(minBuyInAmount), 
        new anchor.BN(maxBuyInAmount), 
        new anchor.BN(safeBoxImpact),
        {
        accounts:{
          marketRequirements: marketRequirementsAccount.publicKey,
          liquidityWallet: liquidityWalletPDA,
          tokenMint: mint,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        }, signers: [marketRequirementsAccount],
      });

      console.log("Debug: ________ \n");
      console.log("marketReq: ", marketRequirementsAccount.publicKey.toString());
      console.log("user: ", user_account.publicKey.toString());
      console.log("speedMarket: ", speedMarketPDA.toString());
      console.log("speedMarketWallet: ", speedMarketWalletPDA.toString());
      console.log("tokenMint: ", mint.toBase58());
      console.log("walletToWithdrawFrom: ", tokenAccount.address.toString());
      console.log("btcFeed: ", btcFeed.toString());
      console.log("systemProgram: ", SystemProgram.programId.toString());
      console.log("tokenProgram: ", TOKEN_PROGRAM_ID.toString());
      console.log("rent: ", anchor.web3.SYSVAR_RENT_PUBKEY.toString());
      let create_tx;
      try {
        create_tx = await program.rpc.createSpeedMarket(
          speedMarketBump, 
          speedMarketWalletBump, 
          marketStrikeTime, 
          directionUp, 
          buyInAmount, {
          accounts:{
            marketRequirements: marketRequirementsAccount.publicKey,
            user: user_account.publicKey,
            speedMarket: speedMarketPDA,
            speedMarketWallet: speedMarketWalletPDA,
            tokenMint: mint,
            walletToWithdrawFrom: tokenAccount.address,
            priceFeed: btcFeed,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          },
          signers: [user_account],
        });
        console.log("create tx: ", create_tx);
        
        
      }
      catch(err) {
        throw err;
      }

      await delay(5000);

      const txDetails = await provider.connection.getTransaction(create_tx, {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        });
      
      console.log(txDetails);
      const logs = txDetails?.meta?.logMessages || null;
      
      if (!logs) {
        console.log("No logs found");
      }
      const tokenAccounts = await provider.connection.getTokenAccountsByOwner(
        tokenAccount.address, {
          mint
        }
      );
      
      

      console.log(tokenAccounts);

      console.log(logs);
      tokenAccountInfo = await getAccount(
        provider.connection,
        tokenAccount.address
      );
      console.log(tokenAccountInfo);
      let walletAccountInfo = await getAccount(
        provider.connection,
        speedMarketWalletPDA
      );
      let speedMarketWallet = walletAccountInfo.amount;
      let userTokenAmountAfterCreation = tokenAccountInfo.amount;
      let deposited = parseInt(userTokenAmountBeforeCreation.toString()) - parseInt(userTokenAmountAfterCreation.toString());
      console.log("Balance in new speed market wallet: ", speedMarketWallet.toString());
      console.log("User token amount before creation: ", userTokenAmountBeforeCreation.toString());
      console.log("User token amount after creation: ", userTokenAmountAfterCreation.toString());
      console.log("Deposited: ", deposited);

      assert(deposited.toString(), buyInAmount.toString(), "Amount spent on speed market does not match");
      assert(deposited.toString(), speedMarketWallet.toString(), "Deposited amount does not match");
      
      let speedMarketObj = await program.account.speedMarket.fetch(speedMarketPDA);
      // let speedMarketObj = program;
      console.log("\n\n\n SpeedMarket created: ");
      console.log("user: ", speedMarketObj.user.toString());
      console.log("tokenMint: ", speedMarketObj.tokenMint.toString());
      console.log("escrowWallet: ", speedMarketObj.escrowWallet.toString());
      console.log("asset: ", speedMarketObj.asset.toString());
      console.log("strikeTime: ", speedMarketObj.strikeTime.toString());
      console.log("strikePrice: ", speedMarketObj.strikePrice.toString());
      console.log("finalPrice: ", speedMarketObj.finalPrice.toString());
      console.log("direction: ", speedMarketObj.direction.toString());
      console.log("buyInAmount: ", speedMarketObj.buyInAmount.toString());
      console.log("resolved: ", speedMarketObj.resolved);
      console.log("lpFee: ", speedMarketObj.lpFee.toString());
      console.log("createdAt: ", speedMarketObj.createdAt.toString());

      const escrowWallet = await getAccount(
        provider.connection,
        speedMarketObj.escrowWallet
      );
      console.log(escrowWallet);

      // RESOLVE ATTEMPTS
      
      let resolve_tx = await program.rpc.resolveSpeedMarket(
        speedMarketBump, 
        {
        accounts:{
          user: user_account.publicKey,
          speedMarket: speedMarketPDA,
          tokenMint: mint,
          walletToDepositTo: tokenAccount.address,
          walletToWithdrawFrom: speedMarketWalletPDA,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [user_account],
      });
      console.log("resolve tx: ", create_tx);
      await delay(5000);
      const txDetails2 = await provider.connection.getTransaction(resolve_tx, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
      console.log(txDetails2);
      console.log(txDetails2?.meta?.logMessages);

      tokenAccountInfo = await getAccount(
        provider.connection,
        tokenAccount.address
      );

      console.log("User token amount before resolution: ", userTokenAmountAfterCreation);
      console.log("User token amount after creation: ", tokenAccountInfo.amount);
      console.log("Received: ",parseInt(tokenAccountInfo.amount.toString()) - parseInt(userTokenAmountAfterCreation.toString()))
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
