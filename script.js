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
