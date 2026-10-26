const items = {
    pho_bo: { name: 'Phở bò', price: 50000 },
    banh_mi: { name: 'Bánh mì', price: 45000 },
    bun_cha: { name: 'Bún chả', price: 60000 },
    com_tam: { name: 'Cơm tấm', price: 60000 },
    bun_bo: { name: 'Bún bò', price: 50000 },
    com_ga: { name: 'Cơm gà', price: 60000 },
    tra_tac: { name: 'Trà tắc', price: 20000 },
    tra_da: { name: 'Trà đá', price: 12000 }
};

const ingredients = {
    pho_bo: 'bánh phở, thịt bò, hành lá, hành tây và nước dùng',
    banh_mi: 'bánh mì, thịt nguội, dưa leo, cà rốt và rau mùi',
    bun_cha: 'bún, thịt nướng, rau sống và nước mắm',
    com_tam: 'cơm, thịt heo, trứng ốp la, cà chua và nước mắm',
    bun_bo: 'bún, thịt bò, rau sống, nước dùng, cà chua và ớt',
    com_ga: 'cơm gà, thịt gà, dưa leo, nước mắm và rau sống',
    tra_tac: 'trà, tắc và đường',
    tra_da: 'trà , nước lọc và đá',
};

const cart = {};
const cartNotes = {};
const cartTable = document.querySelector('#gio');
const voiceButton = document.querySelector('#voice-button');
const voiceStatus = document.querySelector('#voice-status');
const noiseLevelFill = document.querySelector('#noise-level-fill');
const cartTotalElement = document.querySelector('#cart-total');
const submitOrderButton = document.querySelector('#submit-order-button');
const formatMoney = value => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
const excludedIngredients = new Set();
const blockedIngredients = new Set();
const itemIngredients = {
    pho_bo: ['pho', 'thit bo', 'hanh la', 'hanh tay', 'nuoc dung'],
    banh_mi: ['banh mi', 'thit nguoi', 'dua leo', 'ca rot', 'rau mui'],
    bun_cha: ['bun', 'thit nuong', 'rau song', 'nuoc mam', 'dau phong'],
    com_tam: ['com', 'thit heo', 'trung op la', 'ca chua', 'nuoc mam'],
    bun_bo: ['bun bo', 'thit bo', 'rau song', 'nuoc dung', 'ot'],
    com_ga: ['com ga', 'thit ga', 'dua leo', 'nuoc mam', 'rau song'],
    tra_tac: ['tra', 'tac', 'duong'],
    tra_da: ['tra', 'nuoc loc', 'da']
};
const ingredientLabels = {
    pho: 'bánh phở', 'thit bo': 'thịt bò', 'hanh la': 'hành lá',
    'hanh tay': 'hành tây', 'nuoc dung': 'nước dùng', 'banh mi': 'bánh mì',
    'thit nguoi': 'thịt nguội', 'dua leo': 'dưa leo', 'ca rot': 'cà rốt',
    'rau mui': 'rau mùi', bun: 'bún', 'thit nuong': 'thịt nướng',
    'rau song': 'rau sống', 'nuoc mam': 'nước mắm', 'dau phong': 'đậu phộng',
    'bun bo': 'bún bò', ot: 'ớt', com: 'cơm', 'thit heo': 'thịt heo',
    'trung op la': 'trứng ốp la', 'ca chua': 'cà chua', 'com ga': 'cơm gà',
    'thit ga': 'thịt gà', tra: 'trà', tac: 'tắc', duong: 'đường',
    'nuoc tinh khiet': 'nước tinh khiết'
};
const removableIngredients = new Set([
    'hanh la', 'hanh tay', 'rau mui', 'dua leo', 'ca rot', 'rau song',
    'ot', 'dau phong', 'nuoc mam', 'tac', 'duong', 'ca chua'
]);
const requiredIngredients = new Set([
    'pho', 'thit bo', 'nuoc dung', 'banh mi', 'thit nguoi', 'bun',
    'thit nuong', 'com', 'thit heo', 'trung op la', 'bun bo', 'thit ga',
    'com ga', 'tra', 'nuoc tinh khiet'
]);
let pendingConfirmation = null;
let checkoutConfirmationPending = false;

function displayIngredientList(list) {
    return list.map(item => ingredientLabels[item] || item);
}

