// ==========================================
// ตั้งค่าระบบ Supabase & Telegram
// ==========================================
const SUPABASE_URL = "https://znaduzusrhntkopejfbr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_w9_2JBY3zX6hMef13QfY8A_xcKdO2RZ";
const TELEGRAM_TOKEN = "8885002492:AAGTW9aV89PosCdYSY33Lhf_qZR5HMui1P0";
const TELEGRAM_CHAT_ID = "-1004384220202";

// ฟังก์ชันสำหรับเรียก Supabase Direct API
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

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);

  // ==========================================
  // ส่วนหน้าแสดงสินค้า (products.json + Supabase Stock)
  // ==========================================
  const productList = document.getElementById('product-list');

  if (productList) {
    // โหลด products.json ของคุณ ร่วมกับดึงสต็อกล่าสุดจาก Supabase
    Promise.all([
      fetch('products.json').then(res => {
        if (!res.ok) throw new Error('โหลด products.json ไม่สำเร็จ');
        return res.json();
      }),
      supabaseApi('stock?select=*').catch(() => [])
    ])
    .then(([products, stockList]) => {
      // สร้าง Map จำนวนสต็อกตามชื่อสินค้า
      const stockMap = {};
      (stockList || []).forEach(s => {
        if (s.product_name) stockMap[s.product_name.trim().toLowerCase()] = Number(s.quantity);
      });

      // รวมสต็อกเข้ากับข้อมูลสินค้าเดิม
      const updatedProducts = products.map(p => ({
        ...p,
        quantity: stockMap[(p.name || '').trim().toLowerCase()] ?? 10
      }));

      function renderProducts(items, filter) {
        const filtered = filter === 'all' ? items : items.filter(p => p.mood === filter);
        
        productList.innerHTML = filtered.map(p => {
          const qty = p.quantity ?? 10;
          const isOutOfStock = qty <= 0;

          return `
${esc(p.mood)}${esc(p.name)}${esc(p.description)}฿${esc(p.price)}${isOutOfStock ? '❌ สินค้าหมดสต็อก' : `คงเหลือ${qty} ชิ้น`}[${isOutOfStock ? 'สินค้าหมด' : 'สั่งซื้อสินค้า'}
](${isOutOfStock ? 'javascript:void(0)' : order.html?item=${encodeURIComponent(p.name)}&price=${encodeURIComponent(p.price)}})  `;
}).join('');
}const moodFilter = urlParams.get('mood') || 'all';renderProducts(updatedProducts, moodFilter);const filterBar = document.getElementById('filter-bar');if (filterBar) {const activeBtn = filterBar.querySelector([data-mood="${CSS.escape(moodFilter)}"]);if (activeBtn) activeBtn.classList.add('active');filterBar.addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON') {
    filterBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    renderProducts(updatedProducts, e.target.dataset.mood);
  }
});
}}).catch(err => {console.error(err);productList.innerHTML = 'โหลดสินค้าไม่สำเร็จ กรุณารีเฟรชหน้า';});}// ==========================================// ส่วนหน้าสั่งซื้อ (บันทึก Supabase -> ตัดสต็อก -> แจ้ง Telegram)// ==========================================const orderForm = document.getElementById('orderForm');if (orderForm) {const itemInput = document.getElementById('items');const totalInput = document.getElementById('total');if (urlParams.has('item')) itemInput.value = urlParams.get('item');if (urlParams.has('price')) totalInput.value = urlParams.get('price');orderForm.addEventListener('submit', async (e) => {
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
    // 1. บันทึกลงตาราง orders ใน Supabase
    await supabaseApi('orders', 'POST', [{
      customer_name: customerName,
      contact: contact,
      address: address,
      item_name: itemName,
      total: total,
      note: note
    }]);

    // 2. เรียกฟังก์ชัน reduce_stock เพื่อตัดสต็อก
    let stockStatusMsg = '📊 บันทึกสั่งซื้อเรียบร้อย';
    try {
      const res = await supabaseApi('rpc/reduce_stock', 'POST', { target_name: itemName });
      stockStatusMsg = `📊 สถานะสต็อก: ${res}`;
    } catch (stErr) {
      stockStatusMsg = `⚠️ ตัดสต็อกไม่สำเร็จ: ${stErr.message}`;
    }

    // 3. ส่งข้อความแจ้งเตือนเข้า Telegram
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

    // 4. นำทางไปหน้าขอบคุณ
    window.location.href = 'thankyou.html';

  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    submitBtn.innerText = originalText;
    submitBtn.disabled = false;
  }
});
}// ==========================================// ส่วน Admin (ดึงจาก Supabase แทน CSV)// ==========================================const ordersTableBody = document.querySelector('#ordersTable tbody');if (ordersTableBody) {supabaseApi('orders?select=*&order=created_at.desc').then(orders => {if (!orders || orders.length === 0) {ordersTableBody.innerHTML = '
