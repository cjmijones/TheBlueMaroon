# UX Database Truth Pass Design

## Goal
Make the app's portfolio, holding, and marketplace surfaces accurately reflect the data that is currently backed by the database and live APIs.

## Current Truth Boundary
- Live data: Supabase-authenticated user, linked wallets, wallet balances, owned NFTs, creator app assets, fractionalization lifecycle records, and transaction history.
- Not live yet: purchased fractional positions, withdrawable balances, sell quotes, open orders, order books, checkout settlement, and marketplace listings.

## UX Rule
Screens may advertise planned capabilities, but they must not display invented balances, prices, positions, orders, or proceeds as if they belong to the signed-in user.

## Scope
- Replace mock holdings and position values with portfolio-derived launched creator assets or honest empty states.
- Replace mock withdrawable, sell, order book, and open-order data with unavailable states.
- Quarantine marketplace listing and asset detail mock data behind empty/unavailable states until backend routes exist.
- Update the local agent task board with what is complete and what remains.

## Out Of Scope
- Implementing real marketplace orders, fills, bids, asks, fees, or cancellations.
- Implementing real withdrawable balance calculation.
- Adding a price oracle, NAV engine, or payment settlement.
- Changing backend schema or migrations.
