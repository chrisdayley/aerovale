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

Aircraft purchase, leasing, selling and trade-ins; three cabin configurations; route licenses, pricing, capacity, competition and range constraints; round-trip rotations with up to six routes from a common base; automatic fuel purchasing and maintenance; lasting service reputation; five AI rivals with treasury, flights, preannounced expansion and fleet modernization; three licenses per connection and rival buyouts; airport ownership and airline revenue shares; six permanent airline improvements; six cycling market conditions; business credit and repayment; 24 rewarded campaign objectives; a one-time recovery grant; finances, activity feed, route map, release calendar and catalog filters.

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

29 engine and progression checks cover the first-flight loop, earnings reconciliation, route and model restrictions, multi-route scheduling, paused departures, airport income, AI behavior, buyouts, leases, ticket pricing, credit, objectives, save validation, long-term simulation, opening dates, catalog completeness, generational improvements, obsolescence and trade-ins.

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
