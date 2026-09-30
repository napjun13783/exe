const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzj4Fzm4wlYbfZkEOGG8CSSPJrDf9M1s67zHV1VFVUIHPJnF0hw8KmmNH72onmgJijysg/exec';
const CSV_URL = 'YOUR_CSV_URL';

// ==========================================
// ตั้งค่า Telegram Bot สำหรับแจ้งเตือน
// ==========================================
const TELEGRAM_BOT_TOKEN = '8885002492:AAGTW9aV89PosCdYSY33Lhf_qZR5HMui1P0';
const TELEGRAM_CHAT_ID = '-1004384220202';

// ฟังก์ชันส่งข้อความเข้า Telegram
async function sendTelegramNotification(message) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  // ==========================================
  // ส่วนหน้าแสดงสินค้า
  // ==========================================
  const productList = document.getElementById('product-list');
  if (productList) {
    fetch('products.json').then(res => res.json()).then(products => {
      const moodFilter = urlParams.get('mood') || 'all';
      renderProducts(products, moodFilter);

      const filterBar = document.getElementById('filter-bar');
      if (filterBar) {
        const activeBtn = filterBar.querySelector(`[data-mood="${moodFilter}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        filterBar.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON') {
            filterBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderProducts(products, e.target.dataset.mood);
          }
        });
      }
    });
  }

  function renderProducts(products, filter) {
    productList.innerHTML = '';
    const filtered = filter === 'all' ? products : products.filter(p => p.mood === filter);
    filtered.forEach(p => {
      productList.innerHTML += `
