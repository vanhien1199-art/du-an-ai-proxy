// File: /netlify/functions/askAI.js

exports.handler = async function(event, context) {
    // --- 1. KIỂM TRA CẤU HÌNH VÀ DỮ LIỆU ĐẦU VÀO ---

    // Kiểm tra 1.1: API Key có được thiết lập trong Biến môi trường không?
    // Đây là bước kiểm tra an ninh và cấu hình quan trọng nhất.
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        const errorMessage = 'LỖI NGHIÊM TRỌNG: Biến môi trường GOOGLE_API_KEY chưa được thiết lập trên Netlify!';
        console.error(errorMessage); // Ghi lại lỗi chi tiết vào Log của Netlify
        return {
            statusCode: 500, // Lỗi từ phía máy chủ (cấu hình sai)
            body: JSON.stringify({ error: 'Lỗi cấu hình máy chủ: Vui lòng liên hệ người quản trị.' }),
        };
    }

    // Kiểm tra 1.2: Dữ liệu gửi lên có hợp lệ và chứa câu hỏi không?
    let question;
    try {
        const body = JSON.parse(event.body);
        question = body.question;
        if (!question || typeof question !== 'string' || question.trim() === '') {
            // Nếu không có 'question' hoặc 'question' rỗng, trả về lỗi
            throw new Error('Câu hỏi không hợp lệ.');
        }
    } catch (error) {
        const errorMessage = 'Dữ liệu gửi lên không hợp lệ hoặc thiếu câu hỏi.';
        console.error(errorMessage, error);
        return {
            statusCode: 400, // 400 Bad Request - Lỗi từ phía người dùng
            body: JSON.stringify({ error: errorMessage }),
        };
    }

    // --- 2. GỌI API CỦA GOOGLE VÀ XỬ LÝ PHẢN HỒI ---

   const GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    const prompt = `Bạn là một trợ giảng AI, chỉ trả lời các câu hỏi liên quan đến bài học "Đo tốc độ" dành cho học sinh lớp 7 một cách ngắn gọn, dễ hiểu. Nếu câu hỏi không liên quan, hãy trả lời rằng "Câu hỏi này nằm ngoài phạm vi bài học Đo tốc độ, bạn có câu hỏi nào khác không?". Câu hỏi của học sinh là: "${question}"`;

    try {
        const response = await fetch(GOOGLE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        // Xử lý 2.1: Các phản hồi lỗi từ Google (ví dụ: 400, 403, 500)
        if (!response.ok) {
            // Cố gắng đọc nội dung lỗi chi tiết mà Google trả về
            let errorDetails = `Lỗi từ Google AI API với mã trạng thái ${response.status}.`;
            try {
                const errorData = await response.json();
                if (errorData.error && errorData.error.message) {
                    errorDetails += ` Chi tiết: ${errorData.error.message}`;
                }
            } catch (e) {
                errorDetails += ` Không thể đọc chi tiết lỗi.`;
            }
            console.error(errorDetails); // Ghi lỗi chi tiết vào Log
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: errorDetails }),
            };
        }

        const data = await response.json();

        // Xử lý 2.2: Phản hồi thành công nhưng không có nội dung (do bộ lọc an toàn)
        if (!data.candidates || data.candidates.length === 0) {
            let reason = "Không có nội dung trả về, có thể do câu hỏi vi phạm bộ lọc an toàn của Google.";
            if (data.promptFeedback && data.promptFeedback.blockReason) {
                reason += ` Lý do từ Google: ${data.promptFeedback.blockReason}`;
            }
            console.warn(reason); // Ghi cảnh báo vào Log
            return {
                statusCode: 200, // Vẫn là phản hồi thành công
                body: JSON.stringify({ answer: `Rất tiếc, tôi không thể trả lời câu hỏi này. (${reason})` }),
            };
        }

        const aiResponse = data.candidates[0].content.parts[0].text;

        // --- 3. GỬI PHẢN HỒI THÀNH CÔNG VỀ TRÌNH DUYỆT ---
        return {
            statusCode: 200,
            body: JSON.stringify({ answer: aiResponse }),
        };

    } catch (error) {
        // --- 4. XỬ LÝ CÁC LỖI NGOẠI LỆ KHÁC (VÍ DỤ: LỖI MẠNG) ---
        console.error('LỖI NGOẠI LỆ (ví dụ: lỗi mạng):', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Đã xảy ra lỗi không xác định phía máy chủ: ${error.message}` }),
        };
    }
};

