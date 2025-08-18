#!/usr/bin/env node
// generate-support-chats.mjs
//
// Generates fake support chat transcripts with personal data categories.
// Creates N .txt files in the specified directory.
//
// Run with:
//   node generate-support-chats.mjs --out ./support_chats --count 1000

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Generates a random integer between min and max (inclusive).
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns - Random integer between min and max
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
/**
 * Picks a random element from an array.
 *
 * @param arr - Array to pick from
 * @returns - Random element from the array
 */
function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

// ----- Data pools -----
const agentNames = ['Sofia', 'Liam', 'Ava', 'Noah', 'Maya', 'Ethan'];
const customerNames = ['Jordan', 'Taylor', 'Sam', 'Alex', 'Casey', 'Riley'];

const openings = [
  'Hi, I need help with',
  "Hello—I'm having trouble with",
  'Can you assist me with',
  'Good morning, question about',
];

const issues = [
  'a double charge on my card',
  'logging into my account',
  'a late delivery',
  'resetting my password',
  'updating my subscription',
  'firmware update errors',
];

// Example personal data categories to sprinkle into chats
const personalData = [
  'Social Security Number: 123-45-6789',
  'User ID: U123456',
  'Username: jordan_92',
  'Declared Interests: hiking, cooking',
  'Profile Picture URL: https://example.com/img/profile123.jpg',
  'User Preferences: marketing_emails=false',
  'Profile URL: https://social.example.com/jordan',
  'IP Address: 192.168.1.42',
  'MAC Address: 00:1B:44:11:3A:B7',
  'User Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X)',
  'Cookies: sessionid=abcd1234',
  'Serial Number: SN-1234567890',
  'Survey Data: Q1=Yes, Q2=No',
  'Private Key: -----BEGIN PRIVATE KEY----- [redacted] -----END PRIVATE KEY-----',
  'Email: jordan@example.com',
  'Phone: +1-202-555-0172',
  'Approximate Geolocation: San Francisco, CA',
  'Date of Birth: 1990-05-12',
  'Gender: Non-binary',
  'Political Affiliation: Independent',
  'Race/Ethnicity: Hispanic',
  'Religion: None',
  'Sexual Orientation: Heterosexual',
  'Union Membership: None',
  'Biometric Identifier: FaceID registered',
];

/**
 * Generate a single chat
 *
 * @param chatId - Unique identifier for the chat
 * @returns - Formatted chat transcript as a string
 */
function generateChat(chatId: number): string {
  const customer = pick(customerNames);
  const agent = pick(agentNames);
  const turns = randomInt(8, 18);

  const lines = [];
  lines.push(`Support Chat Transcript #${chatId}`);
  lines.push('==================================');

  for (let i = 0; i < turns; i += 1) {
    if (i % 2 === 0) {
      // customer
      const msg =
        i === 0
          ? `${pick(openings)} ${pick(issues)}.`
          : chance(0.2)
          ? `Here is my ${pick(personalData)}`
          : 'Can you check on that?';
      lines.push(`${customer}: ${msg}`);
    } else {
      // agent
      const msg = chance(0.3)
        ? `Thanks, can you also provide your ${pick(personalData)}?`
        : 'Let me look that up for you.';
      lines.push(`${agent}: ${msg}`);
    }
  }

  return lines.join('\n');
}

/**
 * Chance function to simulate probability.
 *
 * @param p - Probability of true (0-1)
 * @returns - True with probability p
 */
function chance(p: number): boolean {
  return Math.random() < p;
}

const filename = fileURLToPath(import.meta.url);
const dir = dirname(filename);

const OUT_DIR = join(dir, './support_chats');
const COUNT = Number(process.env.COUNT || 1000);

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

for (let i = 1; i <= COUNT; i += 1) {
  const chat = generateChat(i);
  const filename = join(OUT_DIR, `chat_${i.toString().padStart(4, '0')}.txt`);
  writeFileSync(filename, chat, 'utf8');
}

const logger = console;
logger.log(`✅ Generated ${COUNT} support chat transcripts in ${OUT_DIR}`);
