# Aerovale — Airline Empire

An original single-player browser airline management game. Start with $480,000 at Salt Lake City, acquire aircraft and route licenses, run automatic flight rotations, compete with five simulated airlines, and own airports that collect a share of carrier revenue.

## Play locally

From this directory:

```sh
python3 -m http.server 5188 --directory dist
```

Open http://localhost:5188. Serve the directory over HTTP; ES modules and the map asset cannot load reliably by double-clicking the HTML file.

## The evolving campaign

- 40 airports and 9 introduced aircraft at the beginning.
- 600 actual airport locations in the complete world. Another 20 become available every 10 game days, starting on day 11.
- 400 unique aircraft catalog entries: 100 named base airframes, each with original, Eco, Express and Stretch variants. The 300 future derivatives are fictional game variants, with game-balanced performance and prices.
- New base airframes enter the campaign every 8 days, beginning on day 9. Successors follow 60, 120 and 180 days after each family's initial introduction. All aircraft are introduced by day 285.
- Early generations leave production after 100 days in the market. They remain available as discounted legacy purchases and keep flying if owned. Newer models offer fuel, speed, range or capacity advantages; aging increases maintenance and lowers resale value.
- Compatible trade-ins retain aircraft identity, cabin, base and route rotation. Pause automatic departures and finish the active round trip first.
- Airport opening dates and model introductions are campaign milestones, not actual historical opening or certification dates.

## Systems

Aircraft purchase, leasing, selling and trade-ins; three cabin configurations; route licenses, pricing, capacity, competition and range constraints; round-trip rotations with up to six routes from a common base; automatic fuel purchasing and maintenance; lasting service reputation; five AI rivals with treasury, flights, preannounced expansion and fleet modernization; five permanent licenses per connection shared across all airlines, with multiple licenses per airline and no purchases after sellout; airport ownership and airline revenue shares; six permanent airline improvements; six cycling market conditions; business credit and repayment; 24 rewarded campaign objectives; a one-time recovery grant; finances, activity feed, route map, release calendar and catalog filters.

The player can operate up to 150 aircraft. AI fleet expansion limits grow with campaign age, up to 80 routes per rival. These are performance and balance limits.

## Time and persistence

1 real second = 4 game minutes at 1×. 5× and 20× are free. Pausing stops all progression and costs. Rotations continue while away at 1×, capped at 7 game days per catch-up. The simulation begins with the first acquired aircraft.

Progress is local to the browser and origin, with JSON backup export/import. There is no cloud account or cross-device synchronization. Multiple tabs coordinate one simulation writer. Hosting and local preview have separate saves; export/import transfers progress.

## Source layout

- `dist/data.js`: starting world, aircraft, rivals, upgrades and objectives.
- `dist/expansion.js`: additional real airports, extended airframe families and technology generations.
- `dist/engine.js`: economy, flights, time progression, AI, unlock rules and save validation.
- `dist/app.js`: interface, map, controls, local saves and feature-detected WebMCP tools.
- `dist/style.css`: responsive visual system.
- `tests/`: deterministic engine and progression regression tests.

## Tests

```sh
node tests/engine.test.mjs
node tests/expansion.test.mjs
```

40 engine, progression and strategy checks cover the first-flight loop, earnings reconciliation, route and model restrictions, multi-route scheduling, paused departures, airport income, AI behavior, finite shared supply, multi-license capacity, leases, ticket pricing, credit, objectives, save validation, long-term simulation, opening dates, catalog completeness, generational improvements, obsolescence and trade-ins.

## Credits

Airport expansion: OurAirports, public domain, https://ourairports.com/data/ . World geometry: Natural Earth, public domain, via https://github.com/nvkelso/natural-earth-vector . The original aircraft illustration was generated for this game. Typography: DM Sans, Manrope and IBM Plex Mono via Google Fonts.

Airframe names refer to real aircraft families; all operating economics and future derivatives are game design approximations. This game is not affiliated with Airline Manager, Trophy Games, or aircraft manufacturers.

## Visual edition and mobile release

Play: https://chrisdayley.github.io/aerovale/

