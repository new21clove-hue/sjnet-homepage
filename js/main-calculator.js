import { getFullData } from './data-service.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 데이터베이스에서 전체 데이터를 비동기적으로 불러옵니다.
    const telecomData = await getFullData();

    // 데이터를 불러오지 못하면 에러 메시지를 표시하고 실행 중단
    if (!telecomData) {
        const mainContainer = document.getElementById('calculator-section');
        if(mainContainer) mainContainer.innerHTML = '<p style="text-align:center; color:red; font-weight:bold;">[오류] 요금 정보를 불러오는 데 실패했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.</p>';
        return;
    }

    // --- 여기서부터 모든 UI 및 계산기 로직 시작 ---
    const els = {
        telecomCont: document.getElementById('telecom-options-simple'),
        internetCont: document.getElementById('internet-options-simple'),
        tvCont: document.getElementById('tv-options-simple'),
        settopCont: document.getElementById('settop-options-simple'),
        additionalTvCont: document.getElementById('additional-tv-options-simple'),
        combinedCont: document.getElementById('combined-options-simple'),
        detailFeeSummary: document.getElementById('detail-fee-summary'),
        detailSummaryContent: document.getElementById('detail-summary-content'),
        toggleDetailFeeLink: document.getElementById('toggle-detail-fee'),
        results: {
            baseFee: document.getElementById('base-fee'),
            combinedFee: document.getElementById('combined-fee'),
            totalPrice: document.getElementById('total-price'),
            totalSupport: document.getElementById('total-support-fund'),
            combinedFeeLabel: document.getElementById('combined-fee-label')
        },
        summaryResults: {
            baseFee: document.getElementById('summary-base-fee'),
            combinedFee: document.getElementById('summary-combined-fee'),
            totalPrice: document.getElementById('summary-total-price'),
            totalSupport: document.getElementById('summary-total-support'),
            combinedFeeLabel: document.getElementById('summary-combined-fee-label')
        },
        summaryToggleDetails: document.getElementById('summary-toggle-details'),
        summarySignupBtn: document.getElementById('summary-self-signup-btn')
    };

    let state = { telecom: null, internet: null, tv: null, settop: null, additionalTv: null, combinedProduct: null, skbPrepaid: false };
    const fmt = (n) => (n || 0).toLocaleString('ko-KR');

    function updateCalculations() {
        let intPrice = state.internet?.price || 0;
        let tvPrice = state.tv?.price || 0;
        const settopPrice = state.settop?.price || 0;
        const additionalTvPrice = state.additionalTv?.price || 0;
        let internetDiscount = 0;
        let prepaidDiscount = 0;
        let supportFund = 0;
        const cardDiscount = 15000;
        let routerFee = 0;

        const GIFT_CONFIG_KEY = 'telecomGiftConfig';
        const savedConfig = localStorage.getItem(GIFT_CONFIG_KEY);
        const giftConfig = savedConfig ? JSON.parse(savedConfig) : {};
        
        if (state.telecom && giftConfig[state.telecom]) {
            const config = giftConfig[state.telecom];
            supportFund += config.base || 0;
            if (state.internet) {
                if (state.internet.id.includes('500')) supportFund += config.internet_500 || 0;
                else if (state.internet.id.includes('1000')) supportFund += config.internet_1000 || 0;
            }
            if (state.tv && (state.tv.name.includes('스탠다드') || state.tv.name.includes('ALL') || state.tv.name.includes('프리미엄') || state.tv.name.includes('에센스'))) {
                supportFund += config.tv_premium || 0;
            }
            if (state.settop && !state.settop.name.includes('(기본)')) {
                supportFund += config.settop_premium || 0;
            }
            if (state.additionalTv) {
                supportFund += config.tv_add || 0;
            }
        }

        if (state.telecom === 'SKB' && state.internet) {
            const speed = state.internet.id;
            if (speed && (speed.includes('100') || speed.includes('200'))) routerFee = 2200;
            else if (speed && (speed.includes('500') || speed.includes('1000'))) routerFee = 1100;
        }
        
        if (state.telecom === 'SKB' && state.internet && state.tv && state.combinedProduct) {
            const data = telecomData.SKB;
            const tvId = state.tv.id;
            const internetId = state.internet.id;
            const bundleId = state.combinedProduct.id;
            const giftTableFund = data.gift_table?.[tvId]?.[bundleId]?.[internetId];
            if(giftTableFund) supportFund = giftTableFund;
            
            const combinedPriceFromTable = data.pricing_table?.[tvId]?.[bundleId]?.[internetId] || 0;
            intPrice = 0; tvPrice = combinedPriceFromTable; internetDiscount = 0;
            
            if(state.skbPrepaid) {
                prepaidDiscount = 5500;
                supportFund = 100000;
            }
        } else { 
            if (state.telecom === 'HelloVision' && state.combinedProduct?.name === '모바일결합') {
                const discounts = telecomData.HelloVision.mobileDiscounts;
                if (state.internet && discounts) {
                    internetDiscount = state.tv ? discounts.internet_tv[state.internet.id] : discounts.internet_only[state.internet.id];
                    internetDiscount = internetDiscount || 0;
                }
            } 
            else if (state.telecom && state.internet && state.combinedProduct) {
                 if (state.combinedProduct.name !== '결합없음') {
                    internetDiscount = telecomData[state.telecom]?.discounts?.[state.internet.id] || 0;
                }
            }
        }
        
        const baseFee = (intPrice + tvPrice + settopPrice + additionalTvPrice + routerFee);
        const combinedFee = baseFee - internetDiscount - prepaidDiscount;
        const finalPrice = combinedFee - cardDiscount;

        const combinedFeeLabelText = (internetDiscount > 0 || prepaidDiscount > 0 || state.combinedProduct?.name === '모바일결합') ? '휴대폰 결합 요금' : '할인 적용 후 요금';
        if(els.results.combinedFeeLabel) els.results.combinedFeeLabel.textContent = combinedFeeLabelText;
        if(els.summaryResults.combinedFeeLabel) els.summaryResults.combinedFeeLabel.textContent = combinedFeeLabelText;
        
        els.results.baseFee.textContent = `${fmt(baseFee)}원`;
        els.results.combinedFee.textContent = `${fmt(combinedFee)}원`;
        els.results.totalPrice.textContent = `${fmt(finalPrice)}원`;
        els.results.totalSupport.textContent = `${fmt(supportFund)}원`;

        if (els.summaryResults.baseFee) {
            els.summaryResults.baseFee.textContent = `${fmt(baseFee)}원`;
            els.summaryResults.combinedFee.textContent = `${fmt(combinedFee)}원`;
            els.summaryResults.totalPrice.textContent = `${fmt(finalPrice)}원`;
            els.summaryResults.totalSupport.textContent = `${fmt(supportFund)}원`;
        }

        const isSkb = state.telecom === 'SKB';
        const telecomNameFull = telecomData[state.telecom]?.name || state.telecom;
        const pureInternetFee = isSkb ? 0 : intPrice; 
        const pureTvFee = isSkb ? 0 : tvPrice; 
        const pureSettopFee = settopPrice; 
        const pureAdditionalTvFee = additionalTvPrice;
        const detailRouterFee = isSkb ? routerFee : 0; 
        const skbCombinedPrice = isSkb ? tvPrice : 0;
        const subtotalTvFee = pureInternetFee + pureTvFee + pureSettopFee + pureAdditionalTvFee + detailRouterFee + skbCombinedPrice - internetDiscount - prepaidDiscount;
        const combinedProductName = state.combinedProduct ? state.combinedProduct.name : '결합없음';
        
        let detailHTML = '';
        detailHTML += `<div class="detail-row"><span class="detail-label">통신사:</span> <span class="detail-value">${telecomNameFull}</span></div>`;
        if (isSkb) {
             detailHTML += `<div class="detail-row"><span class="detail-label">인터넷:</span> <span class="detail-value">${state.internet ? state.internet.name : '-'} (0원)</span></div>`;
             detailHTML += `<div class="detail-row"><span class="detail-label">TV:</span> <span class="detail-value">${state.tv ? state.tv.name.split('(')[0].trim() : '-'} (0원)</span></div>`;
        } else {
             detailHTML += `<div class="detail-row"><span class="detail-label">인터넷:</span> <span class="detail-value">${state.internet ? `${state.internet.name} (${fmt(pureInternetFee)}원)` : '-'}</span></div>`;
             detailHTML += `<div class="detail-row"><span class="detail-label">TV:</span> <span class="detail-value">${state.tv ? `${state.tv.name} (${fmt(pureTvFee)}원)` : '-'}</span></div>`;
        }
        detailHTML += `<div class="detail-row"><span class="detail-label">셋탑박스:</span> <span class="detail-value">${state.settop ? `${state.settop.name} (${fmt(pureSettopFee)}원)` : '-'}</span></div>`;
        detailHTML += `<div class="detail-row"><span class="detail-label">TV 추가:</span> <span class="detail-value">${state.additionalTv ? `${state.additionalTv.name} (${fmt(pureAdditionalTvFee)}원)` : '-'}</span></div>`;
        detailHTML += `<div class="detail-row"><span class="detail-label">결합상품:</span> <span class="detail-value">${combinedProductName}</span></div>`;
        if (detailRouterFee > 0) detailHTML += `<div class="detail-row"><span class="detail-label">WiFi 공유기:</span> <span class="detail-value">${fmt(detailRouterFee)}원</span></div>`;
        if (skbCombinedPrice > 0) detailHTML += `<div class="detail-row"><span class="detail-label">인터넷+TV 결합가:</span> <span class="detail-value">${fmt(skbCombinedPrice)}원</span></div>`;
        if (internetDiscount > 0) {
            const discountName = combinedProductName.replace(/결합|할인/g, '');
            detailHTML += `<div class="detail-row"><span class="detail-label">인터넷요금할인(${discountName}):</span> <span class="detail-value discount">-${fmt(internetDiscount)}원</span></div>`;
        }
        if (prepaidDiscount > 0) detailHTML += `<div class="detail-row"><span class="detail-label">선납 할인:</span> <span class="detail-value discount">-${fmt(prepaidDiscount)}원</span></div>`;
        detailHTML += `<div class="detail-row final"><span class="detail-label">인터넷TV요금:</span> <span class="detail-value">${fmt(subtotalTvFee)}원</span></div>`;
        els.detailSummaryContent.innerHTML = detailHTML;
    }

    function createOptionButton(type, item, telecomKey) {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.dataset.name = item.name;
        btn.dataset.key = telecomKey;
        btn.dataset.id = item.id || '';
        btn.dataset.type = item.type || '';
        btn.innerHTML = `<span class="item-name">${item.name}</span>` + ((item.price > 0 && telecomKey !== 'SKB') ? `<span class="item-price">월 ${fmt(item.price)}원</span>` : '');
        btn.onclick = () => {
            if (type === 'telecom') { handleTelecomClick(telecomKey); return; }
            const container = btn.parentNode;
            if (type === 'combinedProduct' && telecomKey === 'SKB') {
                if (item.type === 'addon') { 
                    state.skbPrepaid = !state.skbPrepaid;
                    btn.classList.toggle('selected');
                } else { 
                    if(state.combinedProduct?.id !== item.id) {
                        state.combinedProduct = item;
                        container.querySelectorAll('.option-btn[data-type="main"]').forEach(b => b.classList.toggle('selected', b.dataset.id === item.id));
                    }
                }
            } else { 
                const wasSelected = btn.classList.contains('selected');
                container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                if (wasSelected && (type === 'additionalTv' || type === 'tv' || type === 'internet')) {
                    state[type] = null;
                } else {
                    btn.classList.add('selected');
                    state[type] = item;
                }
            }
            updateCalculations();
        };
        return btn;
    }
    
    function renderProducts(telecomKey) {
        const data = telecomData[telecomKey];
        const containers = [els.internetCont, els.tvCont, els.settopCont, els.additionalTvCont, els.combinedCont];
        containers.forEach(c => c.innerHTML = '');

        data.internet?.forEach(item => els.internetCont.appendChild(createOptionButton('internet', item, telecomKey)));
        data.tv?.forEach(item => els.tvCont.appendChild(createOptionButton('tv', item, telecomKey)));
        data.settop?.forEach(item => els.settopCont.appendChild(createOptionButton('settop', item, telecomKey)));
        data.additionalTv?.forEach(item => els.additionalTvCont.appendChild(createOptionButton('additionalTv', item, telecomKey)));
        
        const noBundleOption = (telecomKey === 'SKB') ? [] : [{ name: '결합없음', price: 0, id: 'no_bundle' }];
        if (data.combinedProducts) {
            [ ...noBundleOption, ...data.combinedProducts ].forEach(item => els.combinedCont.appendChild(createOptionButton('combinedProduct', item, telecomKey)));
        }
    }

    function handleTelecomClick(telecomKey) {
        state.telecom = telecomKey;
        document.querySelectorAll('#telecom-options-simple .option-btn').forEach(btn => btn.classList.toggle('selected', btn.dataset.key === telecomKey));
        renderProducts(telecomKey);
        const data = telecomData[telecomKey];
        state.internet = data.internet?.find(item => item.id && item.id.includes('500')) || data.internet?.[0] || null;
        state.tv = data.tv?.[0] || null;
        state.settop = data.settop?.[0] || null;
        state.additionalTv = null;
        state.skbPrepaid = false;
        if (telecomKey === 'SKB') {
            state.combinedProduct = data.combinedProducts?.find(p => p.type === 'main' && p.id === 'family_bundle') || data.combinedProducts?.find(p => p.type === 'main') || null;
        } else if (telecomKey === 'Skylife') {
             state.combinedProduct = null;
        } else if (telecomKey === 'HelloVision') {
             state.combinedProduct = data.combinedProducts?.[0] || null;
        } else { 
            const combinedList = [ { name: '결합없음', price: 0, id: 'no_bundle' }, ...(data.combinedProducts || []) ];
            state.combinedProduct = combinedList.length > 1 ? combinedList[1] : combinedList[0];
        }
        document.querySelectorAll('.product-options .option-btn').forEach(b => b.classList.remove('selected'));
        if (state.internet) document.querySelector(`#internet-options-simple .option-btn[data-name="${state.internet.name}"]`)?.classList.add('selected');
        if (state.tv) document.querySelector(`#tv-options-simple .option-btn[data-name="${state.tv.name}"]`)?.classList.add('selected');
        if (state.settop) document.querySelector(`#settop-options-simple .option-btn[data-name="${state.settop.name}"]`)?.classList.add('selected');
        if (state.combinedProduct) document.querySelector(`#combined-options-simple .option-btn[data-name="${state.combinedProduct.name}"]`)?.classList.add('selected');
        els.detailFeeSummary.style.display = 'none';
        els.toggleDetailFeeLink.textContent = '상세요금 >';
        updateCalculations();
    }
    
    function navigateToSignupPage() {
        let combinedProductName = state.combinedProduct?.name;
        if(state.telecom === 'SKB' && state.skbPrepaid) combinedProductName += ' + SKB(알뜰) 전용요금 선납';
        const params = {
            telecom: telecomData[state.telecom]?.name || state.telecom,
            internet: state.internet?.name,
            tv: state.tv?.name,
            settop: state.settop?.name,
            additionalTv: state.additionalTv?.name,
            combinedProduct: combinedProductName,
            totalPrice: document.getElementById('total-price').textContent,
            supportFund: document.getElementById('total-support-fund').textContent
        };
        const cleanedParams = {};
        for (const key in params) {
            if (params[key] !== null && params[key] !== undefined) cleanedParams[key] = params[key];
        }
        window.location.href = 'signup.html?' + new URLSearchParams(cleanedParams).toString();
    }

    function setupSignupButton() {
        const signupBtn = document.getElementById('self-signup-btn-quote');
        if (!signupBtn) return;
        signupBtn.addEventListener('click', (event) => {
            event.preventDefault();
            navigateToSignupPage();
        });
    }
    
    function setupDetailFeeToggle() {
        els.toggleDetailFeeLink.addEventListener('click', (e) => {
            e.preventDefault();
            const isHidden = els.detailFeeSummary.style.display === 'none' || els.detailFeeSummary.style.display === '';
            els.detailFeeSummary.style.display = isHidden ? 'block' : 'none';
            const linkText = isHidden ? '상세요금 숨기기' : '상세요금';
            const iconClass = isHidden ? 'fa-chevron-up' : 'fa-chevron-right';
            els.toggleDetailFeeLink.innerHTML = `${linkText} <i class="fas ${iconClass}"></i>`;
        });
    }
    
    function setupSummaryBarActions() {
        if (els.summaryToggleDetails) {
            els.summaryToggleDetails.addEventListener('click', (e) => {
                e.preventDefault();
                els.toggleDetailFeeLink.click(); 
                document.querySelector('.quote-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
        if (els.summarySignupBtn) {
            els.summarySignupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                navigateToSignupPage();
            });
        }
    }

    function setupPageViewToggle() {
        const mainContentWrapper = document.getElementById('main-content-wrapper');
        const aiViewWrapper = document.getElementById('ai-view-wrapper');
        const aiNavButton = document.getElementById('ai-calculator-nav-link');
        const aiHeaderButton = document.getElementById('ai-calculator-header-link');
        const logoButton = document.getElementById('logo-link');
        const quickAiFinderBtn = document.getElementById('quick-ai-finder-btn');

        const showMainView = () => { mainContentWrapper.style.display = 'block'; aiViewWrapper.style.display = 'none'; };
        const showAiView = () => { mainContentWrapper.style.display = 'none'; aiViewWrapper.style.display = 'block'; window.scrollTo(0, 0); };
        
        if(aiNavButton) aiNavButton.addEventListener('click', (e) => { e.preventDefault(); showAiView(); });
        if(aiHeaderButton) aiHeaderButton.addEventListener('click', (e) => { e.preventDefault(); showAiView(); });
        if(logoButton) logoButton.addEventListener('click', (e) => { e.preventDefault(); showMainView(); window.scrollTo(0, 0); });
        if(quickAiFinderBtn) quickAiFinderBtn.addEventListener('click', (e) => { e.preventDefault(); showAiView(); });

        document.querySelectorAll('a[data-carrier]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showMainView(); 
                const carrierKey = this.dataset.carrier;
                handleTelecomClick(carrierKey);
                document.querySelector('#calculator-section')?.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    function setupSecretBenefitModal() {
        const quickSecretBenefitBtn = document.getElementById('quick-secret-benefit-btn');
        const modalOverlay = document.getElementById('secret-benefit-modal');
        const form = document.getElementById('benefit-apply-form');
        const nameInput = document.getElementById('benefit-name');
        const phoneInput = document.getElementById('benefit-phone');
        const consentAll = document.getElementById('benefit-consent-all');
        const consentItems = Array.from(form.querySelectorAll('.consent-item'));
        const consentToggles = form.querySelectorAll('.consent-toggle-arrow');
        const customAlert = document.getElementById('custom-alert');
        const productBtns = modalOverlay.querySelectorAll('.product-btn');

        if (!modalOverlay || !form) return;
        
        const showModal = (modalEl) => {
            document.body.classList.add('modal-open');
            modalEl.classList.add('visible');
            modalEl.setAttribute('aria-hidden', 'false');
        };
        const hideModal = (modalEl) => {
            document.body.classList.remove('modal-open');
            modalEl.classList.remove('visible');
            modalEl.setAttribute('aria-hidden', 'true');
        };
        
        const openSecretModal = (e) => {
            e.preventDefault();
            showModal(modalOverlay);
        };
        
        document.getElementById('secret-benefit-link')?.addEventListener('click', openSecretModal);
        if(quickSecretBenefitBtn) quickSecretBenefitBtn.addEventListener('click', openSecretModal);

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay || e.target.closest('.modal-close-btn')) {
                hideModal(modalOverlay);
            }
        });

        productBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('selected');
            });
        });

        const nameRegex = /^(?:[a-zA-Z]{4,}|[가-힣]{2,})$/;
        const phoneRegex = /^010-\d{4}-\d{4}$/;

        const validateField = (input, regex, message) => {
            const validationMessage = input.nextElementSibling;
            if (!input.value || !regex.test(input.value)) {
                input.classList.add('invalid');
                validationMessage.textContent = message;
                validationMessage.style.display = 'block';
                return false;
            } else {
                input.classList.remove('invalid');
                validationMessage.style.display = 'none';
                return true;
            }
        };

        nameInput.addEventListener('input', () => validateField(nameInput, nameRegex, '이름은 한글 2자 이상, 또는 영문 4자 이상 입력해주세요.'));
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            e.target.value = value.replace(/^(\d{3})(\d{4})(\d{4})$/, `$1-$2-$3`);
            validateField(phoneInput, phoneRegex, '휴대폰번호 형식이 올바르지 않습니다.');
        });
        
        consentAll.addEventListener('change', () => {
            consentItems.forEach(item => item.checked = consentAll.checked);
        });

        consentItems.forEach(item => {
            item.addEventListener('change', () => {
                const allChecked = consentItems.every(i => i.checked);
                consentAll.checked = allChecked;
            });
        });
        
        consentToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const detail = toggle.closest('li').querySelector('.consent-detail');
                const isOpen = detail.classList.toggle('open');
                toggle.classList.toggle('open', isOpen);
                if (isOpen) {
                    detail.style.maxHeight = detail.scrollHeight + 'px';
                } else {
                    detail.style.maxHeight = '0';
                }
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const isNameValid = validateField(nameInput, nameRegex, '이름은 한글 2자 이상, 또는 영문 4자 이상 입력해주세요.');
            const isPhoneValid = validateField(phoneInput, phoneRegex, '휴대폰번호 형식이 올바르지 않습니다.');
            const isConsentValid = [...form.querySelectorAll('.consent-required')].every(c => c.checked);

            if (!isConsentValid) {
                alert('필수 약관에 모두 동의해주세요.');
                return;
            }
            
            if (isNameValid && isPhoneValid && isConsentValid) {
                const selectedProducts = [...productBtns].filter(btn => btn.classList.contains('selected')).map(btn => btn.querySelector('span').textContent);
                const applicationData = {
                    products: selectedProducts,
                    name: nameInput.value,
                    phone: phoneInput.value,
                    consents: {
                        all: consentAll.checked,
                        required: [...form.querySelectorAll('.consent-required')].map(c => c.checked),
                        marketing: form.querySelector('.consent-item:not(.consent-required)').checked
                    }
                };
                
                console.log('신청 정보:', applicationData);
                const SCRIPT_URL = "여기에_비밀혜택_신청용_웹_앱_URL을_붙여넣으세요";
                
                if (!SCRIPT_URL || SCRIPT_URL === "여기에_비밀혜택_신청용_웹_앱_URL을_붙여넣으세요") {
                    console.error("SCRIPT_URL is not set.");
                    alert("신청 시스템이 준비되지 않았습니다. 관리자에게 문의해주세요.");
                    return;
                }

                fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify(applicationData),
                    headers: { 'Content-Type': 'application/json' },
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Google Sheet 응답:', data);
                    if (data.result === 'success') {
                        hideModal(modalOverlay);
                        showModal(customAlert);
                        form.reset();
                        productBtns.forEach(btn => btn.classList.remove('selected'));
                        productBtns[0].classList.add('selected');
                    } else {
                        alert('신청 처리 중 오류가 발생했습니다: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Fetch Error:', error);
                    alert('신청 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.');
                });
            }
        });

        customAlert.addEventListener('click', (e) => {
            if (e.target === customAlert || e.target.id === 'alert-close-btn') {
                hideModal(customAlert);
            } else if (e.target.id === 'alert-signup-btn') {
                hideModal(customAlert);
                document.getElementById('calculator-section').scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
    
    function setupQuickMenu() {
        const quickMenuContainer = document.querySelector('.quick-menu-container');
        const quickMenuToggle = document.querySelector('.quick-menu-toggle');
        const iconItems = document.querySelectorAll('.icon-item');
        const panelToggleArrow = document.querySelector('.quick-menu-panel .toggle-arrow');
        const selfSignupBtnIcon = document.querySelector('.icon-item[data-action="self-signup"]');
        const selfSignupBtnInPanel = document.getElementById('quick-self-signup-btn');

        const toggleMenu = (forceState) => {
            quickMenuContainer.classList.toggle('is-open', forceState);
        };

        if (quickMenuToggle) quickMenuToggle.addEventListener('click', () => toggleMenu());
        if (panelToggleArrow) panelToggleArrow.addEventListener('click', () => toggleMenu());
        
        iconItems.forEach(item => {
            if (item.dataset.action === 'self-signup') return;
            item.addEventListener('click', (e) => {
                if (item.getAttribute('target') !== '_blank') e.preventDefault();
                switch (item.dataset.action) {
                    case 'secret-benefit': document.getElementById('quick-secret-benefit-btn').click(); break;
                    case 'ai-finder': document.getElementById('quick-ai-finder-btn').click(); break;
                    case 'kakao': window.open(item.href, '_blank'); break;
                }
            });
        });

        const openQuickSignupModal = (e) => {
            e.preventDefault();
            const modal = document.getElementById('quick-signup-modal');
            document.body.classList.add('modal-open');
            modal.classList.add('visible');
            modal.setAttribute('aria-hidden', 'false');
            modal.dispatchEvent(new CustomEvent('initialize'));
            if (quickMenuContainer.classList.contains('is-open')) toggleMenu(false);
        };

        if (selfSignupBtnIcon) selfSignupBtnIcon.addEventListener('click', openQuickSignupModal);
        if (selfSignupBtnInPanel) selfSignupBtnInPanel.addEventListener('click', openQuickSignupModal);
        
        let touchStartX = 0, touchStartY = 0;
        const swipeThreshold = 50;
        document.body.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        document.body.addEventListener('touchend', e => {
            const deltaX = e.changedTouches[0].screenX - touchStartX;
            const deltaY = e.changedTouches[0].screenY - touchStartY;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX < -swipeThreshold && !quickMenuContainer.classList.contains('is-open') && touchStartX > window.innerWidth * 0.75) toggleMenu(true);
                if (deltaX > swipeThreshold && quickMenuContainer.classList.contains('is-open')) toggleMenu(false);
            }
        });
    }

    function setupAffiliateCardLink() {
        const link = document.getElementById('affiliate-card-link');
        const modal = document.getElementById('affiliate-card-modal');
        if (!link || !modal) return;

        const closeBtn = modal.querySelector('.modal-close-btn');
        const tabsContainer = modal.querySelector('.card-modal-tabs');
        const tabBtns = modal.querySelectorAll('.card-tab-btn');
        const tabContents = modal.querySelectorAll('.card-tab-content');

        const showModal = () => {
            document.body.classList.add('modal-open');
            modal.classList.add('visible');
            modal.setAttribute('aria-hidden', 'false');
        };
        const hideModal = () => {
            document.body.classList.remove('modal-open');
            modal.classList.remove('visible');
            modal.setAttribute('aria-hidden', 'true');
        };

        link.addEventListener('click', (e) => { e.preventDefault(); showModal(); });
        closeBtn.addEventListener('click', hideModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });

        tabsContainer.addEventListener('click', (e) => {
            const targetBtn = e.target.closest('.card-tab-btn');
            if (!targetBtn) return;
            const tabId = targetBtn.dataset.tab;
            tabBtns.forEach(btn => btn.classList.remove('active'));
            targetBtn.classList.add('active');
            tabContents.forEach(content => content.classList.toggle('active', content.id === tabId));
        });
    }

    function setupQuickSignupModal() {
        const modal = document.getElementById('quick-signup-modal');
        if (!modal) return;

        const closeBtn = modal.querySelector('.modal-close-btn');
        const submitBtn = document.getElementById('qs-submit-btn');
        const containers = {
            telecom: document.getElementById('qs-telecom-options'),
            internet: document.getElementById('qs-internet-options'),
            tv: document.getElementById('qs-tv-options'),
            additionalTv: document.getElementById('qs-additional-tv-select'),
            usim: document.getElementById('qs-usim-toggle')
        };
        let quickSignupState = {};
        const initialTelecomOrder = ['SK', 'LG', 'KT', 'SKB', 'Skylife', 'HelloVision'];

        const hideModal = () => {
            document.body.classList.remove('modal-open');
            modal.classList.remove('visible');
            modal.setAttribute('aria-hidden', 'true');
        };

        const createButton = (type, item, container) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = item.name.split('(')[0].trim();
            btn.dataset.name = item.name;

            btn.onclick = () => {
                const wasSelected = btn.classList.contains('selected');
                
                if (type !== 'telecom') {
                    container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                } else {
                    container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                }

                if (wasSelected && type !== 'telecom') {
                    quickSignupState[type] = null;
                    if(type === 'tv') container.querySelector('.no-tv-btn')?.classList.add('selected');
                } else {
                    btn.classList.add('selected');
                    quickSignupState[type] = item;
                    if (type === 'telecom') renderSubOptions(item.key);
                    if (type === 'tv') container.querySelector('.no-tv-btn')?.classList.remove('selected');
                }
            };
            container.appendChild(btn);
        };
        
        const renderSubOptions = (telecomKey) => {
            quickSignupState.telecom = { key: telecomKey, name: telecomData[telecomKey].name || telecomKey };
            ['internet', 'tv'].forEach(type => {
                containers[type].innerHTML = '';
                const options = telecomData[telecomKey]?.[type] || [];
                if (type === 'tv') {
                    const noTvBtn = document.createElement('button');
                    noTvBtn.className = 'option-btn no-tv-btn';
                    noTvBtn.textContent = '미신청';
                    noTvBtn.onclick = () => {
                        quickSignupState.tv = null;
                        containers.tv.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                        noTvBtn.classList.add('selected');
                    };
                    containers.tv.appendChild(noTvBtn);
                }
                options.forEach(item => createButton(type, item, containers[type]));
            });
            
            containers.additionalTv.innerHTML = '<option value="">선택 안함</option>';
            (telecomData[telecomKey]?.additionalTv || []).forEach(item => {
                containers.additionalTv.add(new Option(item.name, item.name));
            });
            quickSignupState.internet = null;
            quickSignupState.tv = null;
            quickSignupState.additionalTv = null;
        };
        
        const initializeModal = () => {
            quickSignupState = { usim: false };
            containers.usim.checked = false;
            containers.telecom.innerHTML = '';
            initialTelecomOrder.forEach(key => createButton('telecom', { key: key, name: telecomData[key].name || key }, containers.telecom));
            const firstTelecomBtn = containers.telecom.querySelector('.option-btn');
            if (firstTelecomBtn) firstTelecomBtn.click();
        };

        modal.addEventListener('initialize', initializeModal);
        containers.additionalTv.onchange = e => {
            const name = e.target.value;
            quickSignupState.additionalTv = name ? { name } : null;
        };
        containers.usim.onchange = e => { quickSignupState.usim = e.target.checked; };
        submitBtn.onclick = () => {
            if (!quickSignupState.telecom || !quickSignupState.internet) {
                alert('통신사와 인터넷 상품은 필수로 선택해야 합니다.');
                return;
            }
            const params = {
                telecom: quickSignupState.telecom.name,
                internet: quickSignupState.internet.name,
                tv: quickSignupState.tv?.name,
                additionalTv: quickSignupState.additionalTv?.name,
                usim: quickSignupState.usim ? '신청' : null
            };
            const cleaned = Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null));
            window.location.href = 'signup.html?' + new URLSearchParams(cleaned).toString();
            hideModal();
        };
        closeBtn.addEventListener('click', hideModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });
    }

    function init() {
        const initialTelecomOrder = ['SK', 'LG', 'KT', 'SKB', 'Skylife', 'HelloVision'];
        
        initialTelecomOrder.forEach(key => {
            if (telecomData[key]) { // 데이터가 존재하는지 확인
                const btn = document.createElement('button');
                btn.className = 'option-btn'; btn.dataset.key = key;
                btn.innerHTML = `<span class="item-name">${telecomData[key].name || key}</span>`;
                btn.onclick = () => handleTelecomClick(key);
                els.telecomCont.appendChild(btn);
            }
        });
        
        // 첫 번째 통신사로 초기화
        if (initialTelecomOrder.length > 0 && telecomData[initialTelecomOrder[0]]) {
            handleTelecomClick(initialTelecomOrder[0]);
        }
        
        setupPageViewToggle(); 
        setupQuickMenu();
        setupSignupButton();
        setupDetailFeeToggle();
        setupSummaryBarActions();
        setupSecretBenefitModal();
        setupAffiliateCardLink();
        setupQuickSignupModal();
    }
    
    init();
});