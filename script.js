// ==========================================
// ตั้งค่าระบบ Supabase & Telegram
// ==========================================
const SUPABASE_URL = "https://znaduzusrhntkopejfbr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_w9_2JBY3zX6hMef13QfY8A_xcKdO2RZ";
const TELEGRAM_TOKEN = "8885002492:AAGTW9aV89PosCdYSY33Lhf_qZR5HMui1P0";
const TELEGRAM_CHAT_ID = "-1004384220202";

// เรียกใช้งาน Supabase Client
function getSupabaseClient() {
  if (window._supabaseInstance) return window._supabaseInstance;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    window._supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return window._supabaseInstance;
  }
  throw new Error("ไม่พบ Supabase SDK กรุณาใส่  ในส่วน  ของ HTML");
}

// กัน HTML/XSS จากข้อมูลลูกค้าและข้อมูลสินค้า
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&')
    .replace(//g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, ''');
}

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);

  // ==========================================
  // 1. ส่วนหน้าแสดงสินค้า (#product-list)
  // ==========================================
  const productList = document.getElementById('product-list');

  if (productList) {
    try {
      const client = getSupabaseClient();
      const { data: products, error } = await client.from('stock').select('*');
      if (error) throw error;

      function renderProducts(items, filter) {
        const filtered = filter === 'all' 
          ? items 
          : items.filter(p => p.product_name.toLowerCase().includes(filter.toLowerCase()));

        if (filtered.length === 0) {
          productList.innerHTML = '
ไม่พบรายการสินค้า';return;}    productList.innerHTML = filtered.map(p => `
${esc(p.product_name)}${p.quantity > 0 ? `คงเหลือ${p.quantity} ชิ้น` : 'สินค้าหมดสต็อก'}
${p.quantity > 0 ? 'สั่งซื้อสินค้า' : 'สินค้าหมด'}
`).join('');
}const moodFilter = urlParams.get('mood') || 'all';renderProducts(products, moodFilter);const filterBar = document.getElementById('filter-bar');if (filterBar) {const activeBtn = filterBar.querySelector([data-mood="${CSS.escape(moodFilter)}"]);if (activeBtn) activeBtn.classList.add('active');filterBar.addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON') {
    filterBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    renderProducts(products, e.target.dataset.mood);
  }
});
}} catch (err) {console.error(err);productList.innerHTML = 'โหลดสินค้าไม่สำเร็จ กรุณารีเฟรชหน้าใหม่อีกครั้ง';}}// ==========================================// 2. ส่วนหน้าสั่งซื้อ (#orderForm)// ==========================================const orderForm = document.getElementById('orderForm');if (orderForm) {const itemInput = document.getElementById('items');const totalInput = document.getElementById('total');if (urlParams.has('item') && itemInput) itemInput.value = urlParams.get('item');
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

    // 2.1 บันทึกออเดอร์ลงตาราง orders ใน Supabase
    const { error: orderErr } = await client.from('orders').insert([{
      customer_name: customerName,
      contact: contact,
      address: address,
      item_name: itemName,
      total: total,
      note: note
    }]);

    if (orderErr) throw new Error('บันทึกออเดอร์ลง Supabase ไม่สำเร็จ: ' + orderErr.message);

    // 2.2 เรียกใช้ฟังก์ชันตัดสต็อกใน Supabase
    const { data: stockResult, error: stockErr } = await client.rpc('reduce_stock', { target_name: itemName });
    const stockStatusMsg = stockErr ? `⚠️ ตัดสต็อกไม่สำเร็จ: \({stockErr.message}` : `📊 สถานะสต็อก:\){stockResult}`;

    // 2.3 ส่งข้อความแจ้งเตือนเข้า Telegram
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

    // 2.4 เปลี่ยนหน้าไปขอบคุณลูกค้า
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
}// ==========================================// 3. ส่วนหน้า Admin (#ordersTable)// ==========================================const ordersTableBody = document.querySelector('#ordersTable tbody');if (ordersTableBody) {try {const client = getSupabaseClient();const { data: orders, error } = await client.from('orders').select('*').order('created_at', { ascending: false });  if (error) throw error;

  if (!orders || orders.length === 0) {
    ordersTableBody.innerHTML = '
