import math
import re
import json
import xml.etree.ElementTree as ET
from typing import List, Dict, Tuple, Optional, Any

from shapely.geometry import Polygon, LineString, MultiLineString
from shapely import affinity
import shapely

from schemas.sar import (
    PolygonCoordinate,
    KMLValidationResponse,
    CoverageRouteResponse,
    RouteWaypoint,
)


class KMLCoverageService:
    """Service for parsing KML/GeoJSON polygons and generating lawnmower coverage routes."""

    @classmethod
    def parse_kml_or_geojson(cls, content: str) -> Tuple[List[PolygonCoordinate], List[str]]:
        """Parse coordinate list from raw KML XML or GeoJSON string.
        
        Returns:
            Tuple of (coordinates_list, warnings_list)
        """
        content_stripped = content.strip()
        warnings = []

        # Try GeoJSON first if it looks like JSON
        if content_stripped.startswith("{") and ("coordinates" in content_stripped or "Feature" in content_stripped):
            try:
                data = json.loads(content_stripped)
                coords = cls._extract_geojson_polygon(data)
                if coords:
                    return coords, warnings
            except json.JSONDecodeError:
                pass

        # Try XML / KML parsing
        try:
            # Handle possible xmlns namespaces by stripping or ignoring
            root = ET.fromstring(content_stripped)
            # Find all <coordinates> elements
            coord_elems = []
            for elem in root.iter():
                if elem.tag.endswith("coordinates"):
                    coord_elems.append(elem.text)

            if not coord_elems:
                raise ValueError("No <coordinates> tag found in KML file.")

            # Look for polygon coordinates (outerBoundaryIs preferred)
            raw_coord_text = coord_elems[0]
            if not raw_coord_text or not raw_coord_text.strip():
                raise ValueError("<coordinates> block is empty.")

            coords = cls._parse_coordinate_string(raw_coord_text.strip())
            if len(coord_elems) > 1:
                warnings.append(f"Multiple coordinate blocks found ({len(coord_elems)}). Using the primary perimeter.")

            return coords, warnings

        except ET.ParseError as e:
            # Fallback regex search for coordinates if XML is slightly malformed
            match = re.search(r"<coordinates>([\s\S]*?)</coordinates>", content_stripped, re.IGNORECASE)
            if match:
                raw_coord_text = match.group(1).strip()
                coords = cls._parse_coordinate_string(raw_coord_text)
                warnings.append("KML parsed using loose XML recovery due to malformed XML header.")
                return coords, warnings
            raise ValueError(f"Failed to parse KML XML: {str(e)}")

    @classmethod
    def _parse_coordinate_string(cls, coord_str: str) -> List[PolygonCoordinate]:
        """Parse KML comma-separated coordinates: 'lon,lat,alt lon,lat,alt ...'"""
        points: List[PolygonCoordinate] = []
        tokens = coord_str.replace("\n", " ").replace("\t", " ").split(" ")

        for token in tokens:
            token = token.strip()
            if not token:
                continue
            parts = token.split(",")
            if len(parts) >= 2:
                try:
                    lon = float(parts[0].strip())
                    lat = float(parts[1].strip())
                    # Validate coordinate limits
                    if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                        raise ValueError(f"Coordinate ({lat}, {lon}) exceeds geographic limits.")
                    points.append(PolygonCoordinate(lat=lat, lon=lon))
                except ValueError as err:
                    if "exceeds" in str(err):
                        raise err
                    continue

        if len(points) < 3:
            raise ValueError(f"Polygon requires at least 3 coordinates, found {len(points)}.")

        return points

    @classmethod
    def _extract_geojson_polygon(cls, data: dict) -> List[PolygonCoordinate]:
        """Extract polygon coordinates from GeoJSON object."""
        coords_raw = None
        if data.get("type") == "FeatureCollection" and data.get("features"):
            geom = data["features"][0].get("geometry", {})
            coords_raw = geom.get("coordinates")
        elif data.get("type") == "Feature":
            geom = data.get("geometry", {})
            coords_raw = geom.get("coordinates")
        elif data.get("type") in ["Polygon", "MultiPolygon"]:
            coords_raw = data.get("coordinates")

        if not coords_raw:
            return []

        # If MultiPolygon, take first polygon
        if isinstance(coords_raw[0][0], list) and isinstance(coords_raw[0][0][0], list):
            coords_raw = coords_raw[0]

        # First ring is outer boundary
        outer_ring = coords_raw[0]
        result = []
        for pt in outer_ring:
            if len(pt) >= 2:
                lon, lat = float(pt[0]), float(pt[1])
                result.append(PolygonCoordinate(lat=lat, lon=lon))

        return result

    @classmethod
    def validate_polygon(cls, coordinates: List[PolygonCoordinate]) -> KMLValidationResponse:
        """Validate polygon closure, self-intersections, calculate area and centroid."""
        warnings: List[str] = []

        if len(coordinates) < 3:
            return KMLValidationResponse(
                is_valid=False,
                message=f"Polygon must have at least 3 distinct vertices (found {len(coordinates)}).",
                coordinates=coordinates,
                center=PolygonCoordinate(lat=0.0, lon=0.0),
                area_sq_meters=0.0,
                perimeter_meters=0.0,
                warnings=["Insufficient vertex count."],
            )

        # Check ring closure
        first = coordinates[0]
        last = coordinates[-1]
        ring_coords = list(coordinates)
        if abs(first.lat - last.lat) > 1e-6 or abs(first.lon - last.lon) > 1e-6:
            ring_coords.append(first)
            warnings.append("Polygon boundary was unclosed. Automatically closed last vertex to initial vertex.")

        # Convert to Shapely geometry in local metric projection
        pts_deg = [(p.lon, p.lat) for p in ring_coords]
        center_lat = sum(p.lat for p in coordinates) / len(coordinates)
        center_lon = sum(p.lon for p in coordinates) / len(coordinates)

        # Metric projection factors
        lat_rad = math.radians(center_lat)
        m_per_lat = 111132.954 - 559.822 * math.cos(2 * lat_rad)
        m_per_lon = 111412.84 * math.cos(lat_rad)

        pts_metric = [
            ((lon - center_lon) * m_per_lon, (lat - center_lat) * m_per_lat)
            for lon, lat in pts_deg
        ]

        raw_poly = Polygon(pts_metric)

        if not raw_poly.is_valid:
            # Attempt repair with buffer(0)
            repaired = shapely.make_valid(raw_poly)
            if repaired.is_valid and not repaired.is_empty:
                warnings.append("Polygon contained self-intersections. Repaired boundary geometry.")
                raw_poly = repaired if isinstance(repaired, Polygon) else repaired.geoms[0]
            else:
                return KMLValidationResponse(
                    is_valid=False,
                    message="Polygon contains unrepairable self-intersections or complex bowtie topology.",
                    coordinates=coordinates,
                    center=PolygonCoordinate(lat=center_lat, lon=center_lon),
                    area_sq_meters=0.0,
                    perimeter_meters=0.0,
                    warnings=["Self-intersecting polygon geometry."],
                )

        area_sq_m = float(raw_poly.area)
        perimeter_m = float(raw_poly.length)

        if area_sq_m < 50.0:
            warnings.append(f"Search perimeter area is very small ({area_sq_m:.1f} m²).")

        return KMLValidationResponse(
            is_valid=True,
            message=f"Search perimeter successfully validated ({area_sq_m:,.0f} m², {perimeter_m:,.0f}m perimeter).",
            coordinates=ring_coords,
            center=PolygonCoordinate(lat=round(center_lat, 6), lon=round(center_lon, 6)),
            area_sq_meters=round(area_sq_m, 1),
            perimeter_meters=round(perimeter_m, 1),
            warnings=warnings,
        )

    @classmethod
    def generate_lawnmower_route(
        cls,
        polygon_coords: List[PolygonCoordinate],
        track_spacing_m: float = 25.0,
        flight_altitude_m: float = 40.0,
        sweep_angle_deg: float = 0.0,
        boundary_margin_m: float = 3.0,
        drone_speed_mps: float = 5.0,
    ) -> CoverageRouteResponse:
        """Generate parallel sweep coverage route inside the validated polygon.
        
        Strict safety:
        - Route waypoints are for visual planning and operator preview only.
        - autonomous_flight_enabled is permanently False.
        """
        warnings: List[str] = []

        if len(polygon_coords) < 3:
            return CoverageRouteResponse(
                is_generated=False,
                message="Cannot generate route: polygon has fewer than 3 vertices.",
                waypoints=[],
                total_distance_m=0.0,
                estimated_flight_seconds=0.0,
                turn_count=0,
                swath_width_m=track_spacing_m,
                track_spacing_m=track_spacing_m,
                flight_altitude_m=flight_altitude_m,
                warnings=["Insufficient vertices."],
                autonomous_flight_enabled=False,
            )

        # Centroid for metric projection
        center_lat = sum(p.lat for p in polygon_coords) / len(polygon_coords)
        center_lon = sum(p.lon for p in polygon_coords) / len(polygon_coords)
        lat_rad = math.radians(center_lat)
        m_per_lat = 111132.954 - 559.822 * math.cos(2 * lat_rad)
        m_per_lon = 111412.84 * math.cos(lat_rad)

        pts_metric = [
            ((p.lon - center_lon) * m_per_lon, (p.lat - center_lat) * m_per_lat)
            for p in polygon_coords
        ]
        poly = Polygon(pts_metric)
        if not poly.is_valid:
            poly = shapely.make_valid(poly)
            if not isinstance(poly, Polygon):
                poly = poly.geoms[0]

        # Apply boundary margin if valid
        target_poly = poly
        if boundary_margin_m > 0.0:
            shrunk = poly.buffer(-boundary_margin_m)
            if not shrunk.is_empty and shrunk.area > 20.0:
                target_poly = shrunk if isinstance(shrunk, Polygon) else shrunk.geoms[0]
            else:
                warnings.append(f"Boundary margin ({boundary_margin_m}m) exceeds polygon radius; using outer boundary.")

        # Rotate polygon by -sweep_angle to align sweep direction with horizontal X-axis
        rotated_poly = affinity.rotate(target_poly, -sweep_angle_deg, origin=(0, 0))
        min_x, min_y, max_x, max_y = rotated_poly.bounds

        span_y = max_y - min_y
        if span_y < track_spacing_m * 0.5:
            return CoverageRouteResponse(
                is_generated=False,
                message=f"Search perimeter width ({span_y:.1f}m) is smaller than minimum track spacing.",
                waypoints=[],
                total_distance_m=0.0,
                estimated_flight_seconds=0.0,
                turn_count=0,
                swath_width_m=track_spacing_m,
                track_spacing_m=track_spacing_m,
                flight_altitude_m=flight_altitude_m,
                warnings=["Area too narrow for selected track spacing."],
                autonomous_flight_enabled=False,
            )

        # Generate scanlines
        # Offset starting line by half track spacing from boundary
        y_cursor = min_y + (track_spacing_m / 2.0)
        lines: List[Tuple[float, float, float, float]] = []

        while y_cursor <= max_y:
            scan_line = LineString([(min_x - 100.0, y_cursor), (max_x + 100.0, y_cursor)])
            inter = rotated_poly.intersection(scan_line)

            if not inter.is_empty:
                if isinstance(inter, LineString):
                    pts = list(inter.coords)
                    if len(pts) >= 2:
                        lines.append((pts[0][0], pts[0][1], pts[-1][0], pts[-1][1]))
                elif isinstance(inter, MultiLineString):
                    # Sort segments by x coordinate
                    for geom in sorted(inter.geoms, key=lambda g: g.coords[0][0]):
                        pts = list(geom.coords)
                        if len(pts) >= 2:
                            lines.append((pts[0][0], pts[0][1], pts[-1][0], pts[-1][1]))

            y_cursor += track_spacing_m

        if not lines:
            return CoverageRouteResponse(
                is_generated=False,
                message="No coverage lanes could be formed inside the polygon.",
                waypoints=[],
                total_distance_m=0.0,
                estimated_flight_seconds=0.0,
                turn_count=0,
                swath_width_m=track_spacing_m,
                track_spacing_m=track_spacing_m,
                flight_altitude_m=flight_altitude_m,
                warnings=["Zero intersection lines generated."],
                autonomous_flight_enabled=False,
            )

        # Connect lines in alternating serpentine (lawnmower) sequence
        waypoints_rotated: List[Tuple[float, float, str]] = []
        for i, (x1, y1, x2, y2) in enumerate(lines):
            # Alternating direction: even lines left->right, odd lines right->left
            if i % 2 == 0:
                p_start = (x1, y1)
                p_end = (x2, y2)
            else:
                p_start = (x2, y2)
                p_end = (x1, y1)

            wp_type = "entry" if i == 0 else "survey_pass"
            waypoints_rotated.append((p_start[0], p_start[1], wp_type))
            waypoints_rotated.append((p_end[0], p_end[1], "survey_pass"))

        if waypoints_rotated:
            # Mark last waypoint as exit
            last_p = waypoints_rotated[-1]
            waypoints_rotated[-1] = (last_p[0], last_p[1], "exit")

        # Rotate waypoints back by +sweep_angle to geographic orientation
        rad_sweep = math.radians(sweep_angle_deg)
        cos_ang = math.cos(rad_sweep)
        sin_ang = math.sin(rad_sweep)

        final_waypoints: List[RouteWaypoint] = []
        total_dist_m = 0.0
        prev_pt_metric: Optional[Tuple[float, float]] = None

        for idx, (rx, ry, wp_type) in enumerate(waypoints_rotated):
            # Rotation formula: x = rx * cos - ry * sin, y = rx * sin + ry * cos
            orig_x = rx * cos_ang - ry * sin_ang
            orig_y = rx * sin_ang + ry * cos_ang

            # Convert metric back to latitude & longitude
            wp_lat = center_lat + (orig_y / m_per_lat)
            wp_lon = center_lon + (orig_x / m_per_lon)

            leg_dist = 0.0
            if prev_pt_metric is not None:
                leg_dist = math.hypot(orig_x - prev_pt_metric[0], orig_y - prev_pt_metric[1])
                total_dist_m += leg_dist

            prev_pt_metric = (orig_x, orig_y)

            final_waypoints.append(
                RouteWaypoint(
                    order=idx + 1,
                    lat=round(wp_lat, 7),
                    lon=round(wp_lon, 7),
                    alt_m=round(flight_altitude_m, 1),
                    waypoint_type=wp_type if wp_type in ["entry", "exit"] else ("turn" if idx % 2 == 1 and idx < len(waypoints_rotated) - 1 else "survey_pass"),
                    leg_distance_m=round(leg_dist, 1),
                )
            )

        # Estimated flight time (at drone_speed_mps with ~3s penalty per turn)
        turn_count = max(0, len(lines) - 1)
        flight_sec = (total_dist_m / max(1.0, drone_speed_mps)) + (turn_count * 3.0)

        return CoverageRouteResponse(
            is_generated=True,
            message=f"Lawnmower coverage route generated: {len(final_waypoints)} waypoints, {total_dist_m:,.0f}m total distance, ~{int(flight_sec // 60)}m {int(flight_sec % 60)}s flight time.",
            waypoints=final_waypoints,
            total_distance_m=round(total_dist_m, 1),
            estimated_flight_seconds=round(flight_sec, 1),
            turn_count=turn_count,
            swath_width_m=track_spacing_m,
            track_spacing_m=track_spacing_m,
            flight_altitude_m=flight_altitude_m,
            warnings=warnings,
            autonomous_flight_enabled=False,
        )
