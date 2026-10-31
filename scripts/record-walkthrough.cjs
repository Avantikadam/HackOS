const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function showCaption(page, title, subtitle) {
  await page.evaluate(({ title, subtitle }) => {
    let el = document.getElementById('demo-caption-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'demo-caption-banner';
      el.style.position = 'fixed';
      el.style.bottom = '24px';
      el.style.left = '50%';
      el.style.transform = 'translateX(-50%)';
      el.style.zIndex = '999999';
      el.style.backgroundColor = '#131C31';
      el.style.color = '#FBF6EE';
      el.style.padding = '10px 24px';
      el.style.borderRadius = '9999px';
      el.style.boxShadow = '0 12px 32px -4px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.1)';
      el.style.fontFamily = 'Inter, -apple-system, sans-serif';
      el.style.fontSize = '14px';
      el.style.fontWeight = '500';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.gap = '12px';
      el.style.transition = 'all 0.35s ease-out';
      el.style.pointerEvents = 'none';
      document.body.appendChild(el);
    }
    el.innerHTML = `
      <span style="background:#1F4ED8;color:#FFFFFF;padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">${title}</span>
      <span style="color:#FBF6EE;font-weight:500;">${subtitle}</span>
    `;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
  }, { title, subtitle });
  await page.waitForTimeout(600);
}

