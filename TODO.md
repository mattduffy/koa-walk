## Pre-calculate calories for found hiking trails
- [ ] correlate trail waypoints track from OSM overpass search with DEM for lat/long/elevation data
- [ ] pre-calculate calories (with default person params if necessary) for correlated trail dataset

## DEM private webservice using .hgt tiles
- [ ] get local copy of .hgt tiles for coterminus US
- [ ] create python program that gets elevation data from .hgt tiles by lat/lon
- [ ] set up python (bottle? or flask?) http server that accepts GET requests with lat/lon, returns elevation in meters

## OpenStreet Map search for nearby trails
- [ ] look into setting up local deployment of OSM, for reasons...
- [ ] add new button/tab to nav bar to display trail search card
- [ ] use OSM overpass api to query for nearby hiking trails
- [ ] search parameters: distance from user, trail difficulty, etc

## Enriched after-hike report
- [ ] add distance half-way time split
- [ ] add per-mile time splits
- [ ] add mile marker map annotations on linestring
- [x] add dropdown list of available calorie model values

## Progress reporting during active hike
- [ ] keep a running distance total during the active hike
- [ ] keep a running calorie total during the active hike
- [ ] keep a running elevation-climbed total during the active hike 

## Improve app loading times
- [x] make icon file sizes much smaller
- [ ] ~maybe convert png icons to svg format~
- [x] maybe base64 encode icons, embed directly in walk.css reducing total # of http requests
- [x] nginx compression ???
- [ ] nginx proxy cache ???

## Add more fields to user preferences
- [x] preferred calorie model to use (pandolf, minimum mechanics, or lcda)
- [x] first and last name fields
- [x] some kind of list of shoes worn during hikes
- [x] BMR values (age, height, weight, gender) for minimum mechanics model
- [x] default ruck weights (to be automatically populated in Start Walk card)
- [x] map orientation (north up vs heading up)
- [x] preference for units displayed

## Calorie estimates for completed hikes
- [x] implement pandolf-santee predictive model for hike waypoint dataset
- [x] add calorie hook to save hike routine
- [x] add calorie result to geojson file when saving hike

## Set up Koa stub server for testing
- [x] install koa
- [x] set up a basic koa app with simple routes
- [x] set up view template system (probably ejs)
- [x] set up minimally necessary middle wares
- [x] set up basic session handling
- [x] ↳ set up redis session handler
- [x] add model for user account objects
- [x] add router / controller for exposing user model actions
- [x] add login / logout router 
- [x] ↳ add ctx middleware to check if user is logged in and repopulate ctx.state.user
- [x] add application middleware to handle webfinger and host-meta requests
- [x] add /user/:username and /:@<username> routes to in prep for webfinger support
