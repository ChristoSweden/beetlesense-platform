import { test as base, type Page, type BrowserContext } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

interface TestUser {
  email: string;
  password: string;
  role: 'owner' | 'pilot' | 'inspector';
  fullName: string;
}

const TEST_USERS: Record<string, TestUser> = {
  owner: {
    email: 'e2e-owner@beetlesense.test',
    password: 'TestOwner2026!',
    role: 'owner',
    fullName: 'Test Skogsägare',
  },
  pilot: {
    email: 'e2e-pilot@beetlesense.test',
    password: 'TestPilot2026!',
    role: 'pilot',
    fullName: 'Test Drönar Pilot',
  },
  inspector: {
    email: 'e2e-inspector@beetlesense.test',
    password: 'TestInspector2026!',
    role: 'inspector',
    fullName: 'Test Inspektör',
  },
};

async function ensureTestUser(
  supabase: SupabaseClient,
  user: TestUser,
): Promise<string> {
  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users.find((u) => u.email === user.email);

  if (existing) return existing.id;

  // Create the test user via admin API
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      full_name: user.fullName,
      role: user.role,
    },
  });

  if (error) throw new Error(`Failed to create test user ${user.email}: ${error.message}`);
  return data.user.id;
}

async function authenticateUser(
  context: BrowserContext,
  baseURL: string,
  user: TestUser,
): Promise<void> {
  // Sign in via Supabase client to get a valid session
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (error) throw new Error(`Failed to sign in as ${user.email}: ${error.message}`);

  const session = data.session;
  if (!session) throw new Error(`No session returned for ${user.email}`);

  // Inject session into browser storage so the app picks it up
  const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
  const storageValue = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: 'bearer',
    user: session.user,
  });

  await context.addCookies([]);
  // Set the Supabase auth token in localStorage for the app domain
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    [storageKey, storageValue],
  );
  await page.close();
}

type AuthFixtures = {
  ownerPage: Page;
  pilotPage: Page;
  inspectorPage: Page;
};

export const test = base.extend<AuthFixtures>({
  ownerPage: async ({ browser, baseURL }, use) => {
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await ensureTestUser(adminSupabase, TEST_USERS.owner);

    const context = await browser.newContext();
    await authenticateUser(context, baseURL!, TEST_USERS.owner);

    const page = await context.newPage();
    await page.goto(baseURL!, { waitUntil: 'networkidle' });

    await use(page);
    await context.close();
  },

  pilotPage: async ({ browser, baseURL }, use) => {
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await ensureTestUser(adminSupabase, TEST_USERS.pilot);

    const context = await browser.newContext();
    await authenticateUser(context, baseURL!, TEST_USERS.pilot);

    const page = await context.newPage();
    await page.goto(baseURL!, { waitUntil: 'networkidle' });

    await use(page);
    await context.close();
  },

  inspectorPage: async ({ browser, baseURL }, use) => {
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await ensureTestUser(adminSupabase, TEST_USERS.inspector);

    const context = await browser.newContext();
    await authenticateUser(context, baseURL!, TEST_USERS.inspector);

    const page = await context.newPage();
    await page.goto(baseURL!, { waitUntil: 'networkidle' });

    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
export { TEST_USERS };
