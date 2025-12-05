/**
 * Navigation Status Utility Functions
 *
 * Utilities for handling AIS navigational status codes,
 * rate of turn calculations, and vessel behavior classification.
 */

/**
 * AIS Navigational Status codes (0-15)
 * Based on ITU-R M.1371-5 standard
 */
export enum NavigationalStatus {
  UNDER_WAY_ENGINE = 0,
  AT_ANCHOR = 1,
  NOT_UNDER_COMMAND = 2,
  RESTRICTED_MANEUVERABILITY = 3,
  CONSTRAINED_BY_DRAUGHT = 4,
  MOORED = 5,
  AGROUND = 6,
  ENGAGED_IN_FISHING = 7,
  UNDER_WAY_SAILING = 8,
  RESERVED_HSC = 9,
  RESERVED_WIG = 10,
  RESERVED_11 = 11,
  RESERVED_12 = 12,
  RESERVED_13 = 13,
  AIS_SART = 14,
  NOT_DEFINED = 15,
}

/**
 * Navigational status display information
 */
export interface NavStatusInfo {
  code: number;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  priority: 'critical' | 'warning' | 'info' | 'normal';
}

/**
 * Get navigational status information
 */
export function getNavStatusInfo(status: number | undefined | null): NavStatusInfo {
  const statusMap: Record<number, NavStatusInfo> = {
    [NavigationalStatus.UNDER_WAY_ENGINE]: {
      code: 0,
      name: 'Under Way Using Engine',
      shortName: 'Underway',
      icon: '>',
      color: '#10B981',
      bgColor: 'bg-emerald-500/10',
      description: 'Vessel is moving under engine power',
      priority: 'normal',
    },
    [NavigationalStatus.AT_ANCHOR]: {
      code: 1,
      name: 'At Anchor',
      shortName: 'Anchored',
      icon: 'A',
      color: '#3B82F6',
      bgColor: 'bg-blue-500/10',
      description: 'Vessel is anchored',
      priority: 'info',
    },
    [NavigationalStatus.NOT_UNDER_COMMAND]: {
      code: 2,
      name: 'Not Under Command',
      shortName: 'NUC',
      icon: '!',
      color: '#EF4444',
      bgColor: 'bg-red-500/10',
      description: 'Vessel unable to maneuver as required',
      priority: 'critical',
    },
    [NavigationalStatus.RESTRICTED_MANEUVERABILITY]: {
      code: 3,
      name: 'Restricted Maneuverability',
      shortName: 'Restricted',
      icon: 'R',
      color: '#F59E0B',
      bgColor: 'bg-amber-500/10',
      description: 'Vessel restricted in ability to maneuver',
      priority: 'warning',
    },
    [NavigationalStatus.CONSTRAINED_BY_DRAUGHT]: {
      code: 4,
      name: 'Constrained by Draught',
      shortName: 'Constrained',
      icon: 'D',
      color: '#F59E0B',
      bgColor: 'bg-amber-500/10',
      description: 'Vessel constrained by her draught',
      priority: 'warning',
    },
    [NavigationalStatus.MOORED]: {
      code: 5,
      name: 'Moored',
      shortName: 'Moored',
      icon: 'M',
      color: '#6B7280',
      bgColor: 'bg-gray-500/10',
      description: 'Vessel is moored',
      priority: 'info',
    },
    [NavigationalStatus.AGROUND]: {
      code: 6,
      name: 'Aground',
      shortName: 'Aground',
      icon: 'X',
      color: '#DC2626',
      bgColor: 'bg-red-600/10',
      description: 'Vessel is aground',
      priority: 'critical',
    },
    [NavigationalStatus.ENGAGED_IN_FISHING]: {
      code: 7,
      name: 'Engaged in Fishing',
      shortName: 'Fishing',
      icon: 'F',
      color: '#10B981',
      bgColor: 'bg-emerald-500/10',
      description: 'Vessel engaged in fishing operations',
      priority: 'info',
    },
    [NavigationalStatus.UNDER_WAY_SAILING]: {
      code: 8,
      name: 'Under Way Sailing',
      shortName: 'Sailing',
      icon: 'S',
      color: '#06B6D4',
      bgColor: 'bg-cyan-500/10',
      description: 'Vessel under sail',
      priority: 'normal',
    },
    [NavigationalStatus.RESERVED_HSC]: {
      code: 9,
      name: 'High Speed Craft',
      shortName: 'HSC',
      icon: 'H',
      color: '#F97316',
      bgColor: 'bg-orange-500/10',
      description: 'Reserved for high-speed craft',
      priority: 'warning',
    },
    [NavigationalStatus.RESERVED_WIG]: {
      code: 10,
      name: 'Wing in Ground',
      shortName: 'WIG',
      icon: 'W',
      color: '#8B5CF6',
      bgColor: 'bg-purple-500/10',
      description: 'Reserved for wing-in-ground craft',
      priority: 'info',
    },
    [NavigationalStatus.AIS_SART]: {
      code: 14,
      name: 'AIS-SART Active',
      shortName: 'SART',
      icon: '!',
      color: '#DC2626',
      bgColor: 'bg-red-600/10',
      description: 'AIS Search and Rescue Transmitter active',
      priority: 'critical',
    },
    [NavigationalStatus.NOT_DEFINED]: {
      code: 15,
      name: 'Not Defined',
      shortName: 'Unknown',
      icon: '?',
      color: '#6B7280',
      bgColor: 'bg-gray-500/10',
      description: 'Default status, not defined',
      priority: 'normal',
    },
  };

  // Handle reserved codes (11-13)
  if (status !== undefined && status !== null && status >= 11 && status <= 13) {
    return {
      code: status,
      name: 'Reserved',
      shortName: 'Reserved',
      icon: '-',
      color: '#6B7280',
      bgColor: 'bg-gray-500/10',
      description: 'Reserved for future use',
      priority: 'normal',
    };
  }

  return statusMap[status ?? 15] || statusMap[NavigationalStatus.NOT_DEFINED];
}

