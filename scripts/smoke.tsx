import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";

const html = renderToStaticMarkup(
  <MemoryRouter>
    <App />
  </MemoryRouter>
);
console.log("rendered length:", html.length);
for (const needle of [
  "Run the hackathon",
  "Not the spreadsheet chaos",
  "Plan a hackathon",
  "See how it works",
  "Verify the organizers and venue",
  "Set up the event",
  "Bring teams together",
  "Check everyone in",
  "Collect submissions and judge fairly",
  "Publish results and close the loop",
  "Saved on device",
  "Organizer",
  "Venue",
  "Participant",
  "Email verified",
  "Event dates confirmed",
  "do not guarantee",
  "Mira",
  "Theo",
  "Ada",
  "Kenji",
  "Noor",
  "Isha",
  "Privacy policy",
  "Product preview",
]) {
  if (!html.includes(needle)) {
    console.log("MISSING:", needle);
    process.exitCode = 1;
  }
}
console.log(process.exitCode ? "SMOKE FAILED" : "SMOKE OK");
