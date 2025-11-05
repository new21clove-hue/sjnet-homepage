import { getFullData } from './data-service.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 데이터베이스에서 전체 데이터를 비동기적으로 불러옵니다.
    const telecomDataFromDB = await getFullData();

    // 데이터를 불러오지 못하면 AI 플래너 기능을 비활성화하거나 에러 메시지를 표시합니다.
    if (!telecomDataFromDB) {
        const aiContainer = document.querySelector('.ai-calculator-body');
        if(aiContainer) aiContainer.innerHTML = '<p style="text-align:center; color:red; font-weight:bold;">[오류] AI 플래너 정보를 불러오는 데 실패했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.</p>';
        return;
    }

    // --- 여기서부터 AI 계산기 로직 시작 ---
    const aiCalcBody = document.querySelector('.ai-calculator-body');
    if (!aiCalcBody) return;

    let allResultsData = [];

    const MOBILE_TIER_PRICES = {
        "20000": { name: '3만원 미만 요금제', price: 20000 }, "30000": { name: '3만원대 요금제', price: 35000 }, "40000": { name: '4만원대 요금제', price: 45000 }, "50000": { name: '5만원대 요금제', price: 55000 }, "60000": { name: '6만원대 요금제', price: 65000 }, "70000": { name: '7만원대 요금제', price: 75000 }, "80000": { name: '8만원 이상 요금제', price: 90000 }
    };
    
    // DB에서 받은 데이터로 telecomData를 재구성합니다. AI 계산기에 필요한 형태로 가공합니다.
    const telecomData = {};
    for (const key in telecomDataFromDB) {
        const original = telecomDataFromDB[key];
        telecomData[key] = {
            name: original.name,
            color: original.color,
            internet: original.internet.map(p => ({ id: p.id, name: p.name.split(' ')[0], price: p.price })),
            tv: original.tv.map(p => ({ id: p.id || (p.name.toLowerCase().includes('basic') || p.name.toLowerCase().includes('이코노미') ? 'basic' : 'premium'), name: p.name.split('(')[0].trim(), price: p.price })),
            additionalTv: {
                basic: original.additionalTv.find(p => p.name.toLowerCase().includes('basic') || p.name.toLowerCase().includes('180') || p.name.toLowerCase().includes('이코노미'))?.price || 0,
                premium: original.additionalTv.find(p => p.name.toLowerCase().includes('premium') || p.name.toLowerCase().includes('all') || p.name.toLowerCase().includes('230') || p.name.toLowerCase().includes('에센스'))?.price || 0,
            },
            combinedProducts: original.combinedProducts,
            cashBenefits: {
                'speed500_premium': (original.discounts?.speed500 || 0) + (original.discounts?.tv_premium || 0) + 400000,
                'speed1000_premium': (original.discounts?.speed1000 || 0) + (original.discounts?.tv_premium || 0) + 400000,
                'default': original.discounts?.speed100 || 350000
            },
            bundled: original.pricing_table ? {
                'speed100_basic': original.pricing_table.pop180?.family_bundle?.speed100,
                'speed500_basic': original.pricing_table.pop180?.family_bundle?.speed500,
                'speed1000_basic': original.pricing_table.pop180?.family_bundle?.speed1000,
                'speed100_premium': original.pricing_table.pop230?.family_bundle?.speed100,
                'speed500_premium': original.pricing_table.pop230?.family_bundle?.speed500,
                'speed1000_premium': original.pricing_table.pop230?.family_bundle?.speed1000,
            } : null,
            mobileDiscounts: original.mobileDiscounts
        };
    }

    const LG_TOGETHER_DISCOUNT = { 2: 10000, 3: 14000, 4: 20000, 5: 20000 };
    const LG_TOGETHER_YOUTH_ADDITIONAL_DISCOUNT = 10000;
    const LG_MOBILE_DISCOUNT_MATRIX = { 1: [0, 0, 0], 2: [2200, 3300, 4400], 3: [3300, 5500, 6600], 4: [4400, 6600, 8800], 5: [4400, 6600, 8800] };
    const MOBILE_PRICE_TIERS_CHAM = [69000, 88000];
    const KT_TOTAL_DISCOUNT_TIERS = { tiers: [22000, 64900, 108900, 141900, 174900, Infinity], '100M': { internet: [1650, 3300, 5500, 5500, 5500, 5500], mobile: [0, 0, 3300, 14300, 18700, 23100] }, '500M+': { internet: [2200, 5500, 5500, 5500, 5500, 5500], mobile: [0, 0, 5500, 16610, 22110, 27610] } };

    const els = { internetSelector: aiCalcBody.querySelector('#internet-selector'), tvSelector: aiCalcBody.querySelector('#tv-selector'), additionalTvSelector: aiCalcBody.querySelector('#additional-tv-selector'), mobileCombinationSelector: aiCalcBody.querySelector('#mobile-combination-selector'), mobileDetailsWrapper: aiCalcBody.querySelector('#mobile-details-wrapper'), mobileList: aiCalcBody.querySelector('#mobile-list'), addMobileBtn: aiCalcBody.querySelector('#add-mobile-btn'), calculateBtn: aiCalcBody.querySelector('#calculate-btn'), loader: aiCalcBody.querySelector('#loader'), resultsContainer: aiCalcBody.querySelector('.results-container'), lowestBillResults: aiCalcBody.querySelector('#lowest-bill-results'), highestBenefitResults: aiCalcBody.querySelector('#highest-benefit-results') };
    function handleOptionSelection(selector) { selector.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { Array.from(selector.children).forEach(btn => btn.classList.remove('selected')); e.target.classList.add('selected'); } }); }
    handleOptionSelection(els.internetSelector); handleOptionSelection(els.tvSelector); handleOptionSelection(els.additionalTvSelector);

    els.mobileCombinationSelector.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { Array.from(els.mobileCombinationSelector.children).forEach(btn => btn.classList.remove('selected')); e.target.classList.add('selected'); const isCombined = e.target.dataset.value === 'yes'; els.mobileDetailsWrapper.classList.toggle('hidden', !isCombined); } });

    let mobileEntryCount = 1;
    els.addMobileBtn.addEventListener('click', () => {
        if (mobileEntryCount >= 5) { alert('가족은 최대 4명까지 추가할 수 있습니다.'); return; }
        mobileEntryCount++;
        const newEntry = document.createElement('div');
        newEntry.className = 'mobile-entry';
        newEntry.innerHTML = `
            <label>가족${mobileEntryCount - 1}</label>
            <select class="mobile-plan-tier">
                <option value="20000">3만원 미만</option><option value="30000">3만원대</option><option value="40000">4만원대</option><option value="50000" selected>5만원대</option><option value="60000">6만원대</option><option value="70000">7만원대</option><option value="80000">8만원 이상</option>
            </select>
            <div class="mobile-entry-options">
                <label class="toggle-switch">청소년<input type="checkbox" class="youth-checkbox"><span class="slider"></span></label>
                <label class="toggle-switch">유심<input type="checkbox" class="usim-checkbox"><span class="slider"></span></label>
            </div>
            <button class="remove-mobile-btn" type="button" title="삭제">&times;</button>
        `;
        els.mobileList.appendChild(newEntry);
    });

    els.mobileList.addEventListener('click', (e) => { if (e.target.classList.contains('remove-mobile-btn')) { e.target.parentElement.remove(); mobileEntryCount--; els.mobileList.querySelectorAll('.mobile-entry').forEach((entry, index) => { entry.querySelector('label').textContent = index === 0 ? '본인' : `가족${index}`; }); } });
    els.calculateBtn.addEventListener('click', runOptimization);

    function runOptimization() {
        const userSelections = getUserSelections();
        els.resultsContainer.style.display = 'none';
        els.loader.style.display = 'block';
        setTimeout(() => {
            const carriers = ['SK', 'LG', 'KT', 'SKB', 'Skylife', 'HelloVision'];
            allResultsData = carriers.map(carrier => calculateBestOptionForCarrier(carrier, userSelections)).flat().filter(result => result && result.monthlyBill !== Infinity);
            displayResults(allResultsData);
            els.loader.style.display = 'none';
            els.resultsContainer.style.display = 'block';
            
            const header = document.querySelector('.sticky-header-container');
            const firstResultCategory = aiCalcBody.querySelector('.result-category');

            if (header && firstResultCategory) {
                const headerHeight = header.offsetHeight;
                const elementPosition = firstResultCategory.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = elementPosition - headerHeight - 20;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        }, 500);
    }

    function getUserSelections() {
        const isMobileCombined = els.mobileCombinationSelector.querySelector('.selected').dataset.value === 'yes';
        return {
            internetSpeed: els.internetSelector.querySelector('.selected').dataset.value,
            tvPlan: els.tvSelector.querySelector('.selected').dataset.value,
            additionalTvCount: parseInt(els.additionalTvSelector.querySelector('.selected').dataset.value, 10),
            mobilePlans: isMobileCombined ? Array.from(els.mobileList.querySelectorAll('.mobile-entry')).map(entry => {
                const select = entry.querySelector('.mobile-plan-tier');
                const youthCheckbox = entry.querySelector('.youth-checkbox');
                const usimCheckbox = entry.querySelector('.usim-checkbox');
                const planData = MOBILE_TIER_PRICES[select.value];
                return { ...planData, isYouth: youthCheckbox.checked, hasUsim: usimCheckbox.checked };
            }) : []
        };
    }
    
    function calculateBestOptionForCarrier(carrierName, selections) {
        const carrierData = telecomData[carrierName];
        if (!carrierData) return [];
        
        const combinedProducts = carrierData.combinedProducts || [{ name: '미결합' }];
        let results = [];

        for (const combinedProduct of combinedProducts) {
            let internetPrice = 0, tvPrice = 0, additionalTvPrice = 0, netBill = 0;
            let internetProduct, tvProduct;
            let internetDiscount = 0, totalMobileDiscount = 0;
            
            if (carrierName === 'SKB') {
                if(selections.tvPlan === 'none' || !carrierData.bundled) continue;
                const key = `speed${selections.internetSpeed}_${selections.tvPlan}`;
                netBill = carrierData.bundled[key] || Infinity;
                if(netBill === Infinity) continue;
                additionalTvPrice = selections.additionalTvCount > 0 ? (carrierData.additionalTv[selections.tvPlan] * selections.additionalTvCount) : 0;
                netBill += additionalTvPrice;
                internetProduct = { name: `${selections.internetSpeed}M`, price: 0 };
                tvProduct = { name: `Btv pop ${selections.tvPlan === 'basic' ? '180' : '230'}`, price: 0 };
            } else {
                internetProduct = carrierData.internet.find(p => p.id.includes(selections.internetSpeed));
                if (!internetProduct) continue;
                internetPrice = internetProduct.price;
                if (selections.tvPlan !== 'none') {
                    tvProduct = carrierData.tv.find(p => p.id === selections.tvPlan);
                    if (!tvProduct) continue;
                    tvPrice = tvProduct.price;
                    additionalTvPrice = selections.additionalTvCount > 0 ? (carrierData.additionalTv[selections.tvPlan] * selections.additionalTvCount) : 0;
                }
                netBill = internetPrice + tvPrice + additionalTvPrice;
            }
            
            const mobileCount = selections.mobilePlans.length;
            const mobilePriceSum = selections.mobilePlans.reduce((sum, p) => sum + p.price, 0);

            if (mobileCount > 0) {
                if (carrierName === 'SK') {
                    if (combinedProduct.name === '요즘가족결합') {
                        internetDiscount = {speed100:4400, speed500:6600, speed1000:8800}[`speed${selections.internetSpeed}`] || 0;
                        let mobileDiscountMap = { 1: 3500, 2: 7000, 3: 18000, 4: 18000, 5: 24000 }; totalMobileDiscount = mobileDiscountMap[mobileCount] || 0;
                    } else if (combinedProduct.name === '패밀리결합') {
                        internetDiscount = 5500;
                    }
                } else if (carrierName === 'LG') {
                    if (combinedProduct.name === '참쉬운가족결합') {
                        internetDiscount = {speed100:5500, speed500:9900, speed1000:13200}[`speed${selections.internetSpeed}`] || 0;
                        const deviceKey = Math.min(mobileCount, 5); const discountRow = LG_MOBILE_DISCOUNT_MATRIX[deviceKey];
                        if (discountRow) { selections.mobilePlans.forEach(plan => { let priceIndex = (plan.price >= MOBILE_PRICE_TIERS_CHAM[1]) ? 2 : (plan.price >= MOBILE_PRICE_TIERS_CHAM[0] ? 1 : 0); totalMobileDiscount += discountRow[priceIndex]; }); }
                    } else if (combinedProduct.name === '투게더결합') {
                        if (selections.internetSpeed !== '100') internetDiscount = 11000;
                        const highTierLines = selections.mobilePlans.filter(p => p.price >= 85000);
                        const highTierCount = highTierLines.length;
                        if (highTierCount > 0) {
                            totalMobileDiscount += (LG_TOGETHER_DISCOUNT[Math.min(highTierCount, 5)] || 0) * highTierCount;
                        }
                        const youthOnHighTierCount = highTierLines.filter(p => p.isYouth).length;
                        totalMobileDiscount += youthOnHighTierCount * LG_TOGETHER_YOUTH_ADDITIONAL_DISCOUNT;
                    }
                } else if (carrierName === 'KT') {
                    if (combinedProduct.name === '총액결합할인') {
                        const speedKey = selections.internetSpeed === '100' ? '100M' : '500M+';
                        let tierIndex = KT_TOTAL_DISCOUNT_TIERS.tiers.findIndex(tier => mobilePriceSum < tier);
                        if (tierIndex === -1) tierIndex = KT_TOTAL_DISCOUNT_TIERS.tiers.length - 1;
                        internetDiscount = KT_TOTAL_DISCOUNT_TIERS[speedKey].internet[tierIndex] || 0;
                        totalMobileDiscount = KT_TOTAL_DISCOUNT_TIERS[speedKey].mobile[tierIndex] || 0;
                    } else if (combinedProduct.name === '프리미엄가족결합') {
                        const premiumLines = selections.mobilePlans.filter(p => p.price >= 80000);
                        if (mobileCount < 2 || premiumLines.length < 2) continue;
                        internetDiscount = 5500;
                        totalMobileDiscount += 5500; 
                        for (let i = 1; i < premiumLines.length; i++) {
                            totalMobileDiscount += premiumLines[i].price * 0.25;
                            if (premiumLines[i].isYouth) totalMobileDiscount += 5500;
                        }
                    }
                }
                else if (carrierName === 'HelloVision' && carrierData.mobileDiscounts) {
                     const hasTv = selections.tvPlan !== 'none';
                     const key = hasTv ? 'internet_tv' : 'internet_only';
                     internetDiscount = carrierData.mobileDiscounts[key][selections.internetSpeed] || 0;
                }
            }
            
            netBill -= internetDiscount;
            const totalBill = netBill + mobilePriceSum - totalMobileDiscount;
            const benefitKey = tvProduct ? `speed${selections.internetSpeed}_${tvProduct.id}` : 'default';
            let cashBenefit = carrierData.cashBenefits[benefitKey] || carrierData.cashBenefits['default'] || 0;
            
            const GIFT_CONFIG_KEY = 'telecomGiftConfig';
            const savedConfig = localStorage.getItem(GIFT_CONFIG_KEY);
            const giftConfig = savedConfig ? JSON.parse(savedConfig) : {};
            const config = giftConfig[carrierName] || {};
            
            const usimCount = selections.mobilePlans.filter(p => p.hasUsim).length;
            if (usimCount > 0) {
                cashBenefit += (config.usim_add || 0) * usimCount;
            }

            const totalBenefit = cashBenefit + (totalMobileDiscount * 36);

            results.push({
                id: `${carrierName}_${combinedProduct.name}`.replace(/\s/g, ''),
                carrier: carrierData.name, monthlyBill: totalBill, netBill, cashBenefit, totalBenefit, totalMobileDiscount, bestPlanName: combinedProduct.name,
                details: { 
                    telecom: { name: carrierData.name, color: carrierData.color },
                    internet: internetProduct, tv: tvProduct,
                    internetDiscount,
                }
            });
        }
        if (results.length === 0) return [];
        const bestOption = results.sort((a,b) => (a.netBill - a.totalMobileDiscount) - (b.netBill - b.totalMobileDiscount))[0];
        return [bestOption];
    }

    function displayResults(results) {
        const sortedByEffectiveBill = [...results].sort((a, b) => (a.netBill - a.totalMobileDiscount) - (b.netBill - b.totalMobileDiscount));
        const sortedByBenefit = [...results].sort((a, b) => b.totalBenefit - a.totalBenefit);
        els.lowestBillResults.innerHTML = sortedByEffectiveBill.slice(0, 3).map((r, i) => createResultCardHTML(r, i + 1)).join('') || "<p>조건에 맞는 결과가 없습니다.</p>";
        els.highestBenefitResults.innerHTML = sortedByBenefit.slice(0, 3).map((r, i) => createResultCardHTML(r, i + 1)).join('') || "<p>조건에 맞는 결과가 없습니다.</p>";
    }

    function createResultCardHTML(result, rank) {
        const { id, carrier, netBill, cashBenefit, totalBenefit, totalMobileDiscount, bestPlanName, details } = result;
        const effectiveBill = netBill - totalMobileDiscount;
        const totalMobileDiscount3Years = totalMobileDiscount * 36;
        const calculationString = `(월정액 ${Math.round(netBill).toLocaleString()}원 - 결합할인 ${Math.round(totalMobileDiscount).toLocaleString()}원)`;
        
        return `
            <div class="result-card">
                <div class="rank-section">
                    <div class="rank">${rank}</div>
                    <div class="telecom-logo" style="color:${details.telecom.color};">${carrier}</div>
                </div>
                <div class="details">
                    <div class="bill-breakdown">
                        <div class="bill-breakdown-row"><span>인터넷+TV 월정액</span><span>${Math.round(netBill).toLocaleString()} 원</span></div>
                        <div class="bill-breakdown-row discount"><span>휴대폰 결합할인</span><span>-${Math.round(totalMobileDiscount).toLocaleString()} 원</span></div>
                        <div class="bill-breakdown-row total"><span>실제 체감 요금</span><span>${Math.round(effectiveBill).toLocaleString()} 원</span></div>
                        <div class="calculation-detail" style="font-size: 13px; color: #888; text-align: right; margin-top: 5px;">${calculationString}</div>
                    </div>
                    <div class="benefit-details">
                        <div class="benefit-row"><span>현금 혜택</span><span class="cash">${Math.round(cashBenefit).toLocaleString()} 원</span></div>
                        <div class="benefit-row"><span>3년 요금 할인</span><span>${Math.round(totalMobileDiscount3Years).toLocaleString()} 원</span></div>
                        <div class="benefit-row total"><span>총 혜택</span><span>${Math.round(cashBenefit + totalMobileDiscount3Years).toLocaleString()} 원</span></div>
                    </div>
                </div>
                <div class="card-footer">
                    <p class="best-plan">추천 결합: ${bestPlanName || '미결합'}</p>
                    <div class="card-buttons">
                        <button class="detail-link secondary" data-result-id="${id}">상세 견적 보기</button>
                        <a href="signup.html" class="detail-link primary signup-link" data-result-id="${id}">셀프 가입</a>
                    </div>
                </div>
            </div>
        `;
    }

    const modalOverlay = document.getElementById('detail-modal');
    const modalBody = document.getElementById('modal-body-content');
    let currentResultForModal = null;

    function openModal(result, type = 'detail') {
        currentResultForModal = result;
        document.getElementById('modal-title').textContent = type === 'detail' ? `${result.carrier} 맞춤 상세 견적서` : '상담 신청하기';
        
        if (type === 'detail') {
            const baseFee = result.netBill + result.details.internetDiscount;
            const totalDiscount3Years = (result.details.internetDiscount + result.totalMobileDiscount) * 36;
            modalBody.innerHTML = `
                <div class="modal-section">
                    <h4>✅ 선택하신 상품</h4>
                    <table class="modal-table" id="modal-products-table">
                        <tr><td>인터넷</td><td>${result.details.internet.name}</td><td>${result.details.internet.price.toLocaleString()}원</td></tr>
                        ${result.details.tv ? `<tr><td>TV</td><td>${result.details.tv.name}</td><td>${result.details.tv.price.toLocaleString()}원</td></tr>` : ''}
                        <tr><td>추천 결합</td><td colspan="2"><b>${result.bestPlanName}</b></td></tr>
                    </table>
                </div>
                <div class="modal-section">
                    <h4>💰 월 예상 납부액 상세</h4>
                    <table class="modal-table" id="modal-fees-table">
                        <tr><td>인터넷+TV 기본요금 (A)</td><td>${Math.round(baseFee).toLocaleString()}원</td></tr>
                        <tr class="discount-row"><td>인터넷 결합할인 (B)</td><td>-${Math.round(result.details.internetDiscount).toLocaleString()}원</td></tr>
                        <tr class="discount-row"><td>휴대폰 결합할인 (C)</td><td>-${Math.round(result.totalMobileDiscount).toLocaleString()}원</td></tr>
                        <tr class="total-row"><td>월 납부 총액 (A-B-C)</td><td>${Math.round(result.netBill - result.totalMobileDiscount).toLocaleString()}원</td></tr>
                    </table>
                </div>
                <div class="modal-section">
                    <h4>🎁 고객님을 위한 총 혜택</h4>
                    <table class="modal-table" id="modal-benefits-table">
                        <tr><td>현금 사은품</td><td>${result.cashBenefit.toLocaleString()}원</td></tr>
                        <tr><td>36개월간 요금 할인</td><td>${Math.round(totalDiscount3Years).toLocaleString()}원</td></tr>
                        <tr class="total-row"><td>총 혜택 금액</td><td>${Math.round(result.cashBenefit + totalDiscount3Years).toLocaleString()}원</td></tr>
                    </table>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-close">닫기</button>
                    <a href="#" class="btn btn-secondary signup-link">셀프 가입</a>
                    <button class="btn btn-action" id="modal-consult-btn">이 상품으로 상담하기</button>
                </div>
            `;
        } else if (type === 'form') {
            modalBody.innerHTML = `
                <div class="modal-section">
                    <h4>상담 신청</h4>
                    <p style="font-size:14px; color:var(--text-light); margin-bottom:20px;">선택하신 견적 내용이 상담사에게 전달됩니다. 아래 정보를 남겨주시면 신속하게 연락드리겠습니다.</p>
                    <form id="consult-form">
                        <div class="form-group">
                            <label for="customer-name">이름</label>
                            <input type="text" id="customer-name" required>
                        </div>
                        <div class="form-group">
                            <label for="customer-phone">연락처</label>
                            <input type="tel" id="customer-phone" placeholder="'-' 없이 숫자만 입력" required>
                        </div>
                        <div class="form-group">
                            <div class="consent">
                                <input type="checkbox" id="consent-check" required>
                                <label for="consent-check">개인정보 수집 및 이용에 동의합니다.</label>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-close">취소</button>
                    <button class="btn btn-action" id="submit-consult-form">상담 신청 완료</button>
                </div>
            `;
        }

        document.body.classList.add('modal-open');
        modalOverlay.classList.add('visible');
    }

    function closeModal() {
        document.body.classList.remove('modal-open');
        modalOverlay.classList.remove('visible');
    }

    function generateSignupUrl(resultId) {
        const result = allResultsData.find(r => r.id === resultId);
        if (!result) return 'signup.html';

        const params = {
            telecom: result.carrier,
            internet: result.details.internet?.name,
            tv: result.details.tv?.name,
            combinedProduct: result.bestPlanName,
            totalPrice: `${Math.round(result.netBill - result.totalMobileDiscount).toLocaleString()}원`,
            supportFund: `${result.cashBenefit.toLocaleString()}원`
        };
        const cleanedParams = {};
        for (const key in params) {
            if (params[key] !== null && params[key] !== undefined) cleanedParams[key] = params[key];
        }
        return 'signup.html?' + new URLSearchParams(cleanedParams).toString();
    }

    document.querySelector('.results-container').addEventListener('click', (e) => {
        if (e.target.classList.contains('detail-link') && e.target.tagName === 'BUTTON') {
            const resultId = e.target.dataset.resultId;
            const resultData = allResultsData.find(r => r.id === resultId);
            if (resultData) openModal(resultData, 'detail');
        } else if (e.target.classList.contains('signup-link')) {
            e.preventDefault();
            const resultId = e.target.dataset.resultId;
            window.location.href = generateSignupUrl(resultId);
        }
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-close-btn') || e.target.classList.contains('btn-close')) {
            closeModal();
        } else if (e.target.id === 'modal-consult-btn') {
            openModal(currentResultForModal, 'form');
        } else if (e.target.id === 'submit-consult-form') {
            const form = document.getElementById('consult-form');
            if (form.checkValidity()) {
                alert('상담 신청이 완료되었습니다. 곧 연락드리겠습니다.');
                closeModal();
            } else {
                form.reportValidity();
            }
        } else if (e.target.classList.contains('signup-link')) {
             e.preventDefault();
             window.location.href = generateSignupUrl(currentResultForModal.id);
        } else if (e.target === modalOverlay) {
            closeModal();
        }
    });
});