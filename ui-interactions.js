// 견적 비교 기능 관련 함수
function getCompareList() {
    return JSON.parse(sessionStorage.getItem('compareList') || '[]');
}

function saveCompareList(list) {
    sessionStorage.setItem('compareList', JSON.stringify(list));
    updateCompareCount();
}

function updateCompareCount() {
    const badge = document.getElementById('compare-count-badge');
    if (badge) {
        badge.textContent = getCompareList().length;
    }
}

// ai-calculator.js 등 다른 파일에서 접근할 수 있도록 window 객체에 추가
window.addToCompare = function(item) {
    let list = getCompareList();
    if (!list.some(i => i.id === item.id)) {
        if (list.length >= 4) {
            alert('비교함에는 최대 4개까지 담을 수 있습니다.');
            return;
        }
        list.push(item);
        saveCompareList(list);
    } else {
        alert('이미 비교함에 추가된 항목입니다.');
    }
}

// ai-calculator.js에서 사용할 수 있도록 전역에 노출
window.generateSignupUrl = function(resultId) {
    const allResults = JSON.parse(sessionStorage.getItem('lastAiResults') || '[]');
    const result = allResults.find(r => r.id === resultId);
    if (!result) return 'signup.html';

    const userSelections = JSON.parse(sessionStorage.getItem('lastAiSelections') || '{}');
    const usimCount = (userSelections.mobilePlans || []).filter(p => p.hasUsim).length;

    const params = {
        telecom: result.carrier,
        internet: result.details.internet?.name,
        tv: result.details.tv?.name,
        combinedProduct: result.bestPlanName,
        usim: usimCount > 0 ? `${usimCount}개` : null,
        totalPrice: `${Math.round(result.netBill)}`,
        supportFund: `${Math.round(result.cashBenefit)}`
    };
    const cleanedParams = {};
    for (const key in params) {
        if (params[key] !== null && params[key] !== undefined) cleanedParams[key] = params[key];
    }
    return 'signup.html?' + new URLSearchParams(cleanedParams).toString();
}


