/**
 * Lead Machine Pro - Core Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initTiltEffects();
    initFormLogic();
    // initPopupSystem(); // Removed per user request
    initNavbarEffect();
    initAIChat();
    initChatFollowMouse();
});

/**
 * Scroll Transformations (Fades & Reveals)
 */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('[data-scroll]').forEach(el => observer.observe(el));
}

/**
 * 3D Tilt Effect for Glass Cards
 */
function initTiltEffects() {
    const cards = document.querySelectorAll('.tilt-card, #hero-floating-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            if (card.classList.contains('dragging')) return;

            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;

            card.style.transform = `translate(var(--move-x), var(--move-y)) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            if (card.classList.contains('dragging')) return;
            card.style.transform = `translate(var(--move-x), var(--move-y)) perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    });
}

/**
 * Progressive Form Logic & Validation
 */
function initFormLogic() {
    const form = document.getElementById('lead-machine-form');
    const steps = document.querySelectorAll('.form-step');
    const nextBtns = document.querySelectorAll('.next-step');
    const prevBtns = document.querySelectorAll('.prev-step');
    const progressBar = document.getElementById('form-progress');
    const successState = document.getElementById('form-success');

    let currentStep = 1;
    const totalSteps = steps.length;

    // Next Step Navigation
    nextBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                changeStep(currentStep + 1);
            }
        });
    });

    // Previous Step Navigation
    prevBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            changeStep(currentStep - 1);
        });
    });

    function changeStep(newStep) {
        steps.forEach(step => step.classList.remove('active'));
        document.querySelector(`.form-step[data-step="${newStep}"]`).classList.add('active');

        currentStep = newStep;
        const progress = (currentStep / totalSteps) * 100;
        progressBar.style.width = `${progress}%`;
    }

    function validateStep(stepNum) {
        const step = document.querySelector(`.form-step[data-step="${stepNum}"]`);
        const inputs = step.querySelectorAll('input[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            const group = input.closest('.input-group') || input.closest('.checkbox-group');
            let isFieldValid = true;

            if (input.type === 'checkbox') {
                isFieldValid = input.checked;
            } else if (input.value.trim() === '') {
                isFieldValid = false;
            } else if (input.type === 'email' && !validateEmail(input.value)) {
                isFieldValid = false;
            }

            if (!isFieldValid) {
                if (group) group.classList.add('invalid');
                isValid = false;
            } else {
                if (group) group.classList.remove('invalid');
            }
        });

        return isValid;
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateStep(3)) return;

        const submitBtn = form.querySelector('.btn-submit');
        const errorState = document.getElementById('form-error');

        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            // Real Call to Formspree
            const response = await fetch(form.action, {
                method: form.method,
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                // Save to shared DB for Dashboard
                if (window.DB) {
                    await window.DB.saveLead(data);
                }

                // UI Success state
                submitBtn.classList.remove('loading');
                form.classList.add('hidden');
                successState.classList.remove('hidden');

                simulateEmailFlow(data);
                startSuccessAction(data);
            } else {
                throw new Error('Server responded with error');
            }
        } catch (error) {
            console.error("Submission error:", error);
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            form.classList.add('hidden');
            errorState.classList.remove('hidden');
        }
    });
}

/**
 * Email Notification Simulation
 */
function simulateEmailFlow(data) {
    console.log("%c--- SIMULACIÓN DE FLUJO DE EMAIL ---", "color: #6366f1; font-weight: bold;");

    // User Confirmation
    console.log(`%c[Para: ${data.email}]`, "color: #10b981; font-weight: bold;");
    console.log(`Asunto: Solicitud recibida - Lead Machine Pro`);
    console.log(`Hola ${data.name}, gracias por contactar con nosotros. Hemos recibido tu solicitud para el servicio de ${data.service}. Un especialista de nuestro equipo revisará tu caso.`);

    // Owner Notification
    console.log(`%c[Para: admin@leadmachinepro.com]`, "color: #f43f5e; font-weight: bold;");
    console.log(`Asunto: NUEVO LEAD - ${data.business}`);
    console.log(`Nombre: ${data.name}\nEmpresa: ${data.business}\nEmail: ${data.email}\nTeléfono: ${data.phone}\nServicio: ${data.service}\nMensaje: ${data.message || 'Sin mensaje'}`);
}

