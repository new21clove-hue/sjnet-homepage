import { firebaseConfig } from './config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, get, set, push, serverTimestamp, query, limitToLast, orderByChild } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// admin.js에서 사용할 수 있도록 db 객체 및 관련 함수 export
export { db, ref, get, query, limitToLast, orderByChild };

// 데이터베이스에서 전체 통신사 데이터를 가져오는 함수
export async function getFullData() {
    try {
        const snapshot = await get(ref(db, '/telecomData'));
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.log("No data available in Firebase. Consider seeding initial data.");
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
        // 변경 로그 기록
        const logRef = ref(db, '/activityLog');
        // 참고: 현재 로그인 시스템이 없으므로 'admin'으로 기록
        await push(logRef, {
            user: "admin",
            timestamp: serverTimestamp(),
            message: "전체 데이터가 저장되었습니다.",
        });

        await set(ref(db, '/telecomData'), data);
        console.log("Data saved successfully to Firebase!");
        return true;
    } catch (error) {
        console.error("Error saving data to Firebase:", error);
        return false;
    }
}