The visual edition replaces the green dashboard with a navy/blue flight deck, brings the interactive route map into the route market, and adds zoom/pan, region selection, rival and airport layers, route planning from airport pins, origin selection and selectable airborne aircraft. Fleet and purchase dialogs now use 100 individually generated aircraft images. All 400 catalog entries have artwork; later fictional variants reuse their original airframe with generation badges. Eight featured airports have credited exact-location photographs, and other destinations use six clearly labeled regional concept environments.

On iPhone, open the game in Safari and choose **Share → Add to Home Screen**. The app caches the complete game library for offline play after its first successful load. Saves stay on the current browser/device; use **Game & saves → Export backup** on the previous URL, then **Import backup** on this URL to continue that airline. Your old save is never erased by publishing.

`dist/` contains editable source and static assets. GitHub Pages serves the identical `docs/` release copy from the `main` branch. To prepare another release, run `node scripts/prepare-pages.mjs`, commit both directories, and push. No keys or backend are needed.

Run all checks with `node --test tests/*.test.mjs`. The visual asset tests verify coverage of all 400 aircraft and 600 airports, image provenance, and offline installation/fallback without deleting other games’ caches. Artwork provenance and exact generation prompts are linked from the in-game credits page.

## Direct route assignment

Owned route cards and route details opened from the map now include an aircraft picker and **Assign & fly**. The picker prefers idle compatible aircraft and shows unavailable aircraft with a reason. Assignment appends to an existing compatible rotation, preserves the cabin, quotes any ferry cost, and starts automatic departures. Assigned routes show their aircraft and a direct management button.

This update keeps the same URL, `aerovale-save-v1` storage key and version-one save format. Existing money, planes, routes, progress and active flights load without a restart or import. The service-worker cache version changes only cached game files; it does not clear saved games.

## Finite route supply and rival personalities

Each unordered airport connection has exactly five licenses shared by the player and all five rivals. Either direction uses the same pool. Airlines can hold multiple licenses; each player license supports one assigned aircraft. A connection is permanently sold out when all five are held. The premium buyout option has been removed. Selling an aircraft does not release its route license. Existing routes keep their original IDs, purchase costs, flight history and assignments; saves without a license-count field are read as owning one license.

Route cards, route details and map previews show remaining supply. Owned route cards support purchasing another available license and assigning an additional plane directly. The save key, version and live URL stay unchanged.

Rivals evaluate incremental operating profit after leases, competition, and reduced earnings on their own existing flights. They preserve an operating reserve, reassess a bid before spending, and upgrade aircraft only when the resulting profit justifies the cost. They are deliberately imperfect: each scouts only 8–12 markets from a limited shortlist, makes varied estimates, and can choose among several reasonable options. Purchase intentions appear 12–48 game hours ahead. Each airline has its own investment schedule and an 18–72-hour scouting interval depending on personality; repeated purchases on a connection wait 5–12 days, and each personality limits its concentration to two or three licenses there.

- Meridian: conservative regional routes around Denver, smaller aircraft, larger cash reserve.
- Solstice: patient international expansion, longer routes, selective investment.
- Nimbus: efficient high-volume connections, competitive capacity expansion.
- Pacifica: Asia/Oceania hub growth and patient capacity additions.
- Kestrel: less crowded and overlooked markets, a wider variety of bets.

The full suite now includes 43 checks covering gameplay, expansion, assets/offline behavior, route scarcity, rival strategy and save compatibility. Browser QA covers sold-out routes, last-slot purchasing, a second aircraft on a second license, save reload, and mobile layout. Test saves are isolated from the published game.

## Independent rival expansion

The shared expansion queue accidentally made all five airlines wait on one another, averaging about ten game days between purchases per airline. Rivals now maintain independent plans, decision counters and review times. Nimbus reinvests most frequently; Solstice waits longer. Typical cycles take about 2–5 game days when profitable, affordable opportunities exist, with the same 12–48-hour advance warning and limits on repeated purchases.

