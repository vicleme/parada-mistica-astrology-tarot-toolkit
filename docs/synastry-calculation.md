# How the synastry score is calculated

This page explains how the synastry calculator (`sinastria.html`) turns two birth charts into its scores. It is written for people who want to understand, check or adjust the numbers. Every value below lives in one of five files, and the code is the final authority if this page and the code ever disagree:

| File | What it holds |
|---|---|
| `astro/js/core/weights.js` | The weight of a single aspect: orb decay, pair boosts, discounts. |
| `astro/js/core/orbs.js` | The maximum orb allowed for each aspect and each kind of point. |
| `sinastria/js/calibration.js` | The scoring constants: stretch, thresholds, shrinkage references, verdict weights. |
| `sinastria/js/scoring.js` | Which aspects count as harmonious, tense or mixed (`harmonicFraction`). |
| `sinastria/js/compute.js` | The pipeline that puts everything together. |

**What the score is, and is not.** It is a structured reading of how many classical synastry factors point in a favourable or a difficult direction, and how tightly. It is not a prediction of whether a relationship will last. The published studies that tested sun-sign pairing against marriage and divorce found small or no effects (see [What has been tested](#what-has-been-tested)).

## 1. From aspects to weights

Each aspect between a point of chart A and a point of chart B gets a weight. The weight is a product of five factors.

```
weight = orb decay × pair boost × aspect-type multiplier × generational discount × reciprocity boost
```

**Orb limit.** An aspect only counts if its orb is inside a maximum that depends on the aspect and on the points involved. Outside it, the weight is zero.

| Aspect | Base orb |
|---|---|
| Conjunction, opposition | 8° |
| Square, trine | 7° |
| Sextile | 5° |
| Quincunx | 3° |
| Semisextile, semisquare, sesquiquadrate | 2° |

The base orb is multiplied by a factor for the narrower of the two points: Uranus, Neptune and Pluto 0.75; Chiron, nodes, Vertex, Part of Fortune and Part of Spirit 0.35; Lilith 0.25; everything else 1.0.

**Orb decay.** The closer to exact, the heavier: `exp(−orb / divisor)`. The divisor is 3.0 for conjunction and opposition, 2.5 for square and trine, 1.8 for sextile and quincunx, and 1.5 for the minor aspects. For example, a conjunction at 3° keeps about 37% of its weight.

**Pair boost.** The classical indicators most cited in synastry weigh more.

| Boost | Pairs |
|---|---|
| 1.35 | Sun–Moon, Venus–Mars, same-planet pairs of the personal planets (Sun–Sun, Moon–Moon, Venus–Venus, Mars–Mars, Mercury–Mercury), Mercury with Sun or Moon, Ascendant with the personal planets, Saturn with the personal planets and with the angles |
| 1.30 | Lunar nodes with the personal planets and with the angles |
| 1.20 | Venus with Sun or Moon, Mars with Sun or Moon, Mercury with Venus or Mars, Jupiter with the personal planets and with the angles, MC and IC with the personal planets, Uranus, Neptune or Pluto touching Sun, Moon, Venus, Mars or Mercury |
| 1.10 | Vertex, Chiron and Lilith with the personal planets |
| 0.60 | Ascendant–Ascendant, Descendant–Descendant, Part of Fortune and Part of Spirit with the personal planets |
| 1.00 | Any pair not listed (the exact list is `AXIS_BOOST` in `weights.js`) |

The Descendant is treated like the Ascendant for conjunction, opposition and square, and gets an intermediate boost of 1.28 with the personal planets for the other aspects. 
**Aspect-type multiplier.** Major aspects count fully (1.0). A major aspect between two non-personal points with no curated boost counts 0.75. Minor aspects count less: 0.6 if both points are personal planets, 0.45 if one is, 0.35 if none is.

**Generational discount.** An aspect between two of Uranus, Neptune and Pluto is shared by a whole generation and says little about the pair, so it is multiplied by 0.3.

**Reciprocity boost.** When the same pair of planets is in aspect in both directions (A's Venus to B's Mars and B's Venus to A's Mars), the weight is multiplied by 1.15. This is tested only among aspects that already count.

## 2. Harmonious, tense or mixed

Each aspect splits its weight between a harmonious side and a tense side through a fraction between 0 and 1 (`harmonicFraction`). A fraction of 1 is fully harmonious, 0 fully tense.

| Aspect | Fraction |
|---|---|
| Trine, sextile | 1.0 |
| Square, opposition | 0 by default, with the exceptions below |
| Conjunction | Depends on the planets. The Mars–Venus type pairs are 0.65, Mars–Moon 0.45, Mars–Saturn 0.15; see `scoring.js` for the rest |
| Semisextile | 0.5 |
| Quincunx, semisquare | 0.2 |
| Sesquiquadrate | 0.15 |

Square and opposition exceptions, each based on the traditional reading of that pair:

| Pair | Fraction | Reading |
|---|---|---|
| Jupiter with Saturn | 0.1 | Mostly tense |
| Jupiter with any other point | 0.3 | Tense, but softer than a pure hard aspect |
| Mars with Venus or Mars | 0.45 | Magnetic attraction with friction: passion, jealousy, sexual tension |
| Venus with Mercury, Sun, Moon or Venus | 0.25 | Friction that stays benign |
| Mars with Sun or Ascendant | 0.30, **Attraction category only** | Spark with friction. Everywhere else it counts as tension (0) |

The Mars with Sun or Ascendant rule is deliberately weaker than Mars with Venus, which is the classic complementary pair. It applies only inside Attraction because the sources that read it as a spark describe it as physical attraction, while the same sources score it as negative for the relationship as a whole. Mars with Moon is left out: it is traditionally read as irritation and emotional clashes.

An aspect with a fraction between 0.41 and 0.59 is shown as *mixed*, above that as *harmonious*, and below as *tense*.

Each aspect then adds `weight × fraction` to the harmonious total and `weight × (1 − fraction)` to the tense total of every pool it belongs to.

## 3. Pools

The same aspects feed several pools, each answering a different question.

| Pool | Question |
|---|---|
| General | How harmonious is the whole picture? Only aspects that belong to a curated list count, so noise does not dilute it. |
| Attraction | Desire and physical pull (Venus, Mars, Ascendant, Sun and Moon touching them, Pluto/Neptune/Uranus with Venus, Mars or Sun). |
| Emotional | Feelings, nurturing, sense of security. |
| Intellectual | Communication and mental fit. |
| Practical | Everyday life, routines, shared work. |
| Affinity | Ease and warmth, mainly Jupiter contacts. |
| Structure | What holds the bond together over time: Saturn, Sun–Moon, angles, commitment houses. |
| Destiny | Nodes, Vertex and related markers of a sense of fated connection. |

House overlays add presence to some categories but carry no harmony, because a planet in a house says where the energy lands, not whether it flows.

## 4. From pools to percentages

For each pool, the share of harmonious weight is `harmonious / (harmonious + tense) × 100`. That share is then:

1. **Stretched** away from 50: `50 + (share − 50) × 1.6`, then limited to the range 5 to 95. The stretch widens the range so that clearly lopsided readings stand out.
2. **Shrunk when the evidence is thin.** If the pool's total weight is below a reference, the result is pulled toward 50 in proportion: `50 + (stretched − 50) × min(1, weight / reference)`. A pool with a single weak aspect should not report an extreme percentage.
3. **Left empty** if the total weight is below 0.5, because there is not enough signal to say anything.

The shrinkage references are the 5th percentile of each pool's weight in 20,000 random pairs, so only about 5% of random pairs fall below them:

| Pool | Reference weight |
|---|---|
| Intellectual | 0.4 |
| Emotional | 0.8 |
| Attraction | 3.3 |
| Practical | 2.8 |
| Affinity | 0.5 |
| Structure | 2.6 |
| Destiny | 0.5 |

They were chosen from random pairs only, not fitted to any real couple or to any relationship outcome.

**Presence.** Each category also shows how much evidence it rests on: `min(100, round(total weight × 22))`, or 0 below the 0.5 floor.

## 5. The headline scores

**Harmony.** The stretched share of the General pool.

**Compatibility (romantic).** The geometric mean of Attraction and Structure, `√(Attraction × Structure)`, nudged by Affinity: `+ 0.08 × (Affinity − 50)`, limited to 0 to 100. The geometric mean means a strong score in one cannot hide a weak score in the other. If Attraction or Structure is empty, Compatibility is empty.

**Compatibility (friendship and family).** The average of the five categories, each weighted by its presence, so a thinly supported category counts little.

**Sharpness.** The percentage of counted aspects with an orb under 2°, multiplied by 2.3 and capped at 100. It is a measure of how exact the aspects are, not of whether they are good. The same is computed separately for the harmonious and for the tense side.

**Verdict.** A weighted mean of three parts:

| Part | Weight |
|---|---|
| Compatibility | 0.50 |
| Harmony | 0.3125 |
| Significance | 0.1875 |

Significance is the weight-averaged harmony of Destiny, Emotional and Intellectual for romantic readings, and of Structure and Destiny otherwise. The mean is then amplified or softened by the sharpness of the side it points to: `50 + (mean − 50) × (0.7 + 0.65 × sharpness / 100)`. A tightly exact favourable reading is pushed further up, and a vague one stays closer to 50.

## 6. Reading the numbers

- Around **50%** means the factors balance out or there are few of them, not that the relationship is neutral.
- Harmony between **45% and 60%** is treated as a mixed zone when the text names the type of bond. Below 45% the reading leans toward difficulty and above 60% toward ease.
- A low Attraction with a high Structure, or the reverse, is information in itself, and the text points it out when the gap is large.

## What has been tested

No outcome study of this exact scoring exists, and it has not been fitted to relationship outcomes. What is known:

- Large studies of sun-sign pairing and marriage found little or nothing: Carlson (1985, *Nature*) found no effect; Schüller (2013, Swiss data) found a slightly higher frequency of same-sign marriages but no effect on divorce; Helgertz and Scott (2020, Swedish registers) found no consistent support. All of them used sun signs only, not full synastry.
- An exploratory check on 17 well-known couples (12 with confirmed birth times) found a weak correlation between Compatibility and relationship length (ρ ≈ 0.51, one-sided p ≈ 0.044, 12 couples), and none once the five couples without birth times were included (ρ ≈ 0.22, p ≈ 0.20). The sample is too small to separate a weak real effect from chance, and it was run before the analysis plan was frozen, so it does not count as confirmation.
- The constants above were chosen from the structure of random pairs and from traditional readings, not tuned to maximize agreement with any outcome.

Treat the result as a way to organize a reading, not as evidence about how a relationship will go.

## Changing the numbers

Edit the value in the file named in the first table, then reload the page. Nothing else needs to change, because `weights.js` is the single source for the weights used by both the synastry calculator and the charts page.
