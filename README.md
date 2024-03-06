# solana-contracts
Thales Solana contracts

## Environment setup

Used this [source](https://dev.to/edge-and-node/the-complete-guide-to-full-stack-solana-development-with-react-anchor-rust-and-phantom-3291) for installation

Needed:
- [npm](https://tecadmin.net/how-to-install-nvm-on-ubuntu-20-04/)
- [solana](https://docs.solana.com/cli/install-solana-cli-tools)
- [rust](https://www.rust-lang.org/tools/install)
- [yarn](https://yarnpkg.com/getting-started/install)
- [anchor](https://www.anchor-lang.com/docs/installation)

## TESTING CODE IN SOLANA PLAYBOOK

### Import from github
1. Go to: [Solana Playbook environment](https://beta.solpg.io/)
2. Create a new project Anchor (Rust) with dummy name
3. In the Projects menu -> import from github
4. copy-paste `https://github.com/thales-markets/solana-contracts` and press import
5. Go to Build & Deploy (top left corner second menu or press Ctrl+Shift+B) 
6. Run Build
7. Connect to Playground wallet
8. Create new keypair by connecting to Playground wallet
9. Use the terminal to obtain airdrop by running: `solana airdrop 5`
10. In tests, right-click on `playbook_test.test.ts` -> run Test

### Manual way:
1. Go to: [Solana Playbook environment](https://beta.solpg.io/)
2. Create a new project
3. Add name and choose framework: Anchor (Rust)
4. Copy-paste from `programs/speed-markets/src/lib.rs into src-> lib.rs
5. Copy-paste from `tests/playbook.ts` to `tests-> anchor.test.rs`
6. Go to Build & Deploy (top left corner second menu or press Ctrl+Shift+B) 
7. Run Build
8. Create new keypair by connecting to Playground wallet
9. Use the terminal to obtain airdrop by running: `solana airdrop 5`  
OR go to Wallet (top right corner -> left (...) menu -> airdrop)  
10. After successful airdrop, run Deploy
11. Run `test` in the terminal


## Speed Markets

Installing new environment

change to be added

Added the test environment

### Adding dependencies to programs

- In the programs/<program_id>/, run: `cargo add mpl-token-metadata` to add the mpl-token-metadata package as dependency
- Other important dependencies: `anchor-spl` (SPL tokens), `mpl-token-metadata` (Tokens metadata);
- Adding a new custom program to the package: `anhor new <program-name>` (kebab style of naming)
- Local imports: `puppet = { path = "../puppet", features = ["cpi"]}` imports puppet program to be used with Cross Program Invokation (CPI)

