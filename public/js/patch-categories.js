// ═══════════════════════════════════════════════════════════════
//  FLOWCHECK SMART CATEGORIZER — patch-categories.js
//  Drop in: add <script src="/js/patch-categories.js"></script>
//  after app-auth.js. This runs AFTER transactions load and
//  re-categorizes anything sitting in "Other".
//
//  HOW IT WORKS:
//  1. Keyword map catches most merchants by name pattern
//  2. Transfer/payment detector prevents double-counting
//  3. User correction memory respects any manual overrides
//  4. Re-renders spending page after patching
// ═══════════════════════════════════════════════════════════════

var FC_CAT = {
  VERSION: '1.0',
  CORRECTIONS_KEY: 'fc-cat-corrections', // user overrides stored here

  // ── Master keyword map ──
  // Format: [pattern (lowercase), category, subcategory, clean name]
  RULES: [
    // ── FOOD & DINING ──
    [/mcdonald|mcdonalds|mcd/i,             'Food','Fast Food','McDonald\'s'],
    [/chipotle/i,                            'Food','Fast Food','Chipotle'],
    [/taco bell/i,                           'Food','Fast Food','Taco Bell'],
    [/wendy/i,                               'Food','Fast Food','Wendy\'s'],
    [/burger king/i,                         'Food','Fast Food','Burger King'],
    [/chick.fil/i,                           'Food','Fast Food','Chick-fil-A'],
    [/subway/i,                              'Food','Fast Food','Subway'],
    [/domino/i,                              'Food','Delivery','Domino\'s'],
    [/pizza hut/i,                           'Food','Delivery','Pizza Hut'],
    [/doordash|door dash/i,                  'Food','Delivery','DoorDash'],
    [/uber.*eat|ubereats/i,                  'Food','Delivery','Uber Eats'],
    [/grubhub/i,                             'Food','Delivery','Grubhub'],
    [/jimmy john/i,                          'Food','Fast Food','Jimmy John\'s'],
    [/panera/i,                              'Food','Fast Food','Panera Bread'],
    [/starbuck/i,                            'Food','Coffee','Starbucks'],
    [/dunkin/i,                              'Food','Coffee','Dunkin\''],
    [/dutch bros/i,                          'Food','Coffee','Dutch Bros'],
    [/target.*cafe|cafe.*target/i,           'Food','Coffee','Target Café'],
    [/olive garden/i,                        'Food','Restaurant','Olive Garden'],
    [/applebee/i,                            'Food','Restaurant','Applebee\'s'],
    [/ihop/i,                                'Food','Restaurant','IHOP'],
    [/cracker barrel/i,                      'Food','Restaurant','Cracker Barrel'],
    [/denny/i,                               'Food','Restaurant','Denny\'s'],
    [/waffle house/i,                        'Food','Restaurant','Waffle House'],
    [/buffet/i,                              'Food','Restaurant','Buffet'],

    // ── GROCERIES ──
    [/walmart.*grocery|grocery.*walmart/i,   'Groceries','Grocery','Walmart Grocery'],
    [/walmart/i,                             'Shopping','General','Walmart'],
    [/target/i,                              'Shopping','General','Target'],
    [/kroger/i,                              'Groceries','Grocery','Kroger'],
    [/aldi/i,                                'Groceries','Grocery','Aldi'],
    [/whole foods/i,                         'Groceries','Grocery','Whole Foods'],
    [/trader joe/i,                          'Groceries','Grocery','Trader Joe\'s'],
    [/safeway/i,                             'Groceries','Grocery','Safeway'],
    [/publix/i,                              'Groceries','Grocery','Publix'],
    [/hyvee|hy-vee/i,                        'Groceries','Grocery','Hy-Vee'],
    [/365 market/i,                          'Groceries','Grocery','365 Market'],
    [/fresh market/i,                        'Groceries','Grocery','Fresh Market'],
    [/costco/i,                              'Groceries','Warehouse','Costco'],
    [/sam.s club/i,                          'Groceries','Warehouse','Sam\'s Club'],

    // ── GAS & AUTO ──
    [/caseys|casey.s/i,                      'Gas','Gas Station','Casey\'s'],
    [/kwik|kum & go|kumago/i,               'Gas','Gas Station','Kum & Go'],
    [/shell/i,                               'Gas','Gas Station','Shell'],
    [/bp |british petro/i,                   'Gas','Gas Station','BP'],
    [/exxon|mobil/i,                         'Gas','Gas Station','ExxonMobil'],
    [/chevron/i,                             'Gas','Gas Station','Chevron'],
    [/speedway/i,                            'Gas','Gas Station','Speedway'],
    [/quiktrip|quick trip/i,                 'Gas','Gas Station','QuikTrip'],
    [/autozone/i,                            'Auto','Parts','AutoZone'],
    [/o.reilly auto|oreilly/i,              'Auto','Parts','O\'Reilly Auto'],
    [/advance auto/i,                        'Auto','Parts','Advance Auto'],
    [/jiffy lube/i,                          'Auto','Service','Jiffy Lube'],
    [/valvoline/i,                           'Auto','Service','Valvoline'],

    // ── SHOPPING ──
    [/amazon/i,                              'Shopping','Online','Amazon'],
    [/amzn/i,                                'Shopping','Online','Amazon'],
    [/ebay/i,                                'Shopping','Online','eBay'],
    [/etsy/i,                                'Shopping','Online','Etsy'],
    [/best buy/i,                            'Shopping','Electronics','Best Buy'],
    [/apple.*store|apple\.com/i,             'Shopping','Electronics','Apple'],
    [/five below/i,                          'Shopping','Discount','Five Below'],
    [/dollar tree/i,                         'Shopping','Discount','Dollar Tree'],
    [/dollar general/i,                      'Shopping','Discount','Dollar General'],
    [/marshalls/i,                           'Shopping','Clothing','Marshalls'],
    [/tj maxx|tjmaxx/i,                      'Shopping','Clothing','TJ Maxx'],
    [/ross store/i,                          'Shopping','Clothing','Ross'],
    [/old navy/i,                            'Shopping','Clothing','Old Navy'],
    [/gap/i,                                 'Shopping','Clothing','Gap'],
    [/h&m/i,                                 'Shopping','Clothing','H&M'],
    [/shein/i,                               'Shopping','Clothing','SHEIN'],
    [/temu/i,                                'Shopping','Online','Temu'],
    [/jerseys|jersey.*spo/i,                 'Shopping','Clothing','Jersey Store'],
    [/home depot/i,                          'Shopping','Home','Home Depot'],
    [/lowe.s/i,                              'Shopping','Home','Lowe\'s'],
    [/ikea/i,                                'Shopping','Home','IKEA'],

    // ── SUBSCRIPTIONS ──
    [/spotify/i,                             'Subscriptions','Music','Spotify'],
    [/apple.*music/i,                        'Subscriptions','Music','Apple Music'],
    [/netflix/i,                             'Subscriptions','Streaming','Netflix'],
    [/hulu/i,                                'Subscriptions','Streaming','Hulu'],
    [/disney.*plus|disneyplus/i,             'Subscriptions','Streaming','Disney+'],
    [/hbo.*max|max.*hbo/i,                   'Subscriptions','Streaming','Max'],
    [/paramount/i,                           'Subscriptions','Streaming','Paramount+'],
    [/peacock/i,                             'Subscriptions','Streaming','Peacock'],
    [/youtube.*premium/i,                    'Subscriptions','Streaming','YouTube Premium'],
    [/twitch/i,                              'Subscriptions','Gaming','Twitch'],
    [/playstation|psn|ps store/i,            'Subscriptions','Gaming','PlayStation'],
    [/xbox/i,                                'Subscriptions','Gaming','Xbox'],
    [/nintendo/i,                            'Subscriptions','Gaming','Nintendo'],
    [/steam/i,                               'Subscriptions','Gaming','Steam'],
    [/chatgpt|openai/i,                      'Subscriptions','Software','ChatGPT'],
    [/claude|anthropic/i,                    'Subscriptions','Software','Claude'],
    [/microsoft.*365|office 365/i,           'Subscriptions','Software','Microsoft 365'],
    [/adobe/i,                               'Subscriptions','Software','Adobe'],
    [/dropbox/i,                             'Subscriptions','Software','Dropbox'],
    [/icloud/i,                              'Subscriptions','Software','iCloud'],
    [/google.*storage|google.*one/i,         'Subscriptions','Software','Google One'],
    [/crunchyroll/i,                         'Subscriptions','Streaming','Crunchyroll'],
    [/audible/i,                             'Subscriptions','Audio','Audible'],

    // ── HEALTH ──
    [/cvs|walgreen|rite aid/i,               'Health','Pharmacy','Pharmacy'],
    [/planet fitness/i,                      'Health','Gym','Planet Fitness'],
    [/ymca/i,                                'Health','Gym','YMCA'],
    [/anytime fitness/i,                     'Health','Gym','Anytime Fitness'],
    [/doctor|physician|clinic|urgent care/i, 'Health','Medical','Medical'],
    [/hospital/i,                            'Health','Medical','Hospital'],
    [/dentist|dental/i,                      'Health','Medical','Dental'],
    [/optometrist|eye care|lenscrafters/i,   'Health','Medical','Vision'],
    [/therapy|counseling/i,                  'Health','Mental Health','Therapy'],

    // ── UTILITIES & BILLS ──
    [/at&t|att\b/i,                          'Bills','Phone','AT&T'],
    [/verizon/i,                             'Bills','Phone','Verizon'],
    [/t-mobile|tmobile/i,                    'Bills','Phone','T-Mobile'],
    [/cricket wireless/i,                    'Bills','Phone','Cricket'],
    [/comcast|xfinity/i,                     'Bills','Internet','Comcast'],
    [/spectrum/i,                            'Bills','Internet','Spectrum'],
    [/cox comm/i,                            'Bills','Internet','Cox'],
    [/electric|energy|power co/i,            'Bills','Utilities','Electric'],
    [/gas.*utility|natural gas/i,            'Bills','Utilities','Gas Utility'],
    [/water.*util|city.*water/i,             'Bills','Utilities','Water'],
    [/insurance/i,                           'Bills','Insurance','Insurance'],
    [/allstate|geico|progressive|state farm/i,'Bills','Insurance','Auto Insurance'],

    // ── TRAVEL & TRANSPORT ──
    [/uber\b/i,                              'Transport','Rideshare','Uber'],
    [/lyft/i,                                'Transport','Rideshare','Lyft'],
    [/airbnb/i,                              'Travel','Lodging','Airbnb'],
    [/marriott|hilton|hyatt|holiday inn/i,   'Travel','Hotel','Hotel'],
    [/delta|united|american air|southwest/i, 'Travel','Flight','Airline'],
    [/expedia|hotels\.com|booking\.com/i,    'Travel','Booking','Travel Booking'],

    // ── TRANSFERS / PAYMENTS (never count as spending) ──
    [/transfer|zelle|venmo|cashapp|paypal/i, '__TRANSFER__','',''],
    [/payment.*thank|autopay|auto.*pay/i,    '__PAYMENT__','',''],
    [/credit card.*payment|card.*payment/i,  '__PAYMENT__','',''],
    [/mortgage.*payment|loan.*payment/i,     '__DEBT_PAYMENT__','',''],
    [/discover.*payment|chase.*payment/i,    '__PAYMENT__','',''],
  ]
};

