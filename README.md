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

## Speed Markets

Installing new environment

change to be added

Added the test environment

### Adding dependencies to programs

- In the programs/<program_id>/, run: `cargo add mpl-token-metadata` to add the mpl-token-metadata package as dependency
- Other important dependencies: `anchor-spl` (SPL tokens), `mpl-token-metadata` (Tokens metadata);
- Adding a new custom program to the package: `anhor new <program-name>` (kebab style of naming)
- Local imports: `puppet = { path = "../puppet", features = ["cpi"]}` imports puppet program to be used with Cross Program Invokation (CPI)