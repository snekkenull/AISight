/**
 * AI Tools
 *
 * Individual tool functions that the AI can invoke to query vessel data,
 * analyze collision risks, and perform other maritime operations.
 */

import type {
  VesselWithPosition,
  LookupVesselInput,
  LookupVesselOutput,
  FindNearbyVesselsInput,
  FindNearbyVesselsOutput,
  AnalyzeCollisionRiskInput,
  AnalyzeCollisionRiskOutput,
  CollisionRisk,
  AnalyzeNavigationSafetyInput,
  AnalyzeNavigationSafetyOutput,
  NavigationSafetyResult,
  WeatherImpact,
} from '../types';
import * as VesselAPI from './VesselAPI';

/**
 * Validate MMSI format (9 digits)
 */
function isValidMMSI(mmsi: string): boolean {
  return /^\d{9}$/.test(mmsi);
}

/**
 * Validate IMO format (7 digits, optionally prefixed with "IMO")
 */
function isValidIMO(imo: string): boolean {
  const imoNumber = imo.replace(/^IMO\s*/i, '');
  return /^\d{7}$/.test(imoNumber);
}

/**
 * Tool: lookupVessel
 *
 * Look up vessel information by MMSI or IMO number
 * First checks local cache, then queries backend if not found
 *
 * Requirements: 7.1, 7.4, 11.5
 */
export async function lookupVessel(
  input: LookupVesselInput,
  vessels: Map<string, VesselWithPosition>
): Promise<LookupVesselOutput> {
  const identifier = input.mmsi || (input as any).imo;
  
  if (!identifier) {
    return {
      found: false,
      error: 'Please provide either an MMSI (9 digits) or IMO number (7 digits).',
    };
  }

  // Determine if this is an MMSI or IMO lookup
  const isMMSI = isValidMMSI(identifier);
  const isIMO = isValidIMO(identifier);

  if (!isMMSI && !isIMO) {
    return {
      found: false,
      error: `Invalid identifier format. MMSI must be exactly 9 digits, IMO must be 7 digits. Received: ${identifier}`,
    };
  }

  let vessel: VesselWithPosition | null | undefined = null;

  // For MMSI lookup
  if (isMMSI) {
    // First, try to find in local vessel map
    vessel = vessels.get(identifier);

    // If not found locally, query backend
    if (!vessel) {
      try {
        const backendVessel = await VesselAPI.getVesselByMMSI(identifier);
        if (backendVessel) {
          vessel = backendVessel;
        }
      } catch (error) {
        console.error('Error fetching vessel from backend:', error);
        return {
          found: false,
          error: `Could not find vessel with MMSI ${identifier}. The vessel may not be currently transmitting or is outside the monitored area.`,
        };
      }
    }
  }

  // For IMO lookup
  if (isIMO && !vessel) {
    // First, try to find in local vessel map by IMO
    for (const v of vessels.values()) {
      if (v.imo_number === identifier || v.imo_number === identifier.replace(/^IMO\s*/i, '')) {
        vessel = v;
        break;
      }
    }

    // If not found locally, query backend
    if (!vessel) {
      try {
        const backendVessel = await VesselAPI.getVesselByIMO(identifier);
        if (backendVessel) {
          vessel = backendVessel;
        }
      } catch (error) {
        console.error('Error fetching vessel from backend:', error);
        return {
          found: false,
          error: `Could not find vessel with IMO ${identifier}. The vessel may not be in the database.`,
        };
      }
    }
  }

  if (!vessel) {
    const idType = isMMSI ? 'MMSI' : 'IMO';
    return {
      found: false,
      error: `No vessel found with ${idType} ${identifier}. The vessel may not be in the database or currently transmitting.`,
    };
  }

  // Check if vessel has position data
  if (!vessel.position) {
    return {
      found: false,
      error: `Vessel ${vessel.name || identifier} found but has no position data available.`,
    };
  }

  // Return vessel data
  return {
    found: true,
    vessel: {
      mmsi: vessel.mmsi,
      name: vessel.name,
      type: vessel.vessel_type,
      position: {
        latitude: vessel.position.latitude,
        longitude: vessel.position.longitude,
      },
      speed: vessel.position.sog,
      course: vessel.position.cog,
      lastUpdate: vessel.position.timestamp,
    },
  };
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in nautical miles
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3440.065; // Earth's radius in nautical miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate bearing from point 1 to point 2
 * Returns bearing in degrees (0-360)
 */
function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = toRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);

  let bearing = toDegrees(Math.atan2(y, x));
  bearing = (bearing + 360) % 360; // Normalize to 0-360

  return bearing;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Tool: findNearbyVessels
 *
 * Find vessels within a radius of a given location
 *
 * Requirements: 8.1, 8.2
 */
export function findNearbyVessels(
  input: FindNearbyVesselsInput,
  vessels: Map<string, VesselWithPosition>
): FindNearbyVesselsOutput {
  const { latitude, longitude, radiusNm } = input;

  const nearbyVessels: FindNearbyVesselsOutput['vessels'] = [];

  // Iterate through all vessels and calculate distances
  for (const vessel of vessels.values()) {
    if (!vessel.position) {
      continue; // Skip vessels without position data
    }

    const distance = calculateDistance(
      latitude,
      longitude,
      vessel.position.latitude,
      vessel.position.longitude
    );

    // Check if vessel is within radius
    if (distance <= radiusNm) {
      const bearing = calculateBearing(
        latitude,
        longitude,
        vessel.position.latitude,
        vessel.position.longitude
      );

      nearbyVessels.push({
        mmsi: vessel.mmsi,
        name: vessel.name,
        distanceNm: Math.round(distance * 100) / 100, // Round to 2 decimal places
        bearing: Math.round(bearing),
        position: {
          latitude: vessel.position.latitude,
          longitude: vessel.position.longitude,
        },
      });
    }
  }

  // Sort by distance (closest first)
  nearbyVessels.sort((a, b) => a.distanceNm - b.distanceNm);

  return {
    vessels: nearbyVessels,
    searchCenter: { latitude, longitude },
    searchRadiusNm: radiusNm,
  };
}

