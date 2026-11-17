import WebSocket from 'ws';

const APP = 'http://127.0.0.1:3000/';
const CDP = 'http://127.0.0.1:9222';
const results = [];
const consoleErrors = [];

function record(name, passed, detail) {
  results.push({ name, passed: Boolean(passed), detail });
}

class Page {
  constructor(target, ws) {
    this.target = target;
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.requests = [];
    this.ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
        return;
      }

      if (msg.method === 'Network.requestWillBeSent') {
        this.requests.push(msg.params.request.url);
      }

      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(
          msg.params.args
            .map((arg) => arg.value ?? arg.description ?? '')
            .join(' ')
            .slice(0, 300),
        );
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(
          (msg.params.exceptionDetails?.text ?? 'exception') +
            ' ' +
            (msg.params.exceptionDetails?.exception?.description ?? ''),
        );
      }
    });
  }

  static async open(url) {
    const response = await fetch(
      `${CDP}/json/new?${encodeURIComponent(url)}`,
      { method: 'PUT' },
    );
    if (!response.ok) throw new Error(`Could not open target: ${response.status}`);
    const target = await response.json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });
    const page = new Page(target, ws);
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Network.enable');
    return page;
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ??
          result.exceptionDetails.text,
      );
    }
    return result.result.value;
  }

  async bodyText() {
    return this.evaluate('document.body ? document.body.innerText : ""');
  }

  async waitForText(text, timeoutMs = 12000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const body = await this.bodyText();
      if (body.includes(text)) return body;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out waiting for text: ${text}`);
  }

  async waitFor(expression, timeoutMs = 12000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await this.evaluate(expression)) return true;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out waiting for: ${expression}`);
  }

  async fill(selector, value, index = 0) {
    const ok = await this.evaluate(`(() => {
      const element = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
      if (!element) return false;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      ).set;
      setter.call(element, ${JSON.stringify(value)});
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (!ok) throw new Error(`Input not found: ${selector}[${index}]`);
  }

  async clickText(text, selector = 'button') {
    const ok = await this.evaluate(`(() => {
      const element = [...document.querySelectorAll(${JSON.stringify(selector)})]
        .find((node) =>
          (node.textContent || '').replace(/\\s+/g, ' ').trim()
            .includes(${JSON.stringify(text)})
        );
      if (!element) return false;
      element.click();
      return true;
    })()`);
    if (!ok) throw new Error(`Clickable text not found: ${text}`);
  }

  async close() {
    this.ws.close();
    await fetch(`${CDP}/json/close/${this.target.id}`).catch(() => {});
  }
}

const stamp = Date.now();
const unusedEmail = `qa-nonexistent-${stamp}@example.invalid`;

async function testValidationAndLogin() {
  const page = await Page.open(APP);
  await page.waitForText('Student Login');
  record('app-loads-signed-out', true, 'Student Login rendered');

  await page.clickText('Create Account');
  await page.waitForText('Create Account');
  await page.fill('input[type=text]', 'QA Test');
  await page.fill('input[type=email]', unusedEmail);
  await page.fill('input[type=password]', 'short');
  await page.clickText('Complete Registration');
  const shortBody = await page.waitForText('at least 8 characters');
  record(
    'registration-password-validation',
    shortBody.includes('at least 8 characters'),
    'Short registration password rejected without creating an account',
  );

  await page.clickText('Sign In', 'button');
  await page.waitForText('Student Login');
  await page.fill('input[type=email]', unusedEmail);
  await page.fill('input[type=password]', 'WrongPass123');
  await page.clickText('Sign In as Student');
  const loginBody = await page.waitForText('Incorrect email or password');
  record(
    'invalid-login-feedback',
    loginBody.includes('Continue with Google'),
    'Invalid credentials show actionable guidance',
  );

  await page.clickText('Forgot password?');
  await page.waitForText('Reset password by email');
  await page.fill('input[type=email]', unusedEmail, 1);
  await page.clickText('Send reset email');
  const resetBody = await page.waitForText('If an account exists');
  record(
    'reset-request-neutral-response',
    resetBody.includes('password-reset link will be sent'),
    'Reset request uses anti-enumeration wording',
  );

  await page.close();
}

async function testExpiredRecoveryLink() {
  const url =
    `${APP}?error=access_denied&error_code=otp_expired` +
    '&error_description=Email+link+is+invalid+or+has+expired';
  const page = await Page.open(url);
  const body = await page.waitForText('password reset link is invalid');
  record(
    'expired-recovery-link',
    body.includes('Request a new reset email') &&
      body.includes('Student Login'),
    'Expired recovery link lands on sign-in with reset guidance',
  );
  const cleanUrl = await page.evaluate('window.location.search');
  record(
    'recovery-callback-params-cleared',
    cleanUrl === '',
    `Callback query removed from URL: ${cleanUrl || '(empty)'}`,
  );
  await page.close();
}

async function testIncompleteOAuthCallback() {
  const page = await Page.open(`${APP}?code=invalid-code`);
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const body = await page.bodyText();
  record(
    'incomplete-oauth-callback',
    body.includes('no longer valid in this browser'),
    body.slice(0, 1200),
  );
  await page.close();
}

async function testGoogleOAuthInitiation() {
  const page = await Page.open(APP);
  await page.waitForText('Student Login');
  await page.clickText('Continue with Google');
  await page.waitFor(
    "location.hostname.includes('accounts.google.com')",
    20000,
  );
  const authorizeUrl = page.requests.find((url) =>
    url.includes('/auth/v1/authorize'),
  );
  if (!authorizeUrl) throw new Error('Supabase authorize URL not found');
  const authUrl = new URL(authorizeUrl);
  const currentHost = await page.evaluate('location.hostname');
  const oauth = {
    currentHost,
    redirectTo: authUrl.searchParams.get('redirect_to'),
    redirectUri: authUrl.searchParams.get('redirect_uri'),
    prompt: authUrl.searchParams.get('prompt'),
    hasClientId: Boolean(authUrl.searchParams.get('client_id')),
  };
  record(
    'google-oauth-initiation',
    oauth.currentHost === 'accounts.google.com' &&
      oauth.hasClientId &&
      oauth.redirectTo === APP &&
      oauth.prompt === 'select_account',
    oauth,
  );
  record(
    'google-oauth-callback-uri',
    typeof oauth.redirectUri === 'string' &&
      oauth.redirectUri.endsWith('/auth/v1/callback'),
    oauth.redirectUri,
  );
  await page.close();
}

async function testDemoRecruiterSession() {
  const page = await Page.open(APP);
  await page.waitForText('Student Login');
  await page.clickText('Recruiter Workspace');
  await page.waitForText('Recruiter Login');
  await page.fill('input[type=text]', 'QA Genomics Lab');
  await page.fill('input[type=email]', `qa-recruiter-${stamp}@example.invalid`);
  await page.fill('input[type=password]', 'DemoPass123');
  await page.clickText('Access Recruiter Workspace');
  const dashboard = await page.waitForText('QA Genomics Lab', 15000);
  record(
    'recruiter-demo-navigation',
    dashboard.includes('QA Genomics Lab'),
    'Recruiter workspace opened with the supplied company',
  );

  await page.evaluate('location.reload()');
  const reloaded = await page.waitForText('QA Genomics Lab', 15000);
  record(
    'demo-session-persistence',
    reloaded.includes('QA Genomics Lab'),
    'Demo recruiter session survived a full reload',
  );

  const openedMenu = await page.evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((node) =>
      (node.textContent || '').includes('QA Genomics Lab Talent Acquisition') &&
      node.querySelector('svg')
    );
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!openedMenu) throw new Error('Recruiter user menu not found');
  await page.waitForText('Company Profile & Settings');
  await page.clickText('Sign Out');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const afterLogout = await page.bodyText();
  record(
    'recruiter-logout',
    afterLogout.includes('Student Login'),
    afterLogout.slice(0, 1200),
  );

  await page.evaluate('location.reload()');
  const afterReload = await page.waitForText('Student Login', 15000);
  record(
    'logout-clears-persisted-session',
    afterReload.includes('Student Login') &&
      !afterReload.includes('QA Genomics Lab'),
    'Reload after logout remains signed out',
  );
  await page.close();
}

async function runTest(name, fn) {
  console.error(`[qa] starting ${name}`);
  try {
    await fn();
    console.error(`[qa] finished ${name}`);
  } catch (error) {
    record(name, false, String(error?.stack ?? error));
    console.error(`[qa] failed ${name}:`, error);
  }
}

async function resetBrowserState() {
  const page = await Page.open(APP);
  await page.evaluate('localStorage.clear(); sessionStorage.clear(); true');
  await page.send('Network.clearBrowserCookies');
  await page.close();
}

async function main() {
  await resetBrowserState();
  await runTest('validation-and-login', testValidationAndLogin);
  await runTest('expired-recovery-link', testExpiredRecoveryLink);
  await runTest('incomplete-oauth-callback', testIncompleteOAuthCallback);
  await runTest('google-oauth-initiation', testGoogleOAuthInitiation);
  await runTest('demo-recruiter-session', testDemoRecruiterSession);

  console.log(JSON.stringify({ results, consoleErrors }, null, 2));
  const failed = results.filter((result) => !result.passed);
  process.exitCode = failed.length > 0 ? 1 : 0;
  setTimeout(() => process.exit(process.exitCode ?? 0), 100);
}

main().catch((error) => {
  console.error('QA script failed:', error);
  console.log(JSON.stringify({ results, consoleErrors }, null, 2));
  process.exitCode = 1;
});