function renderCart() {
    cartTable.querySelectorAll('.cart-row').forEach(row => row.remove());
    Object.keys(cart).forEach(id => {
        const item = items[id];
        const row = document.createElement('tr');
        row.className = 'cart-row';
        const note = cartNotes[id] ? `<br><small>Ghi chú: ${cartNotes[id]}</small>` : '';
        row.innerHTML = `<td>${item.name} x ${cart[id]}${note}</td><td>${formatMoney(item.price * cart[id])}</td>`;
        cartTable.appendChild(row);
    });
    const total = Object.keys(cart).reduce((sum, id) => sum + items[id].price * cart[id], 0);
    if (cartTotalElement) cartTotalElement.textContent = formatMoney(total);
}

function requestOrderConfirmation() {
    const orderIds = Object.keys(cart);
    if (orderIds.length === 0) {
        speak('Giỏ hàng đang trống, bạn hãy gọi món trước.');
        voiceStatus.textContent = 'Giỏ hàng đang trống, bạn hãy gọi món trước.';
        return;
    }
    const orderSummary = orderIds.map(id => `${cart[id]} ${items[id].name}`).join(', ');
    const total = orderIds.reduce((sum, id) => sum + items[id].price * cart[id], 0);
    const confirmMessage = `Đơn của bạn gồm ${orderSummary}. Tổng cộng ${formatMoney(total)}. Bạn có muốn xác nhận đặt món không?`;
    checkoutConfirmationPending = true;
    speak(confirmMessage);
    voiceStatus.textContent = confirmMessage;
}

function changeItem(id, amount) {
    if (!items[id]) return;
    cart[id] = Math.max(0, (cart[id] || 0) + amount);
    if (!cart[id]) delete cart[id];
    renderCart();
}

if (submitOrderButton) submitOrderButton.addEventListener('click', requestOrderConfirmation);

Object.keys(items).forEach(id => {
    const addButton = document.querySelector(`#${id}-btn`);
    const removeButton = document.querySelector(`#${id}-btn2`);
    if (addButton) addButton.addEventListener('click', () => changeItem(id, 1));
    if (removeButton) removeButton.addEventListener('click', () => changeItem(id, -1));
});

