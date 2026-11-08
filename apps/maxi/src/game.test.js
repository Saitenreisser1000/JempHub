// Rauchtest: Seite ist vollständig, das Spielskript lässt sich übersetzen und alle benötigten Elemente sind da.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const html = await readFile(resolve(import.meta.dirname, '..', 'index.html'), 'utf8');

test('Seite ist ein vollständiges HTML-Dokument', () => {
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<title>Maxis Bierkiste<\/title>/);
  assert.match(html, /<\/html>\s*$/);
});

test('Spielskript ist gültiges JavaScript', () => {
  const m = html.match(/<script>([\s\S]*)<\/script>/);
  assert.ok(m, 'Inline-Skript fehlt');
  assert.doesNotThrow(() => new vm.Script(m[1]));
});

test('Alle Elemente, die das Skript anspricht, sind vorhanden', () => {
  const ids = [...html.matchAll(/\$\('([A-Za-z]+)'\)/g)].map(x => x[1]);
  for (const id of new Set(ids)) assert.match(html, new RegExp(`id="${id}"`), `#${id} fehlt`);
});
