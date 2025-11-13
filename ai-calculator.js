import { getFullData } from './data-service.js';

// ▼▼▼ [수정] export 키워드를 추가하고, 전체를 함수로 감쌉니다. ▼▼▼
export function initAiCalculator(telecomDataFromDB) {

    if (!telecomDataFromDB) {
        const aiContainer = document.querySelector('.ai-calculator-body');
        if(aiContainer) aiContainer.innerHTML = '<p style="text-align:center; color:red; font-weight:bold;">[오류] AI 플래너 정보를 불러오는 데 실패했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.</p>';
        return;
    }

    const aiCalcBody = document.querySelector('.ai-calculator-body');
    if (!aiCalcBody) return;

    let allResultsData = [];

    window.MOBILE_TIER_PRICES = {
        "20000": { name: '3만원 미만 요금제', price: 20000 }, "30000": { name: '3만원대 요금제', price: 35000 }, "40000": { name: '4만원대 요금제', price: 45000 }, "50000": { name: '5만원대 요금제', price: 55000 }, "60000": { name: '6만원대 요금제', price: 65000 }, "70000": { name: '7만원대 요금제', price: 75000 }, "80000": { name: '8만원 이상 요금제', price: 90000 }
    };
    
    const telecomData = {};
    for (const key in telecomDataFromDB) {
        const original = telecomDataFromDB[key];
        telecomData[key] = {
            name: original.name,
            color: original.color,
            internet: (original.internet || []).map(p => ({ id: p.id, name: p.name.split(' ')[0], price: p.price })),
            tv: (original.tv || []).map(p => ({ id: p.id || (p.name.toLowerCase().includes('basic') || p.name.toLowerCase().includes('이코노미') ? 'basic' : 'premium'), name: p.name.split('(')[0].trim(), price: p.price })),
            additionalTv: {
                basic: (original.additionalTv || []).find(p => {
                    const n = (p.name || '').toLowerCase();
                    return n.includes('basic') || n.includes('베이직') || n.includes('economy') || n.includes('이코노미') || n.includes('lite') || n.includes('라이트') || n.includes('180') || n.includes('실속형');
                })?.price || 0,
                premium: (original.additionalTv || []).find(p => {
                    const n = (p.name || '').toLowerCase();
                    return n.includes('premium') || n.includes('프리미엄') || n.includes('all') || n.includes('230') || n.includes('에센스') || n.includes('ultra') || n.includes('울트라') || n.includes('모든g');
                })?.price || 0,
            },
            combinedProducts: original.combinedProducts,
            giftPolicy: original.giftPolicy,
            discounts: original.discounts,
            mobileDiscounts: original.mobileDiscounts
        };
    }
    
    const LG_TOGETHER_DISCOUNT = { 2: 10000, 3: 14000, 4: 20000, 5: 20000 };
    const LG_TOGETHER_YOUTH_ADDITIONAL_DISCOUNT = 10000;
    const LG_PREMIUM_DISCOUNT = 5250;
    const LG_MOBILE_DISCOUNT_MATRIX = { 1: [0, 0, 0], 2: [2200, 3300, 4400], 3: [3300, 5500, 6600], 4: [4400, 6600, 8800], 5: [4400, 6600, 8800] };
    const MOBILE_PRICE_TIERS_CHAM = [69000, 88000];
    const KT_TOTAL_DISCOUNT_TIERS = { tiers: [22000, 64900, 108900, 141900, 174900, Infinity], '100M': { internet: [1650, 3300, 5500, 5500, 5500, 5500], mobile: [0, 0, 3300, 14300, 18700, 23100] }, '500M+': { internet: [2200, 5500, 5500, 5500, 5500, 5500], mobile: [0, 0, 5500, 16610, 22110, 27610] } };

    const els = { 
        internetSelector: aiCalcBody.querySelector('#internet-selector'), 
        tvSelector: aiCalcBody.querySelector('#tv-selector'), 
        additionalTvSelector: aiCalcBody.querySelector('#additional-tv-selector'), 
        mobileCombinationSelector: aiCalcBody.querySelector('#mobile-combination-selector'), 
        mobileDetailsWrapper: aiCalcBody.querySelector('#mobile-details-wrapper'), 
        mobileList: aiCalcBody.querySelector('#mobile-list'), 
        addMobileBtn: aiCalcBody.querySelector('#add-mobile-btn'), 
        calculateBtn: aiCalcBody.querySelector('#calculate-btn'), 
        loader: aiCalcBody.querySelector('#loader'), 
        resultsContainer: aiCalcBody.querySelector('.results-container'), 
        recommendationCards: aiCalcBody.querySelector('#ai-recommendation-cards')
    };

    function handleOptionSelection(selector) { selector.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { Array.from(selector.children).forEach(btn => btn.classList.remove('selected')); e.target.classList.add('selected'); } }); }
    handleOptionSelection(els.internetSelector); handleOptionSelection(els.tvSelector); handleOptionSelection(els.additionalTvSelector);

    els.mobileCombinationSelector.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { Array.from(els.mobileCombinationSelector.children).forEach(btn => btn.classList.remove('selected')); e.target.classList.add('selected'); const isCombined = e.target.dataset.value === 'yes'; els.mobileDetailsWrapper.style.display = isCombined ? 'block' : 'none'; } });

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
                <label class="toggle-switch-label">
                    청소년
                    <div class="toggle-switch">
                        <input type="checkbox" class="youth-checkbox">
                        <span class="slider"></span>
                    </div>
                </label>
                <label class="toggle-switch-label">
                    유심
                    <div class="toggle-switch">
                        <input type="checkbox" class="usim-checkbox">
                        <span class="slider"></span>
                    </div>
                </label>
            </div>
            <button class="remove-mobile-btn" type="button" title="삭제">&times;</button>
        `;
        els.mobileList.appendChild(newEntry);
    });

    els.mobileList.addEventListener('click', (e) => { if (e.target.classList.contains('remove-mobile-btn')) { e.target.parentElement.remove(); mobileEntryCount--; els.mobileList.querySelectorAll('.mobile-entry').forEach((entry, index) => { entry.querySelector('label').textContent = index === 0 ? '본인' : `가족${index}`; }); } });
    els.calculateBtn.addEventListener('click', runOptimization);

    function runOptimization() {
        els.calculateBtn.classList.add('calculating');
        els.calculateBtn.disabled = true;

        const userSelections = getUserSelections();
        els.resultsContainer.style.display = 'none';
        els.loader.style.display = 'block';
        
        setTimeout(() => {
            const carriers = ['SK', 'LG', 'KT', 'SKB', 'Skylife', 'HelloVision'];
            allResultsData = carriers.map(carrier => calculateBestOptionForCarrier(carrier, userSelections)).flat().filter(result => result && result.totalBenefit > 0);
            
            displayResults(allResultsData);
            
            els.loader.style.display = 'none';
            els.resultsContainer.style.display = 'block';
            
            const header = document.querySelector('.sticky-header-container');
            const firstResultCategory = aiCalcBody.querySelector('.result-category');

            if (header && firstResultCategory) {
                const headerHeight = header.offsetHeight;
                const elementPosition = firstResultCategory.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = elementPosition - headerHeight - 20;

                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }

            els.calculateBtn.classList.remove('calculating');
            els.calculateBtn.disabled = false;
        }, 1500);
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
                const planData = window.MOBILE_TIER_PRICES[select.value];
                return { ...planData, isYouth: youthCheckbox.checked, hasUsim: usimCheckbox.checked };
            }) : []
        };
    }
    
    function calculateBestOptionForCarrier(carrierName, selections) {
        const carrierData = telecomData[carrierName];
        if (!carrierData) return [];
        
        let combinedProducts = (selections.mobilePlans.length > 0) ? (carrierData.combinedProducts || [{ name: '미결합' }]) : [{ name: '미결합' }];
        
        if ((carrierName === 'SKB' || carrierName === 'SK') && selections.mobilePlans.length > 0) {
            if (!combinedProducts.some(p => p.name === '패밀리결합')) {
                combinedProducts.push({ name: '패밀리결합', price: 0 });
            }
        }
        
        let results = [];
        
        const internetProduct = carrierData.internet.find(p => p.id.includes(selections.internetSpeed));
        if (!internetProduct) return [];

        let tvProduct = null, tvPrice = 0, additionalTvPrice = 0, additionalTvProductForDetail = null;
        if (selections.tvPlan !== 'none') {
            tvProduct = carrierData.tv.find(p => p.id === selections.tvPlan);
            if (!tvProduct) {
                const wantBasic = selections.tvPlan === 'basic';
                const matchBasic = /basic|베이직|이코노미|economy|lite|라이트|180|실속형/i;
                const matchPremium = /premium|all|에센스|프리미엄|230|모든G/i;
                tvProduct = carrierData.tv.find(p => {
                    const nm = (p.name || '').toLowerCase();
                    return wantBasic ? matchBasic.test(nm) : matchPremium.test(nm);
                });
            }
            if (tvProduct) {
                tvPrice = tvProduct.price;
                if (selections.additionalTvCount > 0) {
                    const isBasicChosen = /basic|베이직|이코노미|economy|lite|라이트|180|실속형/i.test(tvProduct.name.toLowerCase());
                    const addKey = isBasicChosen ? 'basic' : 'premium';
                    const pricePerUnit = carrierData.additionalTv[addKey] || 0;
                    if (pricePerUnit > 0) {
                        additionalTvPrice = pricePerUnit * selections.additionalTvCount;
                        additionalTvProductForDetail = {
                            name: `추가 TV ${selections.additionalTvCount}대`,
                            price: additionalTvPrice
                        };
                    }
                }
            }
        }
        if (!tvProduct) {
            tvProduct = { id: 'none', name: '미포함', price: 0 };
        }
        const internetPrice = internetProduct.price;

        for (const combinedProduct of combinedProducts) {
            let internetDiscount = 0, totalMobileDiscount = 0;
            let recommendationContext = {};
            
            const mobileCount = selections.mobilePlans.length;
            const mobilePriceSum = selections.mobilePlans.reduce((sum, p) => sum + p.price, 0);

            if (mobileCount > 0 && combinedProduct.name !== '미결합') {
                if (carrierName === 'SK' || carrierName === 'SKB') {
                    if (combinedProduct.name === '요즘가족결합') {
                        internetDiscount = carrierData.discounts?.[internetProduct.id] || 0;
                        let effectiveMobileCount = mobileCount;
                        if (internetProduct.id.includes('100')) {
                            effectiveMobileCount = Math.min(mobileCount, 3);
                        }
                        totalMobileDiscount = { 1: 3500, 2: 7000, 3: 18000, 4: 18000, 5: 24000 }[effectiveMobileCount] || 0;
                    } else if (combinedProduct.name === '패밀리결합') {
                        internetDiscount = 5500;
                    }
                } else if (carrierName === 'LG' || carrierName === 'HelloVision') {
                    if (combinedProduct.name === '참쉬운가족결합') {
                        internetDiscount = carrierData.discounts?.[internetProduct.id] || 0;
                        const deviceKey = Math.min(mobileCount, 5);
                        const discountRow = LG_MOBILE_DISCOUNT_MATRIX[deviceKey];
                        if (discountRow) {
                            selections.mobilePlans.forEach(plan => {
                                let priceIndex = (plan.price >= MOBILE_PRICE_TIERS_CHAM[1]) ? 2 : (plan.price >= MOBILE_PRICE_TIERS_CHAM[0] ? 1 : 0);
                                totalMobileDiscount += discountRow[priceIndex];
                            });
                        }
                    } else if (combinedProduct.name === '투게더결합') {
                        if (internetProduct.id.includes('500') || internetProduct.id.includes('1000')) {
                            internetDiscount = 11000;
                        }
                        const highTierLines = selections.mobilePlans.filter(p => p.price >= 85000);
                        if (highTierLines.length > 0) {
                            totalMobileDiscount += (LG_TOGETHER_DISCOUNT[Math.min(highTierLines.length, 5)] || 0) * highTierLines.length;
                            totalMobileDiscount += LG_PREMIUM_DISCOUNT * highTierLines.length;
                        }
                        totalMobileDiscount += highTierLines.filter(p => p.isYouth).length * LG_TOGETHER_YOUTH_ADDITIONAL_DISCOUNT;
                    } else if (combinedProduct.name === '모바일결합' && carrierName === 'HelloVision') {
                        const discounts = telecomData.HelloVision?.mobileDiscounts || {};
                        internetDiscount = (tvProduct && tvProduct.id !== 'none' ? (discounts.internet_tv?.[internetProduct.id] || 0) : (discounts.internet_only?.[internetProduct.id] || 0));
                    }
                } else if (carrierName === 'KT' || carrierName === 'Skylife') {
                    if (combinedProduct.name === '총액결합할인') {
                        const speedKey = selections.internetSpeed === '100' ? '100M' : '500M+';
                        let tierIndex = KT_TOTAL_DISCOUNT_TIERS.tiers.findIndex(tier => mobilePriceSum < tier);
                        if (tierIndex === -1) tierIndex = KT_TOTAL_DISCOUNT_TIERS.tiers.length - 1;
                        internetDiscount = KT_TOTAL_DISCOUNT_TIERS[speedKey].internet[tierIndex] || 0;
                        totalMobileDiscount = KT_TOTAL_DISCOUNT_TIERS[speedKey].mobile[tierIndex] || 0;
                    } else if (combinedProduct.name === '프리미엄싱글결합') {
                         if (mobileCount === 1 && selections.mobilePlans[0].price >= 80000) {
                           totalMobileDiscount = Math.round(selections.mobilePlans[0].price * 0.25 / 10) * 10;
                        } else { continue; }
                    } else if (combinedProduct.name === '프리미엄가족결합') {
                        const premiumLines = selections.mobilePlans.filter(p => p.price >= 80000);
                        if (mobileCount >= 2 && premiumLines.length >= 2) {
                            internetDiscount = 5500; 
                            totalMobileDiscount += 5500;
                            premiumLines.slice(1).forEach(p => totalMobileDiscount += Math.round(p.price * 0.25 / 10) * 10);
                            totalMobileDiscount += premiumLines.filter(p => p.isYouth).length * 5500;
                        } else { continue; }
                    } else if (combinedProduct.name === '홈결합30%') {
                        internetDiscount = internetPrice * 0.3;
                    }
                }
            }
            
            if (totalMobileDiscount > internetDiscount && totalMobileDiscount > 3000) {
                recommendationContext = { primaryBenefit: 'mobile', value: totalMobileDiscount };
            } else if (internetDiscount > 0) {
                recommendationContext = { primaryBenefit: 'internet', value: internetDiscount };
            }

            const netBill = (internetPrice || 0) + (tvPrice || 0) + (additionalTvPrice || 0) - (internetDiscount || 0);
            
            const giftPolicy = carrierData.giftPolicy || {};
            const speed = selections.internetSpeed;

            let cashBenefit = 0;
            if (selections.tvPlan !== 'none') {
                cashBenefit = (giftPolicy[`base_${speed}`] || 0) + (giftPolicy[`tv_bundle_add_${speed}`] || 0);
            } else {
                cashBenefit = giftPolicy[`base_${speed}`] || 0;
            }

            if (selections.tvPlan === 'premium') cashBenefit += giftPolicy.premium_tv_add || 0;
            if (selections.additionalTvCount > 0) {
                const addTvAmount = selections.tvPlan === 'premium' ? giftPolicy.add_tv_premium : giftPolicy.add_tv_basic;
                cashBenefit += (addTvAmount || 0) * selections.additionalTvCount;
            }
            if (selections.mobilePlans.filter(p => p.hasUsim).length > 0) cashBenefit += (giftPolicy.usim_add || 0) * selections.mobilePlans.filter(p => p.hasUsim).length;
            if (selections.mobilePlans.filter(p => p.price >= 80000).length > 0) cashBenefit += (giftPolicy.high_mobile_add || 0) * selections.mobilePlans.filter(p => p.price >= 80000).length;

            const totalBenefit = cashBenefit + ((internetDiscount + totalMobileDiscount) * 36);

            results.push({
                id: `${carrierName}_${combinedProduct.name}`.replace(/\s/g, ''),
                carrier: carrierData.name, 
                netBill, cashBenefit, totalBenefit, totalMobileDiscount, bestPlanName: combinedProduct.name,
                details: { telecom: { name: carrierData.name, color: telecomDataFromDB[carrierName].color }, internet: internetProduct, tv: tvProduct, additionalTv: additionalTvProductForDetail, internetDiscount },
                recommendationContext
            });
        }
        
        if (carrierName === 'SKB') {
            const prepaidDiscount = 5500;
            const prepaidCashBenefit = 100000;
            const netBill = internetPrice + tvPrice + additionalTvPrice - prepaidDiscount;
            const totalBenefit = prepaidCashBenefit + (prepaidDiscount * 36);

            results.push({
                id: `${carrierName}_선납`,
                carrier: carrierData.name,
                netBill, cashBenefit: prepaidCashBenefit, totalBenefit, totalMobileDiscount: 0, bestPlanName: 'B알뜰 선납',
                details: { telecom: { name: carrierData.name, color: telecomDataFromDB[carrierName].color }, internet: internetProduct, tv: tvProduct, additionalTv: additionalTvProductForDetail, internetDiscount: prepaidDiscount },
                recommendationContext: { primaryBenefit: 'prepaid', value: prepaidDiscount }
            });
        }
        
        return results;
    }
    
    function generateRecommendationReason(result) {
        if (!result || !result.rankTitle) return '';
        
        const { netBill, cashBenefit, totalMobileDiscount, bestPlanName, details, recommendationContext, rankTitle } = result;
        const fmt = (n) => Math.round(n).toLocaleString();

        if (rankTitle === '최대혜택 1위' || rankTitle === '최저요금 1위') {
            if (recommendationContext?.primaryBenefit === 'mobile' && totalMobileDiscount > 0) {
                return `고객님 가족의 휴대폰 요금제 구성은 <strong>'${bestPlanName}'</strong> 적용 시 <strong>월 ${fmt(totalMobileDiscount)}원</strong>의 추가 통신비 절감 효과가 있어 1위로 추천되었습니다.`;
            }
            if (recommendationContext?.primaryBenefit === 'internet' && details.internetDiscount > 0) {
                return `선택하신 인터넷 상품은 <strong>'${bestPlanName}'</strong> 적용 시 <strong>월 ${fmt(details.internetDiscount)}원</strong>의 가장 큰 요금 할인을 받을 수 있어 추천되었습니다.`;
            }
            if (recommendationContext?.primaryBenefit === 'prepaid') {
                return `<strong>'${bestPlanName}'</strong>은 요금 선납 시 <strong>월 ${fmt(details.internetDiscount)}원</strong>의 고정 할인과 <strong>${fmt(cashBenefit)}원</strong>의 사은품을 제공하는 특별 플랜입니다.`;
            }
        }

        let reasonParts = [];
        let concludingText = '으로 합리적인 선택입니다.';

        switch(rankTitle) {
            case '최대혜택 1위':
            case '최대혜택 2위':
                reasonParts.push(`현금 사은품 ${fmt(cashBenefit)}원`);
                if (totalMobileDiscount > 0) {
                    reasonParts.push(`휴대폰 월 ${fmt(totalMobileDiscount)}원 할인`);
                }
                concludingText = rankTitle === '최대혜택 1위' ? ' 기준으로 가장 큰 혜택을 제공합니다.' : ' 기준으로 혜택이 우수합니다.';
                break;
            case '최저요금 1위':
                 reasonParts.push(`월 요금 ${fmt(netBill)}원`);
                if (totalMobileDiscount > 0) {
                    reasonParts.push(`휴대폰 월 ${fmt(totalMobileDiscount)}원 할인`);
                }
                concludingText = ' 기준으로 가장 저렴합니다.';
                break;
            default:
                reasonParts.push(`월 ${fmt(netBill)}원`);
                reasonParts.push(`현금 ${fmt(cashBenefit)}원`);
                concludingText = '을 종합적으로 고려 시 추천됩니다.';
                break;
        }
        return `${reasonParts.join(', ')}${concludingText}`;
    }

    function displayResults(results) {
        if (!results || results.length === 0) {
            els.recommendationCards.innerHTML = "<p>조건에 맞는 추천 요금제가 없습니다.</p>";
            return;
        }

        const sortedByBenefit = [...results].sort((a, b) => b.totalBenefit - a.totalBenefit);
        const sortedByBill = [...results].sort((a, b) => a.netBill - b.netBill);
        
        const finalCards = new Array(3).fill(null);
        const usedIds = new Set();

        const topBenefit1 = sortedByBenefit[0];
        if (topBenefit1) {
            topBenefit1.rankTitle = "최대혜택 1위";
            topBenefit1.tag = "추천";
            finalCards[0] = topBenefit1;
            usedIds.add(topBenefit1.id);
        }

        const topBill1 = sortedByBill[0];
        if (topBill1) {
            topBill1.rankTitle = "최저요금 1위";
            topBill1.tag = "인기";
            if (!usedIds.has(topBill1.id)) {
                finalCards[1] = topBill1;
                usedIds.add(topBill1.id);
            }
        }
        
        for (const plan of sortedByBenefit) {
            if (!finalCards.includes(null)) break;
            if (!usedIds.has(plan.id)) {
                const emptyIndex = finalCards.indexOf(null);
                if (emptyIndex !== -1) {
                    plan.rankTitle = (emptyIndex === 1) ? "최대혜택 2위" : "추가 추천";
                    plan.tag = "프리미엄";
                    finalCards[emptyIndex] = plan;
                    usedIds.add(plan.id);
                }
            }
        }
        
        const validCards = finalCards.filter(Boolean);
        
        els.recommendationCards.innerHTML = validCards.map(plan => {
            return createPlanCardHTML(plan, plan.rankTitle, plan.tag);
        }).join('');
    }

    function createPlanCardHTML(result, rankTitle, tagText) {
        const { id, carrier, netBill, cashBenefit, totalMobileDiscount, details } = result;
        const internetSpeed = details.internet.name.match(/\d+M|1G/)?.[0] || details.internet.name;
        const tvPlanName = details.tv?.name || '미포함';
        const cardDisplayPrice = netBill;
        
        result.rankTitle = rankTitle;
        const recommendationReason = generateRecommendationReason(result);

        return `
            <div class="plan-card">
                <div class="rank-badge">${rankTitle}</div>
                <div class="plan-card-header" style="background-color: ${details.telecom.color};">
                    <h3>${carrier}</h3>
                    <span class="tag">${carrier}</span>
                </div>
                <div class="plan-card-body">
                    <div class="price-section">
                        <span class="price">${Math.round(cardDisplayPrice).toLocaleString()}원</span>
                        <span class="unit">/월 (VAT포함)</span>
                    </div>
                    <dl class="details-section">
                        <dt>인터넷</dt>
                        <dd>${internetSpeed}</dd>
                        <dt>TV</dt>
                        <dd>${tvPlanName}</dd>
                    </dl>
                    ${recommendationReason ? `
                    <div class="recommendation-reason">
                        <i class="fas fa-check-circle"></i>
                        <span>${recommendationReason}</span>
                    </div>
                    ` : ''}
                    <div class="benefit-section">
                        <span class="label">현금 사은품</span>
                        <span class="amount">${Math.round(cashBenefit).toLocaleString()}원</span>
                    </div>
                    ${totalMobileDiscount > 0 ? `
                    <div class="benefit-section mobile-discount">
                        <span class="label">휴대폰 할인</span>
                        <span class="amount">월 -${Math.round(totalMobileDiscount).toLocaleString()}원</span>
                    </div>
                    ` : ''}
                </div>
                <div class="plan-card-footer">
                    <!-- ▼▼▼ [수정] 버튼 그룹에 '비교함에 담기' 버튼 추가 ▼▼▼ -->
                    <div class="button-group">
                        <button class="btn detail-view-btn" data-result-id="${id}"><i class="fas fa-search"></i> 자세히</button>
                        <button class="btn compare-add-btn" data-result-id="${id}"><i class="fas fa-plus"></i> 비교</button>
                        <a href="${generateSignupUrl(id)}" class="btn btn-primary signup-link" data-tag="${tagText}" data-result-id="${id}"><i class="fas fa-rocket"></i> 셀프 가입</a>
                    </div>
                </div>
            </div>
        `;
    }

    function openDetailsModal(result) {
        const modalId = 'detail-modal';
        const modal = document.getElementById(modalId);
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body-content');
        if (!modal || !modalTitle || !modalBody) return;
        
        const { carrier, netBill, cashBenefit, totalMobileDiscount, bestPlanName, details, rankTitle } = result;
        const fmt = (n) => (n || 0).toLocaleString();

        const baseFee = (details.internet?.price || 0) + (details.tv?.price || 0) + (details.additionalTv?.price || 0);
        const totalDiscount36 = (details.internetDiscount + totalMobileDiscount) * 36;
        const finalTotalBenefit = cashBenefit + totalDiscount36;
        
        const recommendationReason = generateRecommendationReason(result);
        
        modalTitle.textContent = `${carrier} 상세 견적`;
        modalBody.innerHTML = `
            <div class="modal-section">
                <h4><i class="fas fa-check-circle"></i> 선택하신 상품</h4>
                <table class="modal-table">
                    <tr><td>인터넷</td><td>${details.internet.name} (${fmt(details.internet.price)}원)</td></tr>
                    ${details.tv && details.tv.id !== 'none' ? `<tr><td>TV</td><td>${details.tv.name} (${fmt(details.tv.price)}원)</td></tr>` : ''}
                    ${details.additionalTv ? `<tr><td>TV 추가</td><td>${details.additionalTv.name} (${fmt(details.additionalTv.price)}원)</td></tr>` : ''}
                    <tr><td>추천 결합</td><td><b>${bestPlanName}</b></td></tr>
                </table>
            </div>
            ${recommendationReason ? `
            <div class="modal-section recommendation-highlight">
                <h4><i class="fas fa-lightbulb"></i> AI 추천 이유</h4>
                <p>${recommendationReason}</p>
            </div>
            ` : ''}
            <div class="modal-section">
                <h4><i class="fas fa-coins"></i> 월 예상 납부액 상세</h4>
                <table class="modal-table">
                    <tr><td>기본요금 (A)</td><td>${fmt(baseFee)}원</td></tr>
                    <tr class="discount-row"><td>인터넷 할인 (B)</td><td>-${fmt(details.internetDiscount)}원</td></tr>
                    <tr class="total-row"><td>인터넷/TV 월 납부 총액 (A-B)</td><td>${fmt(netBill)}원</td></tr>
                </table>
            </div>
            ${totalMobileDiscount > 0 ? `
            <div class="modal-section">
                <h4><i class="fas fa-mobile-alt"></i> 추가 할인 (휴대폰)</h4>
                <table class="modal-table">
                    <tr class="discount-row"><td>휴대폰 요금 할인</td><td>-${fmt(totalMobileDiscount)}원</td></tr>
                </table>
            </div>
            ` : ''}
            <div class="modal-section">
                <h4><i class="fas fa-gift"></i> 고객님을 위한 총 혜택</h4>
                <table class="modal-table">
                    <tr><td>현금 사은품</td><td>${fmt(cashBenefit)}원</td></tr>
                    <tr><td>총 할인 혜택 (36개월)</td><td>${fmt(totalDiscount36)}원</td></tr>
                    <tr class="total-row"><td>총 혜택 금액</td><td>${fmt(finalTotalBenefit)}원</td></tr>
                </table>
            </div>
            <div class="modal-footer">
                <button class="btn btn-close" id="modal-close-btn-footer">닫기</button>
            </div>
        `;
        
        window.globalModal.open(modalId);
    }

    els.recommendationCards.addEventListener('click', (e) => {
        const detailButton = e.target.closest('.detail-view-btn');
        const signupLink = e.target.closest('a.signup-link');
        const compareButton = e.target.closest('.compare-add-btn');

        if (detailButton) {
            const resultId = detailButton.dataset.resultId;
            const resultData = allResultsData.find(r => r.id === resultId);
            if (resultData) {
                const cardElement = detailButton.closest('.plan-card');
                const rankBadge = cardElement.querySelector('.rank-badge');
                if (rankBadge) {
                    resultData.rankTitle = rankBadge.textContent;
                }
                openDetailsModal(resultData);
            }
        } else if (compareButton) {
            const resultId = compareButton.dataset.resultId;
            const resultData = allResultsData.find(r => r.id === resultId);
            if (resultData) {
                window.addToCompare(resultData);
                compareButton.innerHTML = `<i class="fas fa-check"></i> 추가됨!`;
                compareButton.disabled = true;
                setTimeout(() => {
                    compareButton.innerHTML = `<i class="fas fa-balance-scale"></i> 비교함`;
                    compareButton.disabled = false;
                }, 2000);
            }
        } else if (signupLink) {
            e.preventDefault();
            sessionStorage.setItem('returnContext', JSON.stringify({
                type: 'ai',
                selections: getUserSelections(),
                results: {
                    html: els.recommendationCards.innerHTML,
                    data: allResultsData
                }
            }));
            window.location.href = signupLink.href;
        }
    });

    function generateSignupUrl(resultId) {
        const result = allResultsData.find(r => r.id === resultId);
        if (!result) return 'signup.html';

        const userSelections = getUserSelections();
        const usimCount = userSelections.mobilePlans.filter(p => p.hasUsim).length;

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

    document.addEventListener('restoreAiResults', (e) => {
        const dataToRestore = e.detail;
        if (dataToRestore && dataToRestore.html) {
            els.recommendationCards.innerHTML = dataToRestore.html;
            allResultsData = dataToRestore.data;
            els.loader.style.display = 'none';
            els.resultsContainer.style.display = 'block';

            const header = document.querySelector('.sticky-header-container');
            const firstResult = document.querySelector('.ai-calculator-body .result-category');
            if (header && firstResult) {
                const top = firstResult.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({ top: top - header.offsetHeight - 20, behavior: 'auto' });
            }
        }
    });
    
    window.aiModuleReady = true;
    window.dispatchEvent(new Event('ai-module-ready'));
} // <-- [수정] 함수를 닫는 중괄호를 추가합니다.