/**
 * Calculate CPA (Closest Point of Approach) and TCPA (Time to CPA)
 * between two vessels
 */
function calculateCPAandTCPA(
  vessel1: VesselWithPosition,
  vessel2: VesselWithPosition
): {
  cpaNm: number;
  tcpaMinutes: number;
  cpaPoint: { latitude: number; longitude: number };
} | null {
  if (!vessel1.position || !vessel2.position) {
    return null;
  }

  const pos1 = vessel1.position;
  const pos2 = vessel2.position;

  // Convert speeds from knots to nm/minute
  const speed1 = pos1.sog / 60;
  const speed2 = pos2.sog / 60;

  // If both vessels are stationary, CPA is current distance
  if (speed1 === 0 && speed2 === 0) {
    const distance = calculateDistance(
      pos1.latitude,
      pos1.longitude,
      pos2.latitude,
      pos2.longitude
    );
    return {
      cpaNm: distance,
      tcpaMinutes: 0,
      cpaPoint: {
        latitude: pos1.latitude,
        longitude: pos1.longitude,
      },
    };
  }

  // Calculate velocity components (nm/minute)
  const v1x = speed1 * Math.sin(toRadians(pos1.cog));
  const v1y = speed1 * Math.cos(toRadians(pos1.cog));
  const v2x = speed2 * Math.sin(toRadians(pos2.cog));
  const v2y = speed2 * Math.cos(toRadians(pos2.cog));

  // Relative velocity
  const dvx = v1x - v2x;
  const dvy = v1y - v2y;

  // Convert positions to approximate Cartesian coordinates (nm)
  // Using simple approximation for small distances
  const dx = (pos1.longitude - pos2.longitude) * 60 * Math.cos(toRadians(pos1.latitude));
  const dy = (pos1.latitude - pos2.latitude) * 60;

  // Calculate TCPA
  const dv2 = dvx * dvx + dvy * dvy;
  
  if (dv2 === 0) {
    // Vessels moving in parallel at same speed
    const distance = calculateDistance(
      pos1.latitude,
      pos1.longitude,
      pos2.latitude,
      pos2.longitude
    );
    return {
      cpaNm: distance,
      tcpaMinutes: Infinity,
      cpaPoint: {
        latitude: pos1.latitude,
        longitude: pos1.longitude,
      },
    };
  }

  const tcpa = -(dx * dvx + dy * dvy) / dv2;

  // Calculate CPA position for vessel 1
  const cpa1x = dx + dvx * tcpa;
  const cpa1y = dy + dvy * tcpa;
  const cpa = Math.sqrt(cpa1x * cpa1x + cpa1y * cpa1y);

  // Calculate CPA point (midpoint between vessels at CPA)
  const cpaLat1 = pos1.latitude + (v1y * tcpa) / 60;
  const cpaLon1 = pos1.longitude + (v1x * tcpa) / (60 * Math.cos(toRadians(pos1.latitude)));
  const cpaLat2 = pos2.latitude + (v2y * tcpa) / 60;
  const cpaLon2 = pos2.longitude + (v2x * tcpa) / (60 * Math.cos(toRadians(pos2.latitude)));

  return {
    cpaNm: Math.abs(cpa),
    tcpaMinutes: tcpa,
    cpaPoint: {
      latitude: (cpaLat1 + cpaLat2) / 2,
      longitude: (cpaLon1 + cpaLon2) / 2,
    },
  };
}

/**
 * Decode Rate of Turn value to degrees per minute
 * ROT is encoded as: ROT = 4.733 * sqrt(ROTais)
 */
function decodeROT(rot: number | undefined): number | null {
  if (rot === undefined || rot === null || rot === -128) {
    return null; // No turn data available
  }
  
  const sign = rot >= 0 ? 1 : -1;
  const absRot = Math.abs(rot);
  
  if (absRot >= 127) {
    return sign * 720; // Turning at 720°/min or more
  }
  
  return sign * Math.pow(absRot / 4.733, 2);
}

/**
 * Project vessel position forward in time
 * Enhanced version that accounts for Rate of Turn (ROT)
 */
function projectPosition(
  vessel: VesselWithPosition,
  minutes: number,
  useROT: boolean = true
): { latitude: number; longitude: number; course: number } | null {
  if (!vessel.position) {
    return null;
  }

  const pos = vessel.position;
  const speed = pos.sog / 60; // Convert knots to nm/minute
  let currentCourse = pos.cog;
  
  // Get rate of turn in degrees per minute
  const rotDegPerMin = useROT ? decodeROT(pos.rate_of_turn) : null;
  
  // If vessel is turning, project curved path
  if (rotDegPerMin !== null && Math.abs(rotDegPerMin) > 0.5) {
    // For small time steps, approximate curved path
    const steps = Math.ceil(minutes);
    let lat = pos.latitude;
    let lon = pos.longitude;
    let course = currentCourse;
    
    for (let i = 0; i < steps; i++) {
      const stepTime = Math.min(1, minutes - i); // 1 minute steps
      
      // Update course based on ROT
      course = (course + rotDegPerMin * stepTime + 360) % 360;
      
      // Calculate average course for this step
      const avgCourse = (currentCourse + course) / 2;
      
      // Calculate velocity components
      const vx = speed * Math.sin(toRadians(avgCourse));
      const vy = speed * Math.cos(toRadians(avgCourse));
      
      // Update position
      lat = lat + (vy * stepTime) / 60;
      lon = lon + (vx * stepTime) / (60 * Math.cos(toRadians(lat)));
      
      currentCourse = course;
    }
    
    return { latitude: lat, longitude: lon, course };
  }
  
  // Linear projection (no turn)
  const vx = speed * Math.sin(toRadians(currentCourse));
  const vy = speed * Math.cos(toRadians(currentCourse));

  const newLat = pos.latitude + (vy * minutes) / 60;
  const newLon = pos.longitude + (vx * minutes) / (60 * Math.cos(toRadians(pos.latitude)));

  return {
    latitude: newLat,
    longitude: newLon,
    course: currentCourse,
  };
}