export function initializeUI(telecomData) {

    function setupModalHistoryHandler() {
        const modalIds = [
            'detail-modal', 'secret-benefit-modal', 'custom-alert', 
            'affiliate-card-modal', 'quick-signup-modal', 
            'quick-signup-info-modal', 'event-detail-modal',
            'compare-modal' // 비교함 모달 ID 추가
        ];
        let currentlyOpenModalId = null;

        const openModalWithHistory = (modalId) => {
            const modal = document.getElementById(modalId);
            if (!modal || modal.classList.contains('visible')) return;

            document.body.classList.add('modal-open');
            modal.classList.add('visible');
            modal.setAttribute('aria-hidden', 'false');
            
            currentlyOpenModalId = modalId;
            history.pushState({ modalId: modalId }, '', `#${modalId}`);
        };

        const closeModal = (modalId, fromPopState = false) => {
            const modal = document.getElementById(modalId);
            if (!modal || !modal.classList.contains('visible')) return;

            document.body.classList.remove('modal-open');
            modal.classList.remove('visible');
            modal.setAttribute('aria-hidden', 'true');
            
            if (currentlyOpenModalId === modalId) {
                currentlyOpenModalId = null;
            }

            // 뒤로가기 대신 해시 제거(상태는 유지, popstate 최소화)
            if (!fromPopState && location.hash === `#${modalId}`) {
                history.replaceState(null, '', location.pathname + location.search);
            }
        };

        window.addEventListener('popstate', (event) => {
            if (currentlyOpenModalId && (!event.state || event.state.modalId !== currentlyOpenModalId)) {
                closeModal(currentlyOpenModalId, true);
            }
        });

        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal || e.target.closest('.modal-close-btn')) {
                        closeModal(id);
                    }
                });
            }
        });

        window.globalModal = { open: openModalWithHistory, close: closeModal };
    }

    function setupPageViewToggle() {
        const mainContentWrapper = document.getElementById('main-content-wrapper');
        const aiViewWrapper = document.getElementById('ai-view-wrapper');
        const aiTriggerBtns = document.querySelectorAll('#ai-calculator-nav-link-text, #ai-calculator-header-link, #ai-calculator-body-link, #quick-ai-finder-btn, #fab-ai-finder, #hero-ai-planner-btn');
        const aiNavButton = document.getElementById('ai-calculator-nav-link-text');
        const aiHeaderButton = document.getElementById('ai-calculator-header-link');
        const aiBodyButton = document.getElementById('ai-calculator-body-link');
        const logoButton = document.getElementById('logo-link');
        const quickAiFinderBtn = document.getElementById('quick-ai-finder-btn');
        const fabAiFinderBtn = document.getElementById('fab-ai-finder');

        const showMainView = () => { 
            mainContentWrapper.style.display = 'block'; 
            aiViewWrapper.style.display = 'none'; 
            document.body.classList.remove('ai-view-active');
        };
        const showAiView = () => { 
            mainContentWrapper.style.display = 'none'; 
            aiViewWrapper.style.display = 'block'; 
            document.body.classList.add('ai-view-active');
            window.scrollTo(0, 0); 
        };
        
        if(aiNavButton) aiNavButton.addEventListener('click', (e) => { e.preventDefault(); showAiView(); });
        if(aiHeaderButton) aiHeaderButton.addEventListener('click', (e) => { e.preventDefault(); showAiView(); });
        if(aiBodyButton) aiBodyButton.addEventListener('click', (e) => { e.preventDefault(); showAiView(); });
        if(logoButton) logoButton.addEventListener('click', (e) => { e.preventDefault(); showMainView(); window.scrollTo(0, 0); });
        
        const handleAiFinderClick = (e) => {
            e.preventDefault();
            showAiView();
            const fabContainer = document.querySelector('.mobile-fab-container.open');
            if (fabContainer) fabContainer.classList.remove('open');
            const sidebar = document.querySelector('.quick-menu-container.open');
            if(sidebar) sidebar.classList.remove('open');
            
            const pageBackdrop = document.querySelector('.page-backdrop');
            if (pageBackdrop) pageBackdrop.classList.remove('visible');
        };

        if(quickAiFinderBtn) quickAiFinderBtn.addEventListener('click', handleAiFinderClick);
        if(fabAiFinderBtn) fabAiFinderBtn.addEventListener('click', handleAiFinderClick);

        document.querySelectorAll('a[data-carrier]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showMainView(); 
                const carrierKey = this.dataset.carrier;
                const telecomButton = document.querySelector(`#telecom-options-simple .option-btn[data-key="${carrierKey}"]`);
                if (telecomButton) telecomButton.click();
                
                document.querySelector('#calculator-section')?.scrollIntoView({ behavior: 'smooth' });
            });
        });

        try {
            const rawContext = sessionStorage.getItem('returnContext');
            const ctx = rawContext ? JSON.parse(rawContext) : null;

            if (location.hash === '#ai' || ctx?.type === 'ai') {
                showAiView();
                if (ctx?.selections) {
                    const { internetSpeed, tvPlan, additionalTvCount, mobilePlans } = ctx.selections;
                    document.querySelector(`#internet-selector button[data-value="${internetSpeed}"]`)?.click();
                    document.querySelector(`#tv-selector button[data-value="${tvPlan}"]`)?.click();
                    document.querySelector(`#additional-tv-selector button[data-value="${additionalTvCount}"]`)?.click();

                    if (mobilePlans && mobilePlans.length > 0) {
                        document.querySelector('#mobile-combination-selector button[data-value="yes"]')?.click();
                        const addBtn = document.getElementById('add-mobile-btn');
                        document.querySelectorAll('#mobile-list .mobile-entry:not(:first-child)').forEach(el => el.remove());
                        
                        mobilePlans.forEach((plan, index) => {
                            if (index > 0) addBtn.click();
                        });

                        setTimeout(() => {
                            document.querySelectorAll('#mobile-list .mobile-entry').forEach((entry, index) => {
                                const plan = mobilePlans[index];
                                if (plan && window.MOBILE_TIER_PRICES) {
                                    const tierValue = Object.keys(window.MOBILE_TIER_PRICES).find(key => window.MOBILE_TIER_PRICES[key].price === plan.price) || "80000";
                                    entry.querySelector('.mobile-plan-tier').value = tierValue;
                                    entry.querySelector('.youth-checkbox').checked = plan.isYouth;
                                    entry.querySelector('.usim-checkbox').checked = plan.hasUsim;
                                }
                            });
                        }, 100);
                    } else {
                        document.querySelector('#mobile-combination-selector button[data-value="no"]')?.click();
                    }
                    
                    if (ctx.results && ctx.results.html) {
                        sessionStorage.setItem('lastAiResults', JSON.stringify(ctx.results.data));
                        sessionStorage.setItem('lastAiSelections', JSON.stringify(ctx.selections));
                        const payload = new CustomEvent('restoreAiResults', { detail: ctx.results });
                        const fire = () => document.dispatchEvent(payload);

                        if (window.aiModuleReady) {
                            fire();
                        } else {
                            window.addEventListener('ai-module-ready', fire, { once: true });
                        }
                    }
                }
            } else if (location.hash === '#calculator-section' || ctx?.type === 'main') {
                showMainView();
                if (ctx?.state) {
                    const payload = new CustomEvent('restoreMainCalculator', { detail: ctx.state });
                    const fire = () => document.dispatchEvent(payload);

                    if (window.mainModuleReady) {
                        fire();
                    } else {
                        window.addEventListener('main-module-ready', fire, { once: true });
                    }
                }
                document.querySelector('#calculator-section')?.scrollIntoView({ behavior: 'auto' });
            }

            sessionStorage.removeItem('returnContext');
        } catch (e) {
            console.warn('상태 복원 중 오류 발생:', e);
            sessionStorage.removeItem('returnContext');
        }
    }

    function setupSecretBenefitModal() {
        const secretBenefitBtns = document.querySelectorAll('#secret-benefit-link-nav, #quick-secret-benefit-btn, #fab-secret-benefit, #secret-benefit-link-body');
        const modalId = 'secret-benefit-modal';
        const modalOverlay = document.getElementById(modalId);
        if (!modalOverlay || secretBenefitBtns.length === 0) return;

        const form = document.getElementById('benefit-apply-form');
        const nameInput = document.getElementById('benefit-name');
        const phoneInput = document.getElementById('benefit-phone');
        const consentAll = document.getElementById('benefit-consent-all');
        const consentItems = Array.from(form.querySelectorAll('.consent-item'));
        const consentToggles = form.querySelectorAll('.consent-toggle-arrow');
        const productBtns = modalOverlay.querySelectorAll('.product-btn');
        const loadingOverlay = document.getElementById('loading-overlay');
        
        secretBenefitBtns.forEach(btn => btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.globalModal.open(modalId);
        }));

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
                const submitBtn = form.querySelector('.btn-submit');
                const originalBtnText = submitBtn ? submitBtn.innerHTML : '처리 중...';

                // 먼저 스크립트 URL 검증(조기종료 시 로딩 표시를 하지 않도록)
                const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwofjx4zLTtMX5Fi3lzw4oNYqDcLn7_gygyDblAJ5Pxfg7c-A6P39MPNP6l7Xm2lHhfjQ/exec";
                if (!SCRIPT_URL || !/^https:\/\/script\.google\.com\/macros\/s\/AKfyc/i.test(SCRIPT_URL)) {
                    console.error("SCRIPT_URL is not set or invalid.");
                    alert("신청 시스템이 준비되지 않았습니다. 관리자에게 문의해주세요.");
                    return;
                }
                
                // 유효하면 로딩/비활성화 시작
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '처리 중...';
                }
                if (loadingOverlay) loadingOverlay.classList.add('visible');

                const selectedProducts = [...productBtns].filter(btn => btn.classList.contains('selected')).map(btn => btn.querySelector('span').textContent);
                const applicationData = {
                    products: selectedProducts,
                    name: nameInput.value,
                    phone: phoneInput.value,
                    consents: {
                        all: consentAll.checked,
                        required: [...form.querySelectorAll('.consent-required')].map(c => c.checked),
                        marketing: form.querySelector('.consent-item:not(.consent-required)')?.checked || false
                    }
                };

                fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify(applicationData),
                    redirect: "follow",
                })
                .then(response => response.json())
                .then(data => {
                    if (data.result === 'success') {
                        // 모달 닫기 → 약간의 지연 후 알림 열기 (popstate race 방지)
                        window.globalModal.close(modalId);
                        setTimeout(() => {
                            window.globalModal.open('custom-alert');
                        }, 80);

                        form.reset();
                        productBtns.forEach(btn => btn.classList.remove('selected'));
                        productBtns[0]?.classList.add('selected');
                    } else {
                        throw new Error(data.message || '알 수 없는 서버 오류');
                    }
                })
                .catch(error => {
                    console.error('Fetch Error:', error);
                    alert('신청 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.');
                })
                .finally(() => {
                    if (loadingOverlay) loadingOverlay.classList.remove('visible');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalBtnText;
                    }
                });
            }
        });

        const customAlert = document.getElementById('custom-alert');
        if (customAlert) {
            customAlert.addEventListener('click', (e) => {
                if (e.target.id === 'alert-close-btn') {
                    window.globalModal.close('custom-alert');
                } else if (e.target.id === 'alert-signup-btn') {
                    window.globalModal.close('custom-alert');
                    document.getElementById('calculator-section')?.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }
    
    function setupQuickMenu() {
        const stickyHeader = document.querySelector('.sticky-header-container');
        const summaryBar = document.querySelector('.summary-sticky-bar');
        const pageBackdrop = document.querySelector('.page-backdrop');
        let backdrop = document.querySelector('.quick-menu-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'quick-menu-backdrop';
            document.body.appendChild(backdrop);
        }

        const headerBtn = document.getElementById('quick-menu-header-btn');
        const container = document.querySelector('.quick-menu-container.right-sidebar');
        const closeBtn = container?.querySelector('.quick-menu-close-btn');
        const fabContainer = document.querySelector('.mobile-fab-container');
        const fabToggleBtn = document.getElementById('fab-toggle-btn');
        const fabMenu = document.querySelector('.fab-menu');

        const openPcMenu = () => {
            if (!container || !stickyHeader) return;
            const headerHeight = stickyHeader.offsetHeight;
            const summaryBarHeight = summaryBar && (window.getComputedStyle(summaryBar).display !== 'none') ? summaryBar.offsetHeight : 0;
            
            container.style.top = `${headerHeight}px`;
            container.style.height = `calc(100vh - ${headerHeight}px - ${summaryBarHeight}px)`;
            backdrop.style.top = `${headerHeight}px`;
            
            container.classList.add('open');
            document.body.classList.add('quick-menu-open');
            backdrop.classList.add('visible');
        };

        const closePcMenu = () => {
            if (!container) return;
            container.classList.remove('open');
            document.body.classList.remove('quick-menu-open');
            backdrop.classList.remove('visible');
        };

        const closeAllMenus = () => {
            closePcMenu();
            if (fabContainer) fabContainer.classList.remove('open');
            if (pageBackdrop) pageBackdrop.classList.remove('visible');
        };

        headerBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            container.classList.contains('open') ? closePcMenu() : openPcMenu();
        });

        closeBtn?.addEventListener('click', closeAllMenus);
        container?.querySelectorAll('.quick-panel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!btn.target || btn.target !== '_blank') {
                    if (!btn.getAttribute('href') || btn.getAttribute('href') === '#') {
                        e.preventDefault();
                        closeAllMenus();
                    }
                }
            });
        });
        
        fabToggleBtn?.addEventListener('click', () => {
            const isOpen = fabContainer.classList.toggle('open');
            pageBackdrop?.classList.toggle('visible', isOpen);
        });

        fabMenu?.addEventListener('click', (e) => {
            if (e.target.closest('.fab-action-btn')) {
                closeAllMenus();
            }
        });

        backdrop.addEventListener('click', closeAllMenus);
        pageBackdrop?.addEventListener('click', closeAllMenus);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAllMenus();
        });
    }

    function setupAffiliateCardLink() {
        const affiliateCardBtns = document.querySelectorAll('#affiliate-card-link, #affiliate-card-link-body');
        const modalId = 'affiliate-card-modal';
        const modal = document.getElementById(modalId);
        if (affiliateCardBtns.length === 0 || !modal) return;

        const tabsContainer = modal.querySelector('.card-modal-tabs');
        const tabBtns = modal.querySelectorAll('.card-tab-btn');
        const tabContents = modal.querySelectorAll('.card-tab-content');

        affiliateCardBtns.forEach(link => {
            link.addEventListener('click', (e) => { 
                e.preventDefault(); 
                window.globalModal.open(modalId); 
            });
        });

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
       if (!telecomData) return;
        const mainModalId = 'quick-signup-modal';
        const infoModalId = 'quick-signup-info-modal';
        const triggerBtns = document.querySelectorAll('#quick-self-signup-btn, #fab-self-signup, #hero-quick-signup-btn');
        const loadingOverlay = document.getElementById('loading-overlay');
        if (triggerBtns.length === 0) return;

        const QUICK_SIGNUP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwFxt5YjlMdWEJW3VWC_7eTyP0Xm_GN2lBOfecVCoU8MTmJwr1ecBvutMSglR_jjBUc/exec";

        const submitBtn = document.getElementById('qs-submit-btn');
        const infoForm = document.getElementById('quick-signup-info-form');

        const containers = {
            telecom: document.getElementById('qs-telecom-options'),
            internet: document.getElementById('qs-internet-options'),
            tv: document.getElementById('qs-tv-options'),
            additionalTv: document.getElementById('qs-additional-tv-select'),
            usim: document.getElementById('qs-usim-toggle')
        };
        let quickSignupState = {};
        
        triggerBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.globalModal.open(mainModalId);
                initializeMainModal();
            });
        });

        const createButton = (type, item, container) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = item.name.split('(')[0].trim();
            btn.dataset.name = item.name;
            btn.dataset.key = item.key || item.id;

            btn.onclick = () => {
                container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                quickSignupState[type] = item;
                if (type === 'telecom') renderSubOptions(item.key);
                if (type === 'tv') container.querySelector('.no-tv-btn')?.classList.remove('selected');
            };
            container.appendChild(btn);
            return btn;
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
        
        const initializeMainModal = () => {
            quickSignupState = { usim: false };
            if (containers.usim) containers.usim.checked = false;
            containers.telecom.innerHTML = '';
            
            const initialTelecomOrder = ['LG', 'KT', 'SK', 'SKB', 'Skylife', 'HelloVision'];
            initialTelecomOrder.forEach(key => {
                if (telecomData[key]) {
                    createButton('telecom', { key: key, name: telecomData[key].name || key }, containers.telecom);
                }
            });

            const lgBtn = containers.telecom.querySelector('button[data-key="LG"]');
            if (lgBtn) {
                lgBtn.click();
                const internet500Btn = containers.internet.querySelector('button[data-name*="500"]');
                if (internet500Btn) internet500Btn.click();
                const tvBasicBtn = containers.tv.querySelector('button[data-name*="베이직"]');
                if (tvBasicBtn) tvBasicBtn.click();
            }
        };

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
            
            submitBtn.blur(); 
            
            window.globalModal.close(mainModalId, true);
            window.globalModal.open(infoModalId);

            setTimeout(() => {
                document.getElementById('qs-info-name')?.focus();
            }, 50);
        };

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

        const qsPhoneInput = document.getElementById('qs-info-phone');
        if (qsPhoneInput) {
            qsPhoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/[^0-9]/g, '');
                if (value.length > 11) value = value.slice(0, 11);
                e.target.value = value.replace(/^(\d{3})(\d{4})(\d{4})$/, `$1-$2-$3`);
            });
        }

        infoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('qs-info-name');
            const phoneInput = document.getElementById('qs-info-phone');
            const consentInput = document.getElementById('qs-consent-1');
            const submitBtn = infoForm.querySelector('.btn-submit');
            const originalBtnText = submitBtn ? submitBtn.innerHTML : '처리 중...';

            const isNameValid = validateField(nameInput, nameRegex, '이름 형식이 올바르지 않습니다.');
            const isPhoneValid = validateField(phoneInput, phoneRegex, '연락처 형식이 올바르지 않습니다.');
            
            if (!consentInput.checked) {
                alert('개인정보 수집 및 활용에 동의해주세요.');
                return;
            }

            if (!isNameValid || !isPhoneValid) return;

            // 먼저 스크립트 URL 검증(조기 종료 시 로딩 표시 방지)
            const QUICK_SIGNUP_SCRIPT_URL_CHECK = "https://script.google.com/macros/s/AKfycbwFxt5YjlMdWEJW3VWC_7eTyP0Xm_GN2lBOfecVCoU8MTmJwr1ecBvutMSglR_jjBUc/exec";
            if (!QUICK_SIGNUP_SCRIPT_URL_CHECK) {
                alert("신청 시스템이 준비되지 않았습니다. 관리자에게 문의해주세요.");
                return;
            }

            // 유효하면 로딩/비활성화 시작
            if (loadingOverlay) loadingOverlay.classList.add('visible');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '처리 중...';
            }

            const applicationData = {
                name: nameInput.value,
                phone: phoneInput.value,
                telecom: quickSignupState.telecom?.name,
                internet: quickSignupState.internet?.name,
                tv: quickSignupState.tv?.name,
                additionalTv: quickSignupState.additionalTv?.name,
                usim: quickSignupState.usim ? '신청' : '미신청'
            };

            fetch(QUICK_SIGNUP_SCRIPT_URL, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(applicationData),
                redirect: "follow",
            })
            .then(response => response.json())
            .then(data => {
                if (data.result === 'success') {
                    // 모달 닫기 → 약간의 지연 후 알림 열기 (popstate race 방지)
                    window.globalModal.close(infoModalId);
                    setTimeout(() => {
                        const alertTitle = document.querySelector('#custom-alert .alert-title');
                        if(alertTitle) alertTitle.textContent = '간편상담 신청이 완료되었습니다.';
                        window.globalModal.open('custom-alert');
                    }, 80);
                    infoForm.reset();
                } else {
                    throw new Error(data.message || '알 수 없는 서버 오류');
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error);
                alert('신청 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.');
            })
            .finally(() => {
                if (loadingOverlay) loadingOverlay.classList.remove('visible');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            });
        });
    }

    function setupGlobalModalKeyListener() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const visibleModal = document.querySelector('.modal-overlay.visible');
                if (visibleModal) {
                    window.globalModal.close(visibleModal.id);
                }
            }
        });
    }

    function setupRealtimeStatus() {
        const statusList = document.querySelector('.status-list');
        if (!statusList) return;

        const names = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
        const regions = ["서울 강남구", "부산 해운대구", "대구 수성구", "인천 연수구", "광주 서구", "대전 유성구", "울산 남구", "세종시", "경기 성남시", "강원 원주시"];
        const products = ["LG 500M+TV", "SK 1G+TV", "KT 500M", "LG 1G", "SK 500M+TV", "KT 1G+TV"];
        
        let items = [];
        for (let i = 0; i < 10; i++) {
            const name = names[Math.floor(Math.random() * names.length)] + "* " + names[Math.floor(Math.random() * names.length)];
            const region = regions[Math.floor(Math.random() * regions.length)];
            const product = products[Math.floor(Math.random() * products.length)];
            items.push(`<li>[${name}] ${region} - ${product} 신청완료</li>`);
        }
        
        statusList.innerHTML = items.join('');
        statusList.innerHTML += items.join('');
    }

    function setupFaqAccordion() {
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');

            question.addEventListener('click', () => {
                const isOpen = question.classList.contains('active');

                faqItems.forEach(otherItem => {
                    otherItem.querySelector('.faq-question').classList.remove('active');
                    otherItem.querySelector('.faq-answer').style.maxHeight = null;
                });

                if (!isOpen) {
                    question.classList.add('active');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                }
            });
        });
    }

    function setupDetailFeeToggle() {
        const toggleLink = document.getElementById('toggle-detail-fee');
        const summaryToggleLink = document.getElementById('summary-toggle-details');
        const detailSummary = document.getElementById('detail-fee-summary');

        if (!toggleLink || !detailSummary || !summaryToggleLink) return;

        const toggleDetails = (e) => {
            e.preventDefault();
            const isHidden = detailSummary.style.display === 'none' || detailSummary.style.display === '';
            if (isHidden) {
                detailSummary.style.display = 'block';
                toggleLink.innerHTML = '상세요금 <i class="fas fa-chevron-up"></i>';
                summaryToggleLink.innerHTML = '상세요금 <i class="fas fa-chevron-up"></i>';
            } else {
                detailSummary.style.display = 'none';
                toggleLink.innerHTML = '상세요금 <i class="fas fa-chevron-right"></i>';
                summaryToggleLink.innerHTML = '상세요금 <i class="fas fa-chevron-right"></i>';
            }
        };

        toggleLink.addEventListener('click', toggleDetails);
        summaryToggleLink.addEventListener('click', toggleDetails);
    }

    function setupEventDetailModal() {
        const eventData = {
            event1: {
                title: "친구야 같이 바꾸자! 지인 추천 이벤트",
                image: "https://placehold.co/640x300/007BFF/FFFFFF?text=Friend+Referral+Event",
                content: `
                    <h3>참여 방법</h3>
                    <p>성지넷을 통해 인터넷/TV를 가입하고, 주변 지인에게 추천해주세요! 추천받은 지인이 성지넷을 통해 가입을 완료하면 추천인과 신규가입자 모두에게 특별한 혜택을 드립니다.</p>
                    <ul>
                        <li>1. 먼저 성지넷을 통해 인터넷 가입을 완료합니다.</li>
                        <li>2. 친구에게 성지넷을 소개하고, 친구가 상담 시 추천인(본인)의 성함과 연락처를 알려줍니다.</li>
                        <li>3. 친구의 인터넷 설치가 완료되면 두 분 모두에게 혜택이 지급됩니다!</li>
                    </ul>
                    <h3>이벤트 혜택</h3>
                    <p>추천인과 신규가입자 모두에게 <strong>백화점 상품권 3만원 권</strong>을 추가로 증정합니다.</p>
                    <div class="event-notes">
                        <strong>※ 유의사항</strong><br>
                        - 추천인과 신규가입자 모두 개통이 완료되어야 혜택이 지급됩니다.<br>
                        - 이벤트 혜택은 개통 완료 후 7일 이내에 모바일 상품권으로 발송됩니다.<br>
                        - 본 이벤트는 회사 사정에 따라 예고 없이 변경되거나 종료될 수 있습니다.
                    </div>
                `
            },
            event2: {
                title: "생생 후기 이벤트",
                image: "https://placehold.co/640x250/28A745/FFFFFF?text=Review+Event",
                content: `
                    <h3>참여 방법</h3>
                    <p>성지넷에서 인터넷/TV 가입 후, 이용 후기를 지정된 커뮤니티나 개인 블로그에 작성해주세요. 모든 참여자분들께 감사의 선물을 드립니다.</p>
                    <ul>
                        <li>1. 성지넷에서 인터넷/TV 설치를 완료합니다.</li>
                        <li>2. 인터넷 관련 커뮤니티, 지역 맘카페, 개인 블로그 등에 사진 2장 이상 포함된 후기를 작성합니다.</li>
                        <li>3. 작성한 후기 URL을 성지넷 카카오톡 채널로 보내주시면 확인 후 혜택을 드립니다.</li>
                    </ul>
                    <h3>이벤트 혜택</h3>
                    <p>참여하신 모든 분들께 <strong>스타벅스 아메리카노 기프티콘</strong>을 100% 증정합니다.</p>
                    <div class="event-notes">
                        <strong>※ 유의사항</strong><br>
                        - 전체 공개 게시물만 참여로 인정됩니다.<br>
                        - 후기 작성 시 '성지넷' 키워드가 반드시 포함되어야 합니다.<br>
                        - 기프티콘은 URL 접수 후 3일 이내에 발송됩니다.
                    </div>
                `
            }
        };

        const triggerBtns = document.querySelectorAll('.btn-event-details');
        const modalId = 'event-detail-modal';
        const modal = document.getElementById(modalId);
        if (!modal || triggerBtns.length === 0) return;

        const modalTitle = document.getElementById('modal-event-title');
        const modalImage = document.getElementById('modal-event-image');
        const modalContent = document.getElementById('modal-event-content');

        triggerBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const eventKey = btn.dataset.event;
                const data = eventData[eventKey];

                if (data) {
                    modalTitle.textContent = data.title;
                    modalImage.src = data.image;
                    modalImage.alt = data.title;
                    modalContent.innerHTML = data.content;
                    window.globalModal.open(modalId);
                }
            });
        });
    }

    function setupAiScanner() {}

    function setupDynamicContent() {
        const eventTitle = document.getElementById('event-section-title');
        if (eventTitle) {
            const currentMonth = new Date().getMonth() + 1;
            eventTitle.textContent = `🎁 ${currentMonth}월 진행중인 이벤트`;
        }
    }
    
    function setupCarrierMenuToggle() {
        const carrierMenuToggle = document.querySelector('.carrier-menu-toggle');
        const carrierDropdown = document.querySelector('.carrier-dropdown-menu');

        if (carrierMenuToggle && carrierDropdown) {
            carrierMenuToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.currentTarget.parentElement.classList.toggle('open');
            });

            document.addEventListener('click', (e) => {
                const menuItem = e.target.closest('.carrier-menu-item');
                if (!menuItem) {
                    document.querySelector('.carrier-menu-item.open')?.classList.remove('open');
                }
            });
        }
    }

    function setupRollingHeroAndScroll() {
        const swiper = new Swiper('.hero-swiper', {
            autoplay: { delay: 5000, disableOnInteraction: false },
            loop: true,
            effect: 'fade',
            fadeEffect: { crossFade: true },
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        });

        const targetSection = document.getElementById('calculator-section');
        document.querySelectorAll('.hero-scroll-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!targetSection) return;
            const main = document.getElementById('main-content-wrapper');
            const ai = document.getElementById('ai-view-wrapper');
            if (main && ai) {
                main.style.display = 'block';
                ai.style.display = 'none';
                document.body.classList.remove('ai-view-active');
            }
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        document.querySelectorAll('.hero-secret-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
            e.preventDefault();
            for (const id of ['quick-secret-benefit-btn','secret-benefit-link-body','secret-benefit-link-nav','fab-secret-benefit']) {
                const el = document.getElementById(id);
                if (el) { el.click(); return; }
            }
            alert('비밀혜택 신청 기능을 찾을 수 없습니다.');
            });
        });

        const header = document.querySelector('header');
        if (header && window.innerWidth <= 768) {
            let last = 0;
            const thr = 5;
            window.addEventListener('scroll', () => {
            const y = window.pageYOffset || document.documentElement.scrollTop;
            if (Math.abs(y - last) > thr) {
                if (y > last && y > 50) header.classList.add('hidden');
                else header.classList.remove('hidden');
                last = y <= 0 ? 0 : y;
            }
            }, false);
        }
    }

    
