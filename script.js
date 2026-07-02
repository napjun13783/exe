document.addEventListener('DOMContentLoaded', function() {
    const yesBtn = document.getElementById('yesBtn');
    const noBtn = document.getElementById('noBtn');
    const message = document.getElementById('message');
    const question = document.querySelector('.question');
    const gifContainer = document.querySelector('.gif-container');
    
    let noBtnClickCount = 0;
    const messages = [
        "แน่ใจหรอ? 😢",
        "คิดอีกทีได้ไหม? 🥺",
        "ไม่เอาน่าาา... 💔",
        "จะไม่ให้โอกาสจริงๆหรอ? 😭",
        "ใจร้ายจัง! 😿",
        "ได้โปรดดดด! 🙏",
        "ฉันสัญญาว่าจะทำให้เธอมีความสุข! 💝"
    ];
    
    // ฟังก์ชั่นทำให้ปุ่ม No วิ่งหนี
    function moveNoButton(e) {
        const button = noBtn;
        const container = document.querySelector('.card');
        const containerRect = container.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        
        // คำนวณตำแหน่งใหม่แบบสุ่ม
        const maxX = containerRect.width - buttonRect.width - 20;
        const maxY = containerRect.height - buttonRect.height - 20;
        const minX = 20;
        const minY = 20;
        
        let newX = Math.random() * (maxX - minX) + minX;
        let newY = Math.random() * (maxY - minY) + minY;
        
        // ป้องกันไม่ให้ปุ่มออกนอก container
        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));
        
        // ป้องกันไม่ให้ปุ่มทับกับปุ่ม Yes
        const yesRect = yesBtn.getBoundingClientRect();
        const yesX = yesRect.left - containerRect.left;
        const yesY = yesRect.top - containerRect.top;
        
        // เช็คว่าตำแหน่งใหม่อยู่ใกล้ปุ่ม Yes หรือไม่
        const distance = Math.sqrt(
            Math.pow((newX + buttonRect.width/2) - (yesX + yesRect.width/2), 2) +
            Math.pow((newY + buttonRect.height/2) - (yesY + yesRect.height/2), 2)
        );
        
        if (distance < 120) {
            // ถ้าใกล้เกินไป ให้ย้ายไปอีกฝั่ง
            if (newX < yesX) {
                newX = yesX + 120;
            } else {
                newX = yesX - 120 - buttonRect.width;
            }
        }
        
        // เพิ่ม transition แบบ smooth
        button.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        button.style.position = 'relative';
        button.style.left = (newX - (buttonRect.left - containerRect.left)) + 'px';
        button.style.top = (newY - (buttonRect.top - containerRect.top)) + 'px';
        
        // เพิ่ม class สำหรับ animation
        button.classList.add('moving');
        setTimeout(() => {
            button.classList.remove('moving');
        }, 500);
        
        // เปลี่ยนข้อความปุ่ม No
        if (noBtnClickCount < messages.length) {
            noBtn.textContent = messages[noBtnClickCount];
            noBtnClickCount++;
        }
        
        // ทำให้ปุ่มเล็กลงเมื่อคลิกหลายครั้ง
        const currentScale = 1 - (noBtnClickCount * 0.05);
        if (currentScale > 0.5) {
            noBtn.style.transform = `scale(${currentScale})`;
        }
    }
    
    // Event สำหรับ Mouse (Desktop)
    noBtn.addEventListener('mouseenter', function(e) {
        moveNoButton(e);
    });
    
    noBtn.addEventListener('mouseover', function(e) {
        moveNoButton(e);
    });
    
    // Event สำหรับ Touch (Mobile)
    noBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        moveNoButton(e);
    });
    
    // ทำให้ปุ่ม No วิ่งหนีต่อเนื่องเมื่อเมาส์อยู่ใกล้
    let moveInterval;
    noBtn.addEventListener('mouseenter', function() {
        moveInterval = setInterval(() => {
            const rect = noBtn.getBoundingClientRect();
            const mouseX = event ? event.clientX : 0;
            const mouseY = event ? event.clientY : 0;
            
            const distance = Math.sqrt(
                Math.pow(mouseX - (rect.left + rect.width/2), 2) +
                Math.pow(mouseY - (rect.top + rect.height/2), 2)
            );
            
            if (distance < 150) {
                moveNoButton();
            }
        }, 100);
    });
    
    noBtn.addEventListener('mouseleave', function() {
        clearInterval(moveInterval);
    });
    
    // Event เมื่อคลิกปุ่ม Yes
    yesBtn.addEventListener('click', function() {
        // ซ่อนปุ่ม No
        noBtn.style.display = 'none';
        
        // แสดงข้อความ
        message.classList.remove('hidden');
        
        // เปลี่ยน GIF
        const loveGif = document.querySelector('.love-gif');
        loveGif.src = 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWU0ZWJ4eHh6eGZ3eHh6eGZ3eHh6eGZ3eHh6eGZ3eHh6eGZ3eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlGd1nI7a1jOTSw/giphy.gif';
        
        // เปลี่ยนคำถาม
        question.textContent = 'เย้! รู้อยู่แล้วว่าเธอต้องตอบตกลง! 🎉';
        question.style.color = '#4CAF50';
        
        // เพิ่ม confetti effect
        createConfetti();
        
        // ปรับขนาดปุ่ม Yes
        yesBtn.style.transform = 'scale(1.2)';
        yesBtn.style.background = 'linear-gradient(45deg, #4CAF50, #66BB6A)';
        
        // เล่นเสียง (optional - ถ้ามีไฟล์เสียง)
        playCelebrationSound();
    });
    
    // ฟังก์ชั่นสร้าง confetti
    function createConfetti() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#ff6b6b', '#ffd93d'];
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.style.position = 'fixed';
                confetti.style.left = Math.random() * window.innerWidth + 'px';
                confetti.style.top = '-20px';
                confetti.style.width = '10px';
                confetti.style.height = '10px';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
                confetti.style.zIndex = '1000';
                confetti.style.pointerEvents = 'none';
                confetti.style.animation = `confettiFall ${1 + Math.random() * 2}s linear forwards`;
                
                document.body.appendChild(confetti);
                
                setTimeout(() => {
                    confetti.remove();
                }, 3000);
            }, i * 30);
        }
        
        // เพิ่ม keyframe animation สำหรับ confetti
        const style = document.createElement('style');
        style.textContent = `
            @keyframes confettiFall {
                to {
                    transform: translateY(100vh) rotate(${Math.random() * 360}deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // ฟังก์ชั่นเล่นเสียง (optional)
    function playCelebrationSound() {
        // ถ้าต้องการเล่นเสียง ให้สร้าง Audio element
        // const audio = new Audio('celebration.mp3');
        // audio.play().catch(() => {});
        
        // หรือใช้ Web Audio API สำหรับสร้างเสียงสั้นๆ
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            
            notes.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = freq;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + index * 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.1 + 0.5);
                
                oscillator.start(audioContext.currentTime + index * 0.1);
                oscillator.stop(audioContext.currentTime + index * 0.1 + 0.5);
            });
        } catch (e) {
            // ถ้าไม่สามารถเล่นเสียงได้ ก็ไม่เป็นไร
        }
    }
    
    // เพิ่มเอฟเฟกต์ตอน hover ที่ปุ่ม Yes
    yesBtn.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1)';
    });
    
    yesBtn.addEventListener('mouseleave', function() {
        if (!message.classList.contains('hidden')) {
            this.style.transform = 'scale(1.2)';
        } else {
            this.style.transform = 'scale(1)';
        }
    });
    
    // ป้องกันการคลิกขวาที่ปุ่ม No
    noBtn.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        moveNoButton(e);
    });
});