/**
 * Project vessel path with multiple waypoints (for visualization)
 */
function projectPath(
  vessel: VesselWithPosition,
  totalMinutes: number,
  intervalMinutes: number = 5
): Array<{ latitude: number; longitude: number }> {
  const path: Array<{ latitude: number; longitude: number }> = [];
  
  if (!vessel.position) {
    return path;
  }
  
  // Add current position
  path.push({
    latitude: vessel.position.latitude,
    longitude: vessel.position.longitude,
  });
  
  // Add projected positions at intervals
  for (let t = intervalMinutes; t <= totalMinutes; t += intervalMinutes) {
    const projected = projectPosition(vessel, t, true);
    if (projected) {
      path.push({
        latitude: projected.latitude,
        longitude: projected.longitude,
      });
    }
  }
  
  return path;
}

/**
 * Tool: analyzeCollisionRisk
 *
 * Analyze collision risks between vessels
 *
 * Requirements: 9.1, 9.2
 */
export function analyzeCollisionRisk(
  input: AnalyzeCollisionRiskInput,
  vessels: Map<string, VesselWithPosition>
): AnalyzeCollisionRiskOutput {
  const cpaThresholdNm = input.cpaThresholdNm ?? 0.5;
  const tcpaThresholdMin = input.tcpaThresholdMin ?? 30;

  const risks: CollisionRisk[] = [];
  const vesselsToAnalyze: VesselWithPosition[] = [];

  // Determine which vessels to analyze
  if (input.mmsi) {
    const vessel = vessels.get(input.mmsi);
    if (vessel && vessel.position) {
      vesselsToAnalyze.push(vessel);
    }
  } else {
    // Analyze all vessels with position data
    for (const vessel of vessels.values()) {
      if (vessel.position) {
        vesselsToAnalyze.push(vessel);
      }
    }
  }

  // Analyze pairs of vessels
  const allVessels = Array.from(vessels.values()).filter(v => v.position);

  for (const vessel1 of vesselsToAnalyze) {
    for (const vessel2 of allVessels) {
      // Skip same vessel
      if (vessel1.mmsi === vessel2.mmsi) {
        continue;
      }

      // Skip if we're analyzing a specific vessel and vessel2 is not in the analysis set
      if (input.mmsi && vessel2.mmsi !== input.mmsi) {
        // Only analyze pairs where at least one is the target vessel
        if (vessel1.mmsi !== input.mmsi) {
          continue;
        }
      }

      // Calculate CPA and TCPA
      const cpaResult = calculateCPAandTCPA(vessel1, vessel2);

      if (!cpaResult) {
        continue;
      }

      // Check if risk meets thresholds
      if (
        cpaResult.cpaNm <= cpaThresholdNm &&
        cpaResult.tcpaMinutes >= 0 &&
        cpaResult.tcpaMinutes <= tcpaThresholdMin
      ) {
        // Project paths for visualization using enhanced ROT-aware projection
        const projectionTime = Math.min(cpaResult.tcpaMinutes + 5, tcpaThresholdMin);
        const vessel1Path = projectPath(vessel1, projectionTime, 2);
        const vessel2Path = projectPath(vessel2, projectionTime, 2);

        // Determine if either vessel is turning (affects risk assessment)
        const rot1 = decodeROT(vessel1.position?.rate_of_turn);
        const rot2 = decodeROT(vessel2.position?.rate_of_turn);
        const isTurning = (rot1 !== null && Math.abs(rot1) > 5) || 
                          (rot2 !== null && Math.abs(rot2) > 5);

        risks.push({
          vessel1: {
            mmsi: vessel1.mmsi,
            name: vessel1.name,
          },
          vessel2: {
            mmsi: vessel2.mmsi,
            name: vessel2.name,
          },
          cpaNm: Math.round(cpaResult.cpaNm * 100) / 100,
          tcpaMinutes: Math.round(cpaResult.tcpaMinutes * 10) / 10,
          cpaPoint: cpaResult.cpaPoint,
          vessel1Path,
          vessel2Path,
          // Add turning indicator for enhanced analysis
          ...(isTurning && { turningVessel: true }),
        });
      }
    }
  }

  // Remove duplicate pairs (A-B and B-A)
  const uniqueRisks: CollisionRisk[] = [];
  const seenPairs = new Set<string>();

  for (const risk of risks) {
    const pair1 = `${risk.vessel1.mmsi}-${risk.vessel2.mmsi}`;
    const pair2 = `${risk.vessel2.mmsi}-${risk.vessel1.mmsi}`;

    if (!seenPairs.has(pair1) && !seenPairs.has(pair2)) {
      uniqueRisks.push(risk);
      seenPairs.add(pair1);
    }
  }

  return {
    risks: uniqueRisks,
    analyzedVessels: vesselsToAnalyze.length,
    timestamp: new Date().toISOString(),
  };
}


/**
 * Tool: analyzeVesselBehavior
 *
 * Analyze vessel behavior patterns based on navigational status, speed, and ROT
 *
 * Requirements: Enhanced vessel intelligence
 */
