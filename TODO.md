## OpenStreet Map search for nearby trails
- [ ] use OSM overpass api to query for nearby hiking trails
- [ ] look into setting up local deployment of OSM, for reasons...
- [ ] add new button/tab to nav bar to display trail search card
- [ ] search parameters: distance from user, trail difficulty, etc
- [ ] 

## Progress reporting during active hike
- [ ] keep a running distance total during the active hike
- [ ] keep a running calorie total during the active hike
- [ ] keep a running elevation-climbed total during the active hike 

## Improve app loading times
- [x] make icon file sizes much smaller
- [ ] ~maybe convert png icons to svg format~
- [x] maybe base64 encode icons, embed directly in walk.css reducing total # of http requests
- [ ] nginx compression ???
- [ ] nginx proxy cache ???

## Add more fields to user preferences
- [ ] preferred calorie model to use (pandolf, minimum mechanics, or lcda)
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