/**
 * Rate of Turn interpretation
 * ROT is encoded as degrees per minute * 4.733
 * Values: -128 to +127, where:
 * - 0 = not turning
 * - +127 = turning right at 720°/min or more
 * - -127 = turning left at 720°/min or more
 * - -128 = no turn information available
 */
export interface RateOfTurnInfo {
  raw: number;
  degreesPerMinute: number | null;
  direction: 'left' | 'right' | 'straight' | 'unknown';
  intensity: 'none' | 'slight' | 'moderate' | 'sharp' | 'unknown';
  description: string;
}

/**
 * Decode Rate of Turn value
 */
export function decodeRateOfTurn(rot: number | undefined | null): RateOfTurnInfo {
  if (rot === undefined || rot === null || rot === -128) {
    return {
      raw: rot ?? -128,
      degreesPerMinute: null,
      direction: 'unknown',
      intensity: 'unknown',
      description: 'No turn data available',
    };
  }

  // ROT = 4.733 * sqrt(ROTais) where ROTais is degrees/min
  // So ROTais = (ROT / 4.733)^2
  const sign = rot >= 0 ? 1 : -1;
  const absRot = Math.abs(rot);
  
  // Special case: 127 or -127 means turning at 720°/min or more
  if (absRot >= 127) {
    return {
      raw: rot,
      degreesPerMinute: sign * 720,
      direction: sign > 0 ? 'right' : 'left',
      intensity: 'sharp',
      description: `Turning ${sign > 0 ? 'right' : 'left'} at 720°/min or more`,
    };
  }

  // Calculate actual degrees per minute
  const degreesPerMinute = sign * Math.pow(absRot / 4.733, 2);
  const absDegreesPerMin = Math.abs(degreesPerMinute);

  let direction: RateOfTurnInfo['direction'] = 'straight';
  let intensity: RateOfTurnInfo['intensity'] = 'none';

  if (absDegreesPerMin < 0.5) {
    direction = 'straight';
    intensity = 'none';
  } else if (absDegreesPerMin < 5) {
    direction = degreesPerMinute > 0 ? 'right' : 'left';
    intensity = 'slight';
  } else if (absDegreesPerMin < 20) {
    direction = degreesPerMinute > 0 ? 'right' : 'left';
    intensity = 'moderate';
  } else {
    direction = degreesPerMinute > 0 ? 'right' : 'left';
    intensity = 'sharp';
  }

  const description =
    intensity === 'none'
      ? 'Not turning'
      : `Turning ${direction} at ${absDegreesPerMin.toFixed(1)}°/min`;

  return {
    raw: rot,
    degreesPerMinute,
    direction,
    intensity,
    description,
  };
}

/**
 * Get ROT indicator arrow
 */
export function getRotIndicator(rot: number | undefined | null): {
  symbol: string;
  color: string;
  rotation: number;
} {
  const info = decodeRateOfTurn(rot);

  if (info.direction === 'unknown' || info.intensity === 'none') {
    return { symbol: '→', color: '#6B7280', rotation: 0 };
  }

  const baseRotation = info.direction === 'right' ? 45 : -45;
  const intensityMultiplier =
    info.intensity === 'slight' ? 0.5 : info.intensity === 'moderate' ? 1 : 1.5;

  return {
    symbol: info.direction === 'right' ? '↱' : '↰',
    color:
      info.intensity === 'sharp'
        ? '#EF4444'
        : info.intensity === 'moderate'
          ? '#F59E0B'
          : '#10B981',
    rotation: baseRotation * intensityMultiplier,
  };
}