// ── Load user corrections from localStorage ──
function getCatCorrections() {
  try {
    return JSON.parse(localStorage.getItem(FC_CAT.CORRECTIONS_KEY) || '{}');
  } catch (e) { return {}; }
}

// ── Save a user correction ──
function saveCatCorrection(merchantKey, newCat) {
  try {
    var corrections = getCatCorrections();
    corrections[merchantKey] = newCat;
    localStorage.setItem(FC_CAT.CORRECTIONS_KEY, JSON.stringify(corrections));
  } catch (e) {}
}

// ── Normalize merchant name for matching ──
function normalizeMerchant(name) {
  return String(name || '')
    .replace(/\*/g, ' ')         // TST*Jerseys → TST Jerseys
    .replace(/\s+/g, ' ')
    .replace(/[0-9]{4,}/g, '')   // remove long numbers
    .trim();
}

// ── Clean merchant display name ──
function cleanMerchantName(raw) {
  var name = normalizeMerchant(raw);
  // Apply rules to get clean name
  for (var i = 0; i < FC_CAT.RULES.length; i++) {
    var rule = FC_CAT.RULES[i];
    if (rule[0].test(name) && rule[3]) return rule[3];
  }
  // Title-case the raw name as fallback
  return name.split(' ').map(function(w) {
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ').substring(0, 30);
}

// ── Categorize a single transaction ──
function fcCategorize(tx) {
  if (!tx || !tx.name) return tx;

  var name = normalizeMerchant(tx.name);
  var corrections = getCatCorrections();
  var corrKey = name.toLowerCase().substring(0, 30);

  // User correction takes priority
  if (corrections[corrKey]) {
    return Object.assign({}, tx, {
      cat: corrections[corrKey],
      cleanName: cleanMerchantName(tx.name),
      userCorrected: true
    });
  }

  // Check rules
  for (var i = 0; i < FC_CAT.RULES.length; i++) {
    var rule = FC_CAT.RULES[i];
    if (rule[0].test(name)) {
      var cat = rule[1];
      // Handle special types
      if (cat === '__TRANSFER__') return Object.assign({}, tx, { cat: 'Transfer', isTransfer: true, cleanName: cleanMerchantName(tx.name) });
      if (cat === '__PAYMENT__') return Object.assign({}, tx, { cat: 'Payment', isPayment: true, cleanName: cleanMerchantName(tx.name) });
      if (cat === '__DEBT_PAYMENT__') return Object.assign({}, tx, { cat: 'Debt Payment', isDebtPayment: true, cleanName: cleanMerchantName(tx.name) });
      return Object.assign({}, tx, {
        cat: cat,
        subcat: rule[2] || '',
        cleanName: rule[3] || cleanMerchantName(tx.name)
      });
    }
  }

  // No match — keep original cat if not "Other", otherwise try amount heuristics
  if (tx.cat && tx.cat !== 'Other' && tx.cat !== 'ND' && tx.cat !== 'OT' && tx.cat !== 'WT') {
    return Object.assign({}, tx, { cleanName: cleanMerchantName(tx.name) });
  }

  // Amount heuristic fallbacks
  var amt = Math.abs(tx.amt || 0);
  var suggestedCat = 'Other';
  if (amt < 5) suggestedCat = 'Food';          // small charges usually food/coffee
  else if (amt > 200) suggestedCat = 'Shopping'; // large charges usually shopping

  return Object.assign({}, tx, {
    cat: suggestedCat,
    cleanName: cleanMerchantName(tx.name)
  });
}

// ── Patch the global logList ──
function patchLogListCategories() {
  if (typeof logList === 'undefined' || !Array.isArray(logList)) return 0;
  var patched = 0;
  for (var i = 0; i < logList.length; i++) {
    var original = logList[i];
    var improved = fcCategorize(original);
    if (improved.cat !== original.cat || improved.cleanName !== original.name) {
      logList[i] = improved;
      patched++;
    }
  }
  return patched;
}

// ── Run on load and after Plaid sync ──
function runCategoryPatch() {
  var count = patchLogListCategories();
  if (count > 0) {
    console.log('[FC Cat] Improved ' + count + ' transaction categories');
    // Re-render spending/transactions if those pages are active
    try {
      if (typeof renderSpending === 'function') renderSpending();
      if (typeof renderTransactions === 'function') renderTransactions();
      if (typeof renderBudget === 'function') renderBudget();
    } catch (e) {}
  }
}

// ── UI: Correction sheet (tap a transaction to reclassify) ──
function openCategoryCorrection(txIndex) {
  var tx = logList && logList[txIndex];
  if (!tx) return;
  var categories = ['Food', 'Groceries', 'Shopping', 'Gas', 'Transport', 'Bills', 'Subscriptions', 'Health', 'Entertainment', 'Travel', 'Auto', 'Other', 'Transfer', 'Payment'];
  var sheet = document.createElement('div');
  sheet.id = 'fc-cat-sheet';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;background:rgba(0,0,0,.6)';
  sheet.innerHTML =
    '<div style="width:100%;background:#1a1a1a;border-radius:24px 24px 0 0;padding:20px;max-height:80vh;overflow-y:auto">' +
      '<div style="width:40px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:0 auto 18px"></div>' +
      '<div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:4px">Reclassify Transaction</div>' +
      '<div style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:16px">' + (tx.cleanName || tx.name) + ' · $' + Math.abs(tx.amt).toFixed(2) + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' +
        categories.map(function(cat) {
          var active = cat === tx.cat;
          return '<button onclick="applyCatCorrection(' + txIndex + ',\'' + cat + '\')" style="' +
            'background:' + (active ? 'rgba(var(--acc-rgb,6,182,212),.15)' : 'rgba(255,255,255,.06)') + ';' +
            'border:1px solid ' + (active ? 'rgba(var(--acc-rgb,6,182,212),.35)' : 'rgba(255,255,255,.08)') + ';' +
            'border-radius:12px;padding:10px 8px;color:' + (active ? 'var(--acc)' : 'rgba(255,255,255,.7)') + ';' +
            'font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">' + cat + '</button>';
        }).join('') +
      '</div>' +
      '<button onclick="document.getElementById(\'fc-cat-sheet\').remove()" style="width:100%;margin-top:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:13px;color:rgba(255,255,255,.5);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer">Cancel</button>' +
    '</div>';
  document.body.appendChild(sheet);
  sheet.addEventListener('click', function(e) { if (e.target === sheet) sheet.remove(); });
}

function applyCatCorrection(txIndex, newCat) {
  var tx = logList && logList[txIndex];
  if (!tx) return;
  var corrKey = normalizeMerchant(tx.name).toLowerCase().substring(0, 30);
  saveCatCorrection(corrKey, newCat);
  // Apply to ALL transactions from this merchant
  if (Array.isArray(logList)) {
    logList.forEach(function(t) {
      var k = normalizeMerchant(t.name).toLowerCase().substring(0, 30);
      if (k === corrKey) t.cat = newCat;
    });
  }
  var sheet = document.getElementById('fc-cat-sheet');
  if (sheet) sheet.remove();
  runCategoryPatch();
  if (typeof haptic === 'function') haptic('medium');
  // Show toast
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(74,222,128,.15);border:1px solid rgba(74,222,128,.3);border-radius:999px;padding:10px 20px;color:#4ade80;font-size:13px;font-weight:700;z-index:9999;white-space:nowrap';
  toast.textContent = '✓ All "' + (tx.cleanName || tx.name) + '" → ' + newCat;
  document.body.appendChild(toast);
  setTimeout(function() { if (toast.parentNode) toast.remove(); }, 2500);
}

// ── Auto-run ──
setTimeout(runCategoryPatch, 1500);

// ── Hook into Plaid sync ──
var _origPlaidSync = window.onPlaidSyncComplete;
window.onPlaidSyncComplete = function() {
  if (typeof _origPlaidSync === 'function') _origPlaidSync.apply(this, arguments);
  setTimeout(runCategoryPatch, 500);
};

console.log('[FC Cat] Smart categorizer loaded');
