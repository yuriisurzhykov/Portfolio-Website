import { config } from "dotenv";

// `dotenv.config()` never overwrites a variable that's already set in
// process.env — so this is a no-op in CI (where the workflow sets
// DATABASE_URL/JWT_*_SECRET directly as real environment variables against
// a service-container Postgres) and only takes effect for local runs,
// loading backend/.env.test.
config({ path: ".env.test" });
