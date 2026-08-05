import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');
const coverageDir = path.join(webDir, 'coverage');

const baseCssContent = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --bg-main: #0b0f19;
  --bg-card: rgba(15, 23, 42, 0.65);
  --bg-card-hover: rgba(30, 41, 59, 0.5);
  --border-color: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(129, 140, 248, 0.3);
  
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  
  --accent-primary: #818cf8;
  --accent-cyan: #38bdf8;
  
  --high-grad: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  --high-color: #34d399;
  --high-bg: rgba(16, 185, 129, 0.12);
  --high-border: rgba(16, 185, 129, 0.25);
  
  --medium-grad: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  --medium-color: #fbbf24;
  --medium-bg: rgba(245, 158, 11, 0.12);
  --medium-border: rgba(245, 158, 11, 0.25);
  
  --low-grad: linear-gradient(135deg, #f43f5e 0%, #fb7185 100%);
  --low-color: #fb7185;
  --low-bg: rgba(244, 63, 94, 0.15);
  --low-border: rgba(244, 63, 94, 0.3);
}

*, *:after, *:before {
  box-sizing: border-box;
}

body, html {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  background-color: var(--bg-main);
  background-image: 
    radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(16, 185, 129, 0.10) 0px, transparent 50%),
    radial-gradient(at 50% 100%, rgba(139, 92, 246, 0.08) 0px, transparent 50%);
  background-attachment: fixed;
  color: var(--text-primary);
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.wrapper {
  max-width: 1320px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 4rem;
  min-height: calc(100vh - 80px);
}

/* Header Card */
.pad1 {
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

h1 {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--text-primary);
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

h1 a {
  color: var(--accent-primary);
  text-decoration: none;
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.2);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
}

h1 a:hover {
  background: rgba(99, 102, 241, 0.25);
  color: #a5b4fc;
  transform: translateY(-1px);
  text-decoration: none;
}