function speak(message) {
    if (!('speechSynthesis' in window)) return;
    const voice = new SpeechSynthesisUtterance(message);
    voice.lang = 'vi-VN';
    voice.onend = () => {
        scheduleListeningRestart();
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(voice);
}

function normalizeText(value) {
    return value.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function analyzeVoiceIntent(text, aliases, itemIngredients) {
    const normalized = normalizeText(text);
        const positive = /(^|\s)(co|duoc|dong y|ok|oke|vang|muon|muon a|co a|xac nhan)(\s|$)/.test(normalized);
    const negative = /(^|\s)(khong|ko|thoi|khong muon|khong a)(\s|$)/.test(normalized);
    const itemId = Object.keys(aliases).find(id => aliases[id].some(alias => normalized.includes(alias)));
    const ingredientId = Object.keys(itemIngredients).find(id => itemIngredients[id].some(ingredient => normalized.includes(ingredient)));
    const quantityWords = { mot: 1, hai: 2, ba: 3, bon: 4, tu: 4, nam: 5 };
    const numberMatch = normalized.match(/\b([1-9][0-9]*)\b/);
    const wordQuantity = Object.entries(quantityWords).find(([word]) => normalized.includes(word));

    return {
        text: normalized,
        confirmation: positive ? 'yes' : negative ? 'no' : null,
        itemId,
        ingredientId,
        quantity: numberMatch ? Number(numberMatch[1]) : wordQuantity ? wordQuantity[1] : 1,
        removing: /(^bo\s|(^|\s)(bot|xoa|huy|giam|khong lay)(\s|$))/.test(normalized),
        recommendation: normalized.includes('goi y') || normalized.includes('tieu bieu') || normalized.includes('mon ngon')
    };
}

function extractMultipleOrders(text, aliases) {
    const normalized = normalizeText(text);
    const matches = [];
    Object.entries(aliases).forEach(([id, words]) => {
        words.forEach(normalizedWord => {
            const escaped = normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
            const pattern = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, 'g');
            let match;
            while ((match = pattern.exec(normalized))) {
                matches.push({ id, start: match.index, end: pattern.lastIndex, length: normalizedWord.length });
            }
        });
    });
    matches.sort((first, second) => first.start - second.start || second.length - first.length);
    const selected = [];
    matches.forEach(match => {
        if (!selected.some(item => match.start >= item.start && match.start < item.end)) selected.push(match);
    });
    return selected.map((match, index) => {
        const before = normalized.slice(index ? selected[index - 1].end : 0, match.start);
        const numberMatch = before.match(/(?:^|\s)([1-9][0-9]*|mot|hai|ba|bon|tu|nam)\s*$/);
        const quantities = { mot: 1, hai: 2, ba: 3, bon: 4, tu: 4, nam: 5 };
        const quantity = numberMatch
            ? Number(numberMatch[1]) || quantities[numberMatch[1]] || 1
            : 1;
        const removeCommand = /(^|\s)(bot|bo|xoa|huy|giam|khong lay)(\s|$)/.test(normalized.slice(0, match.start));
        return { id: match.id, quantity, removing: removeCommand };
    });
}

const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    const aliases = {
        pho_bo: ['phở bò', 'phở', 'pho bo', 'pho'],
        banh_mi: ['bánh mì', 'bánh mỳ', 'banh mi', 'banh my'],
        bun_cha: ['bún chả', 'bun cha'],
        com_tam: ['cơm tấm', 'cơm sườn', 'com tam', 'com suon'],
        bun_bo: ['bún bò', 'bun bo'],
        com_ga: ['cơm gà', 'cơm gà xối mỡ', 'com ga', 'com ga xoi mo'],
        tra_tac: ['trà tắc', 'tra tac', 'trà tắt', 'tra tat', 'trà tá', 'tra ta'],
        tra_da: ['trà đá', 'tra da', 'trà đà', 'tra da']
    };
    Object.keys(aliases).forEach(id => {
        aliases[id] = aliases[id].map(normalizeText).sort((a, b) => b.length - a.length);
    });
    const ignoredSpeech = ['a', 'ah', 'uh', 'um', 'e', 'oi', 'xin chao'];
    let listening = false;
    let lastTwoFingerTap = 0;
    let handsFree = false;
    let greetedSession = false;
    let restartTimer;
    let listenTimeout;
    let speechSilenceTimer;
    let microphoneStream = null;
    let backendRecorder = null;
    let backendAudioChunks = [];
    let audioContext = null;
    let noiseAnalyser = null;
    let noiseAnimationFrame = null;

    function clearListenTimeout() {
        clearTimeout(listenTimeout);
        listenTimeout = null;
    }

    function clearSpeechSilenceTimer() {
        clearTimeout(speechSilenceTimer);
        speechSilenceTimer = null;
    }

    async function prepareMicrophone() {
        if (microphoneStream) return true;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return true;
        try {
            microphoneStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            return true;
        } catch (error) {
            voiceStatus.textContent = 'Không bật được chế độ khử ồn, đang thử microphone mặc định...';
            console.warn('Không thể chuẩn bị microphone:', error.message);
            return true;
        }
    }

    function releaseMicrophone() {
        if (!microphoneStream) return;
        if (noiseAnimationFrame) cancelAnimationFrame(noiseAnimationFrame);
        noiseAnimationFrame = null;
        if (audioContext) audioContext.close();
        audioContext = null;
        noiseAnalyser = null;
        if (noiseLevelFill) noiseLevelFill.style.width = '0%';
        microphoneStream.getTracks().forEach(track => track.stop());
        microphoneStream = null;
    }

    function startNoiseMonitor() {
        if (!microphoneStream || audioContext || !noiseLevelFill) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        audioContext = new AudioContextClass();
        noiseAnalyser = audioContext.createAnalyser();
        noiseAnalyser.fftSize = 512;
        const source = audioContext.createMediaStreamSource(microphoneStream);
        const samples = new Uint8Array(noiseAnalyser.fftSize);
        source.connect(noiseAnalyser);

        const updateNoiseLevel = () => {
            noiseAnalyser.getByteTimeDomainData(samples);
            let total = 0;
            samples.forEach(sample => {
                const amplitude = (sample - 128) / 128;
                total += amplitude * amplitude;
            });
            const rms = Math.sqrt(total / samples.length);
            noiseLevelFill.style.width = `${Math.min(100, Math.round(rms * 420))}%`;
            noiseAnimationFrame = requestAnimationFrame(updateNoiseLevel);
        };
        updateNoiseLevel();
    }

    function startBackendRecorder() {
        if (!microphoneStream || !window.MediaRecorder || backendRecorder) return;
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';
        backendAudioChunks = [];
        backendRecorder = new MediaRecorder(microphoneStream, { mimeType });
        backendRecorder.ondataavailable = event => {
            if (event.data.size > 0) backendAudioChunks.push(event.data);
        };
        backendRecorder.onstop = () => {
            const audio = new Blob(backendAudioChunks, { type: mimeType });
            backendAudioChunks = [];
            if (audio.size > 0) sendAudioToBackend(audio);
        };
        backendRecorder.start();
    }

    function stopBackendRecorder() {
        if (!backendRecorder || backendRecorder.state === 'inactive') return;
        backendRecorder.stop();
        backendRecorder = null;
    }

    async function sendAudioToBackend(audio) {
        const formData = new FormData();
        formData.append('audio', audio, 'voice.webm');
        try {
            const response = await fetch('/api/transcribe?provider=auto', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) return;
            const result = await response.json();
            window.lastBackendTranscript = result.text || '';
        } catch (error) {
            console.info('Backend speech provider chưa sẵn sàng:', error.message);
        }
    }

    function scheduleListeningRestart() {
        if (!handsFree) return;
        clearTimeout(restartTimer);
        restartTimer = setTimeout(() => {
            if (!handsFree || listening) return;
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                scheduleListeningRestart();
                return;
            }
            startListening();
        }, 500);
    }

    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    const startListening = () => {
        if (listening) return;
        if (!handsFree) return;
        clearSpeechSilenceTimer();
        try {
            voiceStatus.textContent = 'Đang mở microphone...';
            recognition.start();
            prepareMicrophone().then(() => {
                startNoiseMonitor();
                startBackendRecorder();
            });
            clearListenTimeout();
            listenTimeout = setTimeout(() => {
                if (listening) {
                    voiceStatus.textContent = 'Không nghe được câu rõ ràng, đang thử lại...';
                    recognition.stop();
                }
            }, 8000);
        } catch (error) {
            clearListenTimeout();
            listening = false;
            voiceStatus.textContent = 'Không thể mở microphone. Hãy bấm lại nút.';
            console.warn('Không thể khởi động microphone:', error.message);
        }
    };

    function startVoice() {
        handsFree = true;
        greetedSession = false;
        voiceButton.textContent = 'Dừng gọi món';
        startListening();
    }

    function stopVoice() {
        handsFree = false;
        clearTimeout(restartTimer);
        clearListenTimeout();
        if (listening) recognition.stop();
        releaseMicrophone();
        voiceButton.textContent = 'Bật gọi món bằng giọng nói';
        voiceStatus.textContent = 'Đã dừng gọi món bằng giọng nói.';
    }

    recognition.onstart = () => {
        listening = true;
        voiceButton.textContent = handsFree ? 'Dừng gọi món' : 'Đang nghe...';
        voiceStatus.textContent = 'Đã mở mic. Hãy nói: “Cho tôi một phở bò”';
        if (!greetedSession) {
            greetedSession = true;
            recognition.stop();
            speak('Xin chào, tôi là trợ lý T.N. Bạn đang cần gì?');
        }
    };

    recognition.onaudiostart = () => {
        voiceStatus.textContent = 'Đã nhận microphone, bạn hãy nói món cần gọi.';
    };

    recognition.onspeechstart = () => {
        clearSpeechSilenceTimer();
        voiceStatus.textContent = 'Đã nghe thấy giọng nói...';
    };

    recognition.onspeechend = () => {
        clearSpeechSilenceTimer();
        voiceStatus.textContent = 'Đã ngừng nói, đang chờ 2 giây để xử lý...';
        speechSilenceTimer = setTimeout(() => {
            if (listening) recognition.stop();
        }, 2000);
    };

    recognition.onresult = event => {
        const alternatives = Array.from(event.results[event.resultIndex]);
        const speechResult = alternatives.find(candidate => {
            const candidateText = normalizeText(candidate.transcript);
            const candidateIntent = analyzeVoiceIntent(candidateText, aliases, itemIngredients);
            return candidateIntent.itemId || candidateIntent.confirmation || /(?:doc lai don|gio hang|dat mon|goi mon|dat hang|xac nhan)/.test(candidateText);
        }) || alternatives[0];
        const text = normalizeText(speechResult.transcript);
        clearListenTimeout();
        const confidence = Number(speechResult.confidence);
        if (text.length === 0 || ignoredSpeech.includes(text)) return;
        if (window.speechSynthesis && window.speechSynthesis.speaking) return;

        const intent = analyzeVoiceIntent(text, aliases, itemIngredients);
        if (confidence > 0 && confidence < 0.45 && !intent.itemId && !intent.confirmation && intent.command === 'unknown') return;
        const removeOrderCommand = /^(?:bot|bo bot|xoa|huy|giam|khong lay)\b/.test(text);

        const yes = intent.confirmation === 'yes';
        const no = intent.confirmation === 'no';
        if (checkoutConfirmationPending && (yes || no)) {
            checkoutConfirmationPending = false;
            if (no) {
                speak('Đã hủy xác nhận đặt món.');
                voiceStatus.textContent = 'Đã hủy xác nhận đặt món.';
                return;
            }
            voiceStatus.textContent = 'Đã xác nhận. Đang chuyển sang trang nhận món...';
            window.location.assign('./nhan-mon.html');
            return;
        }
        if (pendingConfirmation && (yes || no)) {
            const pending = pendingConfirmation;
            pendingConfirmation = null;
            if (pending.type === 'cart-restriction') {
                if (no) {
                    const noRestrictionMessage = 'Được, mình giữ nguyên món vừa gọi.';
                    speak(noRestrictionMessage);
                    voiceStatus.textContent = noRestrictionMessage;
                    return;
                }
                pending.itemIds.forEach(itemId => {
                    cartNotes[itemId] = `bỏ ${displayIngredientList(pending.ingredients).join(' và ')}`;
                });
                renderCart();
                const noteMessage = `Đã ghi chú cho ${pending.itemNames.join(' và ')}: bỏ ${displayIngredientList(pending.ingredients).join(' và ')}.`;
                speak(noteMessage);
                voiceStatus.textContent = noteMessage;
                return;
            }
            if (no) {
                const noMessage = pending.type === 'recommendation'
                    ? 'Được, mình không thêm cơm tấm.'
                    : 'Được, mình chưa thêm món đó.';
                speak(noMessage);
                voiceStatus.textContent = noMessage;
                return;
            }
            const blocked = findBlockedIngredients(pending.itemId);
            if (blocked.length > 0) {
                const blockedMessage = `${items[pending.itemId].name} có ${displayIngredientList(blocked).join(' và ')} là thành phần chính, nên không thể bỏ khỏi món này.`;
                speak(blockedMessage);
                voiceStatus.textContent = blockedMessage;
                return;
            }
            const conflict = findExcludedIngredients(pending.itemId);
            if (conflict.length > 0) {
                addOrderWithNote(pending.itemId, pending.quantity, conflict);
                return;
            }
            changeItem(pending.itemId, pending.quantity);
            const yesMessage = `Đã thêm ${pending.quantity} ${items[pending.itemId].name}.`;
            speak(yesMessage);
            voiceStatus.textContent = yesMessage;
            return;
        }

        const exclusionMatch = !removeOrderCommand
            ? text.match(/(?:^|\s)(?:khong an duoc|khong an|di ung)(?:\s+voi)?\s+(.+)$/)
            : null;
        if (exclusionMatch) {
            const ingredientsToExclude = findIngredientAliases(exclusionMatch[1]);
            const blocked = [];
            const excluded = [];
            ingredientsToExclude.forEach(ingredient => {
                if (requiredIngredients.has(ingredient)) {
                    blockedIngredients.add(ingredient);
                    blocked.push(ingredient);
                } else if (removableIngredients.has(ingredient)) {
                    excludedIngredients.add(ingredient);
                    excluded.push(ingredient);
                }
            });
            if (blocked.length || excluded.length) {
                const details = [];
                if (blocked.length) {
                    details.push(`${displayIngredientList(blocked).join(' và ')} là thành phần chính nên không thể bỏ khỏi món`);
                }
                if (excluded.length) {
                    details.push(`đã ghi chú không dùng ${displayIngredientList(excluded).join(' và ')}`);
                }
                const exclusionMessage = `${details.join('; ')}.`;
                const affectedIds = Object.keys(cart).filter(itemId =>
                    findExcludedIngredients(itemId).some(ingredient => excluded.includes(ingredient))
                );
                if (affectedIds.length > 0 && excluded.length > 0) {
                    const itemNames = affectedIds.map(itemId => items[itemId].name);
                    const question = `${exclusionMessage} ${itemNames.join(' và ')} bạn vừa gọi có ${displayIngredientList(excluded).join(' và ')}. Bạn có muốn bỏ ${displayIngredientList(excluded).join(' và ')} không?`;
                    pendingConfirmation = {
                        type: 'cart-restriction',
                        itemIds: affectedIds,
                        itemNames,
                        ingredients: excluded
                    };
                    speak(question);
                    voiceStatus.textContent = question;
                } else {
                    speak(exclusionMessage);
                    voiceStatus.textContent = exclusionMessage;
                }
            }
            return;
        }

        const readOrderCommand = /(^|\s)(?:doc lai don|doc don|xem don|gio hang)(\s|$)/.test(text);
        if (readOrderCommand) {
            const orderIds = Object.keys(cart);
            if (orderIds.length === 0) {
                speak('Giỏ hàng đang trống.');
                voiceStatus.textContent = 'Giỏ hàng đang trống.';
                return;
            }
            const orderSummary = orderIds.map(id => `${cart[id]} ${items[id].name}`).join(', ');
            const total = orderIds.reduce((sum, id) => sum + items[id].price * cart[id], 0);
            const readMessage = `Đơn hiện tại gồm ${orderSummary}. Tổng cộng ${formatMoney(total)}.`;
            speak(readMessage);
            voiceStatus.textContent = readMessage;
            return;
        }

        const submitOrderCommand = /(^|\s)(?:dat mon|goi mon|dat hang|gui don)(\s|$)/.test(text);
        if (submitOrderCommand) {
            requestOrderConfirmation();
            return;
        }

        const recommendedId = 'com_tam';
        const menuNames = Object.values(items).map(item => item.name).join(', ');
        if (intent.recommendation) {
            pendingConfirmation = { type: 'recommendation', itemId: recommendedId, quantity: 1 };
            const recommendation = `Món tiêu biểu của nhà hàng là ${items[recommendedId].name}, giá ${formatMoney(items[recommendedId].price)}. ${ingredients[recommendedId]}. Bạn có muốn gọi món này không?`;
            speak(recommendation);
            voiceStatus.textContent = recommendation;
            return;
        }
        if (text.includes('thuc don') || text.includes('co mon gi') || text.includes('menu')) {
            const menuMessage = `Thực đơn gồm: ${menuNames}.`;
            speak(menuMessage);
            voiceStatus.textContent = menuMessage;
            return;
        }
        if (text.includes('thanh phan') || text.includes('nguyen lieu')) {
            const ingredientId = Object.keys(aliases).find(id => aliases[id].some(alias => text.includes(alias)));
            if (ingredientId) {
                const ingredientMessage = `${items[ingredientId].name} gồm ${ingredients[ingredientId]}.`;
                speak(ingredientMessage);
                voiceStatus.textContent = ingredientMessage;
            } else {
                speak('Bạn muốn hỏi thành phần của món nào?');
                voiceStatus.textContent = 'Bạn muốn hỏi thành phần của món nào?';
            }
            return;
        }
        if (text.includes('tong tien') || text.includes('gio hang')) {
            const total = Object.keys(cart).reduce((sum, id) => sum + items[id].price * cart[id], 0);
            const totalMessage = total ? `Tổng giỏ hàng hiện là ${formatMoney(total)}.` : 'Giỏ hàng đang trống.';
            speak(totalMessage);
            voiceStatus.textContent = totalMessage;
            return;
        }

        const multipleOrders = extractMultipleOrders(text, aliases);
        if (multipleOrders.length > 1) {
            const added = [];
            for (const order of multipleOrders) {
                if (order.removing) {
                    changeItem(order.id, -order.quantity);
                    added.push(`đã bớt ${order.quantity} ${items[order.id].name}`);
                    continue;
                }
                const conflict = findExcludedIngredients(order.id);
                const blocked = findBlockedIngredients(order.id);
                if (blocked.length > 0) {
                    const blockedMessage = `${items[order.id].name} không thể thêm vì có ${displayIngredientList(blocked).join(' và ')} là thành phần chính.`;
                    speak(blockedMessage);
                    voiceStatus.textContent = blockedMessage;
                    continue;
                }
                if (conflict.length > 0) {
                    pendingConfirmation = { type: 'order', itemId: order.id, quantity: order.quantity };
                    const labels = displayIngredientList(conflict).join(' và ');
                    const question = `${items[order.id].name} bạn vừa gọi có ${labels} mà bạn không ăn. Bạn có muốn bỏ ${labels} không?`;
                    speak(question);
                    voiceStatus.textContent = question;
                    break;
                }
                changeItem(order.id, order.quantity);
                added.push(`${order.quantity} ${items[order.id].name}`);
            }
            if (added.length > 0) {
                const multipleMessage = `Đã cập nhật: ${added.join(' và ')}.`;
                speak(multipleMessage);
                voiceStatus.textContent = multipleMessage;
            }
            return;
        }

        const itemId = intent.itemId;
        if (!itemId) {
            voiceStatus.textContent = 'Mình chưa nghe rõ tên món. Bấm nút và thử lại.';
            return;
        }

        const quantity = intent.quantity;
        const isRemoving = intent.removing;
        const amount = isRemoving ? -quantity : quantity;
        const itemName = items[itemId].name;
        const message = isRemoving ? `Đã bớt ${quantity} ${itemName}` : `Đã thêm ${quantity} ${itemName}`;

        if (text.includes('khong hanh')) {
            excludedIngredients.add('hanh la');
        }

        if (!isRemoving) {
            const blocked = findBlockedIngredients(itemId);
            if (blocked.length > 0) {
                const blockedMessage = `${itemName} có ${displayIngredientList(blocked).join(' và ')} là thành phần chính, nên không thể bỏ khỏi món này.`;
                speak(blockedMessage);
                voiceStatus.textContent = blockedMessage;
                return;
            }
            const conflict = findExcludedIngredients(itemId);
            if (conflict.length > 0) {
                pendingConfirmation = { type: 'order', itemId, quantity };
                const labels = displayIngredientList(conflict).join(' và ');
                const question = `${itemName} bạn vừa gọi có ${labels} mà bạn không ăn. Bạn có muốn bỏ ${labels} không?`;
                speak(question);
                voiceStatus.textContent = question;
                return;
            }
        }

        changeItem(itemId, amount);
        speak(message);
        voiceStatus.textContent = `${message}. Bạn có thể nói tiếp.`;
    };

    function findIngredientAliases(text) {
        const knownIngredients = [...new Set(Object.values(itemIngredients).flat())]
            .sort((a, b) => b.length - a.length);
        const found = [];
        knownIngredients.forEach(ingredient => {
            if (!text.includes(ingredient)) return;
            const overlapsLongerMatch = found.some(existing => existing.includes(ingredient));
            if (!overlapsLongerMatch) found.push(ingredient);
        });
        return found;
    }

    function findExcludedIngredients(itemId) {
        return itemIngredients[itemId].filter(ingredient =>
            removableIngredients.has(ingredient) && excludedIngredients.has(ingredient)
        );
    }

    function findBlockedIngredients(itemId) {
        return itemIngredients[itemId].filter(ingredient => blockedIngredients.has(ingredient));
    }

    function addOrderWithNote(itemId, quantity, conflict) {
        changeItem(itemId, quantity);
        cartNotes[itemId] = `bỏ ${displayIngredientList(conflict).join(' và ')}`;
        renderCart();
        const note = `Đã thêm ${quantity} ${items[itemId].name}, ghi chú bỏ ${displayIngredientList(conflict).join(' và ')}.`;
        speak(note);
        voiceStatus.textContent = note;
    }

    recognition.onnomatch = () => {
        const retryMessage = 'Mình chưa nghe rõ, bạn nói lại giúp mình nhé.';
        speak(retryMessage);
        voiceStatus.textContent = retryMessage;
    };

    recognition.onerror = event => {
        listening = false;
        clearListenTimeout();
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            handsFree = false;
        }
        voiceButton.textContent = handsFree ? 'Dừng gọi món' : 'Bật gọi món bằng giọng nói';
        const errorMessages = {
            'not-allowed': 'Hãy cho phép microphone trong trình duyệt rồi bấm nút.',
            'audio-capture': 'Không tìm thấy microphone hoặc microphone đang bị ứng dụng khác sử dụng.',
            'no-speech': 'Chưa nghe thấy giọng nói. Bạn hãy nói gần microphone hơn.',
            aborted: 'Phiên microphone bị ngắt, đang thử mở lại...',
            network: 'Không kết nối được dịch vụ nhận dạng giọng nói. Hãy kiểm tra mạng.'
        };
        const errorMessage = errorMessages[event.error] || `Microphone chưa hoạt động: ${event.error}`;
        if (event.error === 'no-speech') speak(errorMessage);
        voiceStatus.textContent = errorMessage;
    };

    recognition.onend = () => {
        listening = false;
        clearListenTimeout();
        clearSpeechSilenceTimer();
        stopBackendRecorder();
        voiceButton.textContent = handsFree ? 'Dừng gọi món' : 'Bật gọi món bằng giọng nói';
        if (handsFree) {
            scheduleListeningRestart();
        } else if (voiceStatus.textContent === 'Đang nghe...') {
            voiceStatus.textContent = 'Chưa nhận được câu nói. Bấm nút để thử lại.';
        }
    };

    voiceButton.addEventListener('click', () => {
        if (handsFree) {
            stopVoice();
            return;
        }
        startVoice();
    });

    document.addEventListener('touchstart', event => {
        if (event.touches.length !== 2) return;
        event.preventDefault();
        const now = Date.now();
        const isDoubleTap = now - lastTwoFingerTap < 700;
        lastTwoFingerTap = isDoubleTap ? 0 : now;
        if (isDoubleTap) {
            if (!handsFree) startVoice();
        }
    }, { passive: false });
} else {
    voiceButton.disabled = true;
    voiceStatus.textContent = 'Trình duyệt này không hỗ trợ nhận diện giọng nói. Hãy dùng Chrome hoặc Edge.';
    console.warn('Trình duyệt này không hỗ trợ nhận diện giọng nói.');
}

