const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzj4Fzm4wlYbfZkEOGG8CSSPJrDf9M1s67zHV1VFVUIHPJnF0hw8KmmNH72onmgJijysg/exec';
const TELEGRAM_BOT_TOKEN = '8885002492:AAGTW9aV89PosCdYSY33Lhf_qZR5HMui1P0';
const TELEGRAM_CHAT_ID = '-1004384220202';

// แปลงข้อความป้องกัน HTML พัง
function esc(str) {
  if (str === null || str === undefined) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

// ยิงแจ้งเตือนเข้า Telegram
async function sendTelegramNotification(message) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    return data.ok;
  } catch (error) {
    console.error('Telegram Error:', error);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);

  // ==========================================
  // 1. โหลดและแสดงรายการสินค้า
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
${p.mood ? ${esc(p.mood)} : ''}
${p.image ? `

` : ''}

${esc(p.name)}
${esc(p.description)}

฿${esc(p.price)}

สั่งซื้อสินค้า

`).join('');
}

if (productList) {
fetch('products.json')
.then(res => {
if (!res.ok) throw new Error('ไม่สามารถดึงไฟล์ products.json ได้');
return res.json();
})
.then(products => {
const moodFilter = urlParams.get('mood') || 'all';

  // Active ปุ่ม Filter ตาม URL หรือ Default
  const filterBar = document.getElementById('filter-bar');
  if (filterBar) {
    const activeBtn = filterBar.querySelector(`button[data-mood="${moodFilter}"]`) || filterBar.querySelector('button[data-mood="all"]');
    if (activeBtn) activeBtn.classList.add('active');

    filterBar.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        filterBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderProducts(products, e.target.dataset.mood || 'all');
      }
    });
  }

  renderProducts(products, moodFilter);
})
.catch(err => {
  console.error(err);
  productList.innerHTML = `
เกิดข้อผิดพลาดในการโหลดสินค้า (${esc(err.message)})

`;
});
}

// ==========================================
// 2. จัดการหน้าสั่งซื้อสินค้า (Order Form)
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
  payload.append('รายการสินค้า', itemList);
  payload.append('ที่อยู่สำหรับจัดส่ง', address);
  payload.append('ยอดรวมทั้งสิ้น (บาท)', totalPrice);
  payload.append('ไซส์ที่ต้องการ / หมายเหตุเพิ่มเติม', note);

  const submitBtn = orderForm.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.innerText = 'กำลังส่งคำสั่งซื้อ...';
    submitBtn.disabled = true;
  }

  const telegramMessage =
    `🛒 **มีออเดอร์ใหม่เข้า! (BareFit)**\n` +
    `----------------------------------\n` +
    `👤 **ผู้รับ:** ${esc(customerName)}\n` +
    `📞 **ติดต่อ:** ${esc(contact)}\n` +
    `📦 **สินค้า:** ${esc(itemList)}\n` +
    `📍 **ที่อยู่:** ${esc(address)}\n` +
    `💰 **ยอดรวม:** ${esc(totalPrice)} บาท\n` +
    `📝 **หมายเหตุ:** ${esc(note)}\n` +
    `----------------------------------`;

  try {
    await sendTelegramNotification(telegramMessage);

    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    });

    setTimeout(() => {
      window.location.href = 'thankyou.html';
    }, 300);

  } catch (err) {
    console.error('Submit Error:', err);
    alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
    if (submitBtn) {
      submitBtn.innerText = 'ยืนยันการสั่งซื้อ';
      submitBtn.disabled = false;
    }
  }
});
}
});
