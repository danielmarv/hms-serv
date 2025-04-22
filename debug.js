// import { pathToRegexp } from "path-to-regexp"

// // Function to test route paths
// export function testRoutePaths(app) {
//   // Get all registered routes
//   const routes = []

//   // Helper function to extract routes from a router
//   function extractRoutes(router, basePath = "") {
//     if (!router || !router.stack) return

//     router.stack.forEach((layer) => {
//       if (layer.route) {
//         // This is a route
//         const path = basePath + (layer.route.path || "")
//         const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase())
//         routes.push({ path, methods })

//         // Test the path with path-to-regexp
//         try {
//           pathToRegexp(path)
//           console.log(`✅ Valid route: ${path}`)
//         } catch (error) {
//           console.error(`❌ Invalid route: ${path}`, error.message)
//         }
//       } else if (layer.name === "router" && layer.handle.stack) {
//         // This is a sub-router
//         const routerPath = layer.regexp.source.replace("^\\/", "").replace("\\/?(?=\\/|$)", "").replace(/\\\//g, "/")
//         extractRoutes(layer.handle, basePath + (routerPath === "(?:)" ? "" : "/" + routerPath))
//       } else if (layer.name === "bound dispatch" && layer.handle.stack) {
//         // This is a mounted app
//         extractRoutes(layer.handle, basePath)
//       }
//     })
//   }

//   // Extract routes from the main app
//   extractRoutes(app._router)

//   return routes
// }

// // Usage example (add to server.js for debugging)
// // import { testRoutePaths } from './debug.js'
// // testRoutePaths(app)