async function smoothScroll(page, targetY, duration = 1200) {
  await page.evaluate(async ({ targetY, duration }) => {
    const startY = window.scrollY;
    const diff = targetY - startY;
    const startTime = performance.now();
    return new Promise((resolve) => {
      function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 0.5 - Math.cos(progress * Math.PI) / 2;
        window.scrollTo(0, startY + diff * ease);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }, { targetY, duration });
}

async function run() {
  const outputDir = path.resolve(__dirname, '..', 'recordings');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Starting HACKOS Complete Application Walkthrough Recording...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();

  try {
    // ---------------------------------------------------------------
    // PART A: LANDING PAGE
    // ---------------------------------------------------------------
    console.log('[1/10] Recording Landing Page...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await showCaption(page, 'HACKOS 2.0', 'Hackathon Administration, Coordination & Operations System');
    await page.waitForTimeout(2000);

    // Hero Section
    await showCaption(page, 'Landing Page', 'Production Hero with Direct Actions & Verification Metrics');
    await smoothScroll(page, 400, 1000);
    await page.waitForTimeout(1500);

    // Role Demo interactive tabs
    await showCaption(page, 'Interactive Demo', 'Multi-Persona Workflow Preview: Organizer, Venue & Participant');
    await smoothScroll(page, 950, 1200);
    await page.waitForTimeout(1500);

    const venueTab = page.locator('role=tab[name="Venue"]');
    if (await venueTab.count()) {
      await venueTab.click();
      await page.waitForTimeout(1500);
    }
    const participantTab = page.locator('role=tab[name="Participant"]');
    if (await participantTab.count()) {
      await participantTab.click();
      await page.waitForTimeout(1500);
    }

    // Story / How it works
    await showCaption(page, 'Six Stages', 'Stage 01: Verify Organizers & Physical Venue');
    await smoothScroll(page, 1850, 1400);
    await page.waitForTimeout(1600);

    await showCaption(page, 'Six Stages', 'Stage 02: Set Up Event, Tracks, Limits & Schedule');
    await smoothScroll(page, 2800, 1400);
    await page.waitForTimeout(1600);

    await showCaption(page, 'Six Stages', 'Stage 03: Bring Teams Together with Squad Formation & Theo');
    await smoothScroll(page, 3750, 1400);
    await page.waitForTimeout(1800);

    await showCaption(page, 'Six Stages', 'Stage 04: Check In with Offline QR Passes & Sync States');
    await smoothScroll(page, 4650, 1400);
    await page.waitForTimeout(1800);

    await showCaption(page, 'Six Stages', 'Stage 05 & 06: Fair Scoring & Published Results');
    await smoothScroll(page, 5600, 1400);
    await page.waitForTimeout(1800);

    // ---------------------------------------------------------------
    // PART B: MOBILE RESPONSIVE EMULATION
    // ---------------------------------------------------------------
    console.log('[2/10] Recording Mobile Viewport...');
    await showCaption(page, 'Responsive View', 'Android Viewport Emulation (390px Fluid Layout)');
    await page.setViewportSize({ width: 390, height: 844 });
    await smoothScroll(page, 0, 800);
    await page.waitForTimeout(1200);

    // Open mobile menu
    const menuBtn = page.locator('button[aria-label="Open navigation menu"]');
    if (await menuBtn.count()) {
      await menuBtn.click();
      await page.waitForTimeout(1500);
      const closeBtn = page.locator('button[aria-label="Close navigation menu"]');
      if (await closeBtn.count()) await closeBtn.click();
      await page.waitForTimeout(800);
    }

    // Scroll mobile slightly
    await smoothScroll(page, 600, 1000);
    await page.waitForTimeout(1200);

    // Restore desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(1000);

    // ---------------------------------------------------------------
    // PART C: AUTHENTICATION
    // ---------------------------------------------------------------
    console.log('[3/10] Recording Authentication Flow...');
    await page.goto('http://localhost:5173/signup', { waitUntil: 'networkidle' });
    await showCaption(page, 'Sign Up', 'Participant & Organizer Onboarding Portal');
    await page.waitForTimeout(1800);

    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await showCaption(page, 'Authentication', 'Secure Supabase Auth with Role-Based Redirection');
    await page.waitForTimeout(1200);

    await page.fill('#email', 'qa.organizer.demo@hackos.app');
    await page.waitForTimeout(600);
    await page.fill('#password', 'TestPassword123!');
    await page.waitForTimeout(800);

    await page.click('button[type="submit"]');
    await page.waitForURL('**/select-role', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // ---------------------------------------------------------------
    // PART D: ROLE SELECTION PORTAL
    // ---------------------------------------------------------------
    console.log('[4/10] Recording Role Selection Portal...');
    await showCaption(page, 'Role Selection', 'Unified Portal: Organizer, Participant, Team Leader, Venue & Judge');
    await page.waitForTimeout(2000);

    // Select Organizer
    const orgCard = page.locator('text=Organizer').first();
    await orgCard.click();
    await page.waitForTimeout(1000);

    const continueBtn = page.locator('button:has-text("Continue")');
    await continueBtn.click();
    await page.waitForURL('**/organizer**', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // ---------------------------------------------------------------
    // PART E: ORGANIZER DASHBOARD
    // ---------------------------------------------------------------
    console.log('[5/10] Recording Organizer Dashboard...');
    await showCaption(page, 'Organizer Dashboard', 'Live Event Statistics, Capacity Progress & Hackathon Operations');
    await smoothScroll(page, 300, 1000);
    await page.waitForTimeout(2000);

    // Navigate to create event
    await showCaption(page, 'Event Creation', 'Defining Hackathon Constraints, Team Sizes & Tracks');
    await page.goto('http://localhost:5173/organizer/events/new', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.fill('input[placeholder*="Cascade"], input[name*="name"], #name, input[type="text"]', 'National Autonomous Hackathon 2026');
    await page.waitForTimeout(1500);

    // Venue booking requests
    await showCaption(page, 'Venue Requests', 'Official Institutional Authorization & Quotations');
    await page.goto('http://localhost:5173/organizer/venues', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // ---------------------------------------------------------------
    // PART F: PARTICIPANT DASHBOARD & SQUAD MANAGEMENT
    // ---------------------------------------------------------------
    console.log('[6/10] Recording Participant Experience...');
    await page.goto('http://localhost:5173/select-role', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const participantCard = page.locator('text=Participant').first();
    await participantCard.click();
    await page.waitForTimeout(800);
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(2000);

    await showCaption(page, 'Participant Dashboard', 'Discover Hackathons, View Deadlines & Application Status');
    await page.goto('http://localhost:5173/participant/discover', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Team management
    await showCaption(page, 'Team Squads', 'Unique Cryptographic HACK Code & Roster Management');
    await page.goto('http://localhost:5173/team/my-team', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2200);

    // QR Pass
    await showCaption(page, 'QR Check-In Pass', 'Zero-PII Secure Pass for Instant Gate Admission');
    await page.goto('http://localhost:5173/participant/qr-pass', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2200);

    // Project Submissions
    await showCaption(page, 'Project Submissions', 'GitHub Repo, Live Demo URL & Secure PDF Deck Upload');
    await page.goto('http://localhost:5173/team/submissions', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // ---------------------------------------------------------------
    // PART G: VENUE AUTHORITY WORKFLOW
    // ---------------------------------------------------------------
    console.log('[7/10] Recording Venue Authority...');
    await page.goto('http://localhost:5173/select-role', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const venueAdminCard = page.locator('text=Venue Administrator').first();
    await venueAdminCard.click();
    await page.waitForTimeout(800);
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(2000);

    await showCaption(page, 'Venue Authority', 'Facility Specifications, Capacity & AV/Fiber Amenities');
    await page.goto('http://localhost:5173/venue/profile', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await showCaption(page, 'Venue Requests', 'Incoming Booking Inquiries, Quotation Generator & OTP Legal Agreements');
    await page.goto('http://localhost:5173/venue/requests', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // ---------------------------------------------------------------
    // PART H: JUDGE EVALUATION PORTAL
    // ---------------------------------------------------------------
    console.log('[8/10] Recording Judge Portal...');
    await page.goto('http://localhost:5173/select-role', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const judgeCard = page.locator('text=Hackathon Judge').first();
    if (await judgeCard.count()) {
      await judgeCard.click();
      await page.waitForTimeout(800);
      await page.locator('button:has-text("Continue")').click();
      await page.waitForTimeout(2000);

      await showCaption(page, 'Judge Evaluation', '3-Tier Weighted Rubric: Execution, Architecture & Feasibility');
      await page.goto('http://localhost:5173/judge/evaluate', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500);
    }

    // ---------------------------------------------------------------
    // PART I: VOLUNTEER GATE SCANNER & OFFLINE CHECK-IN
    // ---------------------------------------------------------------
    console.log('[9/10] Recording Volunteer Scanner...');
    await showCaption(page, 'Gate Scanner', 'Rapid QR Verification with Offline Queue & Instant Sync');
    await page.goto('http://localhost:5173/scanner', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // ---------------------------------------------------------------
    // PART J: TRUST & SAFETY / LOGOUT
    // ---------------------------------------------------------------
    console.log('[10/10] Recording Trust Officer & Conclusion...');
    await showCaption(page, 'Trust & Safety', 'Anti-Fraud Institutional Domain Registry & Official Review');
    await page.goto('http://localhost:5173/admin/domains', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await showCaption(page, 'HACKOS Walkthrough Complete', 'All Roles, Pipelines & Database Integrations Verified');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

  } catch (err) {
    console.error('Walkthrough error:', err);
  } finally {
    console.log('Closing context and finalizing walkthrough video recording...');
    await context.close();
    await browser.close();

    // Rename generated video to standard name
    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.webm'));
    const newest = files.map(f => ({ name: f, time: fs.statSync(path.join(outputDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time)[0];

    if (newest) {
      const targetPath = path.join(outputDir, 'HACKOS_COMPLETE_APPLICATION_WALKTHROUGH.webm');
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      fs.renameSync(path.join(outputDir, newest.name), targetPath);
      console.log(`✓ Walkthrough video successfully saved to: ${targetPath}`);
    }
  }
}

run();

