import { initializeUI } from './ui-interactions.js';
import { getFullData } from './data-service.js';
import { initMainCalculator } from './main-calculator.js';
import { initAiCalculator } from './ai-calculator.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 앱이 시작되면 데이터를 딱 한 번만 가져옵니다.
    const telecomData = await getFullData();

    // 2. 가져온 데이터를 각 모듈에 전달하며, 모든 UI 기능을 단 한 번만 초기화합니다.
    initializeUI(telecomData);
    initMainCalculator(telecomData);
    initAiCalculator(telecomData);
});