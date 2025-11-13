// ▼▼▼ [수정] data-service에서 추가로 export한 함수들 임포트 ▼▼▼
import { getFullData, saveData, db, ref, get, query, limitToLast, orderByChild } from './data-service.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. 필요한 모든 HTML 요소를 미리 선택합니다.
    const loginContainer = document.getElementById('login-container');
    const adminContainer = document.getElementById('admin-container');
    const loginButton = document.getElementById('login-button');
    const passwordInput = document.getElementById('password-input');
    const loginMessage = document.getElementById('login-message');
    const adminForm = document.getElementById('admin-form');

    // 2. 상태 변수들을 정의합니다.
    const adminPassword = "01234"; // 관리자 비밀번호
    let fullData = null;
    let currentTelecom = null;
    let isFormDirty = false; // 변경사항 감지 플래그

    // 3. 로그인 처리 함수
    const handleLogin = () => {
        if (passwordInput.value === adminPassword) {
            loginContainer.style.display = 'none';
            adminContainer.style.display = 'block';
            document.body.classList.add('logged-in');
            initializeApp();
        } else {
            loginMessage.textContent = "비밀번호가 틀렸습니다.";
            passwordInput.value = '';
            passwordInput.focus();
        }
    };

    // 4. 로그인 버튼과 엔터 키에 이벤트 연결
    loginButton.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // 5. 메인 관리자 앱 초기화 함수
    const initializeApp = async () => {
        try {
            fullData = await getFullData();
        } catch (error) {
            console.error("데이터 로딩 실패:", error);
            alert("데이터를 불러오는 데 실패했습니다. (오류: " + error.message + ")");
            return;
        }

        // ▼▼▼ [추가] 대시보드 및 로그 로딩 함수 호출 ▼▼▼
        loadDashboardData();
        loadActivityLog();

        const telecomSelector = document.getElementById('telecom-selector');
        const telecomKeys = ['KT', 'LG', 'SK', 'SKB', 'Skylife', 'HelloVision'];
        currentTelecom = telecomKeys[0];

        telecomKeys.forEach(key => {
            if (fullData[key]) {
                const btn = document.createElement('button');
                btn.dataset.telecom = key;
                btn.textContent = fullData[key].name || key;
                if (key === currentTelecom) btn.classList.add('active');
                telecomSelector.appendChild(btn);
            }
        });

        telecomSelector.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && !e.target.classList.contains('active')) {
                if (isFormDirty && !confirm("저장되지 않은 변경사항이 있습니다. 정말로 이동하시겠습니까?")) {
                    return;
                }
                telecomSelector.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
                currentTelecom = e.target.dataset.telecom;
                populateAllForms();
                isFormDirty = false;
            }
        });

        adminForm.addEventListener('submit', handleFormSubmit);
        
        populateAllForms();
        isFormDirty = false;
    };

    // ▼▼▼ [추가] 대시보드 데이터 로딩 함수 ▼▼▼
    async function loadDashboardData() {
        const dashboardContent = document.getElementById('dashboard-content');
        // 이 기능은 통계 데이터 수집 로직이 먼저 구현되어야 합니다.
        // 현재는 예시 텍스트만 보여줍니다.
        dashboardContent.innerHTML = `
            <div class="form-group" style="grid-column: 1 / -1;">
                <p>향후 이 곳에 Google Sheet와 연동된 신청 건수, Firebase와 연동된 통신사별 조회수 등의 통계가 표시될 예정입니다.</p>
            </div>
            <div class="form-group"><strong>총 신청 건수 (Google Sheet):</strong> <span>확인 불가</span></div>
            <div class="form-group"><strong>가장 많이 조회된 통신사:</strong> <span>데이터 수집 필요</span></div>
        `;
    }

    // ▼▼▼ [추가] 변경 이력 로딩 함수 ▼▼▼
    async function loadActivityLog() {
        const logContent = document.getElementById('log-content');
        logContent.innerHTML = '<p>로그를 불러오는 중입니다...</p>';
        try {
            // 최근 10개 로그만 가져오기
            const logRef = query(ref(db, 'activityLog'), orderByChild('timestamp'), limitToLast(10));
            const snapshot = await get(logRef);

            if (snapshot.exists()) {
                const logs = [];
                snapshot.forEach(childSnapshot => {
                    logs.push(childSnapshot.val());
                });
                // 최신순으로 정렬
                logs.reverse(); 
                
                logContent.innerHTML = logs.map(log => 
                    `<p style="margin:0 0 8px; padding-bottom:8px; border-bottom:1px solid #eee; font-size: 0.9em;">
                        <strong style="color: var(--primary-dark);">${new Date(log.timestamp).toLocaleString('ko-KR')}</strong>
                        <span style="margin-left: 10px;">[${log.user || 'unknown'}] ${log.message}</span>
                     </p>`
                ).join('');
            } else {
                logContent.textContent = '변경 이력이 없습니다.';
            }
        } catch (error) {
            console.error("로그 로딩 실패:", error);
            logContent.textContent = '로그를 불러오는 데 실패했습니다.';
        }
    }

    // 6. 폼 입력 시 자동 서식 변경 및 '변경됨' 상태로 전환
    const handleInputFormatting = (e) => {
        const type = e.target.dataset.type;
        const rawValue = e.target.value.replace(/[^0-9]/g, '');
        if (type === 'price') {
            e.target.value = Number(rawValue).toLocaleString('ko-KR');
        } else { // gift
            e.target.value = rawValue;
        }
    };

    adminForm.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT') {
            isFormDirty = true;
            handleInputFormatting(e);
        }
    });

    // 7. 페이지 이탈 방지 경고
    window.addEventListener('beforeunload', (e) => {
        if (isFormDirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // --- 이하 폼 생성 및 저장 관련 함수들 (기존과 동일) ---

    function populateAllForms() {
        populatePriceForm();
        populateGiftPolicyForm();
    }

    function populatePriceForm() {
        const data = fullData[currentTelecom];
        const priceGrid = document.getElementById('price-form-grid');
        priceGrid.innerHTML = '';
        (data.internet || []).forEach(item => {
            priceGrid.appendChild(createFormGroup(`price-internet-${item.id}`, `인터넷 ${item.name} 요금`, item.price, 'price'));
        });
        (data.tv || []).forEach(item => {
            priceGrid.appendChild(createFormGroup(`price-tv-${item.id || item.name.slice(0,5)}`, `TV ${item.name} 요금`, item.price, 'price'));
        });
    }

    function populateGiftPolicyForm() {
        const giftPolicyGrid = document.getElementById('gift-policy-form-grid');
        giftPolicyGrid.innerHTML = '';
        const giftPolicy = fullData[currentTelecom].giftPolicy || {};
        const policyStructure = `
            <div class="policy-group"><h3 class="group-title">기본 사은품 (인터넷 속도별)</h3><div class="form-grid">
                ${createFormGroup(`gift-base_100`, '100M 단독', giftPolicy.base_100, 'gift').outerHTML}
                ${createFormGroup(`gift-base_500`, '500M 단독', giftPolicy.base_500, 'gift').outerHTML}
                ${createFormGroup(`gift-base_1000`, '1G 단독', giftPolicy.base_1000, 'gift').outerHTML}
            </div></div>
            <div class="policy-group"><h3 class="group-title">TV 결합 시 추가 사은품</h3><div class="form-grid">
                ${createFormGroup(`gift-tv_bundle_add_100`, '100M+TV', giftPolicy.tv_bundle_add_100, 'gift').outerHTML}
                ${createFormGroup(`gift-tv_bundle_add_500`, '500M+TV', giftPolicy.tv_bundle_add_500, 'gift').outerHTML}
                ${createFormGroup(`gift-tv_bundle_add_1000`, '1G+TV', giftPolicy.tv_bundle_add_1000, 'gift').outerHTML}
            </div></div>
            <div class="policy-group"><h3 class="group-title">기타 추가 사은품</h3><div class="form-grid">
                ${createFormGroup(`gift-premium_tv_add`, '프리미엄 TV', giftPolicy.premium_tv_add, 'gift').outerHTML}
                ${createFormGroup(`gift-add_tv_basic`, '추가 TV (기본)', giftPolicy.add_tv_basic, 'gift').outerHTML}
                ${createFormGroup(`gift-add_tv_premium`, '추가 TV (프리미엄)', giftPolicy.add_tv_premium, 'gift').outerHTML}
                ${createFormGroup(`gift-usim_add`, '유심', giftPolicy.usim_add, 'gift').outerHTML}
                ${createFormGroup(`gift-high_mobile_add`, '고가요금제', giftPolicy.high_mobile_add, 'gift').outerHTML}
            </div></div>`;
        giftPolicyGrid.innerHTML = policyStructure;
    }

    function createFormGroup(id, label, value, type) {
        const group = document.createElement('div');
        group.className = 'form-group';
        let displayValue = value;
        let inputType = 'text';
        if (type === 'gift') {
            displayValue = (value || 0) / 10000;
            group.classList.add('gift-group');
        } else {
            displayValue = (value || 0).toLocaleString('ko-KR');
        }
        group.innerHTML = `<label for="${id}">${label}</label><input type="${inputType}" id="${id}" value="${displayValue}" data-type="${type}">`;
        return group;
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        function getNumericValue(elementId, type) {
            const input = document.getElementById(elementId);
            if (!input) return 0;
            const rawValue = input.value.replace(/[^0-9]/g, '');
            let numberValue = Number(rawValue) || 0;
            if (type === 'gift') return numberValue * 10000;
            return numberValue;
        }

        (fullData[currentTelecom].internet || []).forEach(item => {
            item.price = getNumericValue(`price-internet-${item.id}`, 'price');
        });
        (fullData[currentTelecom].tv || []).forEach(item => {
            item.price = getNumericValue(`price-tv-${item.id || item.name.slice(0,5)}`, 'price');
        });

        if (!fullData[currentTelecom].giftPolicy) {
            fullData[currentTelecom].giftPolicy = {};
        }
        const giftPolicy = fullData[currentTelecom].giftPolicy;
        const policyIds = ['base_100', 'base_500', 'base_1000', 'tv_bundle_add_100', 'tv_bundle_add_500', 'tv_bundle_add_1000', 'premium_tv_add', 'add_tv_basic', 'add_tv_premium', 'usim_add', 'high_mobile_add'];
        policyIds.forEach(id => {
            giftPolicy[id] = getNumericValue(`gift-${id}`, 'gift');
        });

        const success = await saveData(fullData);
        showToast(success ? '성공적으로 저장되었습니다.' : '저장 중 오류가 발생했습니다.', success);
        if (success) {
            isFormDirty = false;
            loadActivityLog(); // [추가] 저장 성공 시 로그 즉시 새로고침
        }
    }

    function showToast(message, isSuccess) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${isSuccess ? 'success' : 'error'}`;
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }
});