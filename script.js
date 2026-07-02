const yesBtn = document.getElementById('yesBtn');
const noBtn = document.getElementById('noBtn');
const message = document.getElementById('message');
const buttonContainer = document.querySelector('.button-container');
const question = document.querySelector('.question');

// ลูกเล่น: เมื่อเอาเมาส์ไปชี้ปุ่ม No ให้มันสุ่มหนีไปที่อื่น
noBtn.addEventListener('mouseover', () => {
    // สุ่มตำแหน่ง X และ Y ภายในหน้าจอ
    const x = Math.floor(Math.random() * (window.innerWidth - noBtn.clientWidth));
    const y = Math.floor(Math.random() * (window.innerHeight - noBtn.clientHeight));
    
    noBtn.style.position = 'absolute';
    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
});

// ลูกเล่น: เมื่อกดปุ่ม Yes ให้โชว์ข้อความแฮปปี้
yesBtn.addEventListener('click', () => {
    message.classList.remove('hidden');
    buttonContainer.classList.add('hidden');
    question.classList.add('hidden');
    
    // เปลี่ยนภาพ GIF ให้เป็นแบบดีใจ (ออปชันเสริม)
    const gif = document.querySelector('.love-gif');
    gif.src = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26BRv0ThflsHCqDrG/giphy.gif";
});