/* Stats Cards Grid */
.clearfix {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.clearfix::after {
  content: none;
}

.fl.pad1y.space-right2 {
  float: none !important;
  margin: 0 !important;
  padding: 1.25rem 1.5rem !important;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.5rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.fl.pad1y.space-right2:hover {
  transform: translateY(-3px);
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
  box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.4);
}

.strong {
  font-size: 2.25rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: block;
  margin-bottom: 0.25rem;
}

.quiet {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.fl .quiet {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  order: -1;
}

.fraction {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  font-weight: 500;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  width: fit-content;
}

/* Keyboard hint & Filter search */
p.quiet {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 1rem;
  margin-bottom: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

p.quiet em {
  font-style: normal;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

#filterTemplate {
  margin-top: 1.25rem;
  display: block;
}

#fileSearch {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--text-primary);
  padding: 0.65rem 1rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 340px;
  margin-left: 0.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

#fileSearch:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.25), 0 2px 8px rgba(0,0,0,0.3);
}

/* Status Banner Line */
.status-line {
  height: 4px;
  border-radius: 999px;
  margin-bottom: 1.5rem;
}

.status-line.high {
  background: var(--high-grad);
  box-shadow: 0 0 16px rgba(16, 185, 129, 0.5);
}

.status-line.medium {
  background: var(--medium-grad);
  box-shadow: 0 0 16px rgba(245, 158, 11, 0.5);
}

.status-line.low {
  background: var(--low-grad);
  box-shadow: 0 0 16px rgba(244, 63, 94, 0.5);
}

/* Coverage Summary Table */
.coverage-summary {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.coverage-summary thead tr {
  background: rgba(30, 41, 59, 0.7);
}

.coverage-summary th {
  padding: 1.1rem 1.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  border-right: none !important;
  text-align: left;
  white-space: nowrap;
}

.coverage-summary th.pct,
.coverage-summary th.abs,
.coverage-summary td.pct,
.coverage-summary td.abs {
  text-align: right;
}

.coverage-summary tbody tr {
  transition: background 0.15s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.coverage-summary tbody tr:last-child {
  border-bottom: none;
}

.coverage-summary tbody tr:hover {
  background: rgba(255, 255, 255, 0.035);
}

.coverage-summary td {
  padding: 1rem 1.25rem;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 0.9rem;
}

.coverage-summary td.file {
  white-space: nowrap;
  font-weight: 600;
}

.coverage-summary td.file a {
  color: var(--accent-cyan);
  text-decoration: none;
  transition: color 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.coverage-summary td.file a:hover {
  color: #7dd3fc;
  text-decoration: underline;
}

/* Progress bar inside summary table */
.coverage-summary td.pic {
  min-width: 140px !important;
  vertical-align: middle;
}

.chart {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  border: none !important;
}

.cover-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s ease;
  display: block;
}

.cover-empty {
  height: 100%;
  background: transparent;
  display: block;
}

.high .cover-fill {
  background: var(--high-grad);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
}

.medium .cover-fill {
  background: var(--medium-grad);
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
}

.low .cover-fill {
  background: var(--low-grad);
  box-shadow: 0 0 10px rgba(244, 63, 94, 0.4);
}

/* Coverage Badges */
.pct.high { color: var(--high-color); font-weight: 700; }
.pct.medium { color: var(--medium-color); font-weight: 700; }
.pct.low { color: var(--low-color); font-weight: 700; }

.abs {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.825rem;
  color: var(--text-muted);
}

/* Code file coverage view */
pre {
  margin: 0;
}

pre.prettyprint {
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-color) !important;
  border-radius: 18px;
  overflow: hidden;
  padding: 1rem 0 !important;
  margin-top: 1.5rem !important;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

table.coverage {
  border-collapse: collapse;
  width: 100%;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
}

table.coverage td {
  padding: 0;
  vertical-align: top;
}

table.coverage td.line-count {
  padding: 0 1.25rem 0 1rem;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
  user-select: none;
  text-align: right;
  font-size: 0.8rem;
}

table.coverage td.line-count a {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.15s ease;
}

table.coverage td.line-count a:hover {
  color: var(--text-secondary);
}

table.coverage td.line-coverage {
  padding: 0 0.85rem;
  text-align: right;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  min-width: 60px;
  user-select: none;
}

.cline-any {
  display: inline-block;
  padding: 0 0.4rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.75rem;
}

.cline-yes {
  background: var(--high-bg);
  color: var(--high-color);
  border: 1px solid var(--high-border);
}

.cline-no {
  background: var(--low-bg);
  color: var(--low-color);
  border: 1px solid var(--low-border);
  font-weight: 700;
}

.cline-neutral {
  background: transparent;
  color: var(--text-muted);
}

.missing-if-branch {
  display: inline-block;
  margin-right: 6px;
  border-radius: 4px;
  padding: 0 6px;
  background: var(--medium-bg);
  color: var(--medium-color);
  border: 1px solid var(--medium-border);
  font-weight: 700;
  font-size: 0.75rem;
}

/* Sorter arrows */
.coverage-summary .sorter {
  height: 12px;
  width: 12px;
  display: inline-block;
  margin-left: 0.4em;
  vertical-align: middle;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.coverage-summary th:hover .sorter {
  opacity: 1;
}

/* Footer */
.footer {
  margin-top: 3rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.825rem;
  padding: 2rem 0;
  border-top: 1px solid var(--border-color);
}

.footer a {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 600;
}

.footer a:hover {
  text-decoration: underline;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.5);
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
`;

const prettifyCssContent = `/* Tokyo Night Syntax Highlighting Theme for Vitest Coverage */
.pln { color: #a9b1d6; } /* Plain text */

.str { color: #9ece6a; } /* String */
.kwd { color: #bb9af7; font-weight: 600; } /* Keyword */
.com { color: #565f89; font-style: italic; } /* Comment */
.typ { color: #2ac3de; font-weight: 600; } /* Type */
.lit { color: #ff9e64; } /* Literal / Numbers */
.pun, .opn, .clo { color: #89ddff; } /* Punctuation & Brackets */
.tag { color: #f7768e; font-weight: 600; } /* HTML Tag */
.atn { color: #e0af68; } /* Attribute Name */
.atv { color: #9ece6a; } /* Attribute Value */
.dec, .var { color: #7dcfff; } /* Declaration / Variable */
.fun { color: #7aa2f7; font-weight: 600; } /* Function */

pre.prettyprint {
  padding: 1rem 0 !important;
  background: rgba(15, 23, 42, 0.75) !important;
  color: #a9b1d6 !important;
}

/* Line background highlight for uncovered lines */
.cstat-no, .fstat-no, .cbranch-no {
  background: rgba(244, 63, 94, 0.18) !important;
  border-left: 3px solid #f43f5e;
}
`;

if (fs.existsSync(coverageDir)) {
  fs.writeFileSync(path.join(coverageDir, 'base.css'), baseCssContent, 'utf-8');
  fs.writeFileSync(path.join(coverageDir, 'prettify.css'), prettifyCssContent, 'utf-8');
  console.log('Successfully styled Vitest coverage report in web/coverage!');
} else {
  console.warn('coverage directory does not exist yet.');
}
