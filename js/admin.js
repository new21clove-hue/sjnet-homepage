// js/admin.js

import { getFullData, saveData } from './data-service.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const adminContainer = document.getElementById('admin-container');
    const loginButton = document.getElementById('login-button');
    const passwordInput = document.getElementById('password-input');
    const loginMessage = document.getElementById('login-message');

    let fullData = null;
    let currentTelecom = null;

    // 1. 로그인 처리
    loginButton.addEventListener('click', async () => {
        const password = passwordInput.value;
        loginMessage.textContent = '인증 중...';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                loginContainer.style.display = 'none';
                adminContainer.style.display = 'block';
                initializeApp(); // 로그인 성공 시 앱 초기화
            } else {
                loginMessage.textContent = '비밀번호가 틀렸습니다.';
            }
        } catch (error) {
            loginMessage.textContent = '로그인 중 오류가 발생했습니다.';
            console.error('Login error:', error);
        }
    });
    
    passwordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') loginButton.click();
    });

    // 2. 앱 초기화 (데이터 로드 및 UI 생성)
    async function initializeApp() {
        fullData = await getFullData();
        if (!fullData) {
            alert("데이터를 불러오는 데 실패했습니다. Firebase 설정을 확인하세요.");
            return;
        }

        const telecomSelector = document.getElementById('telecom-selector');
        const telecomKeys = Object.keys(fullData);
        currentTelecom = telecomKeys[0]; // 첫 번째 통신사를 기본으로 선택

        telecomKeys.forEach(key => {
            const btn = document.createElement('button');
            btn.dataset.telecom = key;
            btn.textContent = fullData[key].name || key;
            if (key === currentTelecom) btn.classList.add('active');
            telecomSelector.appendChild(btn);
        });

        telecomSelector.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                telecomSelector.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
                currentTelecom = e.target.dataset.telecom;
                populateForm();
            }
        });

        document.getElementById('admin-form').addEventListener('submit', handleFormSubmit);
        
        populateForm();
    }

    // 3. 폼 채우기
    function populateForm() {
        const data = fullData[currentTelecom];
        const priceGrid = document.getElementById('price-form-grid');
        const giftGrid = document.getElementById('gift-form-grid');
        priceGrid.innerHTML = '';
        giftGrid.innerHTML = '';

        // 요금 정보 폼 생성
        // 예시: 인터넷 요금
        data.internet.forEach(item => {
            priceGrid.appendChild(createFormGroup(`internet-${item.id}`, `인터넷 ${item.name} 요금`, item.price));
        });
        // 예시: TV 요금
        data.tv.forEach(item => {
            priceGrid.appendChild(createFormGroup(`tv-${item.name.slice(0, 10)}`, `TV ${item.name} 요금`, item.price));
        });

        // 사은품 정보 폼 생성
        Object.entries(data.discounts || {}).forEach(([key, value]) => {
             giftGrid.appendChild(createFormGroup(`gift-${key}`, `사은품: ${key}`, value));
        });
    }

    function createFormGroup(id, label, value) {
        const group = document.createElement('div');
        group.className = 'form-group';
        group.innerHTML = `
            <label for="${id}">${label}</label>
            <input type="number" id="${id}" value="${value || ''}">
        `;
        return group;
    }

    // 4. 폼 제출 (데이터 저장)
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // 현재 UI에서 값을 읽어 fullData 객체를 업데이트하는 로직
        // (이 부분은 실제 데이터 구조에 맞춰 정교하게 작성해야 합니다)
        // 간단한 예시:
        fullData[currentTelecom].internet.forEach(item => {
            const input = document.getElementById(`internet-${item.id}`);
            if(input) item.price = Number(input.value);
        });
        fullData[currentTelecom].tv.forEach(item => {
            const input = document.getElementById(`tv-${item.name.slice(0, 10)}`);
            if(input) item.price = Number(input.value);
        });
        Object.keys(fullData[currentTelecom].discounts || {}).forEach(key => {
            const input = document.getElementById(`gift-${key}`);
            if(input) fullData[currentTelecom].discounts[key] = Number(input.value);
        });

        const success = await saveData(fullData);
        showToast(success ? '성공적으로 저장되었습니다.' : '저장 중 오류가 발생했습니다.', success);
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