# Reedbank balance check

48 deterministic full-night runs: 8 bot strategies, 3 modes, seeds 7 and 31. These are scripted strategy comparisons, not estimates of human win rates.

| Strategy | Relaxed wins | Standard wins | Nightfall wins |
|---|---:|---:|---:|
| balanced + routing | 2/2 | 2/2 | 0/2 |
| balanced, no routing | 2/2 | 2/2 | 0/2 |
| sparks + bells + routing | 2/2 | 0/2 | 0/2 |
| heavy hitters + routing | 2/2 | 2/2 | 0/2 |
| garden economy + routing | 1/2 | 0/2 | 0/2 |
| greedy, parks on rich runs | 0/2 | 0/2 | 0/2 |
| slow reactions (1.5s) | 2/2 | 2/2 | 1/2 |
| careful sorter, beams | 2/2 | 2/2 | 2/2 |

Standard supports balanced, heavy and long-range beam builds across both seeds. The 1.5-second reaction bot also wins both seeds. Nightfall needs more precise investment and routing. Parking permanently on rich channels loses early; buying three gardens before a defence is established also fails on Standard.

Only Reedbank placement and one inlet allocation were tuned. Wickwater combat, geometry, costs, waves and upgrade rules remain covered by original replay hashes.

Raw results: [reedbank-balance.json](reedbank-balance.json). Run `npm run balance:reedbank` to reproduce.
