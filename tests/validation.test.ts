import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSafePublicHttpUrl,
  normalizeCurrency,
  parseAndValidateScreenshotDataUrl,
  validateContractId,
  validateEmail,
  validatePositiveAmount,
  validateSplitRatios,
} from '../lib/validation.ts';

describe('Security & Validation Helpers', () => {
  it('blocks private, loopback, metadata, and non-HTTP URLs (SSRF guard)', () => {
    const blocked = [
      'http://localhost:3000',
      'http://127.0.0.1:8080',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.5/admin',
      'http://192.168.1.1',
      'http://172.16.0.1',
      'http://0.0.0.0:3000',
      'http://[::1]:3000',
      'http://metadata.internal/token',
      'file:///etc/passwd',
      'javascript:alert(1)',
      '',
    ];
    for (const url of blocked) {
      assert.equal(isSafePublicHttpUrl(url), false, `Expected blocked URL: ${url}`);
    }
  });

  it('allows valid public HTTPS/HTTP staging URLs', () => {
    assert.equal(isSafePublicHttpUrl('https://nextjs.org'), true);
    assert.equal(isSafePublicHttpUrl('https://nexus-escrow-demo.vercel.app/checkout'), true);
  });

  it('validates finite positive amounts within safe ceiling', () => {
    assert.equal(validatePositiveAmount(1500.129), 1500.13);
    assert.equal(validatePositiveAmount('4000'), 4000);
    assert.equal(validatePositiveAmount(0), null);
    assert.equal(validatePositiveAmount(-50), null);
    assert.equal(validatePositiveAmount('NaN'), null);
    assert.equal(validatePositiveAmount(5_000_000), null);
  });

  it('normalizes supported currencies and falls back to USD', () => {
    assert.equal(normalizeCurrency('eur'), 'EUR');
    assert.equal(normalizeCurrency('GBP'), 'GBP');
    assert.equal(normalizeCurrency('XYZ'), 'USD');
  });

  it('enforces 100% split ratio sum with valid emails', () => {
    assert.equal(
      validateSplitRatios([
        { recipientName: 'Dev', recipientEmail: 'dev@example.com', role: 'Backend', percentage: 70, amount: 700 },
        { recipientName: 'UI', recipientEmail: 'ui@example.com', role: 'Design', percentage: 30, amount: 300 },
      ]),
      true
    );

    assert.equal(
      validateSplitRatios([
        { recipientName: 'Dev', recipientEmail: 'dev@example.com', role: 'Backend', percentage: 60, amount: 600 },
        { recipientName: 'UI', recipientEmail: 'ui@example.com', role: 'Design', percentage: 20, amount: 200 },
      ]),
      false
    );
  });

  it('validates email format, contract IDs, and raster screenshot data URLs', () => {
    assert.equal(validateEmail('alice@example.com'), true);
    assert.equal(validateEmail('not-an-email'), false);
    assert.equal(validateContractId('ESC-8842'), true);
    assert.equal(validateContractId('../bad'), false);

    const validPng = parseAndValidateScreenshotDataUrl('data:image/png;base64,iVBORw0KGgo=');
    assert.ok(validPng);
    assert.equal(validPng.mimeType, 'image/png');

    const validJpg = parseAndValidateScreenshotDataUrl('data:image/jpg;base64,/9j/4AAQSkZJRg==');
    assert.ok(validJpg);
    assert.equal(validJpg.mimeType, 'image/jpeg');

    assert.equal(parseAndValidateScreenshotDataUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), null);
    assert.equal(parseAndValidateScreenshotDataUrl('https://example.com/test.png'), null);
  });
});

