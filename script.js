// Tailwind initialization
function initTailwind() {
    return { config(userConfig = {}) { return { content: [], theme: { extend: {} }, plugins: [], ...userConfig } } };
}
document.documentElement.setAttribute('data-tailwind-config', JSON.stringify(initTailwind()));

// ====================== MOBILE MENU ======================
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const icon = document.getElementById('hamburger');
    menu.classList.toggle('hidden');
    icon.classList.toggle('fa-bars');
    icon.classList.toggle('fa-xmark');
}

// ====================== CAROUSEL ======================
let currentSlide = 0;
const totalSlides = 3;

function showSlide(n) {
    const slidesContainer = document.getElementById('slides');
    slidesContainer.style.transform = `translateX(-${n * 100}%)`;
    updateDots();
}
function nextSlide() { currentSlide = (currentSlide + 1) % totalSlides; showSlide(currentSlide); }
function prevSlide() { currentSlide = (currentSlide - 1 + totalSlides) % totalSlides; showSlide(currentSlide); }

function createDots() {
    const dotsContainer = document.getElementById('dots');
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('button');
        dot.className = `w-4 h-4 rounded-full transition-all ${i === 0 ? 'bg-amber-500' : 'bg-white/30'}`;
        dot.onclick = () => { currentSlide = i; showSlide(currentSlide); };
        dotsContainer.appendChild(dot);
    }
}
function updateDots() {
    const dots = document.getElementById('dots').children;
    Array.from(dots).forEach((dot, i) => {
        dot.className = `w-4 h-4 rounded-full transition-all ${i === currentSlide ? 'bg-amber-500 scale-125' : 'bg-white/30'}`;
    });
}
function startCarousel() {
    createDots();
    setInterval(() => { currentSlide = (currentSlide + 1) % totalSlides; showSlide(currentSlide); }, 4500);
}

// ====================== WIZARD + STRIPE ======================
let currentModal = null;
let currentStep = 1;
let selectedCategory = null;
let selectedProduct = null;
let selectedAddons = [];
let insuranceSelected = false;
let deliveryDate = '';
let deliveryTime = '';
let instructions = '';

// ←←← REPLACE THESE WITH YOUR REAL STRIPE PAYMENT LINKS ↓↓↓
const stripeLinks = {
    rent: "https://buy.stripe.com/YOUR_RENTAL_DEPOSIT_LINK_HERE",
    buyOrConvert: "https://buy.stripe.com/YOUR_PURCHASE_DEPOSIT_LINK_HERE"
};

const categories = [
    { id: "rent", name: "RENT", subtitle: "$125–$225 / mo", desc: "Fast delivery • Flexible terms" },
    { id: "buy",  name: "BUY",  subtitle: "$2,800–$4,900", desc: "Own it forever • Best value" },
    { id: "convert", name: "CONVERT", subtitle: "$6,800–$18,500", desc: "Turnkey solutions • Fully built" }
];

const productsByCategory = {
    rent: [
        { id:1, name:"20ft Standard", price:125, unit:"mo" },
        { id:2, name:"40ft Standard", price:195, unit:"mo" },
        { id:3, name:"40ft High Cube", price:225, unit:"mo" }
    ],
    buy: [
        { id:4, name:"20ft Standard", price:2800, unit:"one-time" },
        { id:5, name:"40ft Standard", price:4200, unit:"one-time" },
        { id:6, name:"40ft High Cube", price:4900, unit:"one-time" }
    ],
    convert: [
        { id:7, name:"Tiny Home Package", price:18500, unit:"project" },
        { id:8, name:"Job Site Office", price:9900, unit:"project" },
        { id:9, name:"Workshop / Garage", price:6800, unit:"project" }
    ]
};

const addonsList = [
    { id:1, name:"Full Insulation", price:1200 },
    { id:2, name:"Electrical Package", price:950 },
    { id:3, name:"HVAC System", price:2500 },
    { id:4, name:"Roll-up Door", price:850 },
    { id:5, name:"Windows + Security Bars", price:650 },
    { id:6, name:"Interior Lighting & Outlets", price:450 }
];

function calculateTotal() {
    let total = selectedProduct ? selectedProduct.price : 0;
    if (insuranceSelected) total += 150;
    selectedAddons.forEach(a => total += a.price);
    return total;
}

function updateLiveTotal() {
    document.getElementById('liveTotal').textContent = `$${calculateTotal()}`;
}

function updateProgress() {
    const titleEl = document.getElementById('stepTitle');
    const dotsContainer = document.getElementById('progressDots');
    dotsContainer.innerHTML = '';

    const titles = [
        "STEP 1 OF 4 • CHOOSE CATEGORY",
        "STEP 2 OF 4 • CHOOSE PRODUCT",
        "STEP 3 OF 4 • RENTAL DETAILS / ADD-ONS",
        "STEP 4 OF 4 • YOUR DETAILS"
    ];
    titleEl.textContent = titles[currentStep - 1];

    for (let i = 1; i <= 4; i++) {
        const dot = document.createElement('div');
        dot.className = `w-6 h-1.5 rounded-full cursor-pointer transition-all ${i === currentStep ? 'bg-amber-500' : 'bg-white/30'}`;
        dot.onclick = () => { currentStep = i; renderStep(); };
        dotsContainer.appendChild(dot);
    }
}

