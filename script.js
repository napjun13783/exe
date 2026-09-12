const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL';
const CSV_URL = 'YOUR_CSV_URL';

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Product Page Logic
  const productList = document.getElementById('product-list');
  if (productList) {
    fetch('products.json').then(res => res.json()).then(products => {
      const moodFilter = urlParams.get('mood') || 'all';
      renderProducts(products, moodFilter);

      const filterBar = document.getElementById('filter-bar');
      if (filterBar) {
        // Highlight active button
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
        <div class="card">
          <span class="card-tag tag-${p.mood}">${p.mood}</span>
          <img src="${p.image}" alt="${p.name}">
          <h3>${p.name}</h3>
          <p>${p.description}</p>
          <div class="price">฿${p.price}</div>
          <a href="order.html?item=${encodeURIComponent(p.name)}&price=${p.price}" class="btn" style="text-align:center;">สั่งซื้อสินค้า</a>
        </div>
      `;
    });
  }

  // Order Page Logic
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    const itemInput = document.getElementById('items');
    const totalInput = document.getElementById('total');
    if (urlParams.has('item')) itemInput.value = urlParams.get('item');
    if (urlParams.has('price')) totalInput.value = urlParams.get('price');

    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = {
        customerName: document.getElementById('customerName').value,
        contact: document.getElementById('contact').value,
        items: itemInput.value,
        total: totalInput.value,
        note: document.getElementById('note').value
      };

      fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      }).then(() => {
        window.location.href = 'thankyou.html';
      }).catch(err => {
        console.error(err);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      });
    });
  }

  // Admin Page Logic
  const ordersTableBody = document.querySelector('#ordersTable tbody');
  if (ordersTableBody) {
    fetch(CSV_URL).then(res => res.text()).then(csv => {
      const rows = csv.split('\n').slice(1);
      rows.reverse().forEach(row => {
        if (!row.trim()) return;
        const cols = row.split(',');
        ordersTableBody.innerHTML += `<tr>${cols.map(c => `<td>${c}</td>`).join('')}</tr>`;
      });
    });
  }
});