/**
 * Vessel behavior classification based on multiple factors
 */
export type VesselBehavior =
  | 'transiting'
  | 'anchored'
  | 'moored'
  | 'fishing'
  | 'maneuvering'
  | 'drifting'
  | 'stationary'
  | 'unknown';

export interface VesselBehaviorInfo {
  behavior: VesselBehavior;
  confidence: 'high' | 'medium' | 'low';
  description: string;
  icon: string;
}

/**
 * Classify vessel behavior based on available data
 */
export function classifyVesselBehavior(
  navStatus: number | undefined | null,
  sog: number | undefined | null,
  rot: number | undefined | null
): VesselBehaviorInfo {
  const rotInfo = decodeRateOfTurn(rot);
  const speed = sog ?? 0;

  // Check navigational status first
  if (navStatus === NavigationalStatus.AT_ANCHOR) {
    return {
      behavior: 'anchored',
      confidence: 'high',
      description: 'Vessel is at anchor',
      icon: 'A',
    };
  }

  if (navStatus === NavigationalStatus.MOORED) {
    return {
      behavior: 'moored',
      confidence: 'high',
      description: 'Vessel is moored',
      icon: 'M',
    };
  }

  if (navStatus === NavigationalStatus.ENGAGED_IN_FISHING) {
    return {
      behavior: 'fishing',
      confidence: 'high',
      description: 'Vessel engaged in fishing',
      icon: 'F',
    };
  }

  // Speed-based classification
  if (speed < 0.5) {
    if (rotInfo.intensity !== 'none' && rotInfo.intensity !== 'unknown') {
      return {
        behavior: 'maneuvering',
        confidence: 'medium',
        description: 'Vessel maneuvering at low speed',
        icon: '*',
      };
    }
    return {
      behavior: 'stationary',
      confidence: 'medium',
      description: 'Vessel stationary or drifting',
      icon: '.',
    };
  }

  if (speed < 2 && rotInfo.intensity === 'none') {
    return {
      behavior: 'drifting',
      confidence: 'low',
      description: 'Vessel possibly drifting',
      icon: '~',
    };
  }

  // Active maneuvering
  if (rotInfo.intensity === 'sharp' || rotInfo.intensity === 'moderate') {
    return {
      behavior: 'maneuvering',
      confidence: 'high',
      description: `Vessel actively maneuvering (${rotInfo.description})`,
      icon: '*',
    };
  }

  // Default: transiting
  return {
    behavior: 'transiting',
    confidence: speed > 5 ? 'high' : 'medium',
    description: `Vessel transiting at ${speed.toFixed(1)} knots`,
    icon: '>',
  };
}

/**
 * Get fleet status summary
 */
export interface FleetStatusSummary {
  total: number;
  underway: number;
  anchored: number;
  moored: number;
  fishing: number;
  notUnderCommand: number;
  restricted: number;
  aground: number;
  other: number;
}

export function getFleetStatusSummary(
  vessels: Array<{ position?: { navigational_status?: number } }>
): FleetStatusSummary {
  const summary: FleetStatusSummary = {
    total: vessels.length,
    underway: 0,
    anchored: 0,
    moored: 0,
    fishing: 0,
    notUnderCommand: 0,
    restricted: 0,
    aground: 0,
    other: 0,
  };

  for (const vessel of vessels) {
    const status = vessel.position?.navigational_status;

    switch (status) {
      case NavigationalStatus.UNDER_WAY_ENGINE:
      case NavigationalStatus.UNDER_WAY_SAILING:
        summary.underway++;
        break;
      case NavigationalStatus.AT_ANCHOR:
        summary.anchored++;
        break;
      case NavigationalStatus.MOORED:
        summary.moored++;
        break;
      case NavigationalStatus.ENGAGED_IN_FISHING:
        summary.fishing++;
        break;
      case NavigationalStatus.NOT_UNDER_COMMAND:
        summary.notUnderCommand++;
        break;
      case NavigationalStatus.RESTRICTED_MANEUVERABILITY:
      case NavigationalStatus.CONSTRAINED_BY_DRAUGHT:
        summary.restricted++;
        break;
      case NavigationalStatus.AGROUND:
        summary.aground++;
        break;
      default:
        summary.other++;
    }
  }

  return summary;
}