function renderStep() {
    const content = document.getElementById('wizardContent');
    let html = '';

    if (currentStep === 1) {
        html = `
            <div class="text-center mb-8"><h2 class="text-4xl font-bold">Choose Your Category</h2></div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${categories.map(cat => `
                    <div onclick="selectCategory('${cat.id}')" class="cursor-pointer p-8 border-2 rounded-3xl text-center transition-all hover:border-amber-500 ${selectedCategory === cat.id ? 'border-amber-500 bg-amber-500/10' : 'border-transparent'}">
                        <div class="text-5xl font-bold mb-2">${cat.name}</div>
                        <div class="text-2xl text-amber-400">${cat.subtitle}</div>
                        <div class="text-slate-400 mt-6">${cat.desc}</div>
                    </div>
                `).join('')}
            </div>`;
    }
    else if (currentStep === 2) {
        const prods = productsByCategory[selectedCategory] || [];
        html = `
            <h2 class="text-4xl font-bold mb-8">Choose Your ${selectedCategory.toUpperCase()} Option</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${prods.map(p => `
                    <div onclick="selectProduct(${p.id})" class="cursor-pointer p-6 border-2 rounded-3xl transition-all ${selectedProduct && selectedProduct.id === p.id ? 'border-amber-500 bg-amber-500/10' : 'border-transparent hover:border-amber-500/50'}">
                        <div class="font-bold text-xl">${p.name}</div>
                        <div class="text-4xl font-bold text-amber-400">$${p.price}<span class="text-base font-normal">/${p.unit}</span></div>
                    </div>
                `).join('')}
            </div>`;
    }
    else if (currentStep === 3) {
        if (selectedCategory === 'rent') {
            html = `
                <h2 class="text-4xl font-bold mb-8">Rental Details</h2>
                <div class="space-y-8">
                    <label onclick="toggleInsurance(this)" class="cursor-pointer flex items-center gap-4 p-6 border border-amber-500/30 hover:border-amber-500 rounded-3xl">
                        <input type="checkbox" id="insuranceCheck" ${insuranceSelected ? 'checked' : ''} class="w-6 h-6 accent-amber-500">
                        <div class="flex-1">
                            <div class="font-medium">Purchase Rental Insurance</div>
                            <div class="text-amber-400">Protects you during the rental period • +$150</div>
                        </div>
                    </label>

                    <div class="grid grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm mb-2">Preferred Delivery Date</label>
                            <input type="date" id="deliveryDateInput" value="${deliveryDate}" onchange="deliveryDate = this.value; updateLiveTotal()" class="w-full bg-black border border-amber-500/50 rounded-2xl px-5 py-4 focus:outline-none focus:border-amber-500">
                        </div>
                        <div>
                            <label class="block text-sm mb-2">Preferred Delivery Time</label>
                            <input type="time" id="deliveryTimeInput" value="${deliveryTime}" onchange="deliveryTime = this.value; updateLiveTotal()" class="w-full bg-black border border-amber-500/50 rounded-2xl px-5 py-4 focus:outline-none focus:border-amber-500">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm mb-2">Additional Instructions / Delivery Notes (optional)</label>
                        <textarea id="instructionsInput" rows="4" placeholder="Gate code, special instructions, etc..." oninput="instructions = this.value" class="w-full bg-black border border-amber-500/50 rounded-3xl px-5 py-4 focus:outline-none focus:border-amber-500">${instructions}</textarea>
                    </div>
                </div>`;
        } else {
            html = `
                <h2 class="text-4xl font-bold mb-8">Add-ons &amp; Upgrades</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${addonsList.map(addon => `
                        <label onclick="toggleAddon(${addon.id}, this)" class="cursor-pointer flex items-center gap-4 p-5 border border-amber-500/30 hover:border-amber-500 rounded-3xl">
                            <input type="checkbox" class="w-6 h-6 accent-amber-500">
                            <div class="flex-1">
                                <div>${addon.name}</div>
                                <div class="text-amber-400">+$${addon.price}</div>
                            </div>
                        </label>
                    `).join('')}
                </div>`;
        }
    }
    else if (currentStep === 4) {
        html = `
            <h2 class="text-4xl font-bold mb-8">Your Order Summary</h2>
            <div id="summaryContent" class="bg-black p-6 rounded-3xl mb-8"></div>
            
            <div class="grid grid-cols-2 gap-6">
                <div><label class="block text-sm mb-2">Name</label><input type="text" id="name" class="w-full bg-black border border-amber-500/50 rounded-2xl px-5 py-4 focus:outline-none focus:border-amber-500" placeholder="John Doe"></div>
                <div><label class="block text-sm mb-2">Phone</label><input type="tel" id="phone" class="w-full bg-black border border-amber-500/50 rounded-2xl px-5 py-4 focus:outline-none focus:border-amber-500" placeholder="(210) 555-0123"></div>
                <div class="col-span-2"><label class="block text-sm mb-2">Email</label><input type="email" id="email" class="w-full bg-black border border-amber-500/50 rounded-2xl px-5 py-4 focus:outline-none focus:border-amber-500" placeholder="you@email.com"></div>
                <div class="col-span-2"><label class="block text-sm mb-2">Notes / Delivery Address</label><textarea id="notes" rows="4" class="w-full bg-black border border-amber-500/50 rounded-3xl px-5 py-4 focus:outline-none focus:border-amber-500" placeholder="Delivery address, timeline, or special requests..."></textarea></div>
            </div>

            <button onclick="payWithStripe()" class="mt-8 w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-2xl py-8 rounded-3xl flex items-center justify-center gap-4 transition">
                <i class="fa-solid fa-lock"></i> PAY DEPOSIT SECURELY WITH STRIPE
            </button>

            <button onclick="handleFinalSubmit()" class="mt-4 w-full text-amber-400 border border-amber-500/50 hover:bg-amber-500/10 py-6 rounded-3xl text-lg font-medium">
                Just send me a quote (no payment yet)
            </button>`;
    }
    content.innerHTML = html;
    updateProgress();
    updateLiveTotal();
    if (currentStep === 4) renderFinalSummary();
}

