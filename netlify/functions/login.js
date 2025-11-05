// netlify/functions/login.js

exports.handler = async function(event, context) {
    // POST 요청만 허용
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { password } = JSON.parse(event.body);
        
        // Netlify 환경 변수에서 실제 비밀번호를 가져옵니다.
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (password === adminPassword) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, message: 'Login successful' })
            };
        } else {
            return {
                statusCode: 401,
                body: JSON.stringify({ success: false, message: 'Invalid password' })
            };
        }
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Internal Server Error' }) };
    }
};