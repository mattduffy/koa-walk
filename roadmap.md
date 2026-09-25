# Solo Developer Product & Engineering Roadmap: HikeDiscovery App
**Target Architecture:** Node.js Monolith + Local OpenStreetMap (OSM) Node + Python Elevation Microservice (.HGT)

---

## Phase 1: Local Infrastructure Setup & Data Seeding (Months 1-2)
*Objective: Establish standalone local instances of OpenStreetMap and the Elevation Microservice without impacting live users.*

### 🛠️ Track A: OpenStreetMap (OSM) Local Instance
*   **Data Sourcing & Ingestion:**
    *   Download regional `.osm.pbf` extracts from sources like Geofabrik.
    *   Set up a local PostgreSQL database with the **PostGIS** extension.
    *   Use `osm2pgsql` with a custom style file configured to extract hiking/walking paths (`highway=footway`, `highway=path`, `route=hiking`).
*   **Query Layer Routing:**
    *   Expose a lightweight local API endpoint using an OSM routing engine (like OSRM or Valhalla) or write custom pgSQL geospatial queries targeting specific bounding boxes or radii.

### 🐍 Track B: Python Elevation Microservice
*   **DEM Tile Acquisition & Storage:**
    *   Source `.HGT` (SRTM/NASADEM) tiles for target geographical regions from USGS EarthExplorer or NASA Earthdata.
    *   Organize tiles into a highly structured local folder hierarchy (`/data/srtm/NXXWYYY.hgt`).
*   **Service Core Development:**
    *   Build a lightweight Python API using **FastAPI** or **Flask**.
    *   Implement binary file parsing (e.g., using `numpy` or `rasterio`) to read 16-bit signed integers directly from `.HGT` files using latitude/longitude offsets.
    *   Create an endpoint `POST /v1/elevation-profile` that accepts an array of coordinates `[[lat, lon], ...]` and returns an array of matching elevations `[alt, ...]`.

### 🔄 Track C: Main Node.js App & Nginx Bridging
*   **Nginx Reverse-Proxy Configurations:**
    *   Update local Nginx config to securely route internal network traffic without exposing services to the public.
    *   Route `/api/v1/routes/*` internally to the OSM database query script.
    *   Route `/api/v1/elevation/*` internally to the Python service container or port.

---

## Phase 2: System Integration & Calorie Modeling (Months 3-4)
*Objective: Connect the microservices together to extract OSM trails, enrich them with elevation metrics, and execute your custom calorie formula.*

### 🧠 Track A: The Sync & Enrichment Pipeline (Node.js Controller)
1.  **User Request:** User requests "Find nearby trails" from the UI.
2.  **OSM Query:** Node.js executes a geo-query against the local PostGIS/OSM database within a 10km radius.
3.  **Coordinate Extraction:** Extract arrays of `[lat, lon]` points (OSM "ways") representing discovered trails.
4.  **Elevation Fetching:** Node.js fires an internal HTTP request to the Python Service passing the raw coordinate arrays.
5.  **Calorie Calculation:** Node.js passes the combined `[lat, lon, alt]` array into your custom calories expended equation (calculating slope grade changes over distance).

### 🧪 Track B: Data Modeling & Optimization
*   **Coordinate Downsampling:** Implement a polyline simplification algorithm (like the Ramer-Douglas-Peucker algorithm) in Node.js. Passing dense raw OSM nodes directly into the calorie engine will degrade performance.
*   **MongoDB Schema Schema Updates:** Create a `discovered_routes` collection cache so that trails already calculated do not need to hit the Python or OSM layers a second time.

---

## Phase 3: UI Implementation & Local Deployment Validation (Months 5+)
*Objective: Build the user interfaces for "Discovery Mode" and seamlessly migrate from local development to a stable private production box.*

### 🎨 Track A: Frontend Overhaul
*   **Dual Map Interfaces:** Create a toggle switch or dedicated tab for "Record Hike" vs "Explore Trails".
*   **Elevation Graphing:** Implement a UI profile widget (using Chart.js, D3, or Canvas) displaying the upcoming slope, total ascent, and total descent before the user starts walking.
*   **Calorie Preview Panel:** Display the custom calorie metric side-by-side with trail parameters, letting users filter paths by "High Burn" vs "Easy Walk".

### 🚀 Track B: Deployment Architecture & Dockerization
*   **Containerization Strategy:** Create a multi-container `docker-compose.yml` local ecosystem containing:
    1.  Node.js (Main App)
    2.  Python FastAPI App (Elevation Engine)
    3.  PostgreSQL/PostGIS (OSM data)
    4.  MongoDB (User Logs & Cached Routes)
    5.  Nginx (Gateway Proxy)
*   **Resource Management:** Benchmark RAM usage on your development machine. The PostGIS OSM node and Python memory-mapped `.HGT` arrays will be memory-intensive; configure swap spaces or limit bounding boxes accordingly.