function renderFinalSummary() {
    const container = document.getElementById('summaryContent');
    let html = `<div class="space-y-4">`;
    if (selectedProduct) html += `<div class="flex justify-between"><span>${selectedProduct.name}</span><span class="font-bold">$${selectedProduct.price}</span></div>`;
    selectedAddons.forEach(a => {
        html += `<div class="flex justify-between text-sm"><span>${a.name}</span><span>+$${a.price}</span></div>`;
    });
    if (insuranceSelected) html += `<div class="flex justify-between text-sm"><span>Rental Insurance</span><span>+150</span></div>`;
    html += `</div>`;
    container.innerHTML = html;
}

function selectCategory(cat) {
    selectedCategory = cat;
    selectedProduct = null;
    selectedAddons = [];
    nextStep();
}

function selectProduct(id) {
    const allProducts = [...productsByCategory.rent, ...productsByCategory.buy, ...productsByCategory.convert];
    selectedProduct = allProducts.find(p => p.id === id);
    nextStep();
}

function toggleAddon(id, label) {
    const checkbox = label.querySelector('input');
    checkbox.checked = !checkbox.checked;
    const addon = addonsList.find(a => a.id === id);
    if (checkbox.checked) selectedAddons.push(addon);
    else selectedAddons = selectedAddons.filter(a => a.id !== id);
    updateLiveTotal();
}

function toggleInsurance(label) {
    const checkbox = label.querySelector('input');
    checkbox.checked = !checkbox.checked;
    insuranceSelected = checkbox.checked;
    updateLiveTotal();
}

function nextStep() {
    if (currentStep < 4) {
        currentStep++;
        renderStep();
    } else {
        handleFinalSubmit();
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        renderStep();
    }
}

function payWithStripe() {
    if (!selectedCategory) return alert("Please complete the previous steps");

    const link = selectedCategory === 'rent' ? stripeLinks.rent : stripeLinks.buyOrConvert;

    if (!link || link.includes("YOUR_")) {
        return alert("Please replace the Stripe links in js/script.js with your real Payment Links first!");
    }

    const btn = event.target;
    btn.innerHTML = `<span class="animate-pulse">Redirecting to secure Stripe checkout...</span>`;

    setTimeout(() => {
        window.location.href = link;
    }, 800);
}

function handleFinalSubmit() {
    const btn = document.getElementById('btnNext') || event.target;
    btn.innerHTML = `<span class="animate-pulse">SENDING TO THE YARD...</span>`;

    const now = new Date();
    const dateStr = now.getFullYear().toString() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0');
    const random = Math.floor(1000 + Math.random() * 9000);
    const confirmationNumber = `IC-${dateStr}-${random}`;

    setTimeout(() => {
        const message = `✅ Order received!\n\nConfirmation Number: ${confirmationNumber}\n\nOur San Antonio team will contact you within 30 minutes.\n\nThank you for choosing IRONCLAD Containers!`;
        alert(message);
        closeQuoteModal();
    }, 1600);
}

function openQuoteModal() {
    currentModal = document.getElementById('quoteModal');
    currentModal.classList.remove('hidden');
    currentModal.classList.add('flex');
    currentStep = 1;
    selectedCategory = null;
    selectedProduct = null;
    selectedAddons = [];
    insuranceSelected = false;
    deliveryDate = '';
    deliveryTime = '';
    instructions = '';
    renderStep();
}

function closeQuoteModal() {
    if (currentModal) {
        currentModal.classList.add('hidden');
        currentModal.classList.remove('flex');
        currentModal = null;
    }
}

document.addEventListener('click', (e) => {
    if (currentModal && e.target === currentModal) closeQuoteModal();
});

window.onload = () => {
    startCarousel();
    console.log('%cIRONCLAD Containers — Full wizard + Stripe + Confirmation Number ready 🔥', 'color:#f59e0b; font-weight:bold');
};