export function analyzeVesselBehavior(
  input: { mmsi?: string; behaviorType?: string },
  vessels: Map<string, VesselWithPosition>
): {
  vessels: Array<{
    mmsi: string;
    name: string;
    behavior: string;
    confidence: string;
    navStatus: string;
    speed: number;
    isTurning: boolean;
    turnDirection?: string;
    position: { latitude: number; longitude: number };
  }>;
  summary: {
    total: number;
    transiting: number;
    anchored: number;
    moored: number;
    fishing: number;
    maneuvering: number;
    drifting: number;
    stationary: number;
  };
  timestamp: string;
} {
  const results: Array<{
    mmsi: string;
    name: string;
    behavior: string;
    confidence: string;
    navStatus: string;
    speed: number;
    isTurning: boolean;
    turnDirection?: string;
    position: { latitude: number; longitude: number };
  }> = [];

  const summary = {
    total: 0,
    transiting: 0,
    anchored: 0,
    moored: 0,
    fishing: 0,
    maneuvering: 0,
    drifting: 0,
    stationary: 0,
  };

  // Nav status names
  const navStatusNames: Record<number, string> = {
    0: 'Under Way Using Engine',
    1: 'At Anchor',
    2: 'Not Under Command',
    3: 'Restricted Maneuverability',
    4: 'Constrained by Draught',
    5: 'Moored',
    6: 'Aground',
    7: 'Engaged in Fishing',
    8: 'Under Way Sailing',
    14: 'AIS-SART Active',
    15: 'Not Defined',
  };

  // Determine which vessels to analyze
  const vesselsToAnalyze = input.mmsi
    ? [vessels.get(input.mmsi)].filter(Boolean) as VesselWithPosition[]
    : Array.from(vessels.values());

  for (const vessel of vesselsToAnalyze) {
    if (!vessel.position) continue;

    const navStatus = vessel.position.navigational_status ?? 15;
    const sog = vessel.position.sog ?? 0;
    const rot = decodeROT(vessel.position.rate_of_turn);

    // Classify behavior
    let behavior = 'unknown';
    let confidence: 'high' | 'medium' | 'low' = 'low';

    // Check navigational status first
    if (navStatus === 1) {
      behavior = 'anchored';
      confidence = 'high';
      summary.anchored++;
    } else if (navStatus === 5) {
      behavior = 'moored';
      confidence = 'high';
      summary.moored++;
    } else if (navStatus === 7) {
      behavior = 'fishing';
      confidence = 'high';
      summary.fishing++;
    } else if (sog < 0.5) {
      if (rot !== null && Math.abs(rot) > 5) {
        behavior = 'maneuvering';
        confidence = 'medium';
        summary.maneuvering++;
      } else {
        behavior = 'stationary';
        confidence = 'medium';
        summary.stationary++;
      }
    } else if (sog < 2 && (rot === null || Math.abs(rot) < 2)) {
      behavior = 'drifting';
      confidence = 'low';
      summary.drifting++;
    } else if (rot !== null && Math.abs(rot) > 10) {
      behavior = 'maneuvering';
      confidence = 'high';
      summary.maneuvering++;
    } else {
      behavior = 'transiting';
      confidence = sog > 5 ? 'high' : 'medium';
      summary.transiting++;
    }

    // Filter by behavior type if specified
    if (input.behaviorType && input.behaviorType !== 'all' && behavior !== input.behaviorType) {
      continue;
    }

    const isTurning = rot !== null && Math.abs(rot) > 2;
    const turnDirection = isTurning ? (rot! > 0 ? 'right' : 'left') : undefined;

    results.push({
      mmsi: vessel.mmsi,
      name: vessel.name,
      behavior,
      confidence,
      navStatus: navStatusNames[navStatus] || 'Unknown',
      speed: Math.round(sog * 10) / 10,
      isTurning,
      turnDirection,
      position: {
        latitude: vessel.position.latitude,
        longitude: vessel.position.longitude,
      },
    });

    summary.total++;
  }

  // Sort by behavior priority (maneuvering first, then by speed)
  results.sort((a, b) => {
    const priorityOrder = ['maneuvering', 'drifting', 'transiting', 'fishing', 'anchored', 'moored', 'stationary'];
    const aPriority = priorityOrder.indexOf(a.behavior);
    const bPriority = priorityOrder.indexOf(b.behavior);
    if (aPriority !== bPriority) return aPriority - bPriority;
    return b.speed - a.speed;
  });

  return {
    vessels: results.slice(0, 50), // Limit to 50 results
    summary,
    timestamp: new Date().toISOString(),
  };
}


/**
 * Tool: analyzeNavigationSafety
 *
 * Comprehensive navigation safety analysis incorporating sea conditions
 * Combines collision risk, weather impact, and vessel behavior analysis
 */
