export function initMainCalculator(telecomData) {

    if (!telecomData) {
        const mainContainer = document.getElementById('calculator-section');
        if(mainContainer) mainContainer.innerHTML = '<p style="text-align:center; color:red; font-weight:bold; padding: 50px 0;">[오류] 요금 정보를 불러오는 데 실패했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.</p>';
        return;
    }

    if (telecomData.Skylife && !telecomData.Skylife.combinedProducts) {
        telecomData.Skylife.combinedProducts = [{ name: '홈결합30%', price: 0, id: 'skylife_home_bundle' }];
    }

    const els = {
        telecomCont: document.getElementById('telecom-options-simple'),
        internetCont: document.getElementById('internet-options-simple'),
        tvCont: document.getElementById('tv-options-simple'),
        settopCont: document.getElementById('settop-options-simple'),
        additionalTvCont: document.getElementById('additional-tv-options-simple'),
        combinedCont: document.getElementById('combined-options-simple'),
        mobileCombinationSelector: document.getElementById('main-mobile-combination-selector'),
        mobileDetailsWrapper: document.getElementById('main-mobile-details-wrapper'),
        mobileList: document.getElementById('main-mobile-list'),
        addMobileBtn: document.getElementById('main-add-mobile-btn'),
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
        signupButtons: {
            quote: document.getElementById('self-signup-btn-quote'),
            summary: document.getElementById('summary-self-signup-btn')
        },
        wizard: {
            prevBtn: document.getElementById('calc-prev-btn'),
            nextBtn: document.getElementById('calc-next-btn'),
            stepIndicators: document.querySelectorAll('.calc-wizard-progress .step-indicator'),
            stepContents: document.querySelectorAll('.calc-step-content'),
            guideBubble: document.getElementById('calc-guide-bubble'),
            progressBar: document.getElementById('calc-progress-bar'),
        }
    };

    let state = { 
        telecom: null, internet: null, tv: null, settop: null, additionalTv: null, 
        combinedProduct: null, skbPrepaid: false, 
        mobilePlans: [],
        isMobileCombined: false,
        isCombinedProductAuto: true,
        _autoBundleReason: 'init',
        currentStep: 1,
        totalSteps: 5
    };
    const fmt = (n) => (n || 0).toLocaleString('ko-KR');

    const MOBILE_TIER_PRICES = {
        "20000": { name: '3만원 미만 요금제', price: 20000 }, "30000": { name: '3만원대 요금제', price: 35000 },
        "40000": { name: '4만원대 요금제', price: 45000 }, "50000": { name: '5만원대 요금제', price: 55000 },
        "60000": { name: '6만원대 요금제', price: 65000 }, "70000": { name: '7만원대 요금제', price: 75000 },
        "80000": { name: '8만원 이상 요금제', price: 90000 }
    };

    const guideMessages = {
        1: "안녕하세요! 원하시는 통신사를 선택해주세요.",
        2: "사용하실 인터넷 속도는 어떻게 되시나요?",
        3: "TV와 셋탑박스를 선택해주세요. (TV 미신청도 가능!)",
        4: "TV를 추가로 더 설치하시나요?",
        5: "마지막! 휴대폰 결합 정보를 알려주시면 더 큰 할인을 찾아드릴게요!",
        6: "완료! 최적의 견적을 확인해보세요. 정말 고생 많으셨어요!"
    };

    function updateWizardUI() {
        els.wizard.stepIndicators.forEach(indicator => {
            indicator.classList.toggle('active', parseInt(indicator.dataset.step) <= state.currentStep);
        });
        els.wizard.stepContents.forEach(content => {
            content.classList.toggle('active', content.id === `step-${state.currentStep}`);
        });
        if (els.wizard.prevBtn) {
            els.wizard.prevBtn.style.display = state.currentStep === 1 ? 'none' : 'inline-block';
        }
        if (els.wizard.nextBtn) {
            els.wizard.nextBtn.textContent = state.currentStep === state.totalSteps ? '견적 완료!' : '다음 단계';
            els.wizard.nextBtn.style.animation = state.currentStep === state.totalSteps ? 'none' : 'pulse-next 2s infinite';
        }
        const progressPercentage = state.currentStep > 1 ? ((state.currentStep - 1) / (state.totalSteps - 1)) * 100 : 0;
        els.wizard.progressBar.style.width = `${progressPercentage}%`;
        els.wizard.guideBubble.textContent = guideMessages[state.currentStep];
    }
    
    function showAutoBundleNotification(message) {
        const notificationEl = document.getElementById('auto-bundle-notification');
        if (!notificationEl) return;
        notificationEl.textContent = message;
        notificationEl.classList.add('visible');
        setTimeout(() => {
            notificationEl.classList.remove('visible');
        }, 3500);
    }

    function enableAutoBundleAndRecalc(reason = 'unknown') {
        state.isCombinedProductAuto = true;
        state._autoBundleReason = reason;
        recalcBestBundleAndUpdate();
    }

    function recalcBestBundleAndUpdate() {
        if (state.isCombinedProductAuto) {
            const bestId = findBestCombinedProductId();
            const list = getCombinedListNormalized();
            const best = list.find(p => p.id === bestId);
            if (best && (!state.combinedProduct || state.combinedProduct.id !== best.id)) {
                state.combinedProduct = best;
                if (state._autoBundleReason !== 'init') {
                    showAutoBundleNotification(`✨ 고객님께 가장 유리한 '${best.name}'으로 자동 추천되었어요!`);
                }
            } else if (!bestId && state.isMobileCombined === false) {
                state.combinedProduct = null;
            }
            
            if (els.combinedCont) {
                els.combinedCont.querySelectorAll('.option-btn').forEach(btn => {
                    btn.classList.toggle('selected', btn.dataset.id === state.combinedProduct?.id);
                });
            }
        }
        updateCalculations();
    }

    function findBestCombinedProductId() {
        const list = getCombinedListNormalized();
        if (!state.isMobileCombined || list.length === 0) {
            return null;
        }
        let best = { id: null, discount: -1 };
        for (const product of list) {
            const d = calculateTotalDiscountForProduct(product);
            if (d > best.discount) {
                best = { id: product.id, discount: d };
            }
        }
        return best.discount <= 0 ? (list[0]?.id || null) : best.id;
    }

    function computeDiscountBreakdown(product) {
        if (!state.telecom || !state.internet || !product) {
            return { internetDiscount: 0, mobileDiscount: 0 };
        }
        const carrier = state.telecom;
        const internetId = state.internet.id || '';
        const speedKey = internetId.includes('100') ? '100M' : '500M+';
        const mobilePlans = state.mobilePlans || [];
        const mobileCount = mobilePlans.length;
        const mobilePriceSum = mobilePlans.reduce((s, p) => s + (p.price || 0), 0);
        const key = `${product.id || ''}|${product.name || ''}`;
        const isSK_Family   = /요즘가족/.test(key) || /패밀리/.test(key);
        const isKT_Total    = /총액결합/.test(key);
        const isKT_Premium  = /프리미엄가족/.test(key);
        const isKT_Premium_Single = /프리미엄싱글/.test(key);
        const isLG_Cham     = /참쉬운/.test(key);
        const isLG_Together = /투게더/.test(key);
        const isHello_Mob   = /모바일결합/.test(key);
        let internetDiscount = 0;
        let mobileDiscount   = 0;
        if (carrier === 'SK') {
            if (isSK_Family) {
                internetDiscount = (telecomData[carrier]?.discounts?.[internetId]) || 0;
                const SKM = { 1: 3500, 2: 7000, 3: 18000, 4: 18000, 5: 24000 };
                mobileDiscount = SKM[Math.min(mobileCount, 5)] || 0;
            }
        } else if (carrier === 'KT' || carrier === 'Skylife') {
            if (isKT_Total) {
                internetDiscount = (telecomData[carrier]?.discounts?.[internetId]) || 0;
                const KT = { tiers: [22000, 64900, 108900, 141900, 174900, Infinity], '100M': { mobile:[0,0,3300,14300,18700,23100] }, '500M+': { mobile:[0,0,5500,16610,22110,27610] } };
                let tierIndex = KT.tiers.findIndex(t => mobilePriceSum < t);
                if (tierIndex === -1) tierIndex = KT.tiers.length - 1;
                mobileDiscount = (KT[speedKey]?.mobile?.[tierIndex]) || 0;
            } else if (isKT_Premium) {
                internetDiscount = 5500;
                const premium = mobilePlans.filter(p => (p.price || 0) >= 80000);
                if (mobileCount >= 2 && premium.length >= 2) {
                    mobileDiscount = 5500;
                    premium.slice(1).forEach(p => mobileDiscount += (p.price || 0) * 0.25);
                    premium.forEach(p => { if (p.isYouth) mobileDiscount += 5500; });
                }
            } else if (isKT_Premium_Single) {
                const premiumLine = mobilePlans.find(p => (p.price || 0) >= 80000);
                if (mobileCount === 1 && premiumLine) {
                    internetDiscount = 5500;
                    mobileDiscount = Math.round(premiumLine.price * 0.25 / 10) * 10;
                }
            } else if (product.name === '홈결합30%') {
                internetDiscount = (state.internet?.price || 0) * 0.3;
            }
        } else if (carrier === 'LG' || carrier === 'HelloVision') {
            if (isLG_Cham) {
                internetDiscount = (telecomData[carrier]?.discounts?.[internetId]) || 0;
                const ROW = { 1:[0,0,0], 2:[2200,3300,4400], 3:[3300,5500,6600], 4:[4400,6600,8800], 5:[4400,6600,8800] };
                const TIERS = [69000, 88000];
                const row = ROW[Math.min(mobileCount,5)];
                if (row) {
                    mobilePlans.forEach(plan => {
                        const idx = (plan.price >= TIERS[1]) ? 2 : (plan.price >= TIERS[0] ? 1 : 0);
                        mobileDiscount += row[idx];
                    });
                }
            } else if (isLG_Together) {
                if (speedKey !== '100M') {
                    internetDiscount = 11000;
                }
                const TOGETHER = { 2:10000, 3:14000, 4:20000, 5:20000 };
                const YOUTH_ADD = 10000;
                const high = mobilePlans.filter(p => (p.price || 0) >= 85000);
                if (high.length >= 2) {
                    const baseDeviceDiscount = TOGETHER[Math.min(high.length, 5)] || 0;
                    mobileDiscount += baseDeviceDiscount * high.length;
                    const youthHigh = high.filter(p => p.isYouth).length;
                    mobileDiscount += youthHigh * YOUTH_ADD;
                }
            } else if (isHello_Mob) {
                const discounts = telecomData.HelloVision?.mobileDiscounts || {};
                internetDiscount = (state.tv ? (discounts.internet_tv?.[internetId] || 0) : (discounts.internet_only?.[internetId] || 0));
            }
        }
        return { internetDiscount, mobileDiscount };
    }

    function calculateTotalDiscountForProduct(product) {
        const { internetDiscount, mobileDiscount } = computeDiscountBreakdown(product);
        return internetDiscount + mobileDiscount;
    }

    function getCombinedListNormalized() {
        let raw = (telecomData[state.telecom]?.combinedProducts || []);
        if (state.telecom === 'SKB') {
            raw = raw.filter(p => p.name !== '미결합');
        }
        return raw.map((p, i) => ({ ...p, id: p.id || p.name || `cp_${i}` }));
    }

    function setupMobileOptionsUI() {
        if (!els.mobileCombinationSelector || !els.mobileDetailsWrapper || !els.mobileList || !els.addMobileBtn) return;
        const updateMobileState = () => {
            state.isMobileCombined = els.mobileCombinationSelector.querySelector('.selected')?.dataset.value === 'yes';
            if (state.isMobileCombined) {
                state.mobilePlans = Array.from(els.mobileList.querySelectorAll('.mobile-entry')).map(entry => {
                    const select = entry.querySelector('.mobile-plan-tier');
                    const youthCheckbox = entry.querySelector('.youth-checkbox');
                    const usimCheckbox = entry.querySelector('.usim-checkbox');
                    const planData = MOBILE_TIER_PRICES[select.value];
                    return { ...planData, isYouth: youthCheckbox.checked, hasUsim: usimCheckbox.checked };
                });
            } else {
                state.mobilePlans = [];
            }
        };
        const onMobileConfigChange = () => {
            updateMobileState();
            enableAutoBundleAndRecalc('mobile-config-change');
        };
        els.mobileCombinationSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            els.mobileCombinationSelector.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            els.mobileDetailsWrapper.style.display = btn.dataset.value === 'yes' ? 'block' : 'none';
            onMobileConfigChange();
        });
        els.mobileList.addEventListener('change', onMobileConfigChange);
        els.mobileList.addEventListener('input', onMobileConfigChange);
        els.addMobileBtn.addEventListener('click', () => {
            const mobileEntryCount = els.mobileList.children.length;
            if (mobileEntryCount >= 5) {
                alert('가족은 최대 4명까지 추가할 수 있습니다.');
                return;
            }
            const newEntry = document.createElement('div');
            newEntry.className = 'mobile-entry';
            newEntry.innerHTML = `
                <label>가족${mobileEntryCount}</label>
                <select class="mobile-plan-tier">
                    <option value="20000">3만원 미만</option><option value="30000">3만원대</option>
                    <option value="40000">4만원대</option><option value="50000" selected>5만원대</option>
                    <option value="60000">6만원대</option><option value="70000">7만원대</option>
                    <option value="80000">8만원 이상</option>
                </select>
                <div class="mobile-entry-options">
                    <label class="toggle-switch-label">청소년<div class="toggle-switch"><input type="checkbox" class="youth-checkbox"><span class="slider"></span></div></label>
                    <label class="toggle-switch-label">유심<div class="toggle-switch"><input type="checkbox" class="usim-checkbox"><span class="slider"></span></div></label>
                </div>
                <button class="remove-mobile-btn" type="button" title="삭제">&times;</button>
            `;
            els.mobileList.appendChild(newEntry);
        });
        els.mobileList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-mobile-btn')) {
                e.target.parentElement.remove();
            }
        });
        const mo = new MutationObserver(() => {
            els.mobileList.querySelectorAll('.mobile-entry').forEach((entry, index) => {
                entry.querySelector('label').textContent = index === 0 ? '본인' : `가족${index}`;
            });
            onMobileConfigChange();
        });
        mo.observe(els.mobileList, { childList: true });
        updateMobileState();
    }

    function updateCalculations() {
        if (!state.telecom) return;
        if (state.isCombinedProductAuto) {
            const bestProductId = findBestCombinedProductId();
            if (bestProductId) {
                const allCombinedProducts = getCombinedListNormalized();
                const bestProduct = allCombinedProducts.find(p => p.id === bestProductId);
                if (bestProduct && (!state.combinedProduct || state.combinedProduct.id !== bestProduct.id)) {
                    state.combinedProduct = bestProduct;
                }
            } else {
                state.combinedProduct = null;
            }
            if (els.combinedCont) {
                els.combinedCont.querySelectorAll('.option-btn').forEach(btn => {
                    btn.classList.toggle('selected', btn.dataset.id === state.combinedProduct?.id);
                });
            }
        }
        let intPrice = state.internet?.price || 0;
        let tvPrice = state.tv?.price || 0;
        const settopPrice = state.settop?.price || 0;
        const additionalTvPrice = state.additionalTv?.price || 0;
        let internetDiscount = 0;
        let prepaidDiscount = 0;
        let supportFund = 0;
        const cardDiscount = 15000;
        let routerFee = 0;
        let totalMobileDiscount = 0;
        const giftPolicy = telecomData[state.telecom]?.giftPolicy || {};
        if (state.internet) {
            const speed = state.internet.id.includes('1000') ? '1000' : (state.internet.id.includes('500') ? '500' : '100');
            supportFund = state.tv ? (giftPolicy[`base_${speed}`] || 0) + (giftPolicy[`tv_bundle_add_${speed}`] || 0) : giftPolicy[`base_${speed}`] || 0;
        }
        const isPremiumTV = state.tv && (state.tv.name.includes('스탠다드') || state.tv.name.includes('ALL') || state.tv.name.includes('프리미엄') || state.tv.name.includes('에센스') || state.tv.name.includes('모든G'));
        if (isPremiumTV) supportFund += giftPolicy.premium_tv_add || 0;
        if (state.additionalTv) {
            const isPremiumAddTV = state.additionalTv.name.includes('프리미엄') || state.additionalTv.name.includes('ALL');
            supportFund += (isPremiumAddTV ? giftPolicy.add_tv_premium : giftPolicy.add_tv_basic) || 0;
        }
        const mobileCount = state.mobilePlans.length;
        const usimCount = state.mobilePlans.filter(p => p.hasUsim).length;
        if (usimCount > 0) supportFund += (giftPolicy.usim_add || 0) * usimCount;
        if (mobileCount > 1) supportFund += giftPolicy.family_add || 0;
        if (state.telecom === 'SKB' && state.internet) {
            const speedId = state.internet.id;
            if (speedId.includes('100') || speedId.includes('200')) routerFee = 2200;
            else if (speedId.includes('500') || speedId.includes('1000')) routerFee = 1100;
            if (state.skbPrepaid) {
                prepaidDiscount = 5500;
                supportFund = 100000;
            }
        }
        const { internetDiscount: idc, mobileDiscount: mdc } = computeDiscountBreakdown(state.combinedProduct);
        internetDiscount = idc;
        totalMobileDiscount = mdc;
        const baseFee = (intPrice + tvPrice + settopPrice + additionalTvPrice + routerFee);
        const subtotalTvFee = baseFee - internetDiscount - prepaidDiscount;
        const finalPrice = state.internet ? (subtotalTvFee - cardDiscount) : subtotalTvFee;
        const combinedFeeLabelText = (internetDiscount > 0 || prepaidDiscount > 0 || totalMobileDiscount > 0) ? '휴대폰 결합 요금' : '할인 적용 후 요금';
        if(els.results.combinedFeeLabel) els.results.combinedFeeLabel.textContent = combinedFeeLabelText;
        if(els.summaryResults.combinedFeeLabel) els.summaryResults.combinedFeeLabel.textContent = combinedFeeLabelText;
        const priceElements = [
            els.results.baseFee, els.results.combinedFee, els.results.totalPrice, els.results.totalSupport,
            els.summaryResults.baseFee, els.summaryResults.combinedFee, els.summaryResults.totalPrice, els.summaryResults.totalSupport
        ];
        els.results.baseFee.textContent = `${fmt(baseFee)}원`;
        els.results.combinedFee.textContent = `${fmt(subtotalTvFee)}원`;
        els.results.totalPrice.textContent = `${fmt(finalPrice)}원`;
        els.results.totalSupport.textContent = `${fmt(supportFund)}원`;
        if (els.summaryResults.baseFee) {
            els.summaryResults.baseFee.textContent = `${fmt(baseFee)}원`;
            els.summaryResults.combinedFee.textContent = `${fmt(subtotalTvFee)}원`;
            els.summaryResults.totalPrice.textContent = `${fmt(finalPrice)}원`;
            els.summaryResults.totalSupport.textContent = `${fmt(supportFund)}원`;
        }
        priceElements.forEach(el => {
            if (el) {
                el.classList.remove('flash-update');
                void el.offsetWidth; 
                el.classList.add('flash-update');
            }
        });
        const telecomNameFull = telecomData[state.telecom]?.name || state.telecom;
        const combinedProductName = state.combinedProduct ? state.combinedProduct.name : '-';
        let detailHTML = '';
        detailHTML += `<div class="detail-row"><span class="detail-label">통신사:</span> <span class="detail-value">${telecomNameFull}</span></div>`;
        detailHTML += `<div class="detail-row"><span class="detail-label">인터넷:</span> <span class="detail-value">${state.internet ? `${state.internet.name} (${fmt(intPrice)}원)` : '-'}</span></div>`;
        detailHTML += `<div class="detail-row"><span class="detail-label">TV:</span> <span class="detail-value">${state.tv ? `${state.tv.name} (${fmt(tvPrice)}원)` : '-'}</span></div>`;
        detailHTML += `<div class="detail-row"><span class="detail-label">셋탑박스:</span> <span class="detail-value">${state.settop ? `${state.settop.name} (${fmt(settopPrice)}원)` : '-'}</span></div>`;
        detailHTML += `<div class="detail-row"><span class="detail-label">TV 추가:</span> <span class="detail-value">${state.additionalTv ? `${state.additionalTv.name} (${fmt(additionalTvPrice)}원)` : '-'}</span></div>`;
        detailHTML += `<div class="detail-row"><span class="detail-label">결합상품:</span> <span class="detail-value">${combinedProductName}</span></div>`;
        if (routerFee > 0) detailHTML += `<div class="detail-row"><span class="detail-label">WiFi 공유기:</span> <span class="detail-value">${fmt(routerFee)}원</span></div>`;
        if (internetDiscount > 0) {
            const discountName = combinedProductName.replace(/결합|할인/g, '');
            detailHTML += `<div class="detail-row"><span class="detail-label">인터넷요금할인(${discountName}):</span> <span class="detail-value discount">-${fmt(internetDiscount)}원</span></div>`;
        }
        if (prepaidDiscount > 0) detailHTML += `<div class="detail-row"><span class="detail-label">선납 할인:</span> <span class="detail-value discount">-${fmt(prepaidDiscount)}원</span></div>`;
        detailHTML += `<div class="detail-row final"><span class="detail-label">월 납부 총액:</span> <span class="detail-value">${fmt(subtotalTvFee)}원</span></div>`;
        if (totalMobileDiscount > 0) {
            detailHTML += `<h4 style="font-size: 15px; font-weight: 700; margin: 15px 0 10px 0; padding-top: 15px; border-top: 1px dashed #ccc;">추가 요금 할인</h4>`;
            const discountName = combinedProductName.replace(/결합|할인/g, '');
            detailHTML += `<div class="detail-row"><span class="detail-label">휴대폰요금할인(${discountName}):</span> <span class="detail-value discount">-${fmt(totalMobileDiscount)}원</span></div>`;
        }
        els.detailSummaryContent.innerHTML = detailHTML;
        const params = {
            telecom: telecomNameFull,
            internet: state.internet?.name,
            tv: state.tv?.name,
            settop: state.settop?.name,
            additionalTv: state.additionalTv?.name,
            combinedProduct: combinedProductName,
            mobilePlanDetails: JSON.stringify(state.mobilePlans),
            usim: state.mobilePlans.filter(p => p.hasUsim).length > 0 ? `${state.mobilePlans.filter(p => p.hasUsim).length}개` : null,
            totalPrice: subtotalTvFee,
            supportFund: supportFund
        };
        const cleanedParams = {};
        for (const key in params) {
            if (params[key] !== null && params[key] !== undefined) {
                cleanedParams[key] = params[key];
            }
        }
        const signupUrl = 'signup.html?' + new URLSearchParams(cleanedParams).toString();
        if (els.signupButtons.quote) els.signupButtons.quote.href = signupUrl;
        if (els.signupButtons.summary) els.signupButtons.summary.href = signupUrl;
        [els.signupButtons.quote, els.signupButtons.summary].forEach(btn => {
            if (!btn) return;
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const fullState = {
                    telecomKey: state.telecom,
                    internetId: state.internet?.id,
                    tvId: state.tv?.id,
                    settopId: state.settop?.id,
                    additionalTvId: state.additionalTv?.id,
                    combinedProductId: state.combinedProduct?.id,
                    skbPrepaid: state.skbPrepaid,
                    mobilePlans: state.mobilePlans,
                    isCombinedProductAuto: state.isCombinedProductAuto
                };
                sessionStorage.setItem('returnContext', JSON.stringify({ type: 'main', state: fullState }));
                window.location.href = newBtn.href;
            });
        });
        els.signupButtons.quote = document.getElementById('self-signup-btn-quote');
        els.signupButtons.summary = document.getElementById('summary-self-signup-btn');
    }

    function createOptionButton(type, item, telecomKey) {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.dataset.name = item.name;
        btn.dataset.key = telecomKey;
        btn.dataset.id = item.id || item.name;
        btn.dataset.type = item.type || '';
        btn.innerHTML = `<span class="item-name">${item.name}</span>` + (item.price > 0 ? `<span class="item-price">월 ${fmt(item.price)}원</span>` : '');
        const handleOptionClick = () => {
            if (type === 'telecom') { 
                handleTelecomClick(telecomKey); 
                return; 
            }
            if (type === 'combinedProduct') {
                state.isCombinedProductAuto = false;
            } else {
                state.isCombinedProductAuto = true;
            }
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
            if (type !== 'combinedProduct') {
                recalcBestBundleAndUpdate();
            } else {
                updateCalculations();
            }
        };
        btn.onclick = handleOptionClick;
        return btn;
    }
    
    function renderProducts(telecomKey) {
        const data = telecomData[telecomKey];
        const containers = [els.internetCont, els.tvCont, els.settopCont, els.additionalTvCont, els.combinedCont];
        containers.forEach(c => c.innerHTML = '');
        (data.internet || []).forEach(item => els.internetCont.appendChild(createOptionButton('internet', item, telecomKey)));
        (data.tv || []).forEach(item => els.tvCont.appendChild(createOptionButton('tv', item, telecomKey)));
        (data.settop || []).forEach(item => els.settopCont.appendChild(createOptionButton('settop', item, telecomKey)));
        (data.additionalTv || []).forEach(item => els.additionalTvCont.appendChild(createOptionButton('additionalTv', item, telecomKey)));
        const list = getCombinedListNormalized();
        list.forEach(item => {
            els.combinedCont.appendChild(createOptionButton('combinedProduct', item, telecomKey));
        });
    }

    function handleTelecomClick(telecomKey) {
        state.telecom = telecomKey;
        state.isCombinedProductAuto = true;
        document.querySelectorAll('#telecom-options-simple .option-btn').forEach(btn => btn.classList.toggle('selected', btn.dataset.key === telecomKey));
        renderProducts(telecomKey);
        const data = telecomData[telecomKey];
        state.internet = data.internet?.find(item => item.id && item.id.includes('500')) || data.internet?.[0] || null;
        state.tv = data.tv?.[0] || null;
        state.settop = data.settop?.[0] || null;
        state.additionalTv = null;
        state.skbPrepaid = false;
        state.isMobileCombined = els.mobileCombinationSelector.querySelector('.selected')?.dataset.value === 'yes';
        const firstEntry = els.mobileList.querySelector('.mobile-entry:first-child');
        els.mobileList.innerHTML = '';
        if(firstEntry) {
            firstEntry.querySelector('label').textContent = '본인';
            firstEntry.querySelector('.mobile-plan-tier').value = "80000";
            firstEntry.querySelector('.youth-checkbox').checked = false;
            firstEntry.querySelector('.usim-checkbox').checked = false;
            els.mobileList.appendChild(firstEntry);
        }
        state.combinedProduct = null; 
        
        if (state.internet) document.querySelector(`#internet-options-simple .option-btn[data-id="${state.internet.id}"]`)?.classList.add('selected');
        if (state.tv) document.querySelector(`#tv-options-simple .option-btn[data-id="${state.tv.id}"]`)?.classList.add('selected');
        if (state.settop) document.querySelector(`#settop-options-simple .option-btn[data-id="${state.settop.id}"]`)?.classList.add('selected');
        
        const firstCombinedProduct = getCombinedListNormalized()[0];
        if (firstCombinedProduct) {
            state.combinedProduct = firstCombinedProduct;
            const btn = els.combinedCont.querySelector(`.option-btn[data-id="${firstCombinedProduct.id}"]`);
            if (btn) btn.classList.add('selected');
        }
        
        els.detailFeeSummary.style.display = 'none';
        if (els.toggleDetailFeeLink) els.toggleDetailFeeLink.innerHTML = '상세요금 <i class="fas fa-chevron-right"></i>';
        
        state.currentStep = 1;
        updateWizardUI();
        updateCalculations();
    }
    
    (function initCalculator() {
        
        function injectDynamicStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .auto-bundle-notification {
                    background-color: var(--primary-light-bg); color: var(--primary-dark);
                    font-size: 14px; font-weight: 500; padding: 12px 15px;
                    border-radius: 8px; margin: 0 30px 20px; text-align: center;
                    opacity: 0; max-height: 0; transform: translateY(-10px);
                    transition: all 0.4s ease; overflow: hidden;
                }
                .auto-bundle-notification.visible {
                    opacity: 1; max-height: 50px; transform: translateY(0); margin-bottom: 20px;
                }
                .flash-update { animation: flash-update 0.7s ease-out; }
                @keyframes flash-update {
                    0% { transform: translateY(5px); opacity: 0.5; }
                    50% { transform: translateY(-2px); opacity: 1; }
                    100% { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        function createNotificationElement() {
            const quotePanelBody = document.querySelector('.quote-body');
            if (quotePanelBody && !document.getElementById('auto-bundle-notification')) {
                const notificationEl = document.createElement('div');
                notificationEl.id = 'auto-bundle-notification';
                notificationEl.className = 'auto-bundle-notification';
                quotePanelBody.prepend(notificationEl);
            }
        }

        injectDynamicStyles();
        createNotificationElement();
        
        const initialTelecomOrder = ['SK', 'LG', 'KT', 'SKB', 'Skylife', 'HelloVision'];
        if (els.wizard.nextBtn) {
            els.wizard.nextBtn.addEventListener('click', () => {
                if (state.currentStep < state.totalSteps) {
                    state.currentStep++;
                    updateWizardUI();
                } else {
                    els.wizard.guideBubble.textContent = guideMessages[6];
                    const quotePanel = document.querySelector('.quote-panel');
                    if (quotePanel) {
                        quotePanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            });
        }
        if (els.wizard.prevBtn) {
            els.wizard.prevBtn.addEventListener('click', () => {
                if (state.currentStep > 1) {
                    state.currentStep--;
                    updateWizardUI();
                }
            });
        }
        initialTelecomOrder.forEach(key => {
            if (telecomData[key]) {
                const btn = document.createElement('button');
                btn.className = 'option-btn'; btn.dataset.key = key;
                btn.innerHTML = `<span class="item-name">${telecomData[key].name || key}</span>`;
                btn.onclick = () => handleTelecomClick(key);
                els.telecomCont.appendChild(btn);
            }
        });
        setupMobileOptionsUI();
        if (initialTelecomOrder.length > 0 && telecomData[initialTelecomOrder[0]]) {
            handleTelecomClick(initialTelecomOrder[0]);
        }
    })();
    
    function restoreMainCalculatorState(stateToRestore) {
        const telecomKey = stateToRestore.telecomKey;
        if (!telecomKey || !telecomData[telecomKey]) return;
        document.querySelectorAll('#telecom-options-simple .option-btn').forEach(btn => btn.classList.toggle('selected', btn.dataset.key === telecomKey));
        renderProducts(telecomKey);
        const data = telecomData[telecomKey];
        state.telecom = telecomKey;
        state.internet = data.internet.find(i => i.id === stateToRestore.internetId) || null;
        state.tv = data.tv.find(i => i.id === stateToRestore.tvId) || null;
        state.settop = data.settop.find(i => i.id === stateToRestore.settopId) || null;
        state.additionalTv = data.additionalTv.find(i => i.id === stateToRestore.additionalTvId) || null;
        state.skbPrepaid = stateToRestore.skbPrepaid;
        state.mobilePlans = stateToRestore.mobilePlans || [];
        state.isCombinedProductAuto = stateToRestore.isCombinedProductAuto;
        if (!state.isCombinedProductAuto) {
            state.combinedProduct = getCombinedListNormalized().find(i => i.id === stateToRestore.combinedProductId) || null;
        }
        if (state.internet) document.querySelector(`#internet-options-simple .option-btn[data-id="${state.internet.id}"]`)?.classList.add('selected');
        if (state.tv) document.querySelector(`#tv-options-simple .option-btn[data-id="${state.tv.id}"]`)?.classList.add('selected');
        if (state.settop) document.querySelector(`#settop-options-simple .option-btn[data-id="${state.settop.id}"]`)?.classList.add('selected');
        if (state.additionalTv) document.querySelector(`#additional-tv-options-simple .option-btn[data-id="${state.additionalTv.id}"]`)?.classList.add('selected');
        if (els.mobileList && state.mobilePlans.length > 0) {
            els.mobileList.innerHTML = '';
            state.mobilePlans.forEach((plan, index) => {
                const tierValue = Object.keys(MOBILE_TIER_PRICES).find(key => MOBILE_TIER_PRICES[key].price === plan.price) || "80000";
                const newEntry = document.createElement('div');
                newEntry.className = 'mobile-entry';
                newEntry.innerHTML = `
                    <label>${index === 0 ? '본인' : `가족${index}`}</label>
                    <select class="mobile-plan-tier">
                        <option value="20000">3만원 미만</option><option value="30000">3만원대</option>
                        <option value="40000">4만원대</option><option value="50000">5만원대</option>
                        <option value="60000">6만원대</option><option value="70000">7만원대</option>
                        <option value="80000">8만원 이상</option>
                    </select>
                    <div class="mobile-entry-options">
                        <label class="toggle-switch-label">청소년<div class="toggle-switch"><input type="checkbox" class="youth-checkbox"><span class="slider"></span></div></label>
                        <label class="toggle-switch-label">유심<div class="toggle-switch"><input type="checkbox" class="usim-checkbox"><span class="slider"></span></div></label>
                    </div>
                    ${index > 0 ? '<button class="remove-mobile-btn" type="button" title="삭제">&times;</button>' : ''}
                `;
                newEntry.querySelector('.mobile-plan-tier').value = tierValue;
                newEntry.querySelector('.youth-checkbox').checked = plan.isYouth;
                newEntry.querySelector('.usim-checkbox').checked = plan.hasUsim;
                els.mobileList.appendChild(newEntry);
            });
            els.mobileCombinationSelector.querySelector('button[data-value="yes"]').click();
        } else {
             els.mobileCombinationSelector.querySelector('button[data-value="no"]').click();
        }
        state.currentStep = state.totalSteps;
        updateWizardUI();
        updateCalculations();
    }

    document.addEventListener('restoreMainCalculator', (e) => {
        restoreMainCalculatorState(e.detail);
    });

    window.mainModuleReady = true;
    window.dispatchEvent(new Event('main-module-ready'));
}