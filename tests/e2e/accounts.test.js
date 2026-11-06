// Sign Up (S1–S12), Log In (L1–L8) and Access Control (A1–A3).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PASSWORD, expectPath, heading, setup, signUp, signUpAndOnboard, textOf, uniqueEmail, uploadAndIdentify,
} from './helpers.js';

const ctx = setup();

const alert = (page) => page.getByRole('alert');
const passwordField = (page) => page.getByLabel('Password', { exact: true });

async function submitSignUp(page, email, password) {
  await page.getByLabel('Email').fill(email);
  await passwordField(page).fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();
}

async function submitLogIn(page, email, password) {
  await page.getByLabel('Email').fill(email);
  await passwordField(page).fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
}

async function logOut(page) {
  await page.getByRole('button', { name: /menu/i }).click();
  await page.getByRole('button', { name: 'Log Out' }).click();
  await expectPath(page, '/');
}

const accountCount = (page) =>
  page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('rewear:accounts') || '{}')).length);

describe('Sign Up page', () => {
  it('S1–S4 shows email, masked password and Create Account', async () => {
    const page = await ctx.newPage();
    await page.go('/signup');
    assert.ok(await page.getByLabel('Email').isVisible());
    assert.equal(await passwordField(page).getAttribute('type'), 'password');
    assert.ok(await page.getByRole('button', { name: 'Create Account' }).isVisible());
  });

  it('S5 "Already have an account? Log in" shows Log In', async () => {
    const page = await ctx.newPage();
    await page.go('/signup');
    await page.getByRole('link', { name: 'Already have an account? Log in' }).click();
    await expectPath(page, '/login');
  });

  it('S6 a valid new account goes to Question 1', async () => {
    const page = await ctx.newPage();
    await page.go('/signup');
    await submitSignUp(page, uniqueEmail(), PASSWORD);
    await expectPath(page, '/questions/1');
    assert.match(await textOf(page.locator('.question-count')), /Question 1 of 5/);
  });

  it('S7 the new account can log in later and lands on Clothing Upload', async () => {
    const page = await ctx.newPage();
    const { email, password } = await signUp(page);
    await logOut(page);
    await page.go('/login');
    await submitLogIn(page, email, password);
    await expectPath(page, '/upload');
  });

  it('S8 / S12 an email that is already used shows an error and creates nothing', async () => {
    const page = await ctx.newPage();
    const { email } = await signUp(page);
    await logOut(page);
    await page.go('/signup');
    await submitSignUp(page, email.toUpperCase(), 'another-password');
    assert.match(await textOf(alert(page)), /already in use/i);
    await expectPath(page, '/signup');
    assert.equal(await accountCount(page), 1);
  });

  it('S9 / S12 a short password shows the 8-character minimum', async () => {
    const page = await ctx.newPage();
    await page.go('/signup');
    await submitSignUp(page, uniqueEmail(), 'short');
    assert.match(await textOf(alert(page)), /at least 8 characters/i);
    await expectPath(page, '/signup');
    assert.equal(await accountCount(page), 0);
  });

  it('S10 / S12 a badly formatted email shows an invalid-email error', async () => {
    const page = await ctx.newPage();
    await page.go('/signup');
    await submitSignUp(page, 'not-an-email', PASSWORD);
    assert.match(await textOf(alert(page)), /valid email/i);
    assert.equal(await accountCount(page), 0);
  });

  it('S11 / S12 empty fields show an error naming the field', async () => {
    const page = await ctx.newPage();
    await page.go('/signup');
    await submitSignUp(page, '', PASSWORD);
    assert.match(await textOf(alert(page)), /email/i);
    await submitSignUp(page, uniqueEmail(), '');
    assert.match(await textOf(alert(page)), /password/i);
    await expectPath(page, '/signup');
    assert.equal(await accountCount(page), 0);
  });
});

describe('Log In page', () => {
  it('L1–L4 shows email, masked password and Log In', async () => {
    const page = await ctx.newPage();
    await page.go('/login');
    assert.ok(await page.getByLabel('Email').isVisible());
    assert.equal(await passwordField(page).getAttribute('type'), 'password');
    assert.ok(await page.getByRole('button', { name: 'Log In' }).isVisible());
  });

  it('L5 "Create an account" shows Sign Up', async () => {
    const page = await ctx.newPage();
    await page.go('/login');
    await page.getByRole('link', { name: 'Create an account' }).click();
    await expectPath(page, '/signup');
  });

  it('L6 matching email and password show Clothing Upload', async () => {
    const page = await ctx.newPage();
    const { email, password } = await signUp(page);
    await logOut(page);
    await page.go('/login');
    await submitLogIn(page, email, password);
    await expectPath(page, '/upload');
  });

  it('L7 a wrong password or unknown email shows incorrect email or password', async () => {
    const page = await ctx.newPage();
    const { email } = await signUp(page);
    await logOut(page);
    await page.go('/login');
    await submitLogIn(page, email, 'wrong-password');
    assert.match(await textOf(alert(page)), /incorrect email or password/i);
    await submitLogIn(page, 'nobody@example.com', PASSWORD);
    assert.match(await textOf(alert(page)), /incorrect email or password/i);
    await expectPath(page, '/login');
  });

  it('L8 empty fields show an error naming the field', async () => {
    const page = await ctx.newPage();
    await page.go('/login');
    await submitLogIn(page, '', PASSWORD);
    assert.match(await textOf(alert(page)), /email/i);
    await submitLogIn(page, 'someone@example.com', '');
    assert.match(await textOf(alert(page)), /password/i);
  });
});

describe('Access control', () => {
  it('A1 logged out: questions, profile and flow URLs show Log In', async () => {
    const page = await ctx.newPage();
    for (const path of ['/questions/1', '/questions/5', '/profile-complete', '/upload', '/identify', '/preferences', '/ideas', '/ideas/classic-cut-offs']) {
      await page.go(path);
      await expectPath(page, '/login');
      assert.equal(await textOf(heading(page)), 'Welcome back', path);
    }
  });

  it('A2 after Log Out, the browser back button shows Log In', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await uploadAndIdentify(page, 'skirt');
    await logOut(page);
    await page.goBack();
    await expectPath(page, '/login');
    assert.equal(await textOf(heading(page)), 'Welcome back');
  });

  it('A3 without a photo this session, later flow pages show Clothing Upload', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    for (const path of ['/identify', '/preferences', '/ideas', '/ideas/classic-cut-offs']) {
      await page.go(path);
      await expectPath(page, '/upload');
    }
  });
});