export function analyzeNavigationSafety(
  input: AnalyzeNavigationSafetyInput,
  vessels: Map<string, VesselWithPosition>
): AnalyzeNavigationSafetyOutput {
  const includeWeather = input.includeWeather !== false;
  const results: NavigationSafetyResult[] = [];
  const weatherWarnings: string[] = [];

  // Determine which vessels to analyze
  const vesselsToAnalyze = input.mmsi
    ? [vessels.get(input.mmsi)].filter(Boolean) as VesselWithPosition[]
    : Array.from(vessels.values()).filter(v => v.position).slice(0, 20); // Limit for performance

  if (vesselsToAnalyze.length === 0) {
    return {
      success: false,
      results: [],
      summary: {
        totalAnalyzed: 0,
        criticalRisk: 0,
        highRisk: 0,
        moderateRisk: 0,
        lowRisk: 0,
        weatherWarnings: [],
      },
      timestamp: new Date().toISOString(),
      error: input.mmsi ? `Vessel ${input.mmsi} not found` : 'No vessels available for analysis',
    };
  }

  // Summary counters
  let criticalCount = 0;
  let highCount = 0;
  let moderateCount = 0;
  let lowCount = 0;

  for (const vessel of vesselsToAnalyze) {
    if (!vessel.position) continue;

    const safetyFactors: NavigationSafetyResult['safetyFactors'] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // 1. Analyze collision risks for this vessel
    const collisionRisks: NavigationSafetyResult['collisionRisks'] = [];
    for (const otherVessel of vessels.values()) {
      if (otherVessel.mmsi === vessel.mmsi || !otherVessel.position) continue;

      const cpaResult = calculateCPAandTCPAForSafety(vessel, otherVessel);
      if (cpaResult && cpaResult.tcpaMinutes >= 0 && cpaResult.tcpaMinutes <= 30) {
        let riskLevel: 'low' | 'moderate' | 'high' = 'low';
        if (cpaResult.cpaNm < 0.25) {
          riskLevel = 'high';
          riskScore += 30;
        } else if (cpaResult.cpaNm < 0.5) {
          riskLevel = 'moderate';
          riskScore += 15;
        } else if (cpaResult.cpaNm < 1.0) {
          riskLevel = 'low';
          riskScore += 5;
        }

        if (cpaResult.cpaNm < 1.0) {
          collisionRisks.push({
            otherVessel: { mmsi: otherVessel.mmsi, name: otherVessel.name },
            cpaNm: Math.round(cpaResult.cpaNm * 100) / 100,
            tcpaMinutes: Math.round(cpaResult.tcpaMinutes * 10) / 10,
            riskLevel,
          });
        }
      }
    }

    // Add collision risk factor
    if (collisionRisks.length > 0) {
      const highRiskCollisions = collisionRisks.filter(r => r.riskLevel === 'high').length;
      safetyFactors.push({
        factor: 'Collision Risk',
        status: highRiskCollisions > 0 ? 'danger' : collisionRisks.length > 2 ? 'warning' : 'caution',
        details: `${collisionRisks.length} vessel(s) within CPA threshold, ${highRiskCollisions} high-risk`,
      });
      if (highRiskCollisions > 0) {
        recommendations.push('Immediate course/speed alteration recommended to increase CPA');
      }
    } else {
      safetyFactors.push({
        factor: 'Collision Risk',
        status: 'safe',
        details: 'No vessels within dangerous CPA range',
      });
    }

    // 2. Analyze weather impact
    let weatherImpact: WeatherImpact | undefined;
    if (includeWeather) {
      weatherImpact = analyzeWeatherImpactForVessel(vessel.position.latitude, vessel.position.longitude);
      
      // Add weather risk to score
      if (weatherImpact.severity === 'severe') {
        riskScore += 40;
      } else if (weatherImpact.severity === 'high') {
        riskScore += 25;
      } else if (weatherImpact.severity === 'moderate') {
        riskScore += 10;
      }

      // Add weather safety factors
      safetyFactors.push({
        factor: 'Wind Conditions',
        status: weatherImpact.windEffect.beaufort >= 8 ? 'danger' :
                weatherImpact.windEffect.beaufort >= 6 ? 'warning' :
                weatherImpact.windEffect.beaufort >= 4 ? 'caution' : 'safe',
        details: weatherImpact.windEffect.impact,
      });

      safetyFactors.push({
        factor: 'Sea State',
        status: weatherImpact.seaStateEffect.seaState >= 6 ? 'danger' :
                weatherImpact.seaStateEffect.seaState >= 4 ? 'warning' :
                weatherImpact.seaStateEffect.seaState >= 3 ? 'caution' : 'safe',
        details: weatherImpact.seaStateEffect.impact,
      });

      safetyFactors.push({
        factor: 'Visibility',
        status: weatherImpact.visibilityEffect.distance < 1 ? 'danger' :
                weatherImpact.visibilityEffect.distance < 3 ? 'warning' :
                weatherImpact.visibilityEffect.distance < 5 ? 'caution' : 'safe',
        details: weatherImpact.visibilityEffect.impact,
      });

      // Add weather recommendations
      recommendations.push(...weatherImpact.recommendations);

      // Collect weather warnings
      if (weatherImpact.severity === 'severe' || weatherImpact.severity === 'high') {
        weatherImpact.factors.forEach(f => {
          if (!weatherWarnings.includes(f)) weatherWarnings.push(f);
        });
      }
    }

    // 3. Analyze vessel behavior/status
    const navStatus = vessel.position.navigational_status ?? 15;
    const sog = vessel.position.sog ?? 0;
    
    if (navStatus === 2) { // Not Under Command
      safetyFactors.push({
        factor: 'Vessel Status',
        status: 'danger',
        details: 'Vessel is Not Under Command - limited maneuverability',
      });
      riskScore += 20;
      recommendations.push('Vessel has limited maneuverability - other vessels should keep clear');
    } else if (navStatus === 3) { // Restricted Maneuverability
      safetyFactors.push({
        factor: 'Vessel Status',
        status: 'warning',
        details: 'Vessel has Restricted Maneuverability',
      });
      riskScore += 10;
    } else if (navStatus === 6) { // Aground
      safetyFactors.push({
        factor: 'Vessel Status',
        status: 'danger',
        details: 'Vessel is Aground',
      });
      riskScore += 30;
      recommendations.push('Emergency: Vessel is aground - assistance may be required');
    } else {
      safetyFactors.push({
        factor: 'Vessel Status',
        status: 'safe',
        details: `Normal operations (${getNavStatusName(navStatus)})`,
      });
    }

    // 4. Speed analysis in context of conditions
    if (includeWeather && weatherImpact) {
      if (sog > 15 && weatherImpact.severity !== 'low') {
        safetyFactors.push({
          factor: 'Speed for Conditions',
          status: 'warning',
          details: `High speed (${sog} kts) in ${weatherImpact.severity} weather conditions`,
        });
        riskScore += 10;
        recommendations.push('Consider reducing speed given current weather conditions');
      } else if (sog > 20 && weatherImpact.visibilityEffect.distance < 5) {
        safetyFactors.push({
          factor: 'Speed for Visibility',
          status: 'warning',
          details: `High speed (${sog} kts) with reduced visibility (${weatherImpact.visibilityEffect.distance} nm)`,
        });
        riskScore += 15;
        recommendations.push('Reduce speed to safe level for current visibility');
      }
    }

    // Determine overall risk level
    let overallRisk: 'low' | 'moderate' | 'high' | 'critical';
    if (riskScore >= 60) {
      overallRisk = 'critical';
      criticalCount++;
    } else if (riskScore >= 40) {
      overallRisk = 'high';
      highCount++;
    } else if (riskScore >= 20) {
      overallRisk = 'moderate';
      moderateCount++;
    } else {
      overallRisk = 'low';
      lowCount++;
    }

    results.push({
      vessel: {
        mmsi: vessel.mmsi,
        name: vessel.name,
        position: {
          latitude: vessel.position.latitude,
          longitude: vessel.position.longitude,
        },
        speed: sog,
        course: vessel.position.cog,
      },
      overallRisk,
      riskScore: Math.min(100, riskScore),
      collisionRisks,
      weatherImpact,
      safetyFactors,
      recommendations: [...new Set(recommendations)], // Remove duplicates
    });
  }

  // Sort by risk score (highest first)
  results.sort((a, b) => b.riskScore - a.riskScore);

  return {
    success: true,
    results,
    summary: {
      totalAnalyzed: results.length,
      criticalRisk: criticalCount,
      highRisk: highCount,
      moderateRisk: moderateCount,
      lowRisk: lowCount,
      weatherWarnings,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper: Calculate CPA and TCPA for safety analysis
 */
function calculateCPAandTCPAForSafety(
  vessel1: VesselWithPosition,
  vessel2: VesselWithPosition
): { cpaNm: number; tcpaMinutes: number } | null {
  if (!vessel1.position || !vessel2.position) return null;

  const pos1 = vessel1.position;
  const pos2 = vessel2.position;

  const speed1 = pos1.sog / 60;
  const speed2 = pos2.sog / 60;

  if (speed1 === 0 && speed2 === 0) {
    const distance = calculateDistanceNm(
      pos1.latitude, pos1.longitude,
      pos2.latitude, pos2.longitude
    );
    return { cpaNm: distance, tcpaMinutes: 0 };
  }

  const v1x = speed1 * Math.sin(toRadians(pos1.cog));
  const v1y = speed1 * Math.cos(toRadians(pos1.cog));
  const v2x = speed2 * Math.sin(toRadians(pos2.cog));
  const v2y = speed2 * Math.cos(toRadians(pos2.cog));

  const dvx = v1x - v2x;
  const dvy = v1y - v2y;

  const dx = (pos1.longitude - pos2.longitude) * 60 * Math.cos(toRadians(pos1.latitude));
  const dy = (pos1.latitude - pos2.latitude) * 60;

  const dv2 = dvx * dvx + dvy * dvy;
  if (dv2 === 0) {
    const distance = calculateDistanceNm(
      pos1.latitude, pos1.longitude,
      pos2.latitude, pos2.longitude
    );
    return { cpaNm: distance, tcpaMinutes: Infinity };
  }

  const tcpa = -(dx * dvx + dy * dvy) / dv2;
  const cpa1x = dx + dvx * tcpa;
  const cpa1y = dy + dvy * tcpa;
  const cpa = Math.sqrt(cpa1x * cpa1x + cpa1y * cpa1y);

  return { cpaNm: Math.abs(cpa), tcpaMinutes: tcpa };
}

/**
 * Helper: Calculate distance in nautical miles
 */
function calculateDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Helper: Get navigation status name
 */
function getNavStatusName(status: number): string {
  const names: Record<number, string> = {
    0: 'Under Way Using Engine',
    1: 'At Anchor',
    2: 'Not Under Command',
    3: 'Restricted Maneuverability',
    4: 'Constrained by Draught',
    5: 'Moored',
    6: 'Aground',
    7: 'Engaged in Fishing',
    8: 'Under Way Sailing',
    14: 'AIS-SART Active',
    15: 'Not Defined',
  };
  return names[status] || 'Unknown';
}

/**
 * Helper: Analyze weather impact for a vessel position
 */
function analyzeWeatherImpactForVessel(lat: number, lon: number): WeatherImpact {
  // Generate consistent weather data for the location
  const seed = Math.abs(lat * 1000 + lon * 100 + new Date().getHours());
  const random = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  const baseWindSpeed = 5 + Math.abs(lat) / 10;
  const windSpeed = Math.round((baseWindSpeed + random(1) * 15) * 10) / 10;
  const beaufort = windSpeedToBeaufortScale(windSpeed);
  
  const waveHeight = Math.round((windSpeed / 10 + random(4) * 1.5) * 10) / 10;
  const seaState = waveHeightToSeaStateCode(waveHeight);
  
  const visibility = Math.round((10 + random(11) * 15) * 10) / 10;

  const factors: string[] = [];
  const recommendations: string[] = [];

  // Analyze wind impact
  let windImpact = '';
  if (beaufort >= 10) {
    windImpact = `Storm force winds (${windSpeed} kts, Beaufort ${beaufort}) - Extremely dangerous`;
    factors.push('Storm force winds');
    recommendations.push('Seek shelter immediately if possible');
  } else if (beaufort >= 8) {
    windImpact = `Gale force winds (${windSpeed} kts, Beaufort ${beaufort}) - Dangerous conditions`;
    factors.push('Gale force winds');
    recommendations.push('Reduce speed and secure all loose equipment');
  } else if (beaufort >= 6) {
    windImpact = `Strong winds (${windSpeed} kts, Beaufort ${beaufort}) - Challenging conditions`;
    factors.push('Strong winds');
    recommendations.push('Exercise caution, monitor conditions');
  } else if (beaufort >= 4) {
    windImpact = `Moderate winds (${windSpeed} kts, Beaufort ${beaufort}) - Normal operations`;
  } else {
    windImpact = `Light winds (${windSpeed} kts, Beaufort ${beaufort}) - Favorable conditions`;
  }

  // Analyze sea state impact
  let seaImpact = '';
  if (seaState >= 7) {
    seaImpact = `Very high seas (${waveHeight}m waves) - Extremely hazardous`;
    factors.push('Very high seas');
    recommendations.push('Alter course to minimize beam seas if possible');
  } else if (seaState >= 5) {
    seaImpact = `Rough seas (${waveHeight}m waves) - Difficult conditions`;
    factors.push('Rough seas');
    recommendations.push('Reduce speed to prevent structural stress');
  } else if (seaState >= 4) {
    seaImpact = `Moderate seas (${waveHeight}m waves) - Some discomfort`;
  } else {
    seaImpact = `Calm to slight seas (${waveHeight}m waves) - Good conditions`;
  }

  // Analyze visibility impact
  let visImpact = '';
  if (visibility < 0.5) {
    visImpact = `Dense fog (${visibility} nm visibility) - Navigation extremely hazardous`;
    factors.push('Dense fog');
    recommendations.push('Sound fog signals, post extra lookouts, reduce to safe speed');
  } else if (visibility < 2) {
    visImpact = `Poor visibility (${visibility} nm) - Restricted visibility rules apply`;
    factors.push('Restricted visibility');
    recommendations.push('Apply COLREGS Rule 19, use radar, reduce speed');
  } else if (visibility < 5) {
    visImpact = `Moderate visibility (${visibility} nm) - Exercise caution`;
  } else {
    visImpact = `Good visibility (${visibility} nm) - Clear conditions`;
  }

  // Determine overall severity
  let severity: 'low' | 'moderate' | 'high' | 'severe';
  if (beaufort >= 10 || seaState >= 7 || visibility < 0.5) {
    severity = 'severe';
  } else if (beaufort >= 8 || seaState >= 5 || visibility < 2) {
    severity = 'high';
  } else if (beaufort >= 6 || seaState >= 4 || visibility < 5) {
    severity = 'moderate';
  } else {
    severity = 'low';
  }

  return {
    severity,
    factors,
    recommendations,
    windEffect: {
      speed: windSpeed,
      beaufort,
      impact: windImpact,
    },
    seaStateEffect: {
      waveHeight,
      seaState,
      impact: seaImpact,
    },
    visibilityEffect: {
      distance: visibility,
      impact: visImpact,
    },
  };
}

/**
 * Helper: Convert wind speed to Beaufort scale
 */
function windSpeedToBeaufortScale(knots: number): number {
  if (knots < 1) return 0;
  if (knots < 4) return 1;
  if (knots < 7) return 2;
  if (knots < 11) return 3;
  if (knots < 17) return 4;
  if (knots < 22) return 5;
  if (knots < 28) return 6;
  if (knots < 34) return 7;
  if (knots < 41) return 8;
  if (knots < 48) return 9;
  if (knots < 56) return 10;
  if (knots < 64) return 11;
  return 12;
}

/**
 * Helper: Convert wave height to sea state code
 */
function waveHeightToSeaStateCode(meters: number): number {
  if (meters < 0.1) return 0;
  if (meters < 0.5) return 2;
  if (meters < 1.25) return 3;
  if (meters < 2.5) return 4;
  if (meters < 4) return 5;
  if (meters < 6) return 6;
  if (meters < 9) return 7;
  if (meters < 14) return 8;
  return 9;
}


/**
 * Weather/Sea Conditions Tools
 * 
 * These tools provide simulated sea conditions data for maritime operations.
 * In production, these would integrate with real weather APIs like:
 * - NOAA Marine Weather
 * - Open-Meteo Marine API
 * - Copernicus Marine Service
 */

import type {
  GetSeaConditionsInput,
  GetSeaConditionsOutput,
  SeaConditions,
  GetWeatherForecastInput,
  GetWeatherForecastOutput,
  WeatherForecastPeriod,
} from '../types';

/**
 * Beaufort scale descriptions
 */
const BEAUFORT_DESCRIPTIONS: Record<number, string> = {
  0: 'Calm',
  1: 'Light air',
  2: 'Light breeze',
  3: 'Gentle breeze',
  4: 'Moderate breeze',
  5: 'Fresh breeze',
  6: 'Strong breeze',
  7: 'Near gale',
  8: 'Gale',
  9: 'Strong gale',
  10: 'Storm',
  11: 'Violent storm',
  12: 'Hurricane force',
};

/**
 * Douglas sea scale descriptions
 */
const SEA_STATE_DESCRIPTIONS: Record<number, string> = {
  0: 'Calm (glassy)',
  1: 'Calm (rippled)',
  2: 'Smooth',
  3: 'Slight',
  4: 'Moderate',
  5: 'Rough',
  6: 'Very rough',
  7: 'High',
  8: 'Very high',
  9: 'Phenomenal',
};

/**
 * Convert wind speed to Beaufort scale
 */
function windSpeedToBeaufort(knots: number): number {
  if (knots < 1) return 0;
  if (knots < 4) return 1;
  if (knots < 7) return 2;
  if (knots < 11) return 3;
  if (knots < 17) return 4;
  if (knots < 22) return 5;
  if (knots < 28) return 6;
  if (knots < 34) return 7;
  if (knots < 41) return 8;
  if (knots < 48) return 9;
  if (knots < 56) return 10;
  if (knots < 64) return 11;
  return 12;
}

/**
 * Convert wave height to Douglas sea scale
 */
function waveHeightToSeaState(meters: number): number {
  if (meters < 0.1) return 0;
  if (meters < 0.1) return 1;
  if (meters < 0.5) return 2;
  if (meters < 1.25) return 3;
  if (meters < 2.5) return 4;
  if (meters < 4) return 5;
  if (meters < 6) return 6;
  if (meters < 9) return 7;
  if (meters < 14) return 8;
  return 9;
}

/**
 * Get visibility description
 */
function getVisibilityDescription(nm: number): string {
  if (nm < 0.5) return 'Dense fog';
  if (nm < 1) return 'Thick fog';
  if (nm < 2) return 'Fog';
  if (nm < 5) return 'Mist/Haze';
  if (nm < 10) return 'Moderate';
  return 'Good';
}

/**
 * Generate realistic sea conditions based on location and time
 * Uses deterministic pseudo-random generation based on coordinates
 */
function generateSeaConditions(lat: number, lon: number): SeaConditions {
  // Use coordinates to seed pseudo-random values for consistency
  const seed = Math.abs(lat * 1000 + lon * 100 + new Date().getHours());
  const random = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  // Generate wind conditions (varies by latitude - stronger at higher latitudes)
  const baseWindSpeed = 5 + Math.abs(lat) / 10;
  const windSpeed = Math.round((baseWindSpeed + random(1) * 15) * 10) / 10;
  const windDirection = Math.round(random(2) * 360);
  const gustSpeed = windSpeed > 15 ? Math.round((windSpeed + random(3) * 10) * 10) / 10 : undefined;
  const beaufortScale = windSpeedToBeaufort(windSpeed);

  // Generate wave conditions (correlated with wind)
  const waveHeight = Math.round((windSpeed / 10 + random(4) * 1.5) * 10) / 10;
  const wavePeriod = Math.round((5 + random(5) * 8) * 10) / 10;
  const waveDirection = (windDirection + Math.round(random(6) * 30 - 15) + 360) % 360;
  const seaStateCode = waveHeightToSeaState(waveHeight);

  // Generate swell (if significant)
  const hasSwell = random(7) > 0.4;
  const swell = hasSwell ? {
    height: Math.round((0.5 + random(8) * 2) * 10) / 10,
    period: Math.round((8 + random(9) * 6) * 10) / 10,
    direction: Math.round(random(10) * 360),
  } : undefined;

  // Generate visibility
  const visibilityBase = 10 + random(11) * 15;
  const visibility = Math.round(visibilityBase * 10) / 10;

  // Generate temperatures (varies by latitude)
  const airTemp = Math.round((25 - Math.abs(lat) / 3 + random(12) * 10 - 5) * 10) / 10;
  const seaTemp = Math.round((airTemp - 2 + random(13) * 4) * 10) / 10;

  // Generate pressure
  const pressure = Math.round((1013 + random(14) * 30 - 15) * 10) / 10;
  const pressureTrend = random(15) < 0.33 ? 'falling' : random(15) < 0.66 ? 'steady' : 'rising';

  // Generate warnings if conditions are severe
  const warnings: string[] = [];
  if (beaufortScale >= 7) warnings.push(`Gale warning: Wind force ${beaufortScale}`);
  if (waveHeight >= 4) warnings.push(`Heavy seas warning: Wave height ${waveHeight}m`);
  if (visibility < 2) warnings.push(`Restricted visibility: ${visibility} nm`);

  // Overall conditions summary
  let conditions = `${BEAUFORT_DESCRIPTIONS[beaufortScale]} winds`;
  if (seaStateCode >= 4) conditions += `, ${SEA_STATE_DESCRIPTIONS[seaStateCode].toLowerCase()} seas`;
  if (visibility < 5) conditions += `, ${getVisibilityDescription(visibility).toLowerCase()} visibility`;

  return {
    location: { latitude: lat, longitude: lon },
    timestamp: new Date().toISOString(),
    wind: {
      speed: windSpeed,
      direction: windDirection,
      gustSpeed,
      beaufortScale,
      description: BEAUFORT_DESCRIPTIONS[beaufortScale],
    },
    waves: {
      height: waveHeight,
      period: wavePeriod,
      direction: waveDirection,
      description: SEA_STATE_DESCRIPTIONS[seaStateCode],
    },
    swell,
    seaState: {
      code: seaStateCode,
      description: SEA_STATE_DESCRIPTIONS[seaStateCode],
    },
    visibility: {
      distance: visibility,
      description: getVisibilityDescription(visibility),
    },
    temperature: {
      air: airTemp,
      seaSurface: seaTemp,
    },
    pressure: {
      value: pressure,
      trend: pressureTrend as 'rising' | 'falling' | 'steady',
    },
    conditions,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Tool: getSeaConditions
 *
 * Get current sea and weather conditions at a location
 * Can optionally use a vessel's MMSI to get conditions at that vessel's position
 */
export function getSeaConditions(
  input: GetSeaConditionsInput,
  vessels: Map<string, VesselWithPosition>
): GetSeaConditionsOutput {
  let lat = input.latitude;
  let lon = input.longitude;

  // If MMSI provided, get vessel's position
  if (input.mmsi) {
    const vessel = vessels.get(input.mmsi);
    if (!vessel) {
      return {
        success: false,
        error: `Vessel with MMSI ${input.mmsi} not found`,
      };
    }
    if (!vessel.position) {
      return {
        success: false,
        error: `Vessel ${vessel.name || input.mmsi} has no position data`,
      };
    }
    lat = vessel.position.latitude;
    lon = vessel.position.longitude;
  }

  // Validate coordinates
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return {
      success: false,
      error: 'Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180.',
    };
  }

  const conditions = generateSeaConditions(lat, lon);

  return {
    success: true,
    conditions,
  };
}

/**
 * Tool: getWeatherForecast
 *
 * Get weather forecast for a maritime location
 */
export function getWeatherForecast(
  input: GetWeatherForecastInput
): GetWeatherForecastOutput {
  const { latitude, longitude, hours = 24 } = input;

  // Validate coordinates
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return {
      success: false,
      location: { latitude, longitude },
      error: 'Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180.',
    };
  }

  // Generate forecast periods (every 3 hours)
  const forecast: WeatherForecastPeriod[] = [];
  const now = new Date();
  const periodsCount = Math.min(Math.ceil(hours / 3), 48); // Max 6 days

  for (let i = 0; i < periodsCount; i++) {
    const forecastTime = new Date(now.getTime() + i * 3 * 60 * 60 * 1000);
    
    // Use time offset to vary conditions
    const seed = Math.abs(latitude * 1000 + longitude * 100 + forecastTime.getHours() + i * 7);
    const random = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    const windSpeed = Math.round((5 + Math.abs(latitude) / 10 + random(1) * 15) * 10) / 10;
    const windDirection = Math.round(random(2) * 360);
    const waveHeight = Math.round((windSpeed / 10 + random(4) * 1.5) * 10) / 10;

    forecast.push({
      time: forecastTime.toISOString(),
      wind: {
        speed: windSpeed,
        direction: windDirection,
        gustSpeed: windSpeed > 15 ? Math.round((windSpeed + random(3) * 10) * 10) / 10 : undefined,
      },
      waves: {
        height: waveHeight,
        period: Math.round((5 + random(5) * 8) * 10) / 10,
        direction: (windDirection + Math.round(random(6) * 30 - 15) + 360) % 360,
      },
      visibility: Math.round((10 + random(7) * 15) * 10) / 10,
      precipitation: random(8) > 0.7 ? Math.round(random(9) * 10 * 10) / 10 : 0,
      conditions: BEAUFORT_DESCRIPTIONS[windSpeedToBeaufort(windSpeed)],
    });
  }

  return {
    success: true,
    location: { latitude, longitude },
    forecast,
  };
}
