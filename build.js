#!/usr/bin/env node
/*
 * MoveBreak — build script
 *
 * Concatène src/template.html + src/app.jsx → movebreak.html.
 * Aucune dépendance npm. Node 16+ suffit.
 *
 * Usage : node build.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const TEMPLATE = path.join(ROOT, "src", "template.html");
const APP = path.join(ROOT, "src", "app.jsx");
const OUT = path.join(ROOT, "movebreak.html");

function read(file) {
  if (!fs.existsSync(file)) {
    console.error(`✗ Fichier introuvable : ${file}`);
    process.exit(1);
  }
  return fs.readFileSync(file, "utf8");
}

const template = read(TEMPLATE);
const app = read(APP);

if (!template.includes("%APP%")) {
  console.error("✗ Le template doit contenir le placeholder %APP%");
  process.exit(1);
}

const html = template.replace("%APP%", app);

fs.writeFileSync(OUT, html);

const sizeKb = (html.length / 1024).toFixed(1);
console.log(`✓ movebreak.html généré (${sizeKb} Ko, ${html.split("\n").length} lignes)`);
