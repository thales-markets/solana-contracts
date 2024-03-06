// No imports needed: web3, anchor, pg and more are globally available
import {
  createMint,
  getMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  transfer,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("Test", () => {
  // const user_account = Keypair.generate();
  const user_account = pg.wallet.keypair;
  let tokenAccount;
  let mintInfo;
  let mint_publicKey = new web3.PublicKey("6EssBiQqFPa1R8HncPZvTW2DiuyL9re8ffbVg7Bno2Ln");

  let mint;

  it("create token mint", async () => {
    const mintAuthority = new web3.Keypair();
    const freezeAuthority = new web3.Keypair();
    mint = await createMint(
      pg.connection,
      user_account,
      mintAuthority.publicKey,
      freezeAuthority.publicKey,
      9 // We are using 9 to match the CLI decimal default exactly
    );
    // console.log(mint);
    console.log("new token address: ", mint.toBase58());
    console.log("mint address: ", mint.toBase58());
    let mint_publicKey = new web3.PublicKey(mint.toBase58());
    mintInfo = await getMint(pg.connection, mint_publicKey);
    console.log("token supply: ", mintInfo.supply);
       console.log("mint authority: ", mintAuthority.publicKey.toString());
       console.log("freezeAuthority: ", freezeAuthority.publicKey.toString());
    tokenAccount = await getOrCreateAssociatedTokenAccount(
      pg.connection,
      user_account,
      mint,
      user_account.publicKey
    );
    let tokenAccountInfo = await getAccount(
      pg.connection,
      tokenAccount.address
    );
    console.log("Token amount before mint: ", tokenAccountInfo.amount);
    console.log("new token account: ", tokenAccount.address.toBase58());
    await mintTo(
      pg.connection,
      user_account,
      mint,
      tokenAccount.address,
      mintAuthority,
      10000000000000 // because decimals for the mint are set to 9
    );

    mintInfo = await getMint(pg.connection, mint);
    console.log("mint amount: ", mintInfo.supply);
    tokenAccountInfo = await getAccount(pg.connection, tokenAccount.address);
    console.log("User token account address: ", tokenAccount.address);
  });

  it("initialize", async () => {
      // mint = await getMint(pg.connection, mint_publicKey);
    tokenAccount = await getOrCreateAssociatedTokenAccount(
      pg.connection,
      user_account,
      mint,
      user_account.publicKey
    );
    let tokenAccountInfo = await getAccount(
      pg.connection,
      tokenAccount.address
    );
    //   const btcFeed = new PublicKey(
    //     "HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J"
    //   );
    const btcFeed = new web3.PublicKey(
      "HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J"
      // "EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw"
    );
    console.log("PROVIDER ACCOUNT: ", pg.wallet);
    console.log("provider acc: ", pg.wallet.publicKey.toString());
    console.log("toke mint: ", mint.toBase58());
    const userWalletPubkey = user_account.publicKey;
    let now = Date.now() / 1000;
    const marketStrikeTime = new anchor.BN(now + 100); // 100 seconds in future
    const strikePrice = new anchor.BN(3700); // ethereum
    console.log("MarketStrike time: ", marketStrikeTime.toString());
    const directionUp = new anchor.BN(0);
    const buyInAmount = new anchor.BN(100, "le");
    const [speedMarketPDA] = web3.PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("speedmarket"),
        buyInAmount.toArrayLike(Buffer, "le", 8),
        marketStrikeTime.toArrayLike(Buffer, "le", 8),
        mint.toBuffer(),
      ],
      pg.program.programId
    );
    const [speedMarketWalletPDA] = web3.PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("wallet"),
        // user_account.publicKey.toBuffer(),
        buyInAmount.toArrayLike(Buffer, "le", 8),
        marketStrikeTime.toArrayLike(Buffer, "le", 8),
        mint.toBuffer(),
      ],
      pg.program.programId
    );

    const [liquidityWalletPDA] = web3.PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("liquidity"),
        // user_account.publicKey.toBuffer(),
        mint.toBuffer(),
      ],
      pg.program.programId
    );
    
    const [safeBoxWalletPDA] = web3.PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("safebox"),
        // user_account.publicKey.toBuffer(),
        mint.toBuffer(),
      ],
      pg.program.programId
    );

    const [marketRequirementsPDA] = web3.PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("speedrequirements"),
        // user_account.publicKey.toBuffer(),
        mint.toBuffer(),
      ],
      pg.program.programId
    );

    const minStrikeTime = 10; // seconds
    const maxStrikeTime = 200; // seconds
    const minBuyInAmount = 10;
    const maxBuyInAmount = 100;
    const safeBoxImpact = 1;
    const lpFee = 2;
    const priceThreshold = 30;

    const txInitMarketRequirements = await pg.program.methods
      .initializeMarketRequirements(
        new anchor.BN(minStrikeTime),
        new anchor.BN(maxStrikeTime),
        new anchor.BN(minBuyInAmount),
        new anchor.BN(maxBuyInAmount),
        new anchor.BN(safeBoxImpact),
        new anchor.BN(lpFee),
        new anchor.BN(priceThreshold)
      )
      .accounts({
        marketRequirements: marketRequirementsPDA,
        liquidityWallet: liquidityWalletPDA,
        safeBoxWallet: safeBoxWalletPDA,
        tokenMint: mint,
        user: pg.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([pg.wallet.keypair])
      .rpc();

    console.log(
      `Use 'solana confirm -v ${txInitMarketRequirements}' to see the logs`
    );

    // Confirm transaction
    await pg.connection.confirmTransaction(txInitMarketRequirements);

    let liquidityWalletAccount = await getAccount(
      pg.connection,
      liquidityWalletPDA
    );
    let safeBoxWalletAccount = await getAccount(
      pg.connection,
      liquidityWalletPDA
    );
    console.log(
      "Market requirements public key: ",
      marketRequirementsPDA.toString()
    );
    console.log(
      "Liquidity wallet account owner: ",
      liquidityWalletAccount.owner.toString()
    );
    // console.log("Liquidity wallet account: ", liquidityWalletAccount.address);

    let signature = await transfer(
      pg.connection,
      user_account,
      tokenAccount.address,
      liquidityWalletPDA,
      user_account.publicKey,
      50
    );

    liquidityWalletAccount = await getAccount(
      pg.connection,
      liquidityWalletPDA
    );

    console.log(
      "Liquidity wallet account after transfer: ",
      liquidityWalletAccount.amount
    );

    console.log("Debug: ________ \n");
    console.log("marketReq: ", marketRequirementsPDA.toString());
    console.log("user: ", pg.wallet.publicKey.toString());
    console.log("speedMarket: ", speedMarketPDA.toString());
    console.log("speedMarketWallet: ", speedMarketWalletPDA.toString());
    console.log("liquidityWallet: ", liquidityWalletAccount.address.toString());
    console.log("tokenMint: ", mint.toBase58());
    console.log("walletToWithdrawFrom: ", tokenAccount.address.toString());
    console.log("walletToWithdrawFrom owner: ", tokenAccount.owner.toString());
    console.log("btcFeed: ", btcFeed.toString());
    console.log("systemProgram: ", web3.SystemProgram.programId.toString());
    console.log("tokenProgram: ", TOKEN_PROGRAM_ID.toString());
    console.log("rent: ", anchor.web3.SYSVAR_RENT_PUBKEY.toString());
    const directionUP = new anchor.BN(0);
    const create_tx = await pg.program.methods
      .createSpeedMarket(
        marketStrikeTime,
        directionUP,
        buyInAmount,
        strikePrice
      )
      .accounts({
        marketRequirements: marketRequirementsPDA,
        user: pg.wallet.publicKey,
        speedMarket: speedMarketPDA,
        speedMarketWallet: speedMarketWalletPDA,
        tokenMint: mint,
        walletToWithdrawFrom: tokenAccount.address,
        safeBoxWallet: safeBoxWalletPDA,
        priceFeed: btcFeed,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([pg.wallet.keypair])
      .rpc();

    console.log(`Use 'solana confirm -v ${create_tx}' to see the logs`);
    // Confirm transaction
    await pg.connection.confirmTransaction(create_tx);

    const resolve_tx = await pg.program.methods
      .resolveSpeedMarket()
      .accounts({
        marketRequirements: marketRequirementsPDA,
        user: pg.wallet.publicKey,
        speedMarket: speedMarketPDA,
        tokenMint: mint,
        walletToDepositTo: tokenAccount.address,
        walletToWithdrawFrom: speedMarketWalletPDA,
        liquidWallet: liquidityWalletPDA,
        priceFeed: btcFeed,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([pg.wallet.keypair])
      .rpc();

    console.log(`Use 'solana confirm -v ${resolve_tx}' to see the logs`);
    // Confirm transaction
    await pg.connection.confirmTransaction(resolve_tx);

    // // Generate keypair for the new account
    // const newAccountKp = new web3.Keypair();

    // // Send transaction
    // const data = new BN(42);
    // const txHash = await pg.program.methods
    //   .initialize(data)
    //   .accounts({
    //     newAccount: newAccountKp.publicKey,
    //     signer: pg.wallet.publicKey,
    //     systemProgram: web3.SystemProgram.programId,
    //   })
    //   .signers([newAccountKp])
    //   .rpc();
    // console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);

    // // Confirm transaction
    // await pg.connection.confirmTransaction(txHash);

    // // Fetch the created account
    // const newAccount = await pg.program.account.newAccount.fetch(
    //   newAccountKp.publicKey
    // );

    // console.log("On-chain data is:", newAccount.data.toString());

    // // Check whether the data on-chain is equal to local 'data'
    // assert(data.eq(newAccount.data));
  });
});
