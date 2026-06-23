const express = require("express");
const cors = require("cors");

// Load environment variables
require("./config/env");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Import route modules
const authRouter = require("./routes/auth");
const emailRouter = require("./routes/email");
const mpesaRouter = require("./routes/mpesa");
const dbRouter = require("./routes/db");
const departmentsRouter = require("./routes/departments");
const afyalinkRouter = require("./routes/afyalink");
const workflowsRouter = require("./routes/workflows");
const paymentsRouter = require("./routes/payments");
const domainsRouter = require("./routes/domains");

// Mount routes
app.use("/api/auth", authRouter);
app.use("/api", emailRouter);
app.use("/api/email", emailRouter);
app.use("/api/mpesa", mpesaRouter);
app.use("/api/db", dbRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/afyalink", afyalinkRouter);
app.use("/api/workflows", workflowsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/domains", domainsRouter);

const { runMigrations } = require("./utils/migrationRunner");

// Start server
app.listen(PORT, async () => {
  console.log(`Eagle Tech HMIS Server listening on port ${PORT}`);
  // Run database migrations asynchronously
  runMigrations().catch(err => {
    console.error('[MigrationRunner] Migration execution failed:', err);
  });
});
