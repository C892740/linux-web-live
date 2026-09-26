import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { msStatus } from "./msStatus";

const http = httpRouter();

auth.addHttpRoutes(http);

/**
 * Public endpoint the auth page polls to learn whether Microsoft 365
 * sign-in is fully configured (client id + secret present on the Convex
 * deployment). Lets the UI offer the real flow when it exists and a clear
 * fallback when credentials haven't been added yet.
 */
http.route({
  path: "/ms-status",
  method: "GET",
  handler: msStatus,
});

export default http;
