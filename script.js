// ==========================================
// ตั้งค่าระบบ Supabase & Telegram
// ==========================================
const SUPABASE_URL = "https://znaduzusrhntkopejfbr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_w9_2JBY3zX6hMef13QfY8A_xcKdO2RZ";
const TELEGRAM_TOKEN = "8885002492:AAGTW9aV89PosCdYSY33Lhf_qZR5HMui1P0";
const TELEGRAM_CHAT_ID = "-1004384220202";

// ฟังก์ชันสำหรับยิง Supabase REST API โดยตรง (ไม่ต้องใช้ SDK)
async function supabaseFetch(endpoint, options = {}) {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  const res = await fetch(`\({SUPABASE_URL}/rest/v1/\){endpoint}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Supabase API Error (\({res.status}):\){errorText}`);
  }

  // ถ้าไม่มี Content กลับมา (เช่น 204 No Content) ให้คืนค่า array ว่าง
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// กัน HTML/XSS
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&')
    .replace(//g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, ''');
}

let allProducts = [];

// ฟังก์ชันหลักทำงานเมื่อหน้าเว็บพร้อม
async function initApp() {
  const urlParams = new URLSearchParams(window.location.search);

  // ==========================================
  // 1. ส่วนหน้าแสดงสินค้า (Product List / Grid)
  // ==========================================
  // ค้นหา Element สำหรับแสดงสินค้าแบบยืดหยุ่น
  const productContainer = document.getElementById('product-list') || 
                           document.getElementById('product-grid') || 
                           document.querySelector('.product-grid') ||
                           document.getElementById('products') ||
                           document.querySelector('main');

  if (productContainer && !document.getElementById('orderForm') && !document.getElementById('ordersTable')) {
    try {
      // 1.1 ดึงข้อมูลสต็อกสินค้าโดยตรงจาก Supabase REST API
      const stockData = await supabaseFetch('stock?select=*');

      if (!stockData || stockData.length === 0) {
        productContainer.innerHTML = '
ไม่พบรายการสินค้าในระบบ';return;}  // 1.2 แปลงข้อมูลและจัดหมวดหมู่
  allProducts = stockData.map(s => {
    let mood = 'Seamless';
    const nameLower = (s.product_name || '').toLowerCase();
    
    if (nameLower.includes('cotton')) mood = 'Cotton';
    else if (nameLower.includes('sport') || nameLower.includes('flex')) mood = 'Sport Flex';
    else if (nameLower.includes('lounge') || nameLower.includes('starter') || nameLower.includes('pack')) mood = 'Lounge & Set';
    else if (nameLower.includes('seamless') || nameLower.includes('ไร้ขอบ')) mood = 'Seamless';

    return {
      name: s.product_name,
      price: 350,
      description: 'กางเกงชั้นในชาย BareFit สวมใส่สบาย ผ้านุ่ม ยืดหยุ่นดีเยี่ยม',
      mood: mood,
      quantity: Number(s.quantity ?? 0)
    };
  });

  // 1.3 ฟังก์ชันวาดการ์ดสินค้า
  window.renderProducts = function(items) {
    if (!items || items.length === 0) {
      productContainer.innerHTML = '
ไม่พบรายการสินค้าในหมวดหมู่นี้';return;}    productContainer.innerHTML = `
${items.map(p => {const qty = Number(p.quantity ?? 0);const isOutOfStock = qty <= 0;return `${esc(p.mood)}${esc(p.name)}${esc(p.description)}฿${esc(p.price)}${isOutOfStock ? '❌ สินค้าหมดสต็อก' : `คงเหลือ${qty} ชิ้น`}[${isOutOfStock ? 'สินค้าหมด' : 'สั่งซื้อสินค้า'}
](${isOutOfStock ? 'javascript:void(0)' : order.html?item=${encodeURIComponent(p.name)}&price=${encodeURIComponent(p.price)}})`;}).join('')}`;
};// แสดงสินค้าเริ่มต้นconst initialMood = urlParams.get('mood') || 'all';filterProducts(initialMood);// ดักจับปุ่มกรองหมวดหมู่บนหน้าเว็บdocument.addEventListener('click', (e) => {const btn = e.target.closest('button, .btn-filter');if (btn) {const category = btn.dataset.mood || btn.innerText.trim();if (category) filterProducts(category);}});} catch (err) {console.error('Error:', err);productContainer.innerHTML = `เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า: ${esc(err.message)}`;}}// ==========================================// 2. ส่วนหน้าสั่งซื้อ (#orderForm)// ==========================================const orderForm = document.getElementById('orderForm');if (orderForm) {const itemInput = document.getElementById('items');const totalInput = document.getElementById('total');if (urlParams.has('item') && itemInput) itemInput.value = urlParams.get('item');
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
  const originalText = submitBtn ? submitBtn.innerText : 'ส่งข้อมูล';
  if (submitBtn) {
    submitBtn.innerText = 'กำลังส่งคำสั่งซื้อ...';
    submitBtn.disabled = true;
  }

  try {
    // 2.1 บันทึกออเดอร์ลงตาราง orders
    await supabaseFetch('orders', {
      method: 'POST',
      body: JSON.stringify([{
        customer_name: customerName,
        contact: contact,
        address: address,
        item_name: itemName,
        total: total,
        note: note
      }])
    });

    // 2.2 เรียกฟังก์ชันตัดสต็อก reduce_stock
    let stockStatusMsg = '📊 บันทึกคำสั่งซื้อเรียบร้อย';
    try {
      const stockResult = await supabaseFetch('rpc/reduce_stock', {
        method: 'POST',
        body: JSON.stringify({ target_name: itemName })
      });
      stockStatusMsg = `📊 สถานะสต็อก: ${stockResult}`;
    } catch (stErr) {
      stockStatusMsg = `⚠️ ตัดสต็อกไม่สำเร็จ: ${stErr.message}`;
    }

    // 2.3 แจ้งเตือนเข้า Telegram
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
    });

    window.location.href = 'thankyou.html';

  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการส่งข้อมูล: ' + err.message);
    if (submitBtn) {
      submitBtn.innerText = originalText;
      submitBtn.disabled = false;
    }
  }
});
}// ==========================================// 3. ส่วนหน้า Admin (#ordersTable)// ==========================================const ordersTableBody = document.querySelector('#ordersTable tbody');if (ordersTableBody) {try {const orders = await supabaseFetch('orders?select=*&order=created_at.desc');  if (!orders || orders.length === 0) {
    ordersTableBody.innerHTML = '
