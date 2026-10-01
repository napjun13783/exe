// ==========================================
// ตั้งค่าระบบ Supabase & Telegram
// ==========================================
const SUPABASE_URL = "https://znaduzusrhntkopejfbr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_w9_2JBY3zX6hMef13QfY8A_xcKdO2RZ";
const TELEGRAM_TOKEN = "8885002492:AAGTW9aV89PosCdYSY33Lhf_qZR5HMui1P0";
const TELEGRAM_CHAT_ID = "-1004384220202";

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyIW-ydWw3RXqrTwR3GwgFLaxuR0_VuUSSrYneLzw6iqoeBpqNC26DV613jhlsX912d/exec';
const CSV_URL = 'YOUR_CSV_URL'; // ใส่ลิงก์ CSV จริงของคุณ (ถ้ามี)

// ฟังก์ชันดึงข้อมูล Supabase Direct REST API
async function supabaseApi(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`\({SUPABASE_URL}/rest/v1/\){endpoint}`, options);
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// กัน HTML/XSS จากข้อมูลลูกค้าและข้อมูลสินค้า
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&')
    .replace(//g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, ''');
}

// อ่าน CSV ที่มีเครื่องหมายจุลภาคหรือขึ้นบรรทัดใหม่ใน "..." ได้
function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);

  // ==========================================
  // ส่วนหน้าแสดงสินค้า
  // ==========================================
  const productList = document.getElementById('product-list');

  function renderProducts(products, filter) {
    const filtered = filter === 'all' ? products : products.filter(p => p.mood === filter);
    
    if (filtered.length === 0) {
      productList.innerHTML = '
ไม่พบรายการสินค้าในหมวดหมู่นี้';return;}productList.innerHTML = filtered.map(p => {
  const qty = p.quantity !== undefined ? Number(p.quantity) : 10;
  const isOutOfStock = qty <= 0;

  return `
${esc(p.mood)}${esc(p.name)}${esc(p.description)}฿${esc(p.price)}${isOutOfStock ? '❌ สินค้าหมดสต็อก' : `คงเหลือ${qty} ชิ้น`}[${isOutOfStock ? 'สินค้าหมด' : 'สั่งซื้อสินค้า'}
](${isOutOfStock ? 'javascript:void(0)' : order.html?item=${encodeURIComponent(p.name)}&price=${encodeURIComponent(p.price)}})`;
}).join('');}if (productList) {// ดึงข้อมูลสินค้าจาก products.json ควบคู่กับเช็กสต็อกจริงจาก SupabasePromise.all([fetch('products.json').then(res => {if (!res.ok) throw new Error('โหลด products.json ไม่สำเร็จ (HTTP ' + res.status + ')');return res.json();}),supabaseApi('stock?select=*').catch(() => [])]).then(([products, stockList]) => {// จับคู่จำนวนสต็อกกับสินค้าใน products.jsonconst stockMap = {};if (Array.isArray(stockList)) {stockList.forEach(s => {if (s.product_name) stockMap[s.product_name.trim().toLowerCase()] = Number(s.quantity);});}const productsWithStock = products.map(p => {
  const key = (p.name || '').trim().toLowerCase();
  return {
    ...p,
    quantity: stockMap[key] !== undefined ? stockMap[key] : (p.quantity ?? 10)
  };
});

const moodFilter = urlParams.get('mood') || 'all';
renderProducts(productsWithStock, moodFilter);

