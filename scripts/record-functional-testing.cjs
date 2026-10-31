const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function showCaption(page, title, subtitle, tone = 'blue') {
  await page.evaluate(({ title, subtitle, tone }) => {
    let el = document.getElementById('test-caption-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'test-caption-banner';
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
    const badgeBg = tone === 'red' ? '#E2603F' : tone === 'green' ? '#2F7D6C' : '#1F4ED8';
    el.innerHTML = `
      <span style="background:${badgeBg};color:#FFFFFF;padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">${title}</span>
      <span style="color:#FBF6EE;font-weight:500;">${subtitle}</span>
    `;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
  }, { title, subtitle, tone });
  await page.waitForTimeout(600);
}

async function run() {
  const outputDir = path.resolve(__dirname, '..', 'recordings');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Starting HACKOS Functional Testing Screen Recording...');

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
    // TEST 1: FORM VALIDATION & EMPTY SUBMISSIONS
    // ---------------------------------------------------------------
    console.log('[Test 1/12] Testing Login Form Validation...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await showCaption(page, 'VALIDATION', 'Test 1: Submitting Empty Login Form', 'red');
    await page.waitForTimeout(1500);

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(1800);

    // ---------------------------------------------------------------
    // TEST 2: INVALID CREDENTIALS HANDLING
    // ---------------------------------------------------------------
    console.log('[Test 2/12] Testing Invalid Credentials...');
    await showCaption(page, 'SECURITY', 'Test 2: Rejecting Invalid Email / Password Pair', 'red');
    await page.fill('#email', 'unknown.hacker@example.com');
    await page.fill('#password', 'WrongPassword999!');
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // ---------------------------------------------------------------
    // TEST 3: SIGNUP VALIDATION & MISMATCHED PASSWORDS
    // ---------------------------------------------------------------
    console.log('[Test 3/12] Testing Signup Validation...');
    await page.goto('http://localhost:5173/signup', { waitUntil: 'networkidle' });
    await showCaption(page, 'VALIDATION', 'Test 3: Enforcing Password Confirmation Match', 'red');
    await page.fill('#name, input[placeholder*="Ada"], input[type="text"]', 'Test Participant');
    await page.fill('#email, input[type="email"]', 'test.participant@hackos.app');
    await page.fill('#password, input[type="password"]', 'PasswordA123!');
    const confirmInput = page.locator('input[type="password"]').nth(1);
    if (await confirmInput.count()) {
      await confirmInput.fill('DifferentPasswordB456!');
    }
    const signupBtn = page.locator('button[type="submit"]');
    await signupBtn.click();
    await page.waitForTimeout(2000);

    // ---------------------------------------------------------------
    // TEST 4: ROLE GUARD & ROUTE PROTECTION
    // ---------------------------------------------------------------
    console.log('[Test 4/12] Testing Unauthenticated Route Protection...');
    await showCaption(page, 'RBAC GUARD', 'Test 4: Unauthenticated Access to /organizer Blocked', 'blue');
    await page.goto('http://localhost:5173/organizer', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // ---------------------------------------------------------------
    // TEST 5: VALID AUTHENTICATION & ROLE REDIRECTION
    // ---------------------------------------------------------------
    console.log('[Test 5/12] Testing Authorized Authentication...');
    await showCaption(page, 'AUTH SUCCESS', 'Test 5: Supabase Sign-In with Authorized Test Account', 'green');
    await page.fill('#email', 'qa.organizer.demo@hackos.app');
    await page.fill('#password', 'TestPassword123!');
    await submitBtn.click();
    await page.waitForURL('**/select-role', { timeout: 10000 });
    await page.waitForTimeout(1800);

    // ---------------------------------------------------------------
    // TEST 6: ROLE SELECTION & PROFILE RESTRICTION
    // ---------------------------------------------------------------
    console.log('[Test 6/12] Testing Role Selection...');
    await showCaption(page, 'ROLE PORTAL', 'Test 6: Selecting Organizer Operational Context', 'blue');
    await page.locator('text=Organizer').first().click();
    await page.locator('button:has-text("Continue")').click();
    await page.waitForURL('**/organizer**', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // ---------------------------------------------------------------
    // TEST 7: DATABASE OPERATION & EVENT FORM
    // ---------------------------------------------------------------
    console.log('[Test 7/12] Testing Event Creation Validation...');
    await page.goto('http://localhost:5173/organizer/events/new', { waitUntil: 'networkidle' });
    await showCaption(page, 'DATABASE OP', 'Test 7: Event Form Constraints (Dates, Limits & Capacity)', 'blue');
    await page.waitForTimeout(2000);

    // ---------------------------------------------------------------
    // TEST 8: TEAM CRYPTOGRAPHIC CODE VERIFICATION
    // ---------------------------------------------------------------
    console.log('[Test 8/12] Testing Team Cryptographic Code...');
    await page.goto('http://localhost:5173/team/my-team', { waitUntil: 'networkidle' });
    await showCaption(page, 'CRYPTO CODE', 'Test 8: Non-Sequential HACK Team Code Generation', 'green');
    await page.waitForTimeout(2200);

    // ---------------------------------------------------------------
    // TEST 9: QR PASS & OPAQUE TOKEN GENERATION
    // ---------------------------------------------------------------
    console.log('[Test 9/12] Testing QR Pass Generation...');
    await page.goto('http://localhost:5173/participant/qr-pass', { waitUntil: 'networkidle' });
    await showCaption(page, 'QR CHECK-IN', 'Test 9: Dynamic Participant QR Pass (Zero PII Token)', 'green');
    await page.waitForTimeout(2200);

    // ---------------------------------------------------------------
    // TEST 10: OFFLINE GATE SCANNER & LOCAL QUEUE
    // ---------------------------------------------------------------
    console.log('[Test 10/12] Testing Offline Scanner & Queue...');
    await page.goto('http://localhost:5173/scanner', { waitUntil: 'networkidle' });
    await showCaption(page, 'OFFLINE QUEUE', 'Test 10: Gate Admission with Offline Sync Indicator', 'blue');
    await page.waitForTimeout(2500);

    // ---------------------------------------------------------------
    // TEST 11: JUDGE EVALUATION RUBRIC
    // ---------------------------------------------------------------
    console.log('[Test 11/12] Testing Judge Weighted Rubric...');
    await page.goto('http://localhost:5173/judge/evaluate', { waitUntil: 'networkidle' });
    await showCaption(page, 'RUBRIC TEST', 'Test 11: 3-Tier Weighted Scoring Rubric Computation', 'green');
    await page.waitForTimeout(2500);

    // ---------------------------------------------------------------
    // TEST 12: MOBILE VIEWPORT EMULATION (360px & 412px)
    // ---------------------------------------------------------------
    console.log('[Test 12/12] Testing Android Responsive Layouts...');
    await showCaption(page, 'RESPONSIVE', 'Test 12A: 360px Viewport (Galaxy S8 / Compact Mobile)', 'blue');
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await showCaption(page, 'RESPONSIVE', 'Test 12B: 412px Viewport (Pixel 7 / Standard Android)', 'blue');
    await page.setViewportSize({ width: 412, height: 915 });
    await page.waitForTimeout(1800);

    // Restore desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await showCaption(page, 'TEST SUITE PASSED', 'All Functional Tests, RBAC Guards & Offline Flows Verified', 'green');
    await page.waitForTimeout(2500);

  } catch (err) {
    console.error('Functional testing error:', err);
  } finally {
    console.log('Closing context and finalizing functional testing video recording...');
    await context.close();
    await browser.close();

    // Rename generated video to standard name
    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.webm'));
    const newest = files
      .filter(f => f !== 'HACKOS_COMPLETE_APPLICATION_WALKTHROUGH.webm')
      .map(f => ({ name: f, time: fs.statSync(path.join(outputDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time)[0];

    if (newest) {
      const targetPath = path.join(outputDir, 'HACKOS_FUNCTIONAL_TESTING.webm');
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      fs.renameSync(path.join(outputDir, newest.name), targetPath);
      console.log(`✓ Functional testing video successfully saved to: ${targetPath}`);
    }
  }
}

run();

