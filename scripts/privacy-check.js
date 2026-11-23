#!/usr/bin/env node
'use strict';

// Dependency-free privacy guard for this public fork.
// Does not disclose matched values. Passing does not replace manual review.
const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const tracked = cp.execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0').filter(Boolean);
const textExtensions = new Set(['.md','.txt','.json','.js','.html','.csv','.yml','.yaml','.xml','.svg','.ts','.css']);
const allPatterns = [
  ['Credential token', /\b(?:ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{25,}|AKIA[0-9A-Z]{16})\b/g],
  ['Private key block', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g],
  ['Embedded password in URL', /https?:\/\/[^/\s:]+:[^@\s/]+@/g],
  ['Bearer/JWT credential', /\bBearer\s+eyJ[A-Za-z0-9_-]{20,}(?:\.[A-Za-z0-9_-]+){1,2}/g],
];
const journalPatterns = [
  ['E-mail address', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g],
  ['Private IPv4 address', /\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g],
  ['Personal home-directory path', /\b[A-Za-z]:\\Users\\[^\\/\s]+|\/(?:Users|home)\/[A-Za-z0-9._-]+/g],
  ['Potential 24-character device identifier', /\b[0-9a-f]{24}\b/gi],
  ['Athom CLI login callback', /cli\.athom\.com\?port=\d+/gi],
  ['Potential pasted login code', /paste the code\s*:\s*[0-9a-f]{24,}/gi],
];
const bad = [];
for (const file of tracked) {
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const patterns = [...allPatterns, ...(file.startsWith('docs/energy/') ? journalPatterns : [])];
  for (const [index, line] of lines.entries()) {
    for (const [name, pattern] of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) bad.push({ file, line: index + 1, name });
    }
  }
}
if (bad.length) {
  for (const hit of bad) {
    console.error(hit.file + ':' + hit.line + ': ' + hit.name + '; inspect before publishing');
  }
  console.error('Privacy guard found ' + bad.length + ' potential issue(s). Matched values are hidden.');
  process.exitCode = 1;
} else {
  console.log('Privacy guard: no recognized credentials or identifiers in ' + tracked.length + ' tracked paths.');
}
