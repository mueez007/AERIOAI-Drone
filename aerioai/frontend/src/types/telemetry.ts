export interface TelemetrySnapshot {
  timestamp: string;
  gps: {
    lat: number;
    lon: number;
    altitude: number;
    speed: number;
    heading: number;
    satellites: number;
    fixType: string;
  };
  attitude: {
    roll: number;
    pitch: number;
    yaw: number;
  };
  battery: {
    voltage: number;
    percent: number;
    current: number;
    mahUsed: number;
    cells: number;
  };
  status: {
    flightMode: string;
    armed: boolean;
    rthActive: boolean;
    failsafe: boolean;
    distanceToHome: number;
  };
}

export interface TelemetryHistoryPoint {
  time: string;
  altitude: number;
  speed: number;
  batteryPercent: number;
}

export interface GPSWaypoint {
  lat: number;
  lon: number;
  alt?: number;
  label?: string;
}