const filterBar = document.getElementById('filter-bar');
if (filterBar) {
  let activeBtn = null;
  try {
    activeBtn = filterBar.querySelector(`[data-mood="${CSS.escape(moodFilter)}"]`);
  } catch (e) {}
  if (activeBtn) activeBtn.classList.add('active');

  filterBar.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      filterBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      renderProducts(productsWithStock, e.target.dataset.mood || 'all');
    }
  });
}
}).catch(err => {console.error(err);productList.innerHTML = `โหลดสินค้าไม่สำเร็จ: ${esc(err.message)}(โปรดตรวจสอบว่าเปิดหน้าเว็บผ่าน Web Server / GitHub Pages และมีไฟล์ products.json อยู่ในโฟลเดอร์เดียวกัน)`;});}// ==========================================// ส่วนหน้าสั่งซื้อ (Supabase + Telegram + Apps Script)// ==========================================const orderForm = document.getElementById('orderForm');if (orderForm) {const itemInput = document.getElementById('items');const totalInput = document.getElementById('total');if (urlParams.has('item')) itemInput.value = urlParams.get('item');if (urlParams.has('price')) totalInput.value = urlParams.get('price');orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const val = (id) => document.getElementById(id)?.value.trim() || '-';
  const customerName = val('customerName');
  const contact = val('contact');
  const address = val('address');
  const itemName = itemInput?.value || '-';
  const total = Number(totalInput?.value || 0);
  const note = val('note');

  const submitBtn = orderForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerText;
  submitBtn.innerText = 'กำลังส่งคำสั่งซื้อ...';
  submitBtn.disabled = true;

  try {
    // 1. บันทึกคำสั่งซื้อลง Supabase
    await supabaseApi('orders', 'POST', [{
      customer_name: customerName,
      contact: contact,
      address: address,
      item_name: itemName,
      total: total,
      note: note
    }]).catch(err => console.warn('Supabase Insert Error:', err));

    // 2. เรียกตัดสต็อกสินค้าใน Supabase
    let stockStatusMsg = '📊 บันทึกสั่งซื้อเรียบร้อย';
    try {
      const res = await supabaseApi('rpc/reduce_stock', 'POST', { target_name: itemName });
      stockStatusMsg = `📊 สถานะสต็อก: ${res}`;
    } catch (stErr) {
      stockStatusMsg = `⚠️ ตัดสต็อกไม่สำเร็จ: ${stErr.message}`;
    }

    // 3. ส่งข้อความแจ้งเตือน Telegram
    const telegramMsg =
      `🛒 มีออเดอร์ใหม่เข้า! (BareFit)\n` +
      `----------------------------------\n` +
      `👤 ผู้รับ: ${customerName}\n` +
      `📞 ติดต่อ: ${contact}\n` +
      `📦 สินค้า: ${itemName}\n` +
      `📍 ที่อยู่: ${address}\n` +
      `💰 ยอดรวม: ${total} บาท\n` +
      `📝 หมายเหตุ: ${note}\n` +
      `----------------------------------\n` +
      `${stockStatusMsg}`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: telegramMsg })
    }).catch(err => console.warn('Telegram Error:', err));

    // 4. ส่งไป Apps Script เดิมด้วย (ถ้าใส่ลิงก์ไว้)
    if (APPS_SCRIPT_URL && !APPS_SCRIPT_URL.includes('YOUR_')) {
      const payload = new URLSearchParams();
      payload.append('ชื่อ-นามสกุล ผู้รับ', customerName);
      payload.append('เบอร์โทรศัพท์ / LINE ID', contact);
      payload.append('ที่อยู่', address);
      payload.append('รายการสินค้า', itemName);
      payload.append('ยอดรวมทั้งสิ้น (บาท)', total);
      payload.append('ไซส์ที่ต้องการ / หมายเหตุเพิ่มเติม', note);

      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString()
      }).catch(err => console.warn('Apps Script Error:', err));
    }

    // 5. นำทางไปหน้าขอบคุณ
    window.location.href = 'thankyou.html';

  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    submitBtn.innerText = originalText;
    submitBtn.disabled = false;
  }
});
}// ==========================================// ส่วน Admin// ==========================================const ordersTableBody = document.querySelector('#ordersTable tbody');if (ordersTableBody) {supabaseApi('orders?select=*&order=created_at.desc').then(orders => {if (!orders || orders.length === 0) {ordersTableBody.innerHTML = '
