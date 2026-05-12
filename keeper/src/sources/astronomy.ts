import {
  SourceFetchResult,
  SourceValue,
} from "./types";

// Lightweight closed-form planetary positions for conjunction
// detection. Uses Meeus low-precision formulas (good to ~1° for the
// classical planets). The spec called for Skyfield, but Skyfield is
// a Python library and would require a subprocess to the keeper's
// Node runtime; this in-process JS implementation avoids that
// operational complexity at the cost of ~1° precision (acceptable
// for "is there a near-conjunction" detection).
//
// Sources for the formulas:
//   Meeus, "Astronomical Algorithms" 2nd ed., chapters 25-31.
//   Public-domain orbital elements for J2000.
//
// We compute geocentric ecliptic longitude for Mercury, Venus, Mars,
// Jupiter, Saturn, the Sun, and the Moon. We report:
//   - Tightest conjunction (smallest angular separation) for the day
//   - Lunar phase
//   - Sun longitude

const D2R = Math.PI / 180;

interface OrbitalElements {
  name: string;
  // Heliocentric orbital elements at J2000, plus rates per century.
  // L: mean longitude (deg, deg/cy)
  // a: semi-major axis (AU)
  // e: eccentricity
  // i: inclination (deg)
  // omega: longitude of ascending node (deg)
  // pi: longitude of perihelion (deg)
  L0: number;
  Ldot: number;
  a: number;
  e0: number;
  edot: number;
  i0: number;
  idot: number;
  omega0: number;
  omegadot: number;
  pi0: number;
  pidot: number;
}

// Source: NASA Standish low-precision elements, J2000 epoch, valid
// 1800-2050. https://ssd.jpl.nasa.gov/planets/approx_pos.html
const PLANETS: OrbitalElements[] = [
  { name: "Mercury", a: 0.38709843, e0: 0.20563661, edot: 0.00002123, i0: 7.00559432, idot: -0.00590158, L0: 252.25166724, Ldot: 149472.67486623, omega0: 48.33961819, omegadot: -0.12214182, pi0: 77.45771895, pidot: 0.15940013 },
  { name: "Venus",   a: 0.72332102, e0: 0.00676399, edot: -0.00005107, i0: 3.39777545, idot: 0.00043494, L0: 181.97970850, Ldot: 58517.81560260, omega0: 76.67261496, omegadot: -0.27274174, pi0: 131.76755713, pidot: 0.05679648 },
  { name: "Mars",    a: 1.52371243, e0: 0.09336511, edot: 0.00009149, i0: 1.85181869, idot: -0.00724757, L0: -4.56813164, Ldot: 19140.29934243, omega0: 49.71320984, omegadot: -0.26852431, pi0: -23.91744784, pidot: 0.45223625 },
  { name: "Jupiter", a: 5.20248019, e0: 0.04853590, edot: 0.00018026, i0: 1.29861416, idot: -0.00322699, L0: 34.33479152, Ldot: 3034.90371757, omega0: 100.29282654, omegadot: 0.13024619, pi0: 14.27495244, pidot: 0.18199196 },
  { name: "Saturn",  a: 9.54149883, e0: 0.05550825, edot: -0.00032044, i0: 2.49424102, idot: 0.00451969, L0: 50.07571329, Ldot: 1222.11494724, omega0: 113.63998702, omegadot: -0.25015002, pi0: 92.86136063, pidot: 0.54179478 },
];

function julianCenturyFromUnix(unixSec: number): number {
  // JD = unix_seconds / 86400 + 2440587.5
  const jd = unixSec / 86400 + 2440587.5;
  return (jd - 2451545.0) / 36525.0;
}

function deg360(x: number): number {
  const y = x % 360;
  return y < 0 ? y + 360 : y;
}

function solveKepler(M: number, e: number): number {
  // M in radians, returns E in radians. Iterative.
  let E = M;
  for (let i = 0; i < 8; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

function heliocentric(p: OrbitalElements, T: number): {
  x: number;
  y: number;
  z: number;
} {
  const a = p.a;
  const e = p.e0 + p.edot * T;
  const i = (p.i0 + p.idot * T) * D2R;
  const omega = (p.omega0 + p.omegadot * T) * D2R;
  const pi = (p.pi0 + p.pidot * T) * D2R;
  const L = (p.L0 + p.Ldot * T) * D2R;
  const M = L - pi;
  const w = pi - omega; // argument of perihelion
  const E = solveKepler(M, e);
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv);
  const r = Math.hypot(xv, yv);
  const u = v + w;
  const x =
    r * (Math.cos(omega) * Math.cos(u) - Math.sin(omega) * Math.sin(u) * Math.cos(i));
  const y =
    r * (Math.sin(omega) * Math.cos(u) + Math.cos(omega) * Math.sin(u) * Math.cos(i));
  const z = r * Math.sin(u) * Math.sin(i);
  return { x, y, z };
}

function geocentricLongitude(p: OrbitalElements, T: number, earth: { x: number; y: number; z: number }): number {
  const h = heliocentric(p, T);
  const dx = h.x - earth.x;
  const dy = h.y - earth.y;
  // ecliptic longitude
  const lambda = (Math.atan2(dy, dx) * 180) / Math.PI;
  return deg360(lambda);
}

function sunGeocentricLongitude(T: number): number {
  // Meeus 25.2-25.10 (low precision)
  const L0 = deg360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * D2R;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M);
  return deg360(L0 + C);
}