/* === [보관함/비교함 버튼 열기] === */
function setupCompareOpeners() {
  const selectors = ['#compare-btn', '#quick-compare-btn', '#open-compare', '.open-compare'];
  const targets = document.querySelectorAll(selectors.join(','));
  if (targets.length === 0) return;
  targets.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.globalModal?.open === 'function') {
        window.globalModal.open('compare-modal');
      } else {
        const modal = document.getElementById('compare-modal');
        if (modal) modal.classList.add('visible');
      }
    });
  });
}


/* === [모바일 하단 고정바 오토하이드] === */
    function setupBottomBarAutoHide() {
        const bar = document.querySelector('.summary-sticky-bar');
        if (!bar) return;
        if (window.innerWidth > 768) return; // 모바일에서만 동작

        let lastY = window.pageYOffset || document.documentElement.scrollTop || 0;
        let ticking = false;

        const onScroll = () => {
            const y = window.pageYOffset || document.documentElement.scrollTop || 0;
            const dy = y - lastY;

            if (Math.abs(dy) > 4) {
                if (dy > 0 && y > 40) {
                    bar.classList.add('hidden'); // 아래로 스크롤 → 숨김
                } else {
                    bar.classList.remove('hidden'); // 위로 스크롤 → 보임
                }
                lastY = y <= 0 ? 0 : y;
            }
            ticking = false;
        };

        const requestTick = () => {
            if (!ticking) {
                window.requestAnimationFrame(onScroll);
                ticking = true;
            }
        };

        window.addEventListener('scroll', requestTick, { passive: true });
    }

    function setupCompareFeature() {
        const viewBtn = document.getElementById('view-compare-btn');
        const modalBody = document.getElementById('compare-modal-body');
        if (!viewBtn || !modalBody) return;

        viewBtn.addEventListener('click', () => {
            const list = getCompareList();
            if (list.length === 0) {
                alert('비교할 항목이 없습니다. 먼저 견적을 비교함에 추가해주세요.');
                return;
            }
            
            let tableHTML = '<div class="compare-table-container"><table class="modal-table compare-table">';
            tableHTML += '<thead><tr><th>항목</th>';
            list.forEach(item => tableHTML += `<th>${item.carrier}<br><small>${item.bestPlanName}</small></th>`);
            tableHTML += '</tr></thead>';
            
            tableHTML += '<tbody>';
            const rows = ['월 요금', '현금 사은품', '휴대폰 할인', '총 혜택 (3년)'];
            rows.forEach((rowName, index) => {
                tableHTML += `<tr><td>${rowName}</td>`;
                list.forEach(item => {
                    let value = '';
                    if (index === 0) value = `${item.netBill.toLocaleString()}원`;
                    else if (index === 1) value = `${item.cashBenefit.toLocaleString()}원`;
                    else if (index === 2) value = `월 ${item.totalMobileDiscount.toLocaleString()}원`;
                    else if (index === 3) value = `${item.totalBenefit.toLocaleString()}원`;
                    tableHTML += `<td>${value}</td>`;
                });
                tableHTML += '</tr>';
            });
            
            tableHTML += '<tr><td></td>';
            list.forEach(item => {
                tableHTML += `<td><a href="${window.generateSignupUrl(item.id)}" class="btn btn-primary">가입하기</a> <button class="btn btn-secondary remove-compare-item" data-id="${item.id}">제거</button></td>`;
            });
            tableHTML += '</tr>';
            tableHTML += '</tbody></table></div>';
            
            modalBody.innerHTML = tableHTML;
            window.globalModal.open('compare-modal');
        });

        modalBody.addEventListener('click', e => {
            if (e.target.classList.contains('remove-compare-item')) {
                const itemId = e.target.dataset.id;
                let list = getCompareList();
                list = list.filter(item => item.id !== itemId);
                saveCompareList(list);
                
                if (list.length > 0) {
                    viewBtn.click();
                } else {
                    window.globalModal.close('compare-modal');
                }
            }
        });

        updateCompareCount();
    }

    function swapContent(container, newContentHTML) {
        const oldContent = container.firstElementChild;

        if (oldContent) {
            oldContent.classList.add('fade-swap-exit');
            requestAnimationFrame(() => {
            oldContent.classList.add('fade-swap-exit-active');
            });
            oldContent.addEventListener(
            'transitionend',
            () => oldContent.remove(),
            { once: true }
            );
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = newContentHTML.trim();
        const newContent = wrapper.firstElementChild;
        newContent.classList.add('fade-swap-enter');
        container.appendChild(newContent);

        requestAnimationFrame(() => {
            newContent.classList.add('fade-swap-enter-active');
        });

        newContent.addEventListener(
            'transitionend',
            () => {
            newContent.classList.remove('fade-swap-enter', 'fade-swap-enter-active');
            },
            { once: true }
        );
    }

    
/* === [AI Wave Portal & Hint Bubble] === */
function setupAiPortalAndHint() {
  // Ensure gate element exists
  let gate = document.getElementById('ai-transition-gate');
  if (!gate) {
    gate = document.createElement('div');
    gate.id = 'ai-transition-gate';
    gate.className = 'ai-transition-gate';
    document.body.appendChild(gate);
  }

  // Wire AI triggers to portal animation (doesn't replace existing behavior)
  const aiTriggers = document.querySelectorAll('#ai-calculator-nav-link-text, #ai-calculator-header-link, #ai-calculator-body-link, #quick-ai-finder-btn, #fab-ai-finder, #hero-ai-planner-btn');
  aiTriggers.forEach(btn => {
    btn?.addEventListener('click', () => {
      try { gate.classList.add('active'); } catch(e) {}
      setTimeout(() => gate.classList.remove('active'), 1800);
    }, { capture: true });
  });

  // Hint bubble
  let bubble = document.getElementById('ai-hint-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'ai-hint-bubble';
    bubble.className = 'ai-hint-bubble';
    bubble.innerHTML = '🌊 AI 파동 게이트로 진입하시겠습니까? <span class="hint-cta">입장하기</span>';
    document.body.appendChild(bubble);
  }
  const showBubble = () => bubble.classList.add('show');
  const hideBubble = () => bubble.classList.remove('show');

  setTimeout(showBubble, 2200);

  bubble.addEventListener('click', () => {
    hideBubble();
    const anyTrigger = document.getElementById('hero-ai-planner-btn') || document.getElementById('ai-calculator-body-link');
    if (anyTrigger) anyTrigger.click();
  });

  let lastY = window.pageYOffset || 0;
  window.addEventListener('scroll', () => {
    const y = window.pageYOffset || 0;
    if (y - lastY > 15 && y > 200) hideBubble();
    lastY = y;
  }, { passive: true });
}


// === 초기화 ===
    setupModalHistoryHandler();
    setupPageViewToggle(); 
    setupQuickMenu();
    setupSecretBenefitModal();
    setupAffiliateCardLink();
    setupQuickSignupModal();
    setupGlobalModalKeyListener();
    setupRealtimeStatus();
    setupFaqAccordion();
    setupDetailFeeToggle();
    setupEventDetailModal();
    setupAiScanner();
    setupDynamicContent();
    setupCarrierMenuToggle();
    setupCompareOpeners();
    setupAiPortalAndHint();
    setupRollingHeroAndScroll();
    setupBottomBarAutoHide(); // ← 모바일 하단 고정바 오토하이드
}

