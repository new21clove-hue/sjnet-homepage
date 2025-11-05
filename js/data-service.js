// js/data-service.js

import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 데이터베이스에서 전체 통신사 데이터를 가져오는 함수
export async function getFullData() {
    try {
        const snapshot = await get(ref(db, '/telecomData'));
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.log("No data available in Firebase. Consider seeding initial data.");
            // 기본 데이터 구조를 반환하거나, 초기 데이터 seeding 함수를 호출할 수 있습니다.
            return null; 
        }
    } catch (error) {
        console.error("Error fetching data from Firebase:", error);
        return null;
    }
}

// 데이터베이스에 전체 통신사 데이터를 저장하는 함수 (관리자용)
export async function saveData(data) {
    try {
        await set(ref(db, '/telecomData'), data);
        console.log("Data saved successfully to Firebase!");
        return true;
    } catch (error) {
        console.error("Error saving data to Firebase:", error);
        return false;
    }
}