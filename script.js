// ==========================================
// ตั้งค่าระบบ Supabase & Telegram
// ==========================================
const SUPABASE_URL = "https://znaduzusrhntkopejfbr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_w9_2JBY3zX6hMef13QfY8A_xcKdO2RZ";
const TELEGRAM_TOKEN = "8885002492:AAGTW9aV89PosCdYSY33Lhf_qZR5HMui1P0";
const TELEGRAM_CHAT_ID = "-1004384220202";

// รายการสินค้าหลัก (แสดงผลทันทีแบบ 100% ไม่ต้องรอ Network)
const DEFAULT_PRODUCTS = [
  { name: "Pro-Sport Active Boxers", price: 350, mood: "Sport Flex", description: "กระชับ ระบายอากาศได้ดี เหมาะกับกิจกรรมสปอร์ต", quantity: 10 },
  { name: "Organic Cotton Everyday Briefs", price: 350, mood: "Cotton (ผ้านุ่ม)", description: "ผ้าคอตตอนออร์แกนิค นุ่มสบาย สวมใส่ได้ทุกวัน", quantity: 10 },
  { name: "Bamboo Antibacterial Boxers", price: 350, mood: "Cotton (ผ้านุ่ม)", description: "เส้นใยไผ่ธรรมชาติ ยับยั้งแบคทีเรีย ลดกลิ่นอับ", quantity: 10 },
  { name: "BareFit Seamless Boxers (ขาสั้นไร้ขอบ)", price: 350, mood: "Seamless (ไร้ขอบ)", description: "รุ่นไร้ขอบ ยืดหยุ่น บางเบา ไม่รั้ง ไม่แนบสนิท", quantity: 9 },
  { name: "BareFit Seamless Briefs (รุ่นไร้ขอบ)", price: 350, mood: "Seamless (ไร้ขอบ)", description: "ทรงบรีฟไร้ขอบ เบาสบาย เรียบเนียนไปกับกางเกง", quantity: 3 },
  { name: "Organic Cotton Boxer Briefs", price: 350, mood: "Cotton (ผ้านุ่ม)", description: "ทรงบ็อกเซอร์บรีฟ ผ้านุ่ม สัมผัสอ่อนโยนต่อผิว", quantity: 10 },
  { name: "Ultra Soft Lounge Boxer", price: 350, mood: "Lounge & Set", description: "ผ้านุ่มพิเศษ ใส่อยู่บ้านหรือใส่นอนก็ผ่อนคลาย", quantity: 10 },
  { name: "Pro-Sport Flex Briefs", price: 350, mood: "Sport Flex", description: "ยืดหยุ่นสูง เคลื่อนไหวคล่องตัว ไม่ย้วยง่าย", quantity: 10 },
  { name: "BareFit Starter Pack (3 ชิ้น)", price: 990, mood: "Lounge & Set", description: "แพ็กสุดคุ้ม รวมรุ่นยอดฮิต 3 ชิ้นในกล่องเดียว", quantity: 9 },
  { name: "Modal Premium Luxe Briefs", price: 350, mood: "Cotton (ผ้านุ่ม)", description: "ผ้าโมดัลพรีเมียม สัมผัสเย็น นุ่มลื่นดุจไหม", quantity: 10 }
];

let activeProductsList = [...DEFAULT_PRODUCTS];

// ฟังก์ชันเรียกใช้งาน Supabase REST API Direct
async function fetchSupabase(endpoint, options = {}) {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(`\({SUPABASE_URL}/rest/v1/\){endpoint}`, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&').replace(//g, '>').replace(/"/g, '"').replace(/'/g, ''');
}

// ฟังก์ชันค้นหา/สร้างกล่องแสดงสินค้าอัตโนมัติ
function findOrCreateProductContainer() {
  let container = document.getElementById('product-list') || 
                    document.getElementById('product-grid') || 
                    document.getElementById('products') || 
                    document.querySelector('.product-grid') || 
                    document.querySelector('.products');

  if (!container) {
    const buttons = document.querySelectorAll('button');
    let filterParent = null;
    buttons.forEach(btn => {
      if (btn.innerText.includes('ทั้งหมด') || btn.innerText.includes('Seamless')) {
        filterParent = btn.parentElement;
      }
    });

    if (filterParent) {
      container = document.createElement('div');
      container.id = 'barefit-auto-grid';
      filterParent.parentNode.insertBefore(container, filterParent.nextSibling);
    }
  }

  return container || document.querySelector('main') || document.body;
}

// ฟังก์ชันวาดการ์ดสินค้า
function renderProductCards(container, items) {
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = '
ไม่พบรายการสินค้าในหมวดหมู่นี้';return;}container.innerHTML = `${items.map(p => {const qty = Number(p.quantity ?? 0);const isOutOfStock = qty <= 0;return `${esc(p.mood)}${esc(p.name)}${esc(p.description)}฿${esc(p.price)}${isOutOfStock ? '❌ สินค้าหมด' : `คงเหลือ${qty} ชิ้น`}[${isOutOfStock ? 'สินค้าหมด' : 'สั่งซื้อสินค้า'}
](${isOutOfStock ? 'javascript:void(0)' : order.html?item=${encodeURIComponent(p.name)}&price=${encodeURIComponent(p.price)}})`;}).join('')}`;}// ฟังก์ชันกรองหมวดหมู่สินค้าfunction filterCategory(category) {const container = findOrCreateProductContainer();const target = (category || 'all').trim().toLowerCase();// อัปเดตสีปุ่ม Activedocument.querySelectorAll('button').forEach(btn => {const txt = btn.innerText.trim().toLowerCase();if (txt === target || (target === 'all' && txt.includes('ทั้งหมด'))) {btn.style.background = '#111';btn.style.color = '#fff';} else if (btn.innerText.includes(' Seamless') || btn.innerText.includes('Cotton') || btn.innerText.includes('Sport') || btn.innerText.includes('Lounge') || btn.innerText.includes('ทั้งหมด')) {btn.style.background = '#f5f5f5';btn.style.color = '#333';}});if (target === 'all' || target === 'ทั้งหมด' || target === '') {renderProductCards(container, activeProductsList);return;}const filtered = activeProductsList.filter(p => {const mood = (p.mood || '').toLowerCase();const name = (p.name || '').toLowerCase();if (target.includes('seamless') || target.includes('ไร้ขอบ')) return mood.includes('seamless') || name.includes('seamless') || name.includes('ไร้ขอบ');
if (target.includes('cotton') || target.includes('ผ้า')) return mood.includes('cotton') || name.includes('cotton');
if (target.includes('sport') || target.includes('flex')) return mood.includes('sport') || name.includes('sport') || name.includes('flex');
if (target.includes('lounge') || target.includes('set')) return mood.includes('lounge') || name.includes('lounge') || name.includes('starter') || name.includes('pack');

