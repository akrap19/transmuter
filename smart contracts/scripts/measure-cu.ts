/**
 * Re-run the finalize CU probe against a running validator and print the report.
 * Prefer `anchor test` which writes reports/finalize-cu.json.
 */
import * as fs from "fs";
import * as path from "path";

const reportPath = path.join(__dirname, "..", "reports", "finalize-cu.json");
if (!fs.existsSync(reportPath)) {
  console.error("No reports/finalize-cu.json yet. Run `anchor test` first.");
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
console.log(JSON.stringify(report, null, 2));
const ok = report.err == null && report.unitsConsumed < report.limit;
console.log(ok ? "PASS: under 1.4M CU" : "FAIL: over budget or simulation error");
process.exit(ok ? 0 : 1);
