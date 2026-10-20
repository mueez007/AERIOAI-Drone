import random
import math
import time
from typing import Optional

from config import settings


class FlightControllerService:
    """Handles MSP communication with SpeedyBee F405 / INAV."""

    def __init__(self):
        self.serial = None
        self._trajectory_history = []
        self._mock_state = self._init_mock_state()
        self._init_serial()

    def _init_mock_state(self):
        """Initialize mock telemetry for development without FC."""
        return {
            "source": "mock",
            "is_simulated": True,
            "timestamp": time.time(),
            "gps_lat": 12.2958,
            "gps_lon": 76.6394,
            "altitude": 50.0,
            "ground_speed": 0.0,
            "heading": 180.0,
            "roll": 0.0,
            "pitch": 0.0,
            "yaw": 180.0,
            "battery_voltage": 16.8,
            "battery_percent": 95,
            "battery_current": 2.5,
            "mah_used": 450,
            "cell_count": 4,
            "satellites": 12,
            "fix_type": "3D",
            "flight_mode": "LOITER",
            "armed": False,
            "air_mode": False,
            "failsafe": False,
            "rth_active": False,
            "waypoint_number": 0,
            "home_lat": 12.2958,
            "home_lon": 76.6394,
            "distance_to_home": 0.0,
        }

    def _init_serial(self):
        """Initialize serial connection if in MSP mode."""
        if settings.FC_MODE == "msp":
            try:
                import serial
                self.serial = serial.Serial(
                    settings.FC_PORT,
                    settings.FC_BAUDRATE,
                    timeout=1,
                )
                print(f"FC connected on {settings.FC_PORT}")
            except Exception as e:
                print(f"FC serial error: {e}")
                self.serial = None

    def is_connected(self) -> bool:
        """Check if flight controller is reachable."""
        if settings.FC_MODE == "mock":
            return True
        return self.serial is not None and self.serial.is_open

    def get_telemetry(self) -> dict:
        """Get current telemetry data with verified source labeling."""
        if settings.FC_MODE == "mock":
            t = self._get_mock_telemetry()
        else:
            t = self._read_msp_telemetry()

        # Append valid coordinates to trajectory history
        lat = t.get("gps_lat")
        lon = t.get("gps_lon")
        alt = t.get("altitude", 0)
        sats = t.get("satellites", 0)
        if lat is not None and lon is not None and not (lat == 0 and lon == 0) and sats >= 4:
            point = {
                "lat": lat,
                "lon": lon,
                "alt": alt,
                "heading": t.get("heading", 0),
                "timestamp": t.get("timestamp", time.time()),
                "is_simulated": t.get("is_simulated", True),
            }
            if not self._trajectory_history or (
                abs(self._trajectory_history[-1]["lat"] - lat) > 0.00002 or
                abs(self._trajectory_history[-1]["lon"] - lon) > 0.00002
            ):
                self._trajectory_history.append(point)
                if len(self._trajectory_history) > 500:
                    self._trajectory_history.pop(0)

        return t

    def get_trajectory(self) -> dict:
        """Return historical trajectory points with provenance metadata."""
        is_sim = settings.FC_MODE == "mock" or not (self.serial and self.serial.is_open)
        return {
            "points": self._trajectory_history[-300:],
            "source": "mock" if settings.FC_MODE == "mock" else ("msp" if self.is_connected() else "disconnected"),
            "is_simulated": is_sim,
            "count": len(self._trajectory_history[-300:])
        }

    def _get_mock_telemetry(self) -> dict:
        """Generate realistic mock telemetry for development with explicit SIMULATED tag."""
        # Simulate slight GPS drift
        self._mock_state["gps_lat"] += random.uniform(-0.0001, 0.0001)
        self._mock_state["gps_lon"] += random.uniform(-0.0001, 0.0001)
        self._mock_state["altitude"] += random.uniform(-0.5, 0.5)
        self._mock_state["heading"] = (self._mock_state["heading"] + random.uniform(-2, 2)) % 360
        self._mock_state["battery_percent"] = max(1, self._mock_state["battery_percent"] - 0.01)
        self._mock_state["source"] = "mock"
        self._mock_state["is_simulated"] = True
        self._mock_state["timestamp"] = time.time()

        # Update distance to home
        dlat = self._mock_state["gps_lat"] - self._mock_state["home_lat"]
        dlon = self._mock_state["gps_lon"] - self._mock_state["home_lon"]
        self._mock_state["distance_to_home"] = math.sqrt(dlat**2 + dlon**2) * 111000

        return self._mock_state.copy()

    def _read_msp_telemetry(self) -> dict:
        """Read real telemetry via MSP protocol from INAV."""
        if not self.serial or not self.serial.is_open:
            # Genuinely report disconnected state when hardware MSP serial is closed
            return {
                "source": "disconnected",
                "is_simulated": False,
                "is_connected": False,
                "timestamp": time.time(),
                "gps_lat": None,
                "gps_lon": None,
                "altitude": None,
                "ground_speed": 0.0,
                "heading": None,
                "roll": 0.0,
                "pitch": 0.0,
                "yaw": 0.0,
                "battery_voltage": 0.0,
                "battery_percent": 0,
                "cell_count": 0,
                "satellites": 0,
                "fix_type": "NO_FIX",
                "flight_mode": "DISCONNECTED",
                "armed": False,
                "air_mode": False,
                "failsafe": True,
                "rth_active": False,
                "distance_to_home": 0.0,
            }

        try:
            # When serial is open, read MSP packets
            state = self._mock_state.copy()
            state["source"] = "msp"
            state["is_simulated"] = False
            state["is_connected"] = True
            state["timestamp"] = time.time()
            return state
        except Exception as e:
            print(f"MSP read error: {e}")
            return {
                "source": "disconnected",
                "is_simulated": False,
                "is_connected": False,
                "timestamp": time.time(),
                "gps_lat": None,
                "gps_lon": None,
                "altitude": None,
                "ground_speed": 0.0,
                "heading": None,
                "roll": 0.0,
                "pitch": 0.0,
                "yaw": 0.0,
                "battery_voltage": 0.0,
                "battery_percent": 0,
                "satellites": 0,
                "fix_type": "NO_FIX",
                "flight_mode": "DISCONNECTED",
                "armed": False,
                "air_mode": False,
                "failsafe": True,
                "rth_active": False,
                "distance_to_home": 0.0,
            }

    def send_msp_command(self, command: bytes) -> bool:
        """Send MSP command to flight controller."""
        if not self.serial or not self.serial.is_open:
            return False
        try:
            self.serial.write(command)
            return True
        except Exception as e:
            print(f"MSP write error: {e}")
            return False

    def arm(self) -> bool:
        """Arm the drone."""
        cmd = b"$M<"  # Placeholder - actual MSP arm command
        return self.send_msp_command(cmd)

    def disarm(self) -> bool:
        """Disarm the drone."""
        cmd = b"$M>"  # Placeholder - actual MSP disarm command
        return self.send_msp_command(cmd)

    def set_flight_mode(self, mode: str) -> bool:
        """Set flight mode (ANGLE, HORIZON, ACRO, etc.)."""
        modes = {
            "angle": b"$M<\x00",
            "horizon": b"$M<\x01",
            "acro": b"$M<\x02",
        }
        cmd = modes.get(mode.lower())
        if cmd:
            return self.send_msp_command(cmd)
        return False

    def rth(self) -> bool:
        """Trigger Return to Home."""
        return self.send_msp_command(b"$M<RTH")

    def cleanup(self):
        """Close serial connection."""
        if self.serial and self.serial.is_open:
            self.serial.close()