The Rival airlines screen shows each carrier's target and countdown, next market review, or why it is waiting. Route cards recognize every pending rival plan. New saves stagger the first reviews; existing saves begin independent reviews gradually over 3–15 game hours, retain any previously announced bid, and never receive a burst of retroactive purchases. The storage key, save version, player purchases and flight state are unchanged.

All 51 checks pass, including independent growth past four licenses, different expansion rates, legacy-save migration, preservation of pending bids and player progress, competing bids for the last slot, retries after an unaffordable review, and deterministic save/reload.

## World events and release notifications

The campaign now has seven special event types: World Games, Festival of Lights, Global Business Summit, Holiday Travel Wave, Fuel Supply Squeeze, Fuel Market Relief and Regional Storm Front. Events rotate through open destinations and regions with varied spacing, 1–3 game days of advance notice, and 4–7-day durations. Travel events affect both passenger demand and market fares, so they can improve earnings even when seats were already filling. Fuel and weather events change operating costs and rotation times. Impacts combine with the base market and are capped; they apply to both player and rival forecasts and new departures. In-flight economics remain fixed.

Apex Airways announces a Dubai launch four game days ahead, then enters with $25–150 million based on the player's business value. It starts without routes and must pay for licenses and leased aircraft, preserve a reserve, scout a limited shortlist, wait between investments, and telegraph every bid. Existing route ownership and the five-license limit remain intact. Fresh campaigns see the launch on day 19. Older saves get a new calendar starting on their current day, so there is no retroactive surge of events or rival purchases.

**World events** lists live and upcoming events, effects, end times and affected destinations, with shortcuts to the route market. The overview surfaces the current briefing and route cards show relevant impacts. On phones, World events is under **More**.

The **Updates** bell opens a persistent notification center for every airport-opening and aircraft-introduction batch, event announcement/start/end, and the newcomer. Each release notice contains the complete list with pictures and links to details. An unread badge, non-blocking alert, category filters and individual/all-read actions make launches visible without interrupting play. The latest 300 notices and their read state are stored with the airline. Offline catch-up creates the same notifications as active play; they are shown when the game is reopened. These are in-game notifications, not operating-system push alerts.

The same `aerovale-save-v1` key and version-one save format are retained. New calendar and notification fields are optional for old saves, and the rival roster safely accepts the original five plus Apex. The new event catalog is included in offline caching. All 62 checks pass, including event scope, real economic effects, expiry, complete release lists, deduplication, offline advancement, save/reload, migration, paid newcomer expansion, and shared license scarcity.

## Career edition: decisions and payoffs

Career now contains a repeatable contract board, airline development and the original milestones. Choose up to two of three offered contracts; replacement offers appear immediately. Eight briefs reward different approaches: profitable dispatches, regional shuttles, premium cabins, network variety, full cabins, a specific connection, long-haul service and efficient airframes. Only qualifying profitable flights that depart after acceptance count. Contracts and earned commissions never expire, including during away progress. Each claim pays a displayed, fleet-scaled commission and one strategy credit, exactly once.

Strategy credits develop three branches—Regional powerhouse, Signature service and Precision operator—with three permanent benefits each. Ranks cost 1, 2 and 3 credits. Their effects change real ticket revenue, demand, premium capacity, crew, fuel, maintenance and/or duration on future departures. Existing quotes stay fixed. A veteran airline receives up to three founding credits based on its existing completed flights. Old saves retain their money, aircraft, airports, licenses, objectives and active flights.

Route mastery uses existing flight history: 10, 40 and 120 completed round trips confer 2%, 4% and 6% extra ticket revenue on that connection. Its progress appears in route cards, route details and Career. A new flight-deck area highlights active commissions, spendable credits and an optional aircraft savings goal. Any catalog aircraft can be pinned from its purchase dialog, including future models. Away briefings include completed contracts and mastery gains; career notifications persist alongside airport and model releases.

The first contract can complete in one profitable round trip (about 48 seconds at normal speed for a new ATR 42 flying SLC–DEN). Later tasks require changing the way the fleet operates, while route mastery and chosen aircraft purchases provide longer goals. There are no login streaks or forced save resets. The version-one save key is unchanged. New module: `dist/career.js`; regression coverage: `tests/career.test.mjs`.
