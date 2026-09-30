function lum(h) {
  const c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function cr(a, b) {
  const l1 = lum(a), l2 = lum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return ((hi + 0.05) / (lo + 0.05)).toFixed(2);
}
const pairs = [
  ['ink-0 #edeeef on bg-1 #1e2024', 'edeeef', '1e2024'],
  ['ink-1 #a9afb8 on bg-1 #1e2024', 'a9afb8', '1e2024'],
  ['ink-2 #7d838d on bg-1 #1e2024', '7d838d', '1e2024'],
  ['ink-3 #828893 on bg-1 #1e2024', '828893', '1e2024'],
  ['accent #e5a13d on bg-1 #1e2024', 'e5a13d', '1e2024'],
  ['accent-hi #f0b45c on surface-0 #24262b', 'f0b45c', '24262b'],
  ['accent-ink #221503 on accent #e5a13d', '221503', 'e5a13d'],
  ['sheet-ink #e9e6de on sheet #262329', 'e9e6de', '262329'],
  ['sheet-ink-soft #aaa49a on sheet #262329', 'aaa49a', '262329'],
  ['sheet-ink-faint #948e84 on sheet #262329', '948e84', '262329'],
  ['blue-ink #132338 on blue #8fb5dd', '132338', '8fb5dd'],
  ['blue-ink #132338 on blue-hi #a9c9ea', '132338', 'a9c9ea'],
  ['ghost text #c4d8ef on bg-1 #1e2024', 'c4d8ef', '1e2024'],
  ['sheet code #e9e6de on sheet #262329', 'e9e6de', '262329'],
  ['tok #c9ced6 on screen #17181b', 'c9ced6', '17181b'],
  ['tok-com #7c8798 on screen #17181b', '7c8798', '17181b'],
  ['tok-kw #e58b5a on screen #17181b', 'e58b5a', '17181b'],
  ['tok-num #d9b36a on screen #17181b', 'd9b36a', '17181b'],
  ['green-ink #0d2314 on green #4fc47c (armed Next)', '0d2314', '4fc47c'],
  ['blue-hi #a9c9ea on dl tile #2a2f37 (blue-dim on inset-0)', 'a9c9ea', '2a2f37'],
];
for (const [n, a, b] of pairs) console.log(n.padEnd(42), cr(a, b) + ':1');
