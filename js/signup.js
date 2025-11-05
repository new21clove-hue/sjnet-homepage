// js/signup.js
function openDaumPostcode() { new daum.Postcode({ oncomplete: function(data) { document.getElementById('address-basic').value = data.roadAddress || data.jibunAddress; document.getElementById('address-detail').focus(); } }).open(); }

document.addEventListener('DOMContentLoaded', function() {
    // ... (기존 코드와 동일한 부분은 생략) ...
    
    let currentStep = 1; let isPayerInfoConfirmed = false;
    
    // [개선] alert 대신 인라인 메시지를 표시하는 함수
    function showValidationAlert(element, message) {
        const formGroup = element.closest('.form-group');
        if (!formGroup) return;
        
        let messageEl = formGroup.querySelector('.validation-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = 'validation-message';
            formGroup.appendChild(messageEl);
        }
        
        element.classList.add('invalid');
        messageEl.textContent = message;
        messageEl.style.display = 'block';
        element.focus();
    }

    // [개선] 오류 메시지를 숨기는 함수
    function hideValidationAlert(element) {
        const formGroup = element.closest('.form-group');
        if (!formGroup) return;
        
        const messageEl = formGroup.querySelector('.validation-message');
        if (messageEl) {
            messageEl.style.display = 'none';
        }
        element.classList.remove('invalid');
    }

    // [개선] 모든 필수 입력 필드에 이벤트 리스너 추가
    document.querySelectorAll('.form-section [required]').forEach(input => {
        input.addEventListener('input', () => hideValidationAlert(input));
    });

    function validateCurrentStep() {
        const currentSection = formSections[currentStep - 1];
        for (const input of currentSection.querySelectorAll('[required]')) {
            if(input.offsetParent === null) continue;
            
            // 모든 필드에 대해 유효성 검사 전 이전 오류 메시지 숨기기
            hideValidationAlert(input);

            if (input.tagName === 'SELECT' && input.value === '') { let labelText = document.querySelector(`label[for="${input.id}"]`)?.innerText.replace('*', '') || '선택항목'; showValidationAlert(input, `"${labelText}"을(를) 선택해주세요.`); return false; }
            if (input.type === 'radio' && !Array.from(currentSection.querySelectorAll(`input[name="${input.name}"]`)).some(radio => radio.checked)) { const groupLabel = input.closest('.form-group').querySelector('.label').innerText.replace('*', ''); showValidationAlert(input, `"${groupLabel}" 항목을 선택해주세요.`); return false; }
            else if (input.classList.contains('terms-checkbox-item') && !input.checked) { showValidationAlert(input, '필수 약관에 모두 동의해주셔야 합니다.'); return false; }
            else if (!input.value.trim() && !['SELECT', 'RADIO', 'CHECKBOX'].includes(input.tagName)) {
                if (input.id === 'address-basic') { showValidationAlert(input, '"주소찾기"를 진행해주세요.'); return false; }
                let labelText = document.querySelector(`label[for="${input.id}"]`)?.innerText.replace('*', '') || input.placeholder || '필수 입력';
                showValidationAlert(input, `"${labelText}" 항목은 필수입니다.`); return false;
            }
            const nameRegex = /^(?:[a-zA-Z]{4,}|[가-힣]{2,})$/;
            if ((input.id === 'name' || input.id === 'bizName' || input.id === 'corporateName') && !nameRegex.test(input.value)) { showValidationAlert(input, '이름/상호/법인명은 한글 2자 이상 또는 영문 4자 이상이어야 합니다.'); return false; }
            if (input.id === 'bizRegNumber' && !/^\d{10}$/.test(input.value)) { showValidationAlert(input, '사업자등록번호는 10자리 숫자로 입력해주세요.'); return false; }
            if (input.id === 'birth' && !/^\d{8}$/.test(input.value)) { showValidationAlert(input, '생년월일을 8자리 숫자로 정확히 입력해주세요.'); return false; }
            if (input.id === 'phone' && !/^010\d{8}$/.test(input.value.replace(/-/g, ''))) { showValidationAlert(input, '휴대폰 번호 형식이 올바르지 않습니다.'); return false; }
            if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) { showValidationAlert(input, '이메일 형식이 올바르지 않습니다.'); return false; }
            
            if (input.name === 'accountNumber' || input.name === 'payerAccountNumber') {
                const bankSelect = input.name === 'accountNumber' ? document.getElementById('bank') : document.getElementById('payerBank');
                const bankName = bankSelect.value;
                const accountNumber = input.value.replace(/\D/g, '');
                const rules = accountLengthRules[bankName];
                if (bankName && rules && !rules.includes(accountNumber.length)) {
                    showValidationAlert(input, `${bankName} 계좌번호 자릿수(${rules.join(' 또는 ')}자리)가 올바르지 않습니다.`);
                    return false;
                }
            }
            if (input.id === 'payerCardNumber' && !/^\d{15,16}$/.test(input.value.replace(/-/g, ''))) { showValidationAlert(input, '카드번호는 15~16자리 숫자로 입력해주세요.'); return false; }
            if (input.id === 'payerCardExpiryMonth' || input.id === 'payerCardExpiryYear') {
                const monthSelect = document.getElementById('payerCardExpiryMonth');
                const yearSelect = document.getElementById('payerCardExpiryYear');
                if (monthSelect.value && yearSelect.value) {
                     const today = new Date();
                     const currentMonth = today.getMonth() + 1;
                     const currentYear = today.getFullYear() % 100;
                     const selectedMonth = parseInt(monthSelect.value, 10);
                     const selectedYear = parseInt(yearSelect.value, 10);

                     if (selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth)) {
                        showValidationAlert(monthSelect, '만료된 카드입니다. 유효기간을 다시 확인해주세요.');
                        return false;
                     }
                }
            }
        }
        return true;
    }

    // ... (나머지 기존 JS 코드는 그대로 유지) ...
});