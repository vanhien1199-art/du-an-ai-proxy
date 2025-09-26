exports.handler = async function (event, context) {
  const apiKey = process.env.GOOGLE_API_KEY;

  // Kiểm tra API key
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Thiếu GOOGLE_API_KEY trong môi trường.' }),
    };
  }

  // Lấy câu hỏi từ người dùng
  let question;
  try {
    const body = JSON.parse(event.body);
    question = body.question;
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Dữ liệu gửi lên không hợp lệ.' }),
    };
  }

  if (!question || typeof question !== 'string') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Không có câu hỏi hợp lệ.' }),
    };
  }

  // Tạo prompt cho AI
  const prompt = `Bạn là một trợ giảng AI, chỉ trả lời các câu hỏi liên quan đến bài học "Đo tốc độ" dành cho học sinh lớp 7. Nếu câu hỏi không liên quan, hãy trả lời rằng "Câu hỏi này nằm ngoài phạm vi bài học Đo tốc độ, bạn có câu hỏi nào khác không?". Câu hỏi của học sinh là: "${question}"`;

  const GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(GOOGLE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const resultText = await response.text();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: 'Lỗi từ Google AI API',
          details: resultText,
        }),
      };
    }

    const data = JSON.parse(resultText);

    const aiResponse =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Không có phản hồi từ AI.';

    return {
      statusCode: 200,
      body: JSON.stringify({ answer: aiResponse }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Lỗi máy chủ trung gian.',
        details: error.message,
      }),
    };
  }
};
