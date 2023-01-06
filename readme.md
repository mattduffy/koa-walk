# My Koa-based Stub Server

This package is meant to be used as a simple stub server to test new node.js packages.  The koa app is very basic and not meant to be run outside of a testing framework.  Currently, the framework of choice is Mocha with Chai and Chai HTTP.

## Using Koa-stub

```bash
npm install --save-dev @mattduffy/koa-stub
```

```javascript
import app from '@mattduffy/koa-stub'
app.use(myNewMiddleware)

```

...
