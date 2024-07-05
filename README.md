# Orderbook Frontend Interface

An open-source repository for the Orderbook front end interface maintained by Polkadex Inc.

Polkadex is a fully non-custodial peer-to-peer orderbook-based cryptocurrency exchange for the DeFi ecosystem built on Substrate.

## Interface

Web: [orderbook.polkadex.trade](https://orderbook.polkadex.trade)

## Directory Structure

| Folder  | Contents                                                            |
|---------|---------------------------------------------------------------------|
| apps/   | The home for each standalone application.                           |
| packages/ | Shared code packages covering core, shared functionality, and utilities. |

## Running the Interface Locally

```bash
yarn 
yarn workspace @orderbook/hestia dev
```

## Chart
Orderbook uses TradingView, which requires a license, even for free usage. You can obtain a license by requesting it from the [TradingView](https://www.tradingview.com/pricing/?source=features_page&feature=promo_block#plans).

After obtaining access the [Charting Library Repository](https://github.com/tradingview/charting_library/), you can run the script (located in /apps/hestia):
```bash
copy_charting_library_files.sh
```

Or you can also do this manually by following these steps:

1. Download the repository from [Charting Library Repository](https://github.com/tradingview/charting_library/)
2. Unzip the files
3. Move datafeeds and charting_library to /apps/hestia/public/static


## Shared Icons, Tokens and Components
The icons displayed in Orderbook are not hosted in this repository. You can access them from the [Polkadex/UX Repository](https://github.com/Polkadex-Substrate/polkadex-ts), which contains all icons, tokens, and UI elements shared across all Polkadex products.

This is an open-source repository, so you are welcome to contribute and help improve it.

## Social Media

- [Twitter](https://twitter.com/polkadex)
- [Telegram](https://t.me/Polkadex)
- [Discord](https://discord.com/invite/Uvua83QAzk)
- [LinkedIn](https://www.linkedin.com/company/69690544)
- [Medium](https://polkadex.medium.com/)
- [Reddit](https://www.reddit.com/r/polkadex)
- [Youtube](https://www.youtube.com/channel/UC6fXRDT4lLKlXG3gP0PP06Q)

## Polkadex Links:
- Polkadex Business Website: [polkadex.trade](https://polkadex.trade)
- Polkadex Docs: [docs.polkadex.trade](https://docs.polkadex.trade)
- Polkadex UX [https://github.com/Polkadex-Substrate/polkadex-ts/tree/main/packages/ui]
- Polkadex API [https://github.com/Polkadex-Substrate/polkadex-ts/tree/main/packages/polkadex-api]
- React Providers [https://github.com/Polkadex-Substrate/polkadex-ts/tree/main/packages/react-providers]
- Thea [https://github.com/Polkadex-Substrate/polkadex-ts/tree/main/packages/thea]
- Polkadex Docs Website [https://github.com/Polkadex-Substrate/polkadex-docs]
