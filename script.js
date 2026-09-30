const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwRYTofrqiijrsYg2A-hIBflqWr6Lpkg-v9ejn0RpuzxNztDGyowtHiinOZMD1flxoC/exec';
const CSV_URL = 'YOUR_CSV_URL';

// ตั้งค่า Telegram Bot
const TELEGRAM_BOT_TOKEN = '8885002492:AAGTW9aV89PosCdYSY33Lhf_qZR5HMui1P0';
const TELEGRAM_CHAT_ID = '-1004384220202';

// ข้อมูลสินค้าสำรองในตัว (ป้องกันปัญหาไฟล์ products.json โหลดไม่ได้)
const PRODUCTS_DATA = [
  { id: 1, name: "BareFit Seamless Briefs (รุ่นไร้ขอบ)", mood: "seamless", price: 129, image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600", description: "บางเบา 0.1mm ไร้รอยต่อ แนบเนื้อ ไม่เห็นขอบเมื่อใส่กางเกงรัดรูป" },
  { id: 2, name: "BareFit Seamless Boxers (ขาสั้นไร้ขอบ)", mood: "seamless", price: 159, image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600", description: "ขาสั้นกันขาเบียด ผ้าลื่นเย็นสบาย กระชับทรงสวย ไม่ม้วนขึ้น" },
  { id: 3, name: "Organic Cotton Everyday Briefs", mood: "cotton", price: 99, image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600", description: "คอตตอนออร์แกนิคแท้ 100% สัมผัสนุ่ม อ่อนโยนต่อผิวสัมผัส" },
  { id: 4, name: "Organic Cotton Boxer Briefs", mood: "cotton", price: 139, image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600", description: "ผ้านุ่มระบายอากาศได้ดีเยี่ยม ลดการสะสมความชื้นตลอดวัน" },
  { id: 5, name: "Pro-Sport Flex Briefs", mood: "sport", price: 149, image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600", description: "ผ้ายืดหยุ่น 4 ทิศทาง แห้งไว ไม่อับชื้น เหมาะสำหรับการออกกำลังกาย" },
  { id: 6, name: "Pro-Sport Active Boxers", mood: "sport", price: 179, image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600", description: "กระชับกล้ามเนื้อ ระบายเหงื่อรวดเร็ว ลดแรงเสียดสีขณะวิ่ง" },
  { id: 7, name: "Ultra Soft Lounge Boxer", mood: "lounge", price: 169, image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600", description: "ทรงหลวมสวมสบาย สัมผัสเบาเหมือนไม่ได้ใส่ เหมาะสำหรับใส่นอน" },
  { id: 8, name: "BareFit Starter Pack (3 ชิ้น)", mood: "lounge", price: 350, image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600", description: "เซ็ตสุดคุ้ม 3 ชิ้น คละสีคลาสสิก (Black / Slate / Nude)" }
];

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);

  // ==========================================
  // 1. ส่วนหน้าแสดงสินค้า
  // ==========================================
  const productList = document.getElementById('product-list');

  function renderProducts(products, filter) {
    if (!productList) return;
    const filtered = filter === 'all' 
      ? products 
      : products.filter(p => (p.mood || '').toLowerCase() === filter.toLowerCase());

    if (filtered.length === 0) {
      productList.innerHTML = '
ไม่พบสินค้าในหมวดหมู่นี้

';
return;
}

productList.innerHTML = filtered.map(p => `
${esc(p.mood)}

${esc(p.name)}
${esc(p.description)}

฿${esc(p.price)}

สั่งซื้อสินค้า

`).join('');
}

if (productList) {
const moodFilter = urlParams.get('mood') || 'all';

// ดึงข้อมูลจากไฟล์ products.json หากล้มเหลวจะสลับไปใช้ PRODUCTS_DATA อัตโนมัติ
fetch('products.json')
.then(res => {
if (!res.ok) throw new Error('Cannot load products.json');
return res.json();
})
.then(products => renderProducts(products, moodFilter))
.catch(() => {
renderProducts(PRODUCTS_DATA, moodFilter);
});

const filterBar = document.getElementById('filter-bar');
if (filterBar) {
const activeBtn = filterBar.querySelector([data-mood="${moodFilter}"]);
if (activeBtn) activeBtn.classList.add('active');

filterBar.addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON') {
    filterBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    renderProducts(PRODUCTS_DATA, e.target.dataset.mood || 'all');
  }
});
}
}

// ==========================================
// 2. ส่วนหน้าสั่งซื้อ (Google Sheet + Telegram)
// ==========================================
const orderForm = document.getElementById('orderForm');
if (orderForm) {
const itemInput = document.getElementById('items');
const totalInput = document.getElementById('total');
if (urlParams.has('item') && itemInput) itemInput.value = urlParams.get('item');
if (urlParams.has('price') && totalInput) totalInput.value = urlParams.get('price');

orderForm.addEventListener('submit', async (e) => {
e.preventDefault();

const customerName = document.getElementById('customerName')?.value || '-';
const contact = document.getElementById('contact')?.value || '-';
const itemList = itemInput?.value || '-';
const address = document.getElementById('address')?.value || '-';
const totalPrice = totalInput?.value || '0';
const note = document.getElementById('note')?.value || '-';

const payload = new URLSearchParams();
payload.append('ชื่อ-นามสกุล ผู้รับ', customerName);
payload.append('เบอร์โทรศัพท์ / LINE ID', contact);
payload.append('ที่อยู่สำหรับจัดส่ง', address);
payload.append('รายการสินค้า', itemList);
payload.append('ยอดรวมทั้งสิ้น (บาท)', totalPrice);
payload.append('ไซส์ที่ต้องการ / หมายเหตุเพิ่มเติม', note);

const submitBtn = orderForm.querySelector('button[type="submit"]');
const originalText = submitBtn ? submitBtn.innerText : 'สั่งซื้อสินค้าทันที';
if (submitBtn) {
  submitBtn.innerText = 'กำลังส่งคำสั่งซื้อ...';
  submitBtn.disabled = true;
}

// ข้อความแจ้งเตือนเข้า Telegram
const telegramMessage = 
  `🛒 **มีออเดอร์ใหม่เข้า! (BareFit)**\n` +
  `----------------------------------\n` +
  `👤 **ผู้รับ:** ${esc(customerName)}\n` +
  `📞 **ติดต่อ:** ${esc(contact)}\n` +
  `📍 **ที่อยู่:** ${esc(address)}\n` +
  `📦 **สินค้า:** ${esc(itemList)}\n` +
  `💰 **ยอดรวม:** ${esc(totalPrice)} บาท\n` +
  `📝 **หมายเหตุ:** ${esc(note)}\n` +
  `----------------------------------`;

try {
  // 1. ส่งเข้า Telegram
  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: telegramMessage,
      parse_mode: 'HTML'
    })
  }).catch(err => console.error('Telegram Error:', err));

  // 2. ส่งไป Google Sheet
  await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString()
  });

  window.location.href = 'thankyou.html';
} catch (err) {
  console.error(err);
  alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
  if (submitBtn) {
    submitBtn.innerText = originalText;
    submitBtn.disabled = false;
  }
}
});
}

// ==========================================
// 3. ส่วน Admin
// ==========================================
const ordersTableBody = document.querySelector('#ordersTable tbody');
if (ordersTableBody && CSV_URL && CSV_URL !== 'YOUR_CSV_URL') {
fetch(CSV_URL)
.then(res => res.text())
.then(csv => {
const rows = csv.split('\n').slice(1);
ordersTableBody.innerHTML = rows.reverse().map(row => {
if (!row.trim()) return '';
const cols = row.split(',');
return `
