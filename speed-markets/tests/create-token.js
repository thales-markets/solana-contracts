// import { createMint } from '@solana/spl-token';
// import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
// import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";

// const { connection } = useConnection();
// const wallet = useAnchorWallet();

// const payer = Keypair.generate();
// const mintAuthority = Keypair.generate();
// const freezeAuthority = Keypair.generate();


// const mint = await createMint(
//   connection,
//   payer,
//   mintAuthority.publicKey,
//   freezeAuthority.publicKey,
//   9 // We are using 9 to match the CLI decimal default exactly
// );

// console.log(mint.toBase58());