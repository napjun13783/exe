// ==========================================
// ตั้งค่าระบบ Supabase & Telegram
// ==========================================
const SUPABASE_URL = "https://znaduzusrhntkopejfbr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_w9_2JBY3zX6hMef13QfY8A_xcKdO2RZ";
const TELEGRAM_TOKEN = "8885002492:AAGTW9aV89PosCdYSY33Lhf_qZR5HMui1P0";
const TELEGRAM_CHAT_ID = "-1004384220202";

// ฟังก์ชันดึง Supabase Client
function getSupabaseClient() {
  if (window._supabaseInstance) return window._supabaseInstance;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    window._supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return window._supabaseInstance;
  }
  return null;
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

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);

  // ==========================================
  // 1. ส่วนหน้าแสดงสินค้า
  // ==========================================
  const productContainer = document.getElementById('product-list') || 
                           document.getElementById('product-grid') || 
                           document.getElementById('products');

  if (productContainer) {
    try {
      // 1.1 โหลดข้อมูลสินค้าหลักจาก products.json
      let productsData = [];
      try {
        const res = await fetch('products.json');
        if (res.ok) {
          productsData = await res.json();
        }
      } catch (e) {
        console.warn('ไม่สามารถโหลด products.json ได้:', e);
      }

      // 1.2 ดึงข้อมูลสต็อกจริงจาก Supabase
      let stockMap = {};
      const client = getSupabaseClient();
      if (client) {
        try {
          const { data: stockData } = await client.from('stock').select('*');
          if (stockData) {
            stockData.forEach(item => {
              if (item.product_name) {
                stockMap[item.product_name.trim().toLowerCase()] = Number(item.quantity);
              }
            });
          }
        } catch (e) {
          console.warn('ดึงข้อมูลจาก Supabase ไม่สำเร็จ:', e);
        }
      }

      // 1.3 ผสานข้อมูลสินค้า + จำนวนสต็อก
      if (productsData.length > 0) {
        allProducts = productsData.map(p => {
          const key = (p.name || '').trim().toLowerCase();
          const stockQty = stockMap[key] !== undefined ? stockMap[key] : (p.quantity ?? 10);
          return { ...p, quantity: stockQty };
        });
      }

      // ฟังก์ชันสำหรับแสดงผลการ์ดสินค้า
      window.renderProducts = function(items) {
        if (!items || items.length === 0) {
          productContainer.innerHTML = '
ไม่พบรายการสินค้าในหมวดหมู่นี้';return;}    productContainer.innerHTML = items.map(p => {
      const qty = p.quantity !== undefined ? p.quantity : 10;
      const isOutOfStock = qty <= 0;

      return `
${p.mood ? ${esc(p.mood)} : ''}${p.image ? `` : ''}${esc(p.name)}${p.description ? `${esc(p.description)}` : ''}฿${esc(p.price || 350)}${isOutOfStock ? '❌ สินค้าหมดสต็อก' : `คงเหลือ${qty} ชิ้น`}[${isOutOfStock ? 'สินค้าหมด' : 'สั่งซื้อสินค้า'}
](${isOutOfStock ? '#' : order.html?item=${encodeURIComponent(p.name)}&price=${encodeURIComponent(p.price || 350)}})  `;
}).join('');
};// แสดงสินค้าทั้งหมดconst initialMood = urlParams.get('mood') || 'all';filterProducts(initialMood);// ดักจับเหตุการณ์การกดปุ่มกรอง (Filter)const filterBar = document.getElementById('filter-bar') || document.querySelector('.filter-bar');if (filterBar) {filterBar.addEventListener('click', (e) => {if (e.target.tagName === 'BUTTON') {filterBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));e.target.classList.add('active');const selectedMood = e.target.dataset.mood || e.target.innerText.trim();filterProducts(selectedMood);}});}} catch (err) {console.error(err);productContainer.innerHTML = 'เกิดข้อผิดพลาดในการโหลดสินค้า กรุณารีเฟรชหน้า';}}// ==========================================// 2. ส่วนหน้าสั่งซื้อ (#orderForm)// ==========================================const orderForm = document.getElementById('orderForm');if (orderForm) {const itemInput = document.getElementById('items');const totalInput = document.getElementById('total');if (urlParams.has('item') && itemInput) itemInput.value = urlParams.get('item');
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
    const client = getSupabaseClient();
    let stockStatusMsg = '📊 บันทึกคำสั่งซื้อเรียบร้อย';

    if (client) {
      // 2.1 บันทึกออเดอร์ลงตาราง orders
      const { error: orderErr } = await client.from('orders').insert([{
        customer_name: customerName,
        contact: contact,
        address: address,
        item_name: itemName,
        total: total,
        note: note
      }]);

      if (orderErr) throw new Error('บันทึกออเดอร์ไม่สำเร็จ: ' + orderErr.message);

      // 2.2 ตัดสต็อกสินค้า
      const { data: stockResult, error: stockErr } = await client.rpc('reduce_stock', { target_name: itemName });
      stockStatusMsg = stockErr ? `⚠️ ตัดสต็อกไม่สำเร็จ: \({stockErr.message}` : `📊 สถานะสต็อก:\){stockResult}`;
    }

    // 2.3 ส่งแจ้งเตือน Telegram
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
}// ==========================================// 3. ส่วนหน้า Admin (#ordersTable)// ==========================================const ordersTableBody = document.querySelector('#ordersTable tbody');if (ordersTableBody) {try {const client = getSupabaseClient();if (client) {const { data: orders, error } = await client.from('orders').select('*').order('created_at', { ascending: false });    if (error) throw error;

    if (!orders || orders.length === 0) {
      ordersTableBody.innerHTML = '