renderCart();

window.orderAI = (() => {
	const quantities = { mot: 1, hai: 2, ba: 3, bon: 4, tu: 4, nam: 5 };

	function normalize(value) {
		return value.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	function detectQuantity(text, start) {
		const before = text.slice(0, start).match(/(?:^|\s)([1-9][0-9]*|mot|hai|ba|bon|tu|nam)\s*$/);
		if (!before) return 1;
		return Number(before[1]) || quantities[before[1]] || 1;
	}

	function analyze(text, aliases) {
		const normalized = normalize(text);
		const matches = [];
		Object.entries(aliases).forEach(([id, words]) => {
			words.forEach(word => {
				const alias = normalize(word);
				let from = 0;
				while (from < normalized.length) {
					const start = normalized.indexOf(alias, from);
					if (start < 0) break;
					matches.push({ id, start, end: start + alias.length, quantity: detectQuantity(normalized, start), length: alias.length });
					from = start + alias.length;
				}
			});
		});
		matches.sort((a, b) => a.start - b.start || b.length - a.length);
		const selected = matches.filter(match => !matches.some(other =>
			other !== match && other.length > match.length && other.start <= match.start && other.end >= match.end
		));
		const unique = selected.filter((match, index) => selected.findIndex(item => item.start === match.start && item.id === match.id) === index);
		const positive = /(^|\s)(co|duoc|dong y|ok|oke|vang|xac nhan)(\s|$)/.test(normalized);
		const negative = /(^|\s)(khong|ko|thoi|huy)(\s|$)/.test(normalized);
		const command = normalized.includes('doc lai don') || normalized.includes('gio hang')
			? 'read-order'
			: normalized.includes('dat mon') || normalized.includes('goi mon') || normalized.includes('dat hang')
				? 'submit-order'
				: unique.length ? 'add-item' : 'unknown';
		return {
			text: normalized,
			command,
			confirmation: positive ? 'yes' : negative ? 'no' : null,
			itemId: unique[0]?.id,
			quantity: unique[0]?.quantity || 1,
			orders: unique.map(({ id, quantity }) => ({ id, quantity })),
			confidence: unique.length ? Math.min(0.99, 0.65 + unique[0].length / 30) : 0.2
		};
	}

	return { analyze, normalize };
})();