/**
 * WhatsApp Redirection Logic
 */
function startSuccessAction(data) {
    const timerEl = document.getElementById('timer');
    let timeLeft = 5;

    const interval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(interval);
            openWhatsApp(data);
        }
    }, 1000);
}

function openWhatsApp(data) {
    const phone = "34622103913";
    const text = encodeURIComponent(`Hola! Acabo de completar el formulario en Lead Machine Pro.\n\nMi nombre es: ${data.name}\nEmpresa: ${data.business}\nServicio: ${data.service}\n\nMe gustaría recibir más información.`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
}

/**
 * Contextual Popup System
 */
function initPopupSystem() {
    const overlay = document.getElementById('popup-overlay');
    const exitPopup = document.getElementById('exit-intent-popup');
    const timePopup = document.getElementById('time-popup');
    const closeBtns = document.querySelectorAll('.close-popup');
    const showFormBtns = document.querySelectorAll('.show-form');

    let popupShown = false;

    // Time-based popup (10 seconds)
    setTimeout(() => {
        if (!popupShown) {
            showPopup(timePopup);
        }
    }, 15000);

    // Exit intent logic
    document.addEventListener('mouseleave', (e) => {
        if (e.clientY < 0 && !popupShown) {
            showPopup(exitPopup);
        }
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.classList.add('hidden');
        });
    });

    showFormBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.classList.add('hidden');
            document.getElementById('leads-form').scrollIntoView({ behavior: 'smooth' });
        });
    });

    function showPopup(popup) {
        if (popupShown) return;
        popupShown = true;

        overlay.classList.remove('hidden');
        exitPopup.classList.add('hidden');
        timePopup.classList.add('hidden');
        popup.classList.remove('hidden');
    }
}

/**
 * Navbar Scroll Effect
 */
function initNavbarEffect() {
    const nav = document.querySelector('.glass-nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });
}
/**
 * Interactive AI Chat & Draggable Window
 */
function initAIChat() {
    const card = document.getElementById('hero-floating-card');
    const input = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-chat-send');
    const messagesContainer = document.getElementById('ai-chat-messages');

    if (!card) return;

    // Clear potentially corrupt saved position
    localStorage.removeItem('chatPos');
    localStorage.removeItem('chatPosPro');

    // --- CHAT LOGIC ---
    function addMessage(text, type) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type}`;
        msgDiv.innerHTML = `<p>${text}</p>`;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function handleSend() {
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        input.value = '';

        // Netlify Function Endpoint
        const API_URL = '/.netlify/functions/chat';

        // Add "Thinking" state
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai loading-msg';
        loadingDiv.innerHTML = '<p>Escribiendo...</p>';
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();
            messagesContainer.removeChild(loadingDiv);

            if (response.ok && data.response) {
                addMessage(data.response, 'ai');
            } else {
                const errorText = data.error || 'Error desconocido';
                throw new Error(errorText);
            }
        } catch (error) {
            console.error("AI Error:", error);
            if (loadingDiv.parentNode) messagesContainer.removeChild(loadingDiv);
            addMessage(`Error: ${error.message}. Si esto persiste, revisa los logs de Netlify.`, 'ai');
        }
    }

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
}

/**
 * Chat Follow Mouse Logic (Smooth Parallax)
 */
function initChatFollowMouse() {
    const card = document.getElementById('hero-floating-card');
    if (!card) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    const lerpAmount = 0.05; // Smoothing factor (0 to 1)

    window.addEventListener('mousemove', (e) => {
        // Calculate normalized mouse position (-1 to 1)
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;

        // Strength of the movement (in pixels)
        targetX = nx * 30;
        targetY = ny * 30;
    });

    function update() {
        // Smoothly interpolate towards the target position
        currentX += (targetX - currentX) * lerpAmount;
        currentY += (targetY - currentY) * lerpAmount;

        // Apply as CSS variables to the card
        card.style.setProperty('--move-x', `${currentX}px`);
        card.style.setProperty('--move-y', `${currentY}px`);

        requestAnimationFrame(update);
    }

    update();
}
