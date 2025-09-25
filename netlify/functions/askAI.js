exports.handler = async function(event, context) {
    // 1. Lấy API key đã được lưu bí mật trên Netlify
    const apiKey = process.env.GOOGLE_API_KEY;
    
    // 2. Lấy câu hỏi mà học sinh đã gửi lên
    const { question } = JSON.parse(event.body);

    if (!question) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Không có câu hỏi nào được đưa ra.' }),
        };
    }

    // 3. Chuẩn bị và gửi yêu cầu đến Google AI (giống như trước đây)
    const GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    const prompt = `Bạn là một trợ giảng AI, chỉ trả lời các câu hỏi liên quan đến bài học "Đo tốc độ" dành cho học sinh lớp 7. Nếu câu hỏi không liên quan, hãy trả lời rằng "Câu hỏi này nằm ngoài phạm vi bài học Đo tốc độ, bạn có câu hỏi nào khác không?". Câu hỏi của học sinh là: "${question}"`;

    try {
        const response = await fetch(GOOGLE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            return { statusCode: response.status, body: JSON.stringify({ error: 'Lỗi từ Google AI API' }) };
        }

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;

        // 4. Trả kết quả về cho trình duyệt của học sinh
        return {
            statusCode: 200,
            body: JSON.stringify({ answer: aiResponse }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Lỗi máy chủ trung gian.' }),
        };
    }
};