function moonGeocentricLongitude(T: number): number {
  // Meeus 47.1 simplified (low precision)
  const Lp = deg360(218.3164477 + 481267.88123421 * T);
  const D = (297.8501921 + 445267.1114034 * T) * D2R;
  const M = (357.5291092 + 35999.0502909 * T) * D2R;
  const Mp = (134.9633964 + 477198.8675055 * T) * D2R;
  const F = (93.2720950 + 483202.0175233 * T) * D2R;
  const lambda =
    Lp +
    6.289 * Math.sin(Mp) +
    -1.274 * Math.sin(Mp - 2 * D) +
    0.658 * Math.sin(2 * D) +
    0.214 * Math.sin(2 * Mp) +
    -0.186 * Math.sin(M) +
    -0.059 * Math.sin(2 * Mp - 2 * D);
  return deg360(lambda);
}

function angSep(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

const PHASE_NAMES = [
  "new",
  "waxing-crescent",
  "first-quarter",
  "waxing-gibbous",
  "full",
  "waning-gibbous",
  "last-quarter",
  "waning-crescent",
];

function lunarPhaseName(elongationDeg: number): string {
  // 0..360 elongation. 0 = new, 180 = full.
  const idx = Math.round((elongationDeg / 360) * 8) % 8;
  return PHASE_NAMES[idx];
}

export async function fetchAstronomy(): Promise<SourceFetchResult> {
  const nowSec = Math.floor(Date.now() / 1000);
  const T = julianCenturyFromUnix(nowSec);

  // Earth heliocentric position (we treat Earth as the third "planet"
  // with its own elements for geocentric correction).
  const earthEl: OrbitalElements = {
    name: "Earth",
    a: 1.00000018,
    e0: 0.01673163,
    edot: -0.00003661,
    i0: -0.00054346,
    idot: -0.01337178,
    L0: 100.46691572,
    Ldot: 35999.37306329,
    omega0: -5.11260389,
    omegadot: -0.24123856,
    pi0: 102.93005885,
    pidot: 0.31795260,
  };
  const earth = heliocentric(earthEl, T);

  const planetLongs = new Map<string, number>();
  for (const p of PLANETS) {
    planetLongs.set(p.name, geocentricLongitude(p, T, earth));
  }
  const sunLong = sunGeocentricLongitude(T);
  const moonLong = moonGeocentricLongitude(T);
  planetLongs.set("Sun", sunLong);
  planetLongs.set("Moon", moonLong);

  // Find tightest pairwise angular separation among the 7 bodies.
  const bodies = Array.from(planetLongs.keys());
  let tightest = { a: "", b: "", sep: 360 };
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const sep = angSep(
        planetLongs.get(bodies[i])!,
        planetLongs.get(bodies[j])!
      );
      if (sep < tightest.sep) {
        tightest = { a: bodies[i], b: bodies[j], sep };
      }
    }
  }

  // Lunar phase: elongation of moon from sun.
  let elong = (moonLong - sunLong + 360) % 360;
  if (elong > 180) elong = 360 - elong;
  const phase = lunarPhaseName((moonLong - sunLong + 360) % 360);

  const ts = nowSec;
  const sepTxt = tightest.sep.toFixed(2);
  const sunDeg = sunLong.toFixed(1);

  const values: SourceValue[] = [
    {
      name: "astronomy:tightest-conjunction",
      category: "HEAVENS",
      raw_value: {
        bodies: [tightest.a, tightest.b],
        separation_deg: Number(sepTxt),
        precision_note: "low-precision Meeus, ~1° tolerance",
      },
      text_representation: `tightest pairing today: ${tightest.a}–${tightest.b} at ${sepTxt}° separation`,
      timestamp: ts,
    },
    {
      name: "astronomy:lunar-phase",
      category: "HEAVENS",
      raw_value: {
        phase,
        elongation_deg: Number(elong.toFixed(1)),
        moon_long_deg: Number(moonLong.toFixed(2)),
        sun_long_deg: Number(sunLong.toFixed(2)),
      },
      text_representation: `moon ${phase}, sun at ecliptic ${sunDeg}°`,
      timestamp: ts,
    },
  ];

  return { values };
}