return mood.includes(target) || name.includes(target);
});renderProductCards(container, filtered);}// เริ่มต้นระบบasync function initApp() {const container = findOrCreateProductContainer();// 1. แสดงผลสินค้าเริ่มต้นทันที (ไม่ให้หน้าว่าง)if (container && !document.getElementById('orderForm') && !document.getElementById('ordersTable')) {renderProductCards(container, activeProductsList);// 2. ดึงจำนวนสต็อกล่าสุดจาก Supabase มาอัปเดตแบบเรียลไทม์
try {
  const stockData = await fetchSupabase('stock?select=*');
  if (stockData && stockData.length > 0) {
    stockData.forEach(s => {
      const item = activeProductsList.find(p => p.name.trim().toLowerCase() === s.product_name.trim().toLowerCase());
      if (item) item.quantity = Number(s.quantity);
    });
    filterCategory('all');
  }
} catch (e) {
  console.warn('เชื่อมต่อ Supabase ไม่สำเร็จ ใช้สต็อกสำรอง:', e);
}

// 3. ผูก Event กรองสินค้ากับปุ่มบนหน้าเว็บ
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn) {
    const cat = btn.dataset.mood || btn.innerText.trim();
    filterCategory(cat);
  }
});
}// ==========================================// ส่วนหน้าสั่งซื้อ (#orderForm)// ==========================================const orderForm = document.getElementById('orderForm');if (orderForm) {const urlParams = new URLSearchParams(window.location.search);const itemInput = document.getElementById('items');const totalInput = document.getElementById('total');if (urlParams.has('item') && itemInput) itemInput.value = urlParams.get('item');
if (urlParams.has('price') && totalInput) totalInput.value = urlParams.get('price');

orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const val = (id) => document.getElementById(id)?.value.trim() || '-';
  const customerName = val('customerName');
  const contact = val('contact');
  const address = val('address');
  const itemName = itemInput?.value || '-';
  const total = Number(totalInput?.value || 0);
  const note = val('note');

  const submitBtn = orderForm.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.innerText = 'กำลังส่งคำสั่งซื้อ...';
    submitBtn.disabled = true;
  }

  try {
    await fetchSupabase('orders', {
      method: 'POST',
      body: JSON.stringify([{ customer_name: customerName, contact: contact, address: address, item_name: itemName, total: total, note: note }])
    });

    let stockMsg = '📊 บันทึกคำสั่งซื้อสำเร็จ';
    try {
      const stockRes = await fetchSupabase('rpc/reduce_stock', {
        method: 'POST',
        body: JSON.stringify({ target_name: itemName })
      });
      stockMsg = `📊 สถานะสต็อก: ${stockRes}`;
    } catch (err) {
      stockMsg = `⚠️ ตัดสต็อกไม่สำเร็จ: ${err.message}`;
    }

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
      `${stockMsg}`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: telegramMsg })
    });

    window.location.href = 'thankyou.html';

  } catch (err) {
    alert('เกิดข้อผิดพลาด: ' + err.message);
    if (submitBtn) {
      submitBtn.innerText = 'ส่งข้อมูล';
      submitBtn.disabled = false;
    }
  }
});
}// ==========================================// ส่วนหน้า Admin (#ordersTable)// ==========================================const ordersTableBody = document.querySelector('#ordersTable tbody');if (ordersTableBody) {try {const orders = await fetchSupabase('orders?select=*&order=created_at.desc');if (!orders || orders.length === 0) {ordersTableBody.innerHTML = '