document.addEventListener('DOMContentLoaded', () => {
  const targetSection = document.getElementById('calculator-section');

  document.querySelectorAll('.hero-scroll-btn').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (targetSection) {
        const mainContentWrapper = document.getElementById('main-content-wrapper');
        const aiViewWrapper = document.getElementById('ai-view-wrapper');
        if (mainContentWrapper && aiViewWrapper) {
          mainContentWrapper.style.display = 'block';
          aiViewWrapper.style.display = 'none';
          document.body.classList.remove('ai-view-active');
        }
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  document.querySelectorAll('.hero-secret-btn').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const existingTriggerIds = [
        'quick-secret-benefit-btn',
        'secret-benefit-link-body',
        'secret-benefit-link-nav',
        'fab-secret-benefit'
      ];
      for (const id of existingTriggerIds) {
        const existingBtn = document.getElementById(id);
        if (existingBtn) {
          existingBtn.click();
          return;
        }
      }
      alert('비밀혜택 신청 기능을 찾을 수 없습니다.');
    });
  });

  const header = document.querySelector('header');
  if (header && window.innerWidth <= 768) {
    let lastScrollTop = 0;
    const scrollThreshold = 5;
    window.addEventListener('scroll', function() {
      let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (Math.abs(scrollTop - lastScrollTop) > scrollThreshold) {
        if (scrollTop > lastScrollTop && scrollTop > 50) {
          header.classList.add('hidden');
        } else {
          header.classList.remove('hidden');
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
      }
    }, false);
  